# test_mongo.py

from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

client = MongoClient(os.getenv("MONGO_URI"))

db = client["observatorios_elqui"]

print("Conectado correctamente")
print(db.list_collection_names())