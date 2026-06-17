from flask import Flask, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv
import os

# Cargar variables del .env
load_dotenv()

# Verificar que la URI se esté leyendo
print("MONGO_URI =", os.getenv("MONGO_URI"))

app = Flask(__name__)
CORS(app)

# Conexión MongoDB Atlas
client = MongoClient(os.getenv("MONGO_URI"))

db = client["observatorios_elqui"]

@app.route("/")
def home():
    return jsonify({
        "status": "ok",
        "message": "Backend Observatorios Elqui funcionando"
    })

@app.route("/api/kpis")
def kpis():
    try:
        doc = db.etl_snapshots.find_one(sort=[("_id", -1)])

        if not doc:
            return jsonify({})

        doc["_id"] = str(doc["_id"])

        return jsonify(doc)

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500


@app.route("/api/weather")
def weather():
    try:
        doc = db.weather_conditions.find_one(sort=[("_id", -1)])

        if not doc:
            return jsonify({})

        doc["_id"] = str(doc["_id"])

        return jsonify(doc)

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500


@app.route("/api/test")
def test():
    try:
        collections = db.list_collection_names()

        return jsonify({
            "status": "connected",
            "database": "observatorios_elqui",
            "collections": collections
        })

    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))