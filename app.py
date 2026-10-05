import os
from datetime import datetime
from flask import Flask, render_template, request, jsonify
import requests

app = Flask(__name__)

GEOCODING_API_URL = "https://geocoding-api.open-meteo.com/v1/search"
WEATHER_API_URL = "https://api.open-meteo.com/v1/forecast"

WEATHER_CODES = {
    0: {"day": "Clear Sky", "night": "Clear Sky", "icon_day": "clear-day", "icon_night": "clear-night"},
    1: {"day": "Mainly Clear", "night": "Mainly Clear", "icon_day": "partly-cloudy-day", "icon_night": "partly-cloudy-night"},
    2: {"day": "Partly Cloudy", "night": "Partly Cloudy", "icon_day": "partly-cloudy-day", "icon_night": "partly-cloudy-night"},
    3: {"day": "Overcast", "night": "Overcast", "icon_day": "cloudy", "icon_night": "cloudy"},
    45: {"day": "Foggy", "night": "Foggy", "icon_day": "fog", "icon_night": "fog"},
    48: {"day": "Depositing Rime Fog", "night": "Depositing Rime Fog", "icon_day": "fog", "icon_night": "fog"},
    51: {"day": "Light Drizzle", "night": "Light Drizzle", "icon_day": "drizzle", "icon_night": "drizzle"},
    53: {"day": "Moderate Drizzle", "night": "Moderate Drizzle", "icon_day": "drizzle", "icon_night": "drizzle"},
    55: {"day": "Dense Drizzle", "night": "Dense Drizzle", "icon_day": "drizzle", "icon_night": "drizzle"},
    56: {"day": "Light Freezing Drizzle", "night": "Light Freezing Drizzle", "icon_day": "freezing-rain", "icon_night": "freezing-rain"},
    57: {"day": "Dense Freezing Drizzle", "night": "Dense Freezing Drizzle", "icon_day": "freezing-rain", "icon_night": "freezing-rain"},
    61: {"day": "Slight Rain", "night": "Slight Rain", "icon_day": "rain", "icon_night": "rain"},
    63: {"day": "Moderate Rain", "night": "Moderate Rain", "icon_day": "rain", "icon_night": "rain"},
    65: {"day": "Heavy Rain", "night": "Heavy Rain", "icon_day": "heavy-rain", "icon_night": "heavy-rain"},
    66: {"day": "Light Freezing Rain", "night": "Light Freezing Rain", "icon_day": "freezing-rain", "icon_night": "freezing-rain"},
    67: {"day": "Heavy Freezing Rain", "night": "Heavy Freezing Rain", "icon_day": "freezing-rain", "icon_night": "freezing-rain"},
    71: {"day": "Slight Snow Fall", "night": "Slight Snow Fall", "icon_day": "snow", "icon_night": "snow"},
    73: {"day": "Moderate Snow Fall", "night": "Moderate Snow Fall", "icon_day": "snow", "icon_night": "snow"},
    75: {"day": "Heavy Snow Fall", "night": "Heavy Snow Fall", "icon_day": "heavy-snow", "icon_night": "heavy-snow"},
    77: {"day": "Snow Grains", "night": "Snow Grains", "icon_day": "snow", "icon_night": "snow"},
    80: {"day": "Slight Rain Showers", "night": "Slight Rain Showers", "icon_day": "rain-showers-day", "icon_night": "rain-showers-night"},
    81: {"day": "Moderate Rain Showers", "night": "Moderate Rain Showers", "icon_day": "rain-showers-day", "icon_night": "rain-showers-night"},
    82: {"day": "Violent Rain Showers", "night": "Violent Rain Showers", "icon_day": "heavy-rain", "icon_night": "heavy-rain"},
    85: {"day": "Slight Snow Showers", "night": "Slight Snow Showers", "icon_day": "snow", "icon_night": "snow"},
    86: {"day": "Heavy Snow Showers", "night": "Heavy Snow Showers", "icon_day": "heavy-snow", "icon_night": "heavy-snow"},
    95: {"day": "Thunderstorm", "night": "Thunderstorm", "icon_day": "thunderstorm", "icon_night": "thunderstorm"},
    96: {"day": "Thunderstorm with Hail", "night": "Thunderstorm with Hail", "icon_day": "thunderstorm", "icon_night": "thunderstorm"},
    99: {"day": "Thunderstorm with Heavy Hail", "night": "Thunderstorm with Heavy Hail", "icon_day": "thunderstorm", "icon_night": "thunderstorm"},
}

def get_weather_info(code, is_day=1):
    info = WEATHER_CODES.get(code, {
        "day": "Unknown",
        "night": "Unknown",
        "icon_day": "cloudy",
        "icon_night": "cloudy"
    })
    condition = info["day"] if is_day else info["night"]
    icon = info["icon_day"] if is_day else info["icon_night"]
    return condition, icon

def get_wind_direction(degrees):
    if degrees is None:
        return "N/A"
    directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
    index = round(degrees / 22.5) % 16
    return directions[index]

