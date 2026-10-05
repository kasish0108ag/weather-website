/**
 * WeatherNow - Frontend Application Logic
 * Handles Open-Meteo data rendering, °C/°F conversion,
 * debounced suggestions, geolocation, and dynamic themes.
 */

(() => {
    // --- Application State ---
    let currentData = null;
    let currentUnit = localStorage.getItem('weathernow_unit') || 'C';
    let debounceTimer = null;

    // --- DOM Elements ---
    const searchForm = document.getElementById('searchForm');
    const cityInput = document.getElementById('cityInput');
    const clearInputBtn = document.getElementById('clearInputBtn');
    const searchSubmitBtn = document.getElementById('searchSubmitBtn');
    const suggestionsDropdown = document.getElementById('suggestionsDropdown');
    const quickChips = document.getElementById('quickChips');
    const geoBtn = document.getElementById('geoBtn');
    const unitC = document.getElementById('unitC');
    const unitF = document.getElementById('unitF');

    const alertBanner = document.getElementById('alertBanner');
    const alertMessage = document.getElementById('alertMessage');
    const alertCloseBtn = document.getElementById('alertCloseBtn');
    const loadingState = document.getElementById('loadingState');
    const dashboardContent = document.getElementById('dashboardContent');

    // Current weather elements
    const cityName = document.getElementById('cityName');
    const countryName = document.getElementById('countryName');
    const dateTimeDisplay = document.getElementById('dateTimeDisplay');
    const currentWeatherIcon = document.getElementById('currentWeatherIcon');
    const currentTemp = document.getElementById('currentTemp');
    const tempUnitDisplay = document.getElementById('tempUnitDisplay');
    const weatherCondition = document.getElementById('weatherCondition');
    const feelsLikeTemp = document.getElementById('feelsLikeTemp');
    const feelsLikeUnit = document.getElementById('feelsLikeUnit');
    let activeSuggestionIndex = -1;

    // Metric elements
    const metricHumidity = document.getElementById('metricHumidity');
    const metricWindSpeed = document.getElementById('metricWindSpeed');
    const windUnitLabel = document.getElementById('windUnitLabel');
    const metricWindDir = document.getElementById('metricWindDir');
    const metricPrecipitation = document.getElementById('metricPrecipitation');
    const metricRainProb = document.getElementById('metricRainProb');
    const metricUVIndex = document.getElementById('metricUVIndex');
    const metricUVCategory = document.getElementById('metricUVCategory');
    const metricPressure = document.getElementById('metricPressure');
    const metricSunrise = document.getElementById('metricSunrise');
    const metricSunset = document.getElementById('metricSunset');

    // Forecast containers
    const hourlyScrollStrip = document.getElementById('hourlyScrollStrip');
    const dailyCardsGrid = document.getElementById('dailyCardsGrid');

    // --- Unit Conversion Utilities ---
    const cToF = (c) => Math.round((c * 9 / 5 + 32) * 10) / 10;
    const kmhToMph = (kmh) => Math.round((kmh * 0.621371) * 10) / 10;

    function formatTemperature(celsiusVal) {
        if (celsiusVal === null || celsiusVal === undefined) return '--';
        if (currentUnit === 'F') {
            return Math.round(cToF(celsiusVal));
        }
        return Math.round(celsiusVal);
    }

    function formatWind(kmhVal) {
        if (kmhVal === null || kmhVal === undefined) return { speed: '--', unit: 'km/h' };
        if (currentUnit === 'F') {
            return { speed: kmhToMph(kmhVal), unit: 'mph' };
        }
        return { speed: kmhVal, unit: 'km/h' };
    }

    // --- Dynamic Theme Setter ---
    function updateTheme(weatherCode, isDay) {
        document.body.className = ''; // Reset existing theme classes

        // Snow codes
        if ([71, 73, 75, 77, 85, 86, 56, 57, 66, 67].includes(weatherCode)) {
            document.body.classList.add('theme-snow');
            return;
        }
        // Thunderstorm codes
        if ([95, 96, 99].includes(weatherCode)) {
            document.body.classList.add('theme-thunderstorm');
            return;
        }
        // Rain & Drizzle codes
        if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(weatherCode)) {
            document.body.classList.add('theme-rain');
            return;
        }
        // Fog & Clouds
        if ([1, 2, 3, 45, 48].includes(weatherCode)) {
            document.body.classList.add('theme-clouds');
            return;
        }
        // Clear Sky
        if (weatherCode === 0) {
            document.body.classList.add(isDay ? 'theme-clear-day' : 'theme-clear-night');
            return;
        }

        document.body.classList.add('theme-default');
    }

    // --- Weather Data Fetching ---
    async function fetchWeather(city) {
        if (!city || !city.trim()) return;

        showLoading(true);
        hideAlert();
        closeSuggestions();

        try {
            const res = await fetch(`/api/weather?city=${encodeURIComponent(city.trim())}`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to fetch weather data.');
            }

            currentData = data;
            localStorage.setItem('weathernow_last_city', city.trim());
            renderWeather();
        } catch (err) {
            showAlert(err.message || 'Unable to load weather. Please try again.');
        } finally {
            showLoading(false);
        }
    }

    async function fetchWeatherByCoords(lat, lon) {
        showLoading(true);
        hideAlert();
        closeSuggestions();

        try {
            const res = await fetch(`/api/weather/coords?lat=${lat}&lon=${lon}`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to fetch weather for coordinates.');
            }

            currentData = data;
            if (data.location && data.location.city) {
                localStorage.setItem('weathernow_last_city', data.location.city);
            }
            renderWeather();
        } catch (err) {
            showAlert(err.message || 'Unable to load weather for your location.');
        } finally {
            showLoading(false);
        }
    }

    // --- Render Weather on UI ---
    function renderWeather() {
        if (!currentData) return;

        const { location, current, daily, hourly } = currentData;

        // Apply theme
        updateTheme(current.weather_code, current.is_day);

        // Location & Header
        cityName.textContent = location.city;
        const regionParts = [location.admin1, location.country].filter(Boolean);
        countryName.textContent = regionParts.join(', ') || location.country || '';
        
        dateTimeDisplay.textContent = current.date ? 
            `${current.date} • ${current.time}` : 'Live Conditions';

        // Hero Weather Info
        currentWeatherIcon.innerHTML = `<use href="#weather-${current.icon}"/>`;
        currentTemp.textContent = formatTemperature(current.temperature);
        tempUnitDisplay.textContent = `°${currentUnit}`;
        weatherCondition.textContent = current.condition;
        feelsLikeTemp.textContent = formatTemperature(current.feels_like);
        if (feelsLikeUnit) feelsLikeUnit.textContent = `°${currentUnit}`;

        // Metric Values
        metricHumidity.textContent = `${current.humidity}%`;
        
        const windInfo = formatWind(current.wind_speed);
        metricWindSpeed.textContent = windInfo.speed;
        windUnitLabel.textContent = windInfo.unit;
        metricWindDir.textContent = current.wind_direction;

        metricPrecipitation.textContent = `${current.precipitation} mm`;
        metricRainProb.textContent = `${current.rain_probability}%`;

        metricUVIndex.textContent = current.uv_index !== null ? current.uv_index : '--';
        metricUVCategory.textContent = current.uv_category || 'N/A';
        metricPressure.textContent = `${current.pressure} hPa`;

        metricSunrise.textContent = current.sunrise || '--';
        metricSunset.textContent = current.sunset || '--';

        // Render Hourly Strip
        renderHourly(hourly);

        // Render 7-Day Forecast
        renderDaily(daily);

        // Make Dashboard Visible
        dashboardContent.style.display = 'flex';
    }

    // --- Render Hourly Forecast ---
    function renderHourly(hourlyList) {
        hourlyScrollStrip.innerHTML = '';
        if (!hourlyList || !hourlyList.length) return;

        hourlyList.forEach((hour, idx) => {
            const card = document.createElement('div');
            card.className = `hourly-card ${idx === 0 ? 'active-now' : ''}`;
            
            card.innerHTML = `
                <span class="hourly-time">${hour.time}</span>
                <div class="hourly-icon-wrap">
                    <svg style="width:100%;height:100%;"><use href="#weather-${hour.icon}"/></svg>
                </div>
                <span class="hourly-temp">${formatTemperature(hour.temperature)}°</span>
                <span class="hourly-rain" title="Precipitation Probability">
                    <svg style="width:10px;height:10px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
                    ${hour.rain_probability}%
                </span>
            `;
            hourlyScrollStrip.appendChild(card);
        });
    }

    // --- Render 7-Day Forecast ---
    function renderDaily(dailyList) {
        dailyCardsGrid.innerHTML = '';
        if (!dailyList || !dailyList.length) return;

        dailyList.forEach((day, idx) => {
            const card = document.createElement('div');
            card.className = `daily-card ${idx === 0 ? 'today-card' : ''}`;

            card.innerHTML = `
                <div>
                    <h4 class="daily-day">${day.day_name}</h4>
                    <p class="daily-date">${day.date_label}</p>
                </div>
                <div class="daily-icon-wrap">
                    <svg style="width:100%;height:100%;"><use href="#weather-${day.icon}"/></svg>
                </div>
                <span class="daily-condition">${day.condition}</span>
                <div class="daily-temp-range">
                    <span class="daily-max-temp">${formatTemperature(day.temp_max)}°</span>
                    <span class="daily-min-temp">${formatTemperature(day.temp_min)}°</span>
                </div>
                <div class="daily-rain-badge" title="Rain probability and precipitation">
                    <svg class="rain-icon-mini" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
                    <span>${day.rain_probability}%</span>
                </div>
            `;
            dailyCardsGrid.appendChild(card);
        });
    }

    // --- Unit Switcher Handler ---
    function setUnit(unit) {
        if (unit === currentUnit) return;
        currentUnit = unit;
        localStorage.setItem('weathernow_unit', unit);

        if (unit === 'C') {
            unitC.classList.add('active');
            unitF.classList.remove('active');
        } else {
            unitF.classList.add('active');
            unitC.classList.remove('active');
        }

        // Re-render UI with converted temperatures without network fetch
        if (currentData) {
            renderWeather();
        }
    }

    // --- Autocomplete Suggestions ---
    async function fetchSuggestions(query) {
        if (!query || query.length < 2) {
            closeSuggestions();
            return;
        }

        try {
            const res = await fetch(`/api/suggestions?q=${encodeURIComponent(query)}`);
            if (!res.ok) return;
            const items = await res.json();
            renderSuggestions(items);
        } catch (e) {
            closeSuggestions();
        }
    }

    function renderSuggestions(items) {
        suggestionsDropdown.innerHTML = '';
        activeSuggestionIndex = -1;
        if (!items || !items.length) {
            closeSuggestions();
            return;
        }

        items.forEach((item, idx) => {
            const li = document.createElement('li');
            li.className = 'suggestion-item';
            li.dataset.index = idx;
            
            const region = [item.admin1, item.country].filter(Boolean).join(', ');
            li.innerHTML = `
                <span class="suggestion-city">${item.name}</span>
                <span class="suggestion-region">${region}</span>
            `;

            li.addEventListener('click', () => {
                cityInput.value = item.name;
                closeSuggestions();
                fetchWeather(item.name);
            });

            suggestionsDropdown.appendChild(li);
        });

        suggestionsDropdown.style.display = 'block';
    }

    function closeSuggestions() {
        suggestionsDropdown.innerHTML = '';
        suggestionsDropdown.style.display = 'none';
        activeSuggestionIndex = -1;
    }

    // --- Alert and Loading Helpers ---
    function showAlert(msg) {
        alertMessage.textContent = msg;
        alertBanner.style.display = 'flex';
    }

    function hideAlert() {
        alertBanner.style.display = 'none';
    }

    function showLoading(isLoading) {
        if (isLoading) {
            loadingState.style.display = 'flex';
            dashboardContent.style.display = 'none';
        } else {
            loadingState.style.display = 'none';
        }
    }

    // --- Event Listeners ---

    // Search submit
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const city = cityInput.value.trim();
        if (city) {
            fetchWeather(city);
        }
    });

    // Input typing & debounce for suggestions
    cityInput.addEventListener('input', (e) => {
        const val = e.target.value;
        clearInputBtn.style.display = val.length > 0 ? 'flex' : 'none';

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            fetchSuggestions(val.trim());
        }, 280);
    });

    // Keyboard navigation for suggestions
    cityInput.addEventListener('keydown', (e) => {
        const items = suggestionsDropdown.querySelectorAll('.suggestion-item');
        if (!items.length || suggestionsDropdown.style.display === 'none') {
            if (e.key === 'Escape') closeSuggestions();
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeSuggestionIndex = (activeSuggestionIndex + 1) % items.length;
            highlightSuggestion(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeSuggestionIndex = (activeSuggestionIndex - 1 + items.length) % items.length;
            highlightSuggestion(items);
        } else if (e.key === 'Enter' && activeSuggestionIndex >= 0) {
            e.preventDefault();
            items[activeSuggestionIndex].click();
        } else if (e.key === 'Escape') {
            closeSuggestions();
        }
    });

    function highlightSuggestion(items) {
        items.forEach((item, idx) => {
            if (idx === activeSuggestionIndex) {
                item.classList.add('active');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('active');
            }
        });
    }

    // Clear input button
    clearInputBtn.addEventListener('click', () => {
        cityInput.value = '';
        clearInputBtn.style.display = 'none';
        closeSuggestions();
        cityInput.focus();
    });

    // Close suggestions on outside click
    document.addEventListener('click', (e) => {
        if (!searchForm.contains(e.target)) {
            closeSuggestions();
        }
    });

    // Popular quick city chips
    if (quickChips) {
        quickChips.addEventListener('click', (e) => {
            const chip = e.target.closest('.chip-btn');
            if (chip && chip.dataset.city) {
                cityInput.value = chip.dataset.city;
                clearInputBtn.style.display = 'flex';
                fetchWeather(chip.dataset.city);
            }
        });
    }

    // Geolocation button
    geoBtn.addEventListener('click', () => {
        if (!navigator.geolocation) {
            showAlert('Geolocation is not supported by your browser.');
            return;
        }

        showLoading(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                fetchWeatherByCoords(position.coords.latitude, position.coords.longitude);
            },
            (error) => {
                showLoading(false);
                let msg = 'Unable to retrieve location.';
                if (error.code === error.PERMISSION_DENIED) {
                    msg = 'Location access denied. Please search for a city manually.';
                }
                showAlert(msg);
            },
            { timeout: 10000, maximumAge: 60000 }
        );
    });

    // Unit toggle buttons
    unitC.addEventListener('click', () => setUnit('C'));
    unitF.addEventListener('click', () => setUnit('F'));

    // Alert close
    alertCloseBtn.addEventListener('click', hideAlert);

    // --- Initialization ---
    // Setup unit from state
    if (currentUnit === 'F') {
        unitF.classList.add('active');
        unitC.classList.remove('active');
    } else {
        unitC.classList.add('active');
        unitF.classList.remove('active');
    }

    // Initial weather load: either last searched city or default "London"
    const initialCity = localStorage.getItem('weathernow_last_city') || 'London';
    cityInput.value = initialCity;
    clearInputBtn.style.display = 'flex';
    fetchWeather(initialCity);
})();
