import json
import logging

from flask import request


from backend.api.generic_data_provider import get_data_api

from backend.api.user_db_handler import UserDataProvider
from backend.api.game_db_handler import GameDataProvider
from backend.app.managers.entity import Player
from backend.app.managers.server import SIServerManager, SIGame
from backend.app.util.util import setup_logger, to_dict

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
        socket.send(f"ACK {player_id}")
        return {"status": "OK"}, 200
    return {"status": "No Socket"}, 200


def websocket_connection(ws, server_manager: SIServerManager):
    while True:
        data = ws.receive()  # Receive a message from the client
        data = json.loads(data)
        action = data.get("action")
        logger.info(f"Received: {data}")
        result = {"status": "error", "desc": "unknown action"}
        if action == "start_game":
            host_name = data.get("host_name")
            game = create_game(server_manager, host_name)
            server_manager.register_socket(game.host.id, ws)
            result = to_dict(game)
        elif action == "register":
            player = Player(data.get("name"), data.get("token"))
            player = server_manager.register_player(player)
            server_manager.register_socket(player.id, ws)
            result = to_dict(player)
        elif action == "signal":
            player_id = data.get("player_id")
            game = server_manager.get_game_by_player_id(player_id)
            if game is not None:
                server_manager.get_game_by_player_id(player_id).process_signal(player_id, data)
            result = {"status": "OK"}

        logger.info(f"ACK: {result}")
        ws.send(f"ACK: {result}")