def get_uv_category(uv_val):
    if uv_val is None:
        return "N/A"
    if uv_val < 3:
        return "Low"
    elif uv_val < 6:
        return "Moderate"
    elif uv_val < 8:
        return "High"
    elif uv_val < 11:
        return "Very High"
    else:
        return "Extreme"

def fetch_weather_by_coords(lat, lon, city_name, country_name, admin1=None, country_code=None):
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,is_day",
        "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,sunrise,sunset,uv_index_max",
        "hourly": "temperature_2m,precipitation_probability,weather_code,is_day",
        "timezone": "auto"
    }

    resp = requests.get(WEATHER_API_URL, params=params, timeout=12)
    resp.raise_for_status()
    data = resp.json()

    current_raw = data.get("current", {})
    daily_raw = data.get("daily", {})
    hourly_raw = data.get("hourly", {})
    timezone_name = data.get("timezone", "UTC")

    # Current weather details
    w_code = current_raw.get("weather_code", 0)
    is_day = current_raw.get("is_day", 1)
    condition, icon = get_weather_info(w_code, is_day)

    # Local date & time parsing
    curr_time_str = current_raw.get("time")
    formatted_date = ""
    formatted_time = ""
    if curr_time_str:
        try:
            dt = datetime.fromisoformat(curr_time_str)
            formatted_date = dt.strftime("%A, %B %d, %Y")
            formatted_time = dt.strftime("%I:%M %p")
        except Exception:
            formatted_date = curr_time_str
            formatted_time = ""

    # Precipitation probability from current hour or daily
    curr_rain_prob = 0
    if hourly_raw.get("time") and curr_time_str:
        try:
            # Match hour prefix (YYYY-MM-DDTHH)
            prefix = curr_time_str[:13]
            for i, h_time in enumerate(hourly_raw["time"]):
                if h_time.startswith(prefix):
                    curr_rain_prob = hourly_raw["precipitation_probability"][i]
                    break
        except Exception:
            curr_rain_prob = 0

    if curr_rain_prob is None or curr_rain_prob == 0:
        if daily_raw.get("precipitation_probability_max"):
            curr_rain_prob = daily_raw["precipitation_probability_max"][0] or 0

    # Today's UV and Sun info
    uv_max = None
    sunrise_time = "N/A"
    sunset_time = "N/A"
    if daily_raw.get("uv_index_max") and len(daily_raw["uv_index_max"]) > 0:
        uv_max = daily_raw["uv_index_max"][0]
    if daily_raw.get("sunrise") and len(daily_raw["sunrise"]) > 0:
        try:
            sunrise_time = datetime.fromisoformat(daily_raw["sunrise"][0]).strftime("%I:%M %p")
        except Exception:
            sunrise_time = daily_raw["sunrise"][0].split("T")[-1]
    if daily_raw.get("sunset") and len(daily_raw["sunset"]) > 0:
        try:
            sunset_time = datetime.fromisoformat(daily_raw["sunset"][0]).strftime("%I:%M %p")
        except Exception:
            sunset_time = daily_raw["sunset"][0].split("T")[-1]

    current_weather = {
        "temperature": round(current_raw.get("temperature_2m", 0), 1),
        "feels_like": round(current_raw.get("apparent_temperature", 0), 1),
        "humidity": current_raw.get("relative_humidity_2m", 0),
        "wind_speed": round(current_raw.get("wind_speed_10m", 0), 1),
        "wind_direction": get_wind_direction(current_raw.get("wind_direction_10m")),
        "precipitation": round(current_raw.get("precipitation", 0), 1),
        "rain_probability": curr_rain_prob,
        "pressure": round(current_raw.get("surface_pressure", 0), 1),
        "weather_code": w_code,
        "condition": condition,
        "icon": icon,
        "is_day": is_day,
        "date": formatted_date,
        "time": formatted_time,
        "raw_time": curr_time_str,
        "uv_index": uv_max,
        "uv_category": get_uv_category(uv_max),
        "sunrise": sunrise_time,
        "sunset": sunset_time
    }

    # 7-Day Forecast parsing
    daily_forecast = []
    daily_times = daily_raw.get("time", [])
    for i in range(len(daily_times)):
        d_time_str = daily_times[i]
        d_code = daily_raw["weather_code"][i]
        d_condition, d_icon = get_weather_info(d_code, is_day=1)

        try:
            d_dt = datetime.fromisoformat(d_time_str)
            if i == 0:
                day_name = "Today"
            elif i == 1:
                day_name = "Tomorrow"
            else:
                day_name = d_dt.strftime("%a")
            date_label = d_dt.strftime("%b %d")
        except Exception:
            day_name = f"Day {i+1}"
            date_label = d_time_str

        daily_forecast.append({
            "date": d_time_str,
            "day_name": day_name,
            "date_label": date_label,
            "weather_code": d_code,
            "condition": d_condition,
            "icon": d_icon,
            "temp_max": round(daily_raw["temperature_2m_max"][i], 1),
            "temp_min": round(daily_raw["temperature_2m_min"][i], 1),
            "rain_probability": daily_raw["precipitation_probability_max"][i] or 0,
            "precipitation_sum": round(daily_raw["precipitation_sum"][i] or 0, 1)
        })

    # Hourly Forecast parsing (next 24 hours from current)
    hourly_forecast = []
    if hourly_raw.get("time"):
        h_times = hourly_raw["time"]
        start_idx = 0
        if curr_time_str:
            prefix = curr_time_str[:13]
            for idx, ht in enumerate(h_times):
                if ht.startswith(prefix):
                    start_idx = idx
                    break

        for i in range(start_idx, min(start_idx + 24, len(h_times))):
            h_time_str = h_times[i]
            h_code = hourly_raw["weather_code"][i]
            h_is_day = hourly_raw["is_day"][i]
            h_cond, h_icon = get_weather_info(h_code, h_is_day)

            try:
                h_dt = datetime.fromisoformat(h_time_str)
                time_label = "Now" if i == start_idx else h_dt.strftime("%I %p").lstrip("0")
            except Exception:
                time_label = h_time_str.split("T")[-1]

            hourly_forecast.append({
                "time": time_label,
                "temperature": round(hourly_raw["temperature_2m"][i], 1),
                "weather_code": h_code,
                "condition": h_cond,
                "icon": h_icon,
                "is_day": h_is_day,
                "rain_probability": hourly_raw["precipitation_probability"][i] or 0
            })

    return {
        "location": {
            "city": city_name,
            "country": country_name,
            "admin1": admin1 or "",
            "country_code": country_code or "",
            "latitude": lat,
            "longitude": lon,
            "timezone": timezone_name
        },
        "current": current_weather,
        "daily": daily_forecast,
        "hourly": hourly_forecast
    }

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/weather")
def get_weather():
    city = request.args.get("city", "").strip()
    if not city:
        return jsonify({"error": "Please enter a city name."}), 400

    try:
        geo_params = {"name": city, "count": 1, "language": "en", "format": "json"}
        geo_resp = requests.get(GEOCODING_API_URL, params=geo_params, timeout=10)
        geo_resp.raise_for_status()
        geo_data = geo_resp.json()

        results = geo_data.get("results")
        if not results:
            return jsonify({"error": f"City '{city}' not found. Please check spelling."}), 404

        best_match = results[0]
        lat = best_match["latitude"]
        lon = best_match["longitude"]
        city_name = best_match.get("name", city)
        country_name = best_match.get("country", "")
        admin1 = best_match.get("admin1", "")
        country_code = best_match.get("country_code", "")

        data = fetch_weather_by_coords(lat, lon, city_name, country_name, admin1, country_code)
        return jsonify(data)
    except requests.Timeout:
        return jsonify({"error": "Weather service connection timed out. Please try again."}), 504
    except requests.RequestException as e:
        return jsonify({"error": f"Failed to retrieve weather data: {str(e)}"}), 502
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

