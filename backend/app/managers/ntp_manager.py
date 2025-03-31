# this class is responsible for calculation and storing client timestamp offset
# once message arrives with client timestamp, offset is applied to it
# so we compare when the signal was emitted, not when it was received
import logging
import threading
from typing import Dict, List

from backend.app.util.util import now

logger = logging.getLogger(__name__)

class NtpBean:

    def __init__(self):
        self.server_out_ts: int = 0
        self.client_ts: int = 0
        self.server_in_ts: int = 0

    def calc_theta(self):
        return ((self.client_ts - self.server_out_ts) + (self.server_in_ts - self.server_out_ts)) / 2


class NtpManager:
    # holds a series of NpbBeans and calculates a sliding average

    ARRAY_SIZE = 8

    def __init__(self):
        self.counter:int = 0
        self.monitor: List[NtpBean] = [NtpBean() for _ in range(NtpManager.ARRAY_SIZE)]

    def process_response(self, server_out_ts, server_in_ts, client_ts):
        ntpbean = self.monitor[self.counter%NtpManager.ARRAY_SIZE]
        ntpbean.server_out_ts = server_out_ts
        ntpbean.server_in_ts = server_in_ts
        ntpbean.client_ts = client_ts
        self.counter += 1

    def get_offset(self):
        offset_array = [x.calc_theta() for x in self.monitor if x.server_out_ts != 0]
        if len(offset_array) == 0:
            return 0

        offset = sum(offset_array) / len(offset_array)
        return offset

class NtpServer:

    def __init__(self, server_manager):
        self.ntp_map: Dict[str, NtpManager] = dict()
        self.server_manager = server_manager
        self.player_ids = set()

    def process_response(self, data):
        player_id = data.get("player_id")
        ntp_manager = self.ntp_map.get(player_id)
        ntp_manager.process_response(
            data.get("server_out_ts"),
            data.get("server_in_ts"),
            data.get("client_ts"))

    def register_player(self, player_id: str):
        self.ntp_map[player_id] = NtpManager()
        self.player_ids.add(player_id)

    def unregister_player(self, player_id: str):
        del self.ntp_map[player_id]
        self.player_ids.remove(player_id)

    def get_offset(self, player_id: str):
        ntp_manager = self.ntp_map.get(player_id)
        return ntp_manager.get_offset() if ntp_manager is not None else 0


    def _monitor(self):
        for player_id in self.player_ids.copy():
            socket = self.server_manager.get_socket_by_player_id(player_id)
            if socket is not None and socket.connected is True:
                ping_message = dict(action="offset_check", player_id=player_id, server_out_ts=now())
                socket.send(ping_message)
            # disabled teporarily to allow reconnect
            # else:
            #    self.server_manager.unregister_player(player_id)

    def monitor(self, interval=1):
        self._monitor()
        threading.Timer(interval, self.monitor, [interval]).start()