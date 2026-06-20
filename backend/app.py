from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv
import os
import subprocess
import sys

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

@app.route("/api/asteroids")
def get_asteroids():

    start = request.args.get("start")
    end = request.args.get("end")

    print("START =", start)
    print("END =", end)

    query = {}

    if start and end:
        query = {
            "fecha": {
                "$gte": start,
                "$lte": end
            }
        }

    print("QUERY =", query)

    data = list(
        db.neo_asteroids.find(query, {"_id":0})
    )

    print("TOTAL =", len(data))

    return jsonify(data)


@app.route("/api/weather-history")
def weather_history():
    try:
        docs = list(
            db.weather_conditions.find(
                {},
                {"_id": 0}
            ).sort("_id", 1)
        )

        return jsonify(docs)

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500


@app.route("/api/storage")
def storage():
    try:

        last_snapshot = db.etl_snapshots.find_one(
            sort=[("_id", -1)]
        )

        return jsonify({
            "asteroids": db.neo_asteroids.count_documents({}),
            "weather": db.weather_conditions.count_documents({}),
            "snapshots": db.etl_snapshots.count_documents({}),
            "collections": len(
                db.list_collection_names()
            ),
            "last_sync": (
                last_snapshot.get("fecha")
                if last_snapshot else "N/A"
            )
        })

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
@app.route('/api/status')
def status():
    return jsonify({
        'database':'online',
        'collections': db.list_collection_names()
    })

@app.route("/api/update", methods=["POST"])
def update_data():

    print("===== UPDATE EJECUTADO =====")

    try:

        start = request.args.get("start")
        end = request.args.get("end")

        print("START =", start)
        print("END =", end)

        result = subprocess.run(
            [
                sys.executable,
                "etl.py",
                start,
                end
            ],
            capture_output=True,
            text=True
        )

        print("RETURN CODE =", result.returncode)
        print("STDOUT =", result.stdout[:500])
        print("STDERR =", result.stderr)

        return jsonify({
            "status":"success",
            "output": result.stdout,
            "stderr": result.stderr,
            "code": result.returncode
        })

    except Exception as e:
        return jsonify({
            "status":"error",
            "error": str(e)
        }),500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))

