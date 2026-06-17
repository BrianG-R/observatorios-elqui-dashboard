from flask import Flask,jsonify
app=Flask(__name__)
@app.get("/api/kpis")
def kpis(): return jsonify({"status":"ok"})
app.run()
