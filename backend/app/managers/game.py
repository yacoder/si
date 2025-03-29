import logging
from abc import abstractmethod
from typing import Dict, Set, Optional, List, Iterable

from backend.app.managers.entity import Player
from backend.app.util.util import generate_id, generate_token, now

logger = logging.getLogger(__name__)

class AGame:
    # abstract class to represent games (SI, Brain, Erudit Quartet, etc)

    def __init__(self, server_manager):
        self.id = generate_id()
        self.token = generate_token()
        self.host: Optional[Player] = None
        self.players: Dict[str, Player] = dict()
        self.server_manager = server_manager

    @abstractmethod
    def check_signals(self):
        # checks incoming signals for individual game
        pass

    @abstractmethod
    def notify_host(self):
        # if active signal exists, send notification to the host
        pass

    @abstractmethod
    def roll_to_next_question(self):
        # depending on the type of the game, perform certain steps
        # for SI change the nominal; for brain reset or update the nominal depending on the rules;
        # for EQ change the nominal/type of the round
        pass

    @abstractmethod
    def process_host_decision(self):
        # host decides if the answer is correct or not (or cancels it)
        # based on it, change the state of the game
        pass

    @abstractmethod
    def process_signal(self, player_id:str, signal):
        pass

    def broadcast_event(self, message: any, player_ids: Optional[Iterable[str]] = None):
        # sends a message to all or subset of players
        # examples:
        # - send update with new score/stats -> all players
        # - send notification that the player won the battle for the button (to a single player)
        # - send notification that the player lost the battle for the button (to all players who tried to win)
        for p in list(self.players.keys()) + [self.host.id]:
            if player_ids is None or p in player_ids:
                socket = self.server_manager.get_socket_by_player_id(p)
                if socket is not None:
                    socket.send(message)

    def register_player(self, player: Player):
        self.players[player.id] = player

    def unregister_player(self, player: Player):
        del self.players[player.id]

    def register_host(self, player: Player):
        self.host = player


class SIGame(AGame):

    DEFAULT_NOMINALS = [10, 20, 30,40, 50]

    def __init__(self, server_manager):
        super().__init__(server_manager)
        self.signals: Set[str] = set()
        self.nominals: List[int] = SIGame.DEFAULT_NOMINALS
        self.nominal_index: int = 0
        self.current_nominal: int = self.nominals[self.nominal_index]
        self.is_accepting_signals: bool = True
        self.last_signal_ts = None
        self.signals: Dict[str, int] = dict()  #  map of [user -> ts of response]

        self.number_of_signals_in_previous_notification: int = 0


    def roll_to_next_question(self):
        self.nominal_index = (self.nominal_index + 1) % len(self.nominals)
        self.current_nominal = self.nominals[self.nominal_index]

    def process_host_decision(self):
        pass

    def process_signal(self, player_id:str, signal):
        if player_id not in self.signals:
            # not allowing double count from the same player
            self.signals[player_id] = signal
            signal['server_ts'] = now()
            self.broadcast_event(self.signals, [self.host.id])


    def check_signals(self):
        # logger.info(f"Checking signal for game {self.id} {self.token}")
        if len(self.signals) and len(self.signals) != self.number_of_signals_in_previous_notification:
            self.number_of_signals_in_previous_notification = len(self.signals)
            self.notify_host()

    def notify_host(self):
        logger.info(f"notifying host")
