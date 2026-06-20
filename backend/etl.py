
from datetime import datetime, timedelta
from dotenv import load_dotenv
from pymongo import MongoClient
import requests
import pandas as pd
import os
import sys

load_dotenv()

NASA_KEY = os.getenv("NASA_KEY")
MONGO_URI = os.getenv("MONGO_URI")

print("NASA_KEY =", NASA_KEY)
print("MONGO_URI cargada =", "SI" if MONGO_URI else "NO")

client = MongoClient(MONGO_URI)
db = client["observatorios_elqui"]

# ---------------------------------
# CONFIGURACION
# ---------------------------------

if len(sys.argv) >= 3:

    START_DATE = sys.argv[1]
    END_DATE = sys.argv[2]

else:

    START_DATE = (
        datetime.now() - timedelta(days=7)
    ).strftime("%Y-%m-%d")

    END_DATE = datetime.now().strftime("%Y-%m-%d")

print("START_DATE =", START_DATE)
print("END_DATE =", END_DATE)

LAT = -30.169
LON = -70.806

# ---------------------------------
# NASA NEO (CONSULTA POR BLOQUES)
# ---------------------------------

records = []

fecha_inicio = datetime.strptime(
    START_DATE,
    "%Y-%m-%d"
)

fecha_fin = datetime.strptime(
    END_DATE,
    "%Y-%m-%d"
)

while fecha_inicio <= fecha_fin:

    bloque_fin = min(
        fecha_inicio + timedelta(days=7),
        fecha_fin
    )

    nasa_url = (
        "https://api.nasa.gov/neo/rest/v1/feed"
        f"?start_date={fecha_inicio.strftime('%Y-%m-%d')}"
        f"&end_date={bloque_fin.strftime('%Y-%m-%d')}"
        f"&api_key={NASA_KEY}"
    )

    print("Consultando:", nasa_url)

    try:

        response = requests.get(
            nasa_url,
            timeout=30
        )

        print(
            "Status NASA:",
            response.status_code
        )

        nasa_data = response.json()

        if "near_earth_objects" not in nasa_data:
            print(
                "NASA no devolvió datos para este bloque"
            )
            fecha_inicio = (
                bloque_fin + timedelta(days=1)
            )
            continue

        for fecha, asteroides in nasa_data[
            "near_earth_objects"
        ].items():

            for neo in asteroides:

                if not neo.get(
                    "close_approach_data"
                ):
                    continue

                acercamiento = neo[
                    "close_approach_data"
                ][0]

                records.append({

                    "fecha": fecha,

                    "nombre": neo["name"],

                    "diametro_km":
                        neo["estimated_diameter"]
                        ["kilometers"]
                        ["estimated_diameter_max"],

                    "peligroso":
                        neo[
                            "is_potentially_hazardous_asteroid"
                        ],

                    "velocidad_kmh": float(
                        acercamiento[
                            "relative_velocity"
                        ][
                            "kilometers_per_hour"
                        ]
                    ),

                    "distancia_km": float(
                        acercamiento[
                            "miss_distance"
                        ][
                            "kilometers"
                        ]
                    )
                })

    except Exception as e:

        print(
            "ERROR EN BLOQUE NASA:",
            e
        )

    fecha_inicio = (
        bloque_fin + timedelta(days=1)
    )

print(
    "Asteroides encontrados:",
    len(records)
)

df = pd.DataFrame(records)

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

response_weather = requests.get(
    weather_url,
    timeout=30
)

print(
    "Status Open-Meteo:",
    response_weather.status_code
)

weather_data = response_weather.json()

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

peligrosos = int(
    df["peligroso"].sum()
) if not df.empty else 0

velocidad_promedio = float(
    round(
        df["velocidad_kmh"].mean(),
        2
    )
) if not df.empty else 0

distancia_promedio = float(
    round(
        df["distancia_km"].mean(),
        2
    )
) if not df.empty else 0

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
    "indice_observacion": round(
        indice_observacion,
        2
    )
}

# ---------------------------------
# GUARDAR EN MONGO
# ---------------------------------

print("Guardando asteroides...")

insertados = 0

for rec in records:

    existe = db.neo_asteroids.find_one({

        "fecha": rec["fecha"],
        "nombre": rec["nombre"]

    })

    if not existe:

        db.neo_asteroids.insert_one(rec)
        insertados += 1

print(
    f"Asteroides nuevos insertados: {insertados}"
)

print("Guardando clima...")

db.weather_conditions.delete_many({})

db.weather_conditions.insert_one(
    weather_doc
)

print("Guardando snapshot...")

db.etl_snapshots.insert_one(
    snapshot
)

print("ETL COMPLETADO")

print(snapshot)

