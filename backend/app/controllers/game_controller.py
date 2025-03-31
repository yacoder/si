import json
import logging

from flask import request
from simple_websocket import Server

from backend.api.generic_data_provider import get_data_api

from backend.api.user_db_handler import UserDataProvider
from backend.api.game_db_handler import GameDataProvider
from backend.app.managers.entity import Player, Signal
from backend.app.managers.server import SIServerManager
from backend.app.util.util import setup_logger, to_dict, now, DEFAULT_NUMBER_OF_ROUNDS, ArgConfig

user_data_provider = UserDataProvider(get_data_api())
game_data_provider = GameDataProvider(get_data_api())

setup_logger()

logger = logging.getLogger(__name__)

def create_game(server_manager: SIServerManager, host_name, ws:Server, number_of_rounds=DEFAULT_NUMBER_OF_ROUNDS):
    game = server_manager.create_game(ws, host_name=host_name, number_of_rounds=number_of_rounds)
    return game

def test_socket_user(server_manager: SIServerManager):
    player_id = request.json.get("player_id")
    socket = server_manager.get_socket_by_player_id(player_id)
    if socket and socket.connected:
        result = to_dict({"player_id": player_id, "status": "OK"})
        socket.send(result)
        return {"status": "OK"}, 200
    return {"status": "No Socket"}, 200

STATUS_OK = {"status": "OK"}

def websocket_connection(ws, server_manager: SIServerManager):
    while True:
        try:
            data = ws.receive()  # Receive a message from the client
            data = json.loads(data)
            action = data.get("action")
            if action == "offset_check" or 'isTrusted' in data:
                pass
            else:
                logger.info(f"Received: {data}")
            result = {"status": "error", "desc": "unknown action"}
            if action == "start_game":
                # { "action": "start_game", "host_name": "Masha", "number_of_rounds": 8 }
                host_name = data.get("host_name")
                number_of_rounds = data.get("number_of_rounds")
                try:
                    number_of_rounds = int(number_of_rounds) if number_of_rounds is not None else DEFAULT_NUMBER_OF_ROUNDS
                except ValueError:
                    number_of_rounds = DEFAULT_NUMBER_OF_ROUNDS
                game = create_game(server_manager, host_name, ws, number_of_rounds=number_of_rounds)
                result = dict(id=game.game_id, token=game.token, host={"name": game.host.name, "id": game.host.player_id, "token": game.token})
            elif action == "host_reconnect":
                # { "action": "host_reconnect",  "token": "ABCDEF" }
                game_id = data.get("game_id")
                game = server_manager.get_game_by_id(game_id)
                if game is not None:
                    server_manager.register_socket(game.host.player_id, ws)
                    result = dict(id=game.game_id, token=game.token, host={"name": game.host.name, "id": game.host.player_id, "token": game.token})
                else:
                    result = {"status": "error", "desc": "game not found"}
            elif action == "register":
                # { "action": "register", "name": "Vovochka", "token": "ABCDEF" }
                game_id = None
                if data.get("game_id") is None:
                    game = server_manager.get_game_by_id(data.get("game_token")) # this function works by token or ID
                    if game is not None:
                        game_id = game.game_id
                else:
                    game_id = data.get("game_id")
                if game_id is None:
                    result = {"status": "error", "desc": "game id not found"}
                    ws.send(f"{result}")
                    continue
                player = Player(data.get("name"), game_id, data.get("player_id", None))
                player = server_manager.register_player(player, ws)
                result = to_dict(player)
            elif action == "signal":
                # { "action": "signal", "player_id": "4", "local_ts": 213121237874 }
                player_id = data.get("player_id")
                local_ts = data.get("local_ts")
                game = server_manager.get_game_by_player_id(player_id)
                if game is not None:
                    offset = server_manager.ntp_manager.get_offset(player_id)
                    adjusted_ts = local_ts + offset
                    signal: Signal = Signal(player_id, now(), local_ts, adjusted_ts)
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
            elif action == "start_timer":
            #{ "action": "start_timer", "game_id": "2" }
                game_id = data.get("game_id")
                game = server_manager.get_game_by_id(game_id)
                if game is not None:
                    game.start_timer()
                result = STATUS_OK
            elif action == "finalize":
                game_id = data.get("game_id")
                game = server_manager.get_game_by_id(game_id)
                if game is not None:
                    game.finalize_game()
            elif action == "offset_check":
                data['server_in_ts'] = now()
                server_manager.process_offset_check(data)
                result = None
            else:
                result = None

            if result is not None:
                logger.info(f"Sending: {result}")
                ws.send(f"{result}")
        except Exception as e:
            if ArgConfig.is_dev():
                raise e
            else:
                logger.error(f"Error: {e}")


def get_game_status(server_manager, game_id):
    game = server_manager.get_game_by_id(game_id)
    if game is not None:
        result = game.generate_game_status()
        return result, 200
    else:
        return {"error": f"game {game_id} not found"}, 200
