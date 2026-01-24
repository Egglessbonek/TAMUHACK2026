import json
import threading

from flask import Flask, jsonify
from flask_cors import CORS
from flask_sock import Sock

app = Flask(__name__)

CORS(app)
sock = Sock(app)

count = 0
clients = set()
clients_lock = threading.Lock()


def broadcast_count():
    payload = json.dumps({"count": count})
    with clients_lock:
        for ws in list(clients):
            try:
                ws.send(payload)
            except Exception:
                clients.discard(ws)

@app.route("/")
def hello_world():
    return "<p>Hello, World!</p>"


@app.get("/api/counter")
def get_counter():
    return jsonify({"count": count})


@app.post("/api/increment")
def increment():
    global count
    count += 1
    broadcast_count()
    return jsonify({"count": count})


@sock.route("/api/ws")
def ws_counter(ws):
    global count
    with clients_lock:
        clients.add(ws)
    ws.send(json.dumps({"count": count}))
    while True:
        msg = ws.receive()
        if msg is None:
            break
        if msg == "increment":
            count += 1
            broadcast_count()
    with clients_lock:
        clients.discard(ws)

if __name__ == "__main__":
    app.run(debug=True, threaded=True)