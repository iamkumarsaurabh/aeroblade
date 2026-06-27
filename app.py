from flask import Flask, render_template, request, jsonify
import requests

app = Flask(__name__)

# PASTE YOUR WEATHERAPI KEY HERE
API_KEY = "db44f9d150a209f3d8be517633f4c8e2"


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/weather")
def get_weather():
    city = request.args.get("city")
    if not city:
        return jsonify({"error": "City is required"}), 400

    url = f"http://api.weatherapi.com/v1/current.json?key={API_KEY}&q={city}&aqi=yes"

    try:
        res = requests.get(url, timeout=10)
        data = res.json()

        if "error" in data:
            # Safely catch and display WeatherAPI's specific error messages
            return (
                jsonify({"error": f"WeatherAPI Error: {data['error']['message']}"}),
                400,
            )

        current = data["current"]
        location = data["location"]

        # Extract the US-EPA index (1-6 scale)
        epa_index = current["air_quality"].get("us-epa-index", 1)

        weather_data = {
            "location": f"{location['name']}, {location['country']}",
            "temp": round(current["temp_c"]),
            "feels_like": round(current["feelslike_c"]),
            "condition": current["condition"]["text"],
            "desc": current["condition"]["text"],
            "humidity": current["humidity"],
            "pressure": current["pressure_mb"],
            "wind": round(current["wind_kph"]),
            "aqi_index": epa_index,
            "aqi_raw": epa_index,  # Passing the index as the raw number for the UI text
        }

        return jsonify(weather_data)

    except requests.exceptions.Timeout:
        return (
            jsonify(
                {"error": "API Connection Timeout. Server took too long to respond."}
            ),
            504,
        )

    except Exception as e:
        return jsonify({"error": f"Internal Error: {str(e)}"}), 500


if __name__ == "__main__":
    app.run(debug=True)
