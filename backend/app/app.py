import json
import os



from flask import Flask, request, send_from_directory

# from flask_cors import CORS
from flask_sock import Sock

from backend.api.sample_db_handler import get_saved_data_api
from backend.api.generic_data_provider import get_data_api

from backend.api.user_db_handler import UserDataProvider
from backend.api.game_db_handler import GameDataProvider
from backend.app.controllers.game_controller import test_socket_user, websocket_connection, get_game_status
from backend.app.managers.server import SIServerManager, SIGame, logger
from backend.app.util.util import setup_logger, ArgConfig

user_data_provider = UserDataProvider(get_data_api())
# game_data_provider = GameDataProvider(get_data_api())

setup_logger()
server_manager = SIServerManager()
ArgConfig.load_args()

app = Flask(__name__, static_folder='../../frontend/build', static_url_path='/')
sock = Sock(app)
# CORS(app)


# dummy methods for testing only

@app.route('/api/set_data', methods=['POST'])
def set_data():
    get_saved_data_api().set_data(request.json)
    return get_saved_data_api().get_data()

@app.route('/api/get_data', methods=['GET'])
def get_data():
    return "1234567890"
#     return get_saved_data_api().get_data()




@app.route('/auth', methods=['POST'])
def auth():
    try:
        user_token = request.json.get("token")
        if user_token is None or user_token == "":
            player_token = user_data_provider.enforce_player_token(request.json.get("player_token"))
            player_data = request.json.get("player_data")
            player = user_data_provider.init_player(player_token, player_data)
            return { "token": player["player_token"]}

        else:
            user_data = request.json.get("user_data")
            user = user_data_provider.init_user(user_token, user_data)
            return { "token":user["token"]}
        
    except Exception as e:
        return {'error': str(e)}, 400

def get_authenticated_user(request):
    user_token = request.headers.get("Authorization").split(" ")[1]
    user = user_data_provider.init_user(user_token, {})
    return user

def get_authenticated_player(request):
    player_token = request.headers.get("Authorization").split(" ")[1]
    player = user_data_provider.init_player(player_token, {})
    return player

   
@app.route('/api/player/game', methods=['GET'])
def get_player_game_data():
    try:
        player = get_authenticated_player(request)
        # game = game_data_provider.get_game_data(player["game_id"])
        return {"status": "OK"}, 200
    except ValueError as e:
        return {'error': str(e)}, 400   
    


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')


@app.route('/test/socket/user', methods=['POST'])
def test_socket_user_():
    return test_socket_user(server_manager)

@sock.route('/ws')
def websocket_connection_(ws):
    return websocket_connection(ws, server_manager)

@app.route('/game/status/<game_id>', methods=['GET'])
def get_game_status_(game_id):
    return get_game_status(server_manager, game_id)




def main():
    logger.info(f"Starting server in {ArgConfig.ENV} mode...")
    app.run(host="127.0.0.1", port=4000)




if __name__ == '__main__':
    main()