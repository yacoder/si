import os



from flask import Flask, request, send_from_directory
from flask_cors import CORS
from flask_sock import Sock

from src.api.sample_db_handler import get_saved_data_api

app = Flask(__name__, static_folder='../client/build', static_url_path='/')
CORS(app)
sock = Sock(app)

@app.route('/auth', methods=['POST'])
def auth():
    return {'token': '1234'}

@app.route('/api/set_data', methods=['POST'])
def set_data():
    get_saved_data_api().set_data(request.json)
    return get_saved_data_api().get_data()

@app.route('/api/get_data', methods=['GET'])
def get_data():
    return get_saved_data_api().get_data()


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

@sock.route('/ws')
def websocket_connection(ws):
    while True:
        data = ws.receive()  # Receive a message from the client
        print(f"Received: {data}")
        ws.send(f"Echo: {data}")  # Send a response back to the client

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=4000)