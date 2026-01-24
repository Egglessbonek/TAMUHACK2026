# Handles the global moo counter w/ live websocket updates

import threading
from typing import Set

from flask import Blueprint, jsonify
from flask_cors import CORS
from flask_sock import Sock
from simple_websocket import Client

counter = Blueprint("counter", __name__)
CORS(counter)
sock = Sock()

global_moo_count: int = 0
ws_clients: Set[Client] = set()
ws_clients_lock: threading.Lock = threading.Lock()


def broadcast_count():
    payload = f"mc|{global_moo_count}"
    with ws_clients_lock:
        for ws in list(ws_clients):
            try:
                ws.send(payload)
            except Exception:
                ws_clients.discard(ws)


@counter.get("/api/counter")
def get_counter():
    return jsonify({"count": global_moo_count})


@sock.route("/api/ws")
def ws_counter(ws: Client):
    global global_moo_count

    # sync
    with ws_clients_lock:
        ws_clients.add(ws)
    ws.send(f"mc|{global_moo_count}")

    while True:
        # inner ws loop
        msg = ws.receive()
        if msg is None:
            break
        if msg == "count_moo":
            global_moo_count += 1
            broadcast_count()

    with ws_clients_lock:
        ws_clients.discard(ws)
