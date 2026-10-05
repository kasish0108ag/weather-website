# WeatherNow - Real-Time Weather & Forecast Website

A professional weather dashboard web application with a Flask Python backend and a modern, responsive HTML5/CSS3/JavaScript frontend powered by the Open-Meteo API.

---

## Project Structure

```
weather website/
│
├── app.py                     # Python Flask backend server & API endpoints
├── requirements.txt           # Python dependencies (Flask, requests)
├── README.md                  # Instructions and project documentation
│
├── templates/
│   └── index.html             # HTML5 semantic weather dashboard layout
│
└── static/
    ├── style.css              # Modern glassmorphism UI & responsive styles
    └── script.js              # Real-time search, autocomplete, °C/°F toggle & themes
```

---

## Features

- **Website Header**: "WeatherNow" logo, instant °C/°F toggle, and "My Location" GPS button.
- **City Search**: Clean search box, Enter key submission, clear button, and live debounced autocomplete suggestions with keyboard arrow navigation (`↑`, `↓`, `Enter`, `Esc`).
- **Quick-Chips**: Instant one-click lookups for London, New York, Tokyo, Paris, Sydney, and Dubai.
- **Current Weather Dashboard**:
  - City name, country, and local date/time in the city's timezone.
  - Crisp vector SVG weather icons mapped to WMO weather codes.
  - Temperature display with feels-like apparent temperature.
  - **8 Weather Metric Cards**: Humidity, Wind Speed (km/h or mph) & Direction, Rain Probability, Precipitation (mm), UV Index with category rating, Atmospheric Pressure, Sunrise & Sunset times.
- **24-Hour Hourly Trend**: Smooth horizontal scrolling strip with hourly icons, temps, and rain chance.
- **7-Day Forecast Grid**: Daily weather outlook cards with maximum and minimum temperatures and rain probability.
- **Dynamic Background Themes**: Automatically changes subtle backdrop gradients to match the current condition (Clear Day/Night, Overcast, Rain, Snow, Thunderstorm).

---

## How to Run

### 1. Open Terminal / Command Prompt
Open PowerShell or Command Prompt in this folder:
```powershell
cd "C:\Users\LENOVO\OneDrive\Desktop\python projects\weather website"
```

### 2. Install Dependencies (if not already installed)
```powershell
py -m pip install -r requirements.txt
```

### 3. Start the Website Server
```powershell
py app.py
```

### 4. View in Browser
Open your favorite web browser and go to:
[http://127.0.0.1:5000](http://127.0.0.1:5000)
