document.getElementById('search-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const city = document.getElementById('city-input').value.trim();
    if (!city) return;

    const dashboard = document.getElementById('dashboard');
    const loading = document.getElementById('loading');

    // Reset layout state
    dashboard.classList.add('hidden');
    dashboard.classList.remove('fade-in');
    loading.classList.remove('hidden');

    try {
        // Run API request to our proxy Flask endpoint
        const response = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Failed to fetch data");
        }

        // Map data directly to corresponding template fields
        document.getElementById('loc-name').innerText = data.location;
        document.getElementById('loc-desc').innerText = data.desc;
        document.getElementById('temp-val').innerText = data.temp;
        document.getElementById('feels-val').innerText = data.feels_like;
        document.getElementById('hum-val').innerText = data.humidity;
        document.getElementById('wind-val').innerText = data.wind;
        document.getElementById('press-val').innerText = data.pressure;

        // Process color index logic for AQI parameter (US EPA standard metric)
        const aqiElement = document.getElementById('aqi-val');
        const aqiScore = data.aqi;

        if (aqiScore === 1 || aqiScore === 2) {
            aqiElement.innerText = "Good";
            aqiElement.style.color = "#10b981"; // Emerald Green
        } else if (aqiScore === 3) {
            aqiElement.innerText = "Moderate";
            aqiElement.style.color = "#facc15"; // Yellow
        } else {
            aqiElement.innerText = "Poor";
            aqiElement.style.color = "#ef4444"; // Red
        }

        // Complete transition state
        loading.classList.add('hidden');
        dashboard.classList.remove('hidden');
        dashboard.classList.add('fade-in');

    } catch (error) {
        loading.classList.add('hidden');
        alert(error.message);
    }
});