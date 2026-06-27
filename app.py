from flask import Flask, render_template, request, jsonify
import requests

app = Flask(__name__)


# Helper function to translate WMO weather codes into readable text
def get_condition(code):
    weather_codes = {
        0: "Clear sky",
        1: "Mainly clear",
        2: "Partly cloudy",
        3: "Overcast",
        45: "Fog",
        48: "Depositing rime fog",
        51: "Light drizzle",
        53: "Moderate drizzle",
        55: "Dense drizzle",
        61: "Light rain",
        63: "Moderate rain",
        65: "Heavy rain",
        71: "Light snow",
        73: "Moderate snow",
        75: "Heavy snow",
        80: "Rain showers",
        81: "Moderate rain showers",
        82: "Violent rain showers",
        95: "Thunderstorm",
        96: "Thunderstorm with hail",
        99: "Heavy thunderstorm with hail",
    }
    return weather_codes.get(code, "Unknown")


# Helper function to convert raw AQI (0-500) to the 1-6 scale your JS expects
def convert_aqi(raw_aqi):
    if raw_aqi <= 50:
        return 1
    if raw_aqi <= 100:
        return 2
    if raw_aqi <= 150:
        return 3
    if raw_aqi <= 200:
        return 4
    if raw_aqi <= 300:
        return 5
    return 6


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/weather")
def get_weather():
    city = request.args.get("city")
    if not city:
        return jsonify({"error": "City is required"}), 400

    try:
        # 1. Geocoding: Get exact Latitude and Longitude for the city
        geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={city}&count=1&format=json"
        geo_res = requests.get(geo_url).json()

        if "results" not in geo_res:
            return jsonify({"error": "City not found on the map."}), 404

        location = geo_res["results"][0]
        lat, lon = location["latitude"], location["longitude"]
        loc_name = f"{location['name']}, {location.get('country', '')}"

        # 2. Fetch highly accurate model-based weather data
        weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,surface_pressure,wind_speed_10m,weather_code"
        weather_res = requests.get(weather_url).json()
        current = weather_res["current"]

        # 3. Fetch Air Quality Data
        aqi_url = f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lon}&current=us_aqi"
        aqi_res = requests.get(aqi_url).json()
        raw_aqi = aqi_res["current"].get("us_aqi", 0)

        # 4. Package it exactly how your JS script.js expects it
        weather_data = {
            "location": loc_name,
            "temp": round(current["temperature_2m"]),
            "feels_like": round(current["apparent_temperature"]),
            "condition": get_condition(current["weather_code"]),
            "desc": get_condition(current["weather_code"]),
            "humidity": current["relative_humidity_2m"],
            "pressure": round(current["surface_pressure"]),
            "wind": round(current["wind_speed_10m"]),
            "aqi": convert_aqi(raw_aqi),
        }

        return jsonify(weather_data)

    except Exception as e:
        return (
            jsonify(
                {"error": "Server error while contacting the meteorological models."}
            ),
            500,
        )


if __name__ == "__main__":
    app.run(debug=True)
