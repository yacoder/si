import json
import logging

from flask import request
from simple_websocket import Server


from backend.app.managers.entity import Player, Signal
from backend.app.managers.server import SIServerManager
from backend.app.util.util import setup_logger, to_dict, now, DEFAULT_NUMBER_OF_ROUNDS, ArgConfig



setup_logger()

logger = logging.getLogger(__name__)

def create_game(server_manager: SIServerManager, host_name, host_id, ws:Server, number_of_rounds=DEFAULT_NUMBER_OF_ROUNDS, round_names_as_text=None):
    game = server_manager.create_game(ws, host_name=host_name, host_id=host_id, number_of_rounds=number_of_rounds, round_names_as_text=round_names_as_text)
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
            if ws.connected is False:
                logger.info("Socket closed")
                break
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
                host_id = data.get("host_id", None)
                number_of_rounds = data.get("number_of_rounds")
                round_names_as_text = data.get("round_names", None)
                try:
                    number_of_rounds = int(number_of_rounds) if number_of_rounds is not None else DEFAULT_NUMBER_OF_ROUNDS
                except ValueError:
                    number_of_rounds = DEFAULT_NUMBER_OF_ROUNDS
                game = create_game(server_manager, host_name, host_id, ws, number_of_rounds=number_of_rounds, round_names_as_text=round_names_as_text)
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
                    client_server_lag = server_manager.ntp_manager.get_client_server_lag(player_id)
                    adjusted_ts = local_ts - client_server_lag
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
            elif action == "set_round_names":
                game_id = data.get("game_id")
                game = server_manager.get_game_by_id(game_id)
                if game is not None and hasattr(game, 'set_round_names'):
                    round_names_as_text = data.get("round_names", None)
                    game.set_round_names(round_names_as_text)
                    result = STATUS_OK
            else:
                result = None
            if result is not None:
                logger.info(f"Sending: {result}")
                ws.send(f"{result}")
            elif action == "offset_check":
                data['server_in_ts'] = now()
                client_sever_lag, server_client_lag = server_manager.process_offset_check(data)
                result = dict(action="offset_check_result", client_sever_lag=client_sever_lag,
                              server_client_lag=server_client_lag)
                ws.send(f"{result}")

        except Exception as e:
            logger.error(f"Error: {e}")
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
