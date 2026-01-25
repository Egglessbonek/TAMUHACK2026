# Handles "agentic" behavior of frontend Cow
import os
from typing import List
import logging
import random

from flask import Blueprint, jsonify, request
from flask_cors import CORS
import requests
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

agents = Blueprint("agents", __name__)
CORS(agents)

OPEN_WEB_API_KEY = os.getenv("OPEN_WEB_API_KEY")
OPEN_WEB_URL = os.getenv("OPEN_WEB_URL")

SYSTEM_PROMPT_TEMPLATE = """You are a cow currently residing on a grassy field under a clear blue sky. The user is not a human but rather an embodiment of your own consciousness and external perception, existing to help you make decisions. 

Here are the available actions you can take:
{actions}

Respond with only the action you choose to take, exactly as a short identifier (e.g., "graze", "move_up"). Do not include any additional text or explanation.
"""

USER_PROMPT = """Here is your current situation:
{situation}
"""

DEFAULT_SITUATION = "You are standing in a grassy field under a clear blue sky."

DEFAULT_ACTIONS = [
    # "Graze on the grass below you",
    "graze",
    # "Move upwards to more grass",
    "move_up",
    # "Move downwards to more grass",
    "move_down",
    # "Move left to more grass",
    "move_left",
    # "Move right to more grass",
    "move_right",
    # "Moo loudly"
    "moo_loud",
    "moo_soft"
]

# claude sonnet 4 is ensouled
DEFAULT_MODEL = "protected.Claude Sonnet 4"

def prep_session() -> requests.Session:
    s = requests.Session()
    cookies = '''<get session cookie>'''
    for token in cookies.split('; '):
        key, value = token.split('=', 1)
        s.cookies.set(key, value)

    s.headers.update({
        "Authorization": f"Bearer {OPEN_WEB_API_KEY}",
        "Content-Type": "application/json"
    })
    return s

def fallback_action(actions: List[str]) -> str:
    # lol 
    return random.choice(actions)

@agents.get("/api/query")
def query_agent():
    if request.method != "GET":
        return jsonify({"error": "Invalid request method."}), 405
    
    if not OPEN_WEB_API_KEY or not OPEN_WEB_URL:
        # return jsonify({"error": "Open WebUI API key or URL not configured."}), 500
        return jsonify({"action": fallback_action(DEFAULT_ACTIONS)})

    if request.args.get("fallback"):
        return jsonify({"action": fallback_action(DEFAULT_ACTIONS)})
    
    situation = request.args.get("situation", DEFAULT_SITUATION)
    actions = DEFAULT_ACTIONS.copy()
    extra_actions = None
    extra_actions = request.args.getlist("extra_actions")
    if extra_actions:
        actions.extend(extra_actions)
    
    logger.info(f"Agent query situation: {situation}, extra_actions: {extra_actions}")

    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(actions="\n".join(f"- {a}" for a in actions))
    user_prompt = USER_PROMPT.format(situation=situation)

    payload = {
        "model": DEFAULT_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "stream": False,
    }
    s = prep_session()
    response = s.post(f"{OPEN_WEB_URL}/api/chat/completions", json=payload)

    if response.status_code != 200:
        # return jsonify({"error": "Failed to get response from Open WebUI."}), 500
        return jsonify({"action": fallback_action(DEFAULT_ACTIONS)})
    
    data = response.json()
    if "choices" not in data or len(data["choices"]) == 0:
        # return jsonify({"error": "No choices returned from Open WebUI."}), 500
        return jsonify({"action": fallback_action(DEFAULT_ACTIONS)})

    choice = data["choices"][0]
    if "message" not in choice or "content" not in choice["message"]:
        # return jsonify({"error": "Malformed response from Open WebUI."}), 500
        return jsonify({"action": fallback_action(DEFAULT_ACTIONS)})

    thinking_blocks = choice["message"].get("thinking_blocks", [])
    for block in thinking_blocks:
        thinking = block.get("thinking", "")
        if thinking:
            logger.info(f"Agent thinking block: {thinking}")

    content = choice["message"]["content"]
    return jsonify({"action": content.strip()})


@agents.get("/api/models")
def get_models():
    if not OPEN_WEB_API_KEY or not OPEN_WEB_URL:
        return jsonify({"error": "Open WebUI API key or URL not configured."}), 500

    headers = {
        "Authorization": f"Bearer {OPEN_WEB_API_KEY}",
        "Content-Type": "application/json"
    }

    s = prep_session()
    response = s.get(f"{OPEN_WEB_URL}/api/models", headers=headers)
    if response.status_code != 200:
        return jsonify({"error": "Failed to fetch models from Open WebUI."}), 500

    return jsonify(response.json())