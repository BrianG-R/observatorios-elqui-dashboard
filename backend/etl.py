from dotenv import load_dotenv
from pymongo import MongoClient
import requests
import pandas as pd
import os
from datetime import datetime

load_dotenv()

NASA_KEY = os.getenv("NASA_KEY")
MONGO_URI = os.getenv("MONGO_URI")

client = MongoClient(MONGO_URI)
db = client["observatorios_elqui"]

# ---------------------------------
# CONFIGURACION
# ---------------------------------

START_DATE = "2026-06-01"
END_DATE = "2026-06-07"

# Cerro Tololo (cerca de La Serena)
LAT = -30.169
LON = -70.806

# ---------------------------------
# NASA NEO
# ---------------------------------

nasa_url = (
    f"https://api.nasa.gov/neo/rest/v1/feed"
    f"?start_date={START_DATE}"
    f"&end_date={END_DATE}"
    f"&api_key={NASA_KEY}"
)

print("Consultando NASA...")

nasa_data = requests.get(nasa_url).json()

records = []

for fecha, asteroides in nasa_data["near_earth_objects"].items():

    for neo in asteroides:

        acercamiento = neo["close_approach_data"][0]

        records.append({
            "fecha": fecha,
            "nombre": neo["name"],
            "diametro_km": neo["estimated_diameter"]["kilometers"]["estimated_diameter_max"],
            "peligroso": neo["is_potentially_hazardous_asteroid"],
            "velocidad_kmh": float(
                acercamiento["relative_velocity"]["kilometers_per_hour"]
            ),
            "distancia_km": float(
                acercamiento["miss_distance"]["kilometers"]
            )
        })

df = pd.DataFrame(records)

print(f"Asteroides encontrados: {len(df)}")

# ---------------------------------
# OPEN METEO
# ---------------------------------

weather_url = (
    f"https://api.open-meteo.com/v1/forecast"
    f"?latitude={LAT}"
    f"&longitude={LON}"
    f"&current=temperature_2m,cloud_cover,wind_speed_10m"
)

print("Consultando Open-Meteo...")

weather_data = requests.get(weather_url).json()

weather_doc = {
    "fecha": datetime.now().strftime("%Y-%m-%d"),
    "ubicacion": "Cerro Tololo",
    "temperatura": weather_data["current"]["temperature_2m"],
    "nubosidad": weather_data["current"]["cloud_cover"],
    "viento": weather_data["current"]["wind_speed_10m"]
}

# ---------------------------------
# KPI
# ---------------------------------

total = len(df)

peligrosos = int(df["peligroso"].sum())

velocidad_promedio = round(df["velocidad_kmh"].mean(), 2)

distancia_promedio = round(df["distancia_km"].mean(), 2)

indice_observacion = max(
    0,
    100
    - weather_doc["nubosidad"] * 0.5
    - weather_doc["viento"] * 0.3
)

snapshot = {
    "fecha": datetime.now().strftime("%Y-%m-%d"),
    "total_asteroides": total,
    "peligrosos": peligrosos,
    "velocidad_promedio": velocidad_promedio,
    "distancia_promedio": distancia_promedio,
    "temperatura": weather_doc["temperatura"],
    "nubosidad": weather_doc["nubosidad"],
    "viento": weather_doc["viento"],
    "indice_observacion": round(indice_observacion, 2)
}

# ---------------------------------
# GUARDAR EN MONGO
# ---------------------------------

print("Guardando asteroides...")

if len(records) > 0:
    db.neo_asteroids.insert_many(records)

print("Guardando clima...")

db.weather_conditions.insert_one(weather_doc)

print("Guardando snapshot...")

db.etl_snapshots.insert_one(snapshot)

print("ETL COMPLETADO")
print(snapshot)