@app.route("/api/weather/coords")
def get_weather_by_coords():
    lat = request.args.get("lat", type=float)
    lon = request.args.get("lon", type=float)
    city_name = request.args.get("city", "Current Location")
    country_name = request.args.get("country", "")

    if lat is None or lon is None:
        return jsonify({"error": "Valid latitude and longitude coordinates are required."}), 400

    try:
        # Attempt reverse geocode via Nominatim if city name not provided
        if city_name == "Current Location":
            try:
                headers = {"User-Agent": "WeatherNowApp/1.0 (contact@weathernow.local)"}
                rev_resp = requests.get(
                    "https://nominatim.openstreetmap.org/reverse",
                    params={"lat": lat, "lon": lon, "format": "json"},
                    headers=headers,
                    timeout=4
                )
                if rev_resp.status_code == 200:
                    addr = rev_resp.json().get("address", {})
                    city_name = addr.get("city") or addr.get("town") or addr.get("village") or addr.get("county") or "Your Location"
                    country_name = addr.get("country", "")
            except Exception:
                pass

        data = fetch_weather_by_coords(lat, lon, city_name, country_name)
        return jsonify(data)
    except requests.Timeout:
        return jsonify({"error": "Weather service connection timed out. Please try again."}), 504
    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@app.route("/api/suggestions")
def get_suggestions():
    query = request.args.get("q", "").strip()
    if len(query) < 2:
        return jsonify([])

    try:
        params = {"name": query, "count": 6, "language": "en", "format": "json"}
        resp = requests.get(GEOCODING_API_URL, params=params, timeout=6)
        if resp.status_code == 200:
            results = resp.json().get("results", [])
            suggestions = []
            for r in results:
                suggestions.append({
                    "name": r.get("name"),
                    "admin1": r.get("admin1", ""),
                    "country": r.get("country", ""),
                    "country_code": r.get("country_code", ""),
                    "latitude": r.get("latitude"),
                    "longitude": r.get("longitude")
                })
            return jsonify(suggestions)
        return jsonify([])
    except Exception:
        return jsonify([])

if __name__ == "__main__":
    # Run locally on port 5000
    app.run(debug=True, host="127.0.0.1", port=5000)
