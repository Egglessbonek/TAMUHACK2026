import json
import threading

from flask import Flask, jsonify
from flask_cors import CORS
from flask_sock import Sock
from simple_websocket import Client

app = Flask(__name__)

CORS(app)
sock = Sock(app)

global_moo_count = 0
ws_clients = set()
ws_clients_lock = threading.Lock()


def broadcast_count():
    payload = f"mc|{global_moo_count}"
    with ws_clients_lock:
        for ws in list(ws_clients):
            try:
                ws.send(payload)
            except Exception:
                ws_clients.discard(ws)

@app.route("/")
def hello_world():
    return "Server is running."


@app.get("/api/counter")
def get_counter():
    return jsonify({"count": global_moo_count})


@app.post("/api/increment")
def increment():
    global global_moo_count
    global_moo_count += 1
    broadcast_count()
    return jsonify({"count": global_moo_count})


@sock.route("/api/ws")
def ws_counter(ws: Client):
    global global_moo_count
    with ws_clients_lock:
        ws_clients.add(ws)
    ws.send(f"mc|{global_moo_count}")
    while True:
        msg = ws.receive()
        if msg is None:
            break
        if msg == "count_moo":
            global_moo_count += 1
            broadcast_count()
    with ws_clients_lock:
        ws_clients.discard(ws)

if __name__ == "__main__":
    app.run(debug=True, threaded=True)