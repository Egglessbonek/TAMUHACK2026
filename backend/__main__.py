from flask import Flask

from api.counter import counter, sock
from api.agents import agents

if __name__ == "__main__":
    app = Flask(__name__)

    @app.route("/")
    def index():
        return "Server is running."

    app.register_blueprint(counter)
    app.register_blueprint(agents)
    sock.init_app(app)
    app.run(debug=True, threaded=True)
