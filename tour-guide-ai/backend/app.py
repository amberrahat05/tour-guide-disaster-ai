from flask import Flask, request, jsonify
from flask_cors import CORS

import joblib
import numpy as np
import requests


# ==========================================
# CREATE FLASK APPLICATION
# ==========================================

app = Flask(__name__)

CORS(app)


# ==========================================
# LOAD ANN MODEL
# ==========================================

model = joblib.load("model/risk_model.pkl")

scaler = joblib.load("model/scaler.pkl")


# ==========================================
# RISK LABELS
# ==========================================

risk_labels = {
    0: "Low",
    1: "Medium",
    2: "High"
}


# ==========================================
# HOME
# ==========================================

@app.route("/", methods=["GET"])
def home():

    return jsonify({
        "success": True,
        "message": "Tour Guide Disaster Risk API is running!"
    })


# ==========================================
# ANN RISK PREDICTION
# ==========================================

@app.route("/predict-risk", methods=["POST"])
def predict_risk():

    try:

        data = request.get_json()

        temperature = float(data["temperature"])
        humidity = float(data["humidity"])
        rainfall = float(data["rainfall"])
        wind_speed = float(data["wind_speed"])
        snowfall = float(data["snowfall"])
        visibility = float(data["visibility"])


        features = np.array([[
            temperature,
            humidity,
            rainfall,
            wind_speed,
            snowfall,
            visibility
        ]])


        features_scaled = scaler.transform(features)


        prediction = model.predict(features_scaled)[0]


        probabilities = model.predict_proba(
            features_scaled
        )[0]


        return jsonify({

            "success": True,

            "risk_level": risk_labels[int(prediction)],

            "risk_code": int(prediction),

            "probabilities": {

                "low": float(probabilities[0]),

                "medium": float(probabilities[1]),

                "high": float(probabilities[2])

            }

        })


    except Exception as e:

        return jsonify({

            "success": False,
            "error": str(e)

        }), 400


# ==========================================
# GEOCODING FUNCTION
# ==========================================

def get_coordinates(place):

    url = "https://nominatim.openstreetmap.org/search"

    params = {
        "q": place + ", India",
        "format": "json",
        "limit": 1
    }

    headers = {
        "User-Agent": "SafarAI-TourGuide/1.0"
    }

    response = requests.get(
        url,
        params=params,
        headers=headers,
        timeout=15
    )

    response.raise_for_status()

    data = response.json()


    if not data:

        return None


    return {
        "lat": float(data[0]["lat"]),
        "lon": float(data[0]["lon"])
    }


# ==========================================
# GET REAL ROUTES
# ==========================================

@app.route("/get-routes", methods=["POST"])
def get_routes():

    try:

        data = request.get_json()

        from_place = data.get("from")
        to_place = data.get("to")


        if not from_place or not to_place:

            return jsonify({

                "success": False,
                "error": "From and To locations are required."

            }), 400


        # ----------------------------------
        # FIND COORDINATES
        # ----------------------------------

        start = get_coordinates(from_place)

        destination = get_coordinates(to_place)


        if start is None:

            return jsonify({

                "success": False,
                "error": f"Could not find location: {from_place}"

            }), 404


        if destination is None:

            return jsonify({

                "success": False,
                "error": f"Could not find location: {to_place}"

            }), 404


        # ----------------------------------
        # OSRM ROUTING
        # ----------------------------------

        route_url = (
            "https://router.project-osrm.org/route/v1/driving/"
            f"{start['lon']},{start['lat']};"
            f"{destination['lon']},{destination['lat']}"
        )


        params = {
            "overview": "full",
            "geometries": "geojson",
            "alternatives": "true",
            "steps": "false"
        }


        route_response = requests.get(
            route_url,
            params=params,
            timeout=30
        )

        route_response.raise_for_status()

        route_data = route_response.json()


        if route_data.get("code") != "Ok":

            return jsonify({

                "success": False,
                "error": "Could not calculate route."

            }), 400


        routes = []


        # ----------------------------------
        # PROCESS ROUTES
        # ----------------------------------

        for index, route in enumerate(
            route_data.get("routes", [])
        ):

            distance_km = route["distance"] / 1000

            duration_hours = route["duration"] / 3600


            # Estimated road travel cost
            # This is only a basic estimate for now.
            estimated_cost = distance_km * 8


            geometry = route["geometry"]["coordinates"]


            coordinates = [
                [lat, lon]
                for lon, lat in geometry
            ]


            routes.append({

                "id": index + 1,

                "distance": round(
                    distance_km, 1
                ),

                "duration": round(
                    duration_hours, 1
                ),

                "cost": round(
                    estimated_cost
                ),

                "coordinates": coordinates

            })


        if not routes:

            return jsonify({

                "success": False,
                "error": "No routes found."

            }), 404


        # ==================================
        # SORT ROUTES
        # ==================================

        shortest = min(
            routes,
            key=lambda x: x["distance"]
        )


        cheapest = min(
            routes,
            key=lambda x: x["cost"]
        )


        # Since OSRM does not provide a true
        # "longest possible route", use the
        # longest alternative returned.

        longest = max(
            routes,
            key=lambda x: x["distance"]
        )


        # For now safest = shortest available
        # route. Later ANN weather risk will
        # determine this properly.

        safest = shortest


        # ==================================
        # RETURN RESPONSE
        # ==================================

        return jsonify({

            "success": True,

            "from": {
                "name": from_place,
                "latitude": start["lat"],
                "longitude": start["lon"]
            },

            "to": {
                "name": to_place,
                "latitude": destination["lat"],
                "longitude": destination["lon"]
            },

            "routes": {

                "shortest": shortest,

                "cheapest": cheapest,

                "safest": safest,

                "longest": longest

            }

        })


    except requests.exceptions.RequestException as e:

        return jsonify({

            "success": False,
            "error": "Routing service could not be reached.",
            "details": str(e)

        }), 503


    except Exception as e:

        return jsonify({

            "success": False,
            "error": str(e)

        }), 500


# ==========================================
# START SERVER
# ==========================================

if __name__ == "__main__":

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )