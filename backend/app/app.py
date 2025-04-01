import os

from flask import Flask, request, send_from_directory

from flask_cors import CORS
from flask_sock import Sock


from backend.api.generic_data_provider import get_data_api

from backend.api.user_db_handler import UserDataProvider
from backend.api.game_db_handler import GameDataProvider
from backend.app.controllers.game_controller import test_socket_user, websocket_connection, get_game_status
from backend.app.managers.server import SIServerManager, logger
from backend.app.util.util import setup_logger, ArgConfig

user_data_provider = UserDataProvider(get_data_api())
game_data_provider = GameDataProvider(get_data_api())

setup_logger()
server_manager = SIServerManager(game_save_handler=game_data_provider.set_game_data,
                                 game_loader=game_data_provider.get_game_data)
ArgConfig.load_args()

app = Flask(__name__, static_folder='../../frontend/build', static_url_path='/')
sock = Sock(app)
CORS(app)


@app.route('/auth', methods=['POST'])
def auth():
    try:
        user_token = request.json.get("token")
        if user_token is None or user_token == "":
            player_data = request.json.get("player_data")
            transient_game = server_manager.get_game_by_id(player_data.get("game_token"))         
            player = user_data_provider.init_player(request.json.get("player_token", None), player_data, transient_game)
            return { "token":player["token"]}
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


@app.route
   
@app.route('/api/player/game', methods=['GET'])
def get_player_game_data():
    try:
        player = get_authenticated_player(request)
        status = get_game_status(server_manager, player['game_id'])
        status[0]['player'] = player
        return status
    except ValueError as e:
        return {'error': str(e)}, 400   
    

@app.route('/api/host/game/<game_id>', methods=['GET'])
def get_host_game_data(game_id):
    try:
        host = get_authenticated_user(request)
        return get_game_status(server_manager, game_id)
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
     # all IPs id not prod:
    hosts_to_serve = "127.0.0.1" if ArgConfig.ENV == "prod" else "0.0.0.0"
    app.run(host=hosts_to_serve, port=4000)




if __name__ == '__main__':
    main()