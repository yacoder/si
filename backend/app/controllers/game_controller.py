import json
import logging

from flask import request


from backend.api.generic_data_provider import get_data_api

from backend.api.user_db_handler import UserDataProvider
from backend.api.game_db_handler import GameDataProvider
from backend.app.managers.entity import Player, Signal
from backend.app.managers.server import SIServerManager, SIGame, AServerManager
from backend.app.util.util import setup_logger, to_dict, now

user_data_provider = UserDataProvider(get_data_api())
game_data_provider = GameDataProvider(get_data_api())

setup_logger()

logger = logging.getLogger(__name__)

def create_game(server_manager: SIServerManager, host_name):
    game = server_manager.create_game(host_name=host_name)
    return game

def test_socket_user(server_manager: SIServerManager):
    player_id = request.json.get("player_id")
    socket = server_manager.get_socket_by_player_id(player_id)
    if socket:
        result = to_dict({"player_id": player_id, "status": "OK"})
        socket.send(result)
        return {"status": "OK"}, 200
    return {"status": "No Socket"}, 200

STATUS_OK = {"status": "OK"}

def websocket_connection(ws, server_manager: SIServerManager):
    while True:
        data = ws.receive()  # Receive a message from the client
        data = json.loads(data)
        action = data.get("action")
        logger.info(f"Received: {data}")
        result = {"status": "error", "desc": "unknown action"}
        if action == "start_game":
            # { "action": "start_game", "host_name": "Masha" }
            host_name = data.get("host_name")
            game = create_game(server_manager, host_name)
            server_manager.register_socket(game.host.player_id, ws)
            result = dict(id=game.game_id, token=game.token, host={"name": game.host.name, "id": game.host.player_id})
        elif action == "register":
            # { "action": "register", "name": "Vovochka", "token": "ABCDEF" }
            player = Player(data.get("name"), data.get("token"))
            player = server_manager.register_player(player, ws)
            result = to_dict(player)
        elif action == "signal":
            # { "action": "signal", "player_id": "4", "local_ts": 213121237874 }
            player_id = data.get("player_id")
            local_ts = data.get("local_ts")
            game = server_manager.get_game_by_player_id(player_id)
            if game is not None:
                signal: Signal = Signal(player_id, local_ts, now())
                server_manager.get_game_by_player_id(player_id).process_signal(signal)
            result = {"status": "OK"}
        elif action == "host_decision":
            # { "action": "host_decision", "game_id": "3", "decision": "accept" }
            game_id = data.get("game_id")
            host_decision = data.get("host_decision")
            game = server_manager.get_game_by_id(game_id)
            if game is not None:
                game.process_host_decision(host_decision)
            result = STATUS_OK


        logger.info(f"ACK: {result}")
        ws.send(f"{result}")

def get_game_status(server_manager, game_id):
    game = server_manager.get_game_by_id(game_id);
    if game is not None:
        return game.generate_game_status(), 200
    else:
        return {"error": f"game {game_id} not found"}, 200
