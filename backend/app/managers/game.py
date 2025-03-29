import logging
from abc import abstractmethod
from enum import Enum, auto
from typing import Dict, Set, Optional, List, Iterable, Union

from backend.app.managers.entity import Player
from backend.app.util.util import generate_id, generate_token, now, to_dict

logger = logging.getLogger(__name__)

class GameState(Enum):
    running = auto()
    finished = auto()

class QuestionState(Enum):
    running = auto()
    awaiting_more_signals = auto()
    answering = auto()

class HostDecision(Enum):
    accept = auto()
    decline = auto()
    cancel = auto()


class AGame:
    # abstract class to represent games (SI, Brain, Erudit Quartet, etc)

    def __init__(self, server_manager):
        self.id = generate_id()
        self.token = generate_token()
        self.host: Optional[Player] = None
        self.players: Dict[str, Player] = dict()
        self.server_manager = server_manager
        self.game_state = GameState.running.name

    @abstractmethod
    def check_signals(self):
        # checks incoming signals for individual game
        pass

    @abstractmethod
    def notify_host(self, message):
        # if active signal exists, send notification to the host
        pass

    @abstractmethod
    def roll_to_next_question(self):
        # depending on the type of the game, perform certain steps
        # for SI change the nominal; for brain reset or update the nominal depending on the rules;
        # for EQ change the nominal/type of the round
        pass

    @abstractmethod
    def process_host_decision(self, decision: Union[HostDecision, str]):
        # host decides if the answer is correct or not (or cancels it)
        # based on it, change the state of the game
        pass

    @abstractmethod
    def process_signal(self, player_id:str, signal):
        pass

    @abstractmethod
    def generate_game_status(self):
        # generates game type specific status to be broadcasted to all players/host
        pass

    @abstractmethod
    def reset(self):
        # after all answers got received or time has expired, we need to clean up all variables
        # affecting state of the game
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

    def finalize_game(self):
        self.game_state = GameState.finished.name

    def update_status(self):
        status = self.generate_game_status()
        self.broadcast_event(status)

    def register_player(self, player: Player):
        self.players[player.id] = player

    def unregister_player(self, player: Player):
        del self.players[player.id]

    def register_host(self, player: Player):
        self.host = player
        self.update_status()


class SIGame(AGame):

    DEFAULT_SIGNAL_ACCUMULATION_TIME = 5  # seconds

    DEFAULT_NOMINALS = [10, 20, 30,40, 50]

    def __init__(self, server_manager, number_of_rounds=8):
        super().__init__(server_manager)
        self.nominals: List[int] = SIGame.DEFAULT_NOMINALS
        self.nominal_index: int = 0
        self.current_nominal: int = self.nominals[self.nominal_index]
        self.current_round = 1
        self.number_of_rounds = number_of_rounds

        # resettable variables
        self.is_host_notified_on_first_signal: bool = False
        self.signals: Dict[str, any] = dict()  # map of [user -> ts of response]
        self.first_signal_ts = None
        # after first signal is received, we wait certain time to allow other signals accumulate
        self.is_accepting_signals: bool = True
        self.question_state: QuestionState = QuestionState.running

    def reset(self):
        self.signals = dict()
        self.is_host_notified_on_first_signal = False
        self.first_signal_ts = None
        self.is_accepting_signals: bool = True
        self.question_state = QuestionState.running

    def generate_game_status(self):
        players = list(self.players.values())
        players.sort(key=lambda p: p.name)
        status = dict()
        players_stat = list()
        for p in players:
            players_stat.append(dict(name=p.name, player_id=p.id, score=p.score))
        status['players'] = players_stat
        status['nominal'] = self.current_nominal
        status['game_state'] = self.game_state
        status['question_state'] = self.question_state.name
        result = dict(status=status)
        result = to_dict(result)
        return result

    def roll_to_next_question(self):
        self.nominal_index = (self.nominal_index + 1) % len(self.nominals)
        if self.current_round < self.number_of_rounds:
            if self.nominal_index == 0:
                self.current_round += 1
            self.current_nominal = self.nominals[self.nominal_index]
            self.reset()
        else:
            self.reset()
            self.finalize_game()
        self.update_status()

    def process_host_decision(self, decision: Union[HostDecision, str]):
        if self.question_state != QuestionState.answering:
            logger.info(f"Cannot accept host decision in {self.question_state.name} state")
            # cannot accept decision if noone is answering
            return
        if isinstance(decision, str):
            decision = HostDecision(decision)

        logger.info(f"decision: {decision}")
        if decision == HostDecision.cancel:
            self.reset()
        else:
            self.roll_to_next_question()

    def process_signal(self, player_id:str, signal):
        if player_id in self.signals:
            # not allowing double count from the same player
            return

        if len(self.signals) == 0:
            self.question_state = QuestionState.awaiting_more_signals
            self.first_signal_ts = now()
        self.signals[player_id] = signal
        signal['server_ts'] = now()
        self.broadcast_event(self.signals, [self.host.id])


    def check_signals(self):
        if self.question_state == QuestionState.answering:
            return
        if len(self.signals):
            if not self.is_host_notified_on_first_signal:
                message = dict(action="game_paused")
                self.notify_host(message)
                self.is_host_notified_on_first_signal = True
            delta = now() - self.first_signal_ts
            if  delta > SIGame.DEFAULT_SIGNAL_ACCUMULATION_TIME * 1000:
                message = dict(action="player_answering", players_queue=["A", "B", "C"])
                logger.info(f"signal accumulation time expired, notifying players")
                self.question_state = QuestionState.answering
                self.broadcast_event(message)
            else:
                logger.info(f"delta = {delta}; keep signals accumulation")

    def notify_host(self, message):
        logger.info(f"notifying host")
        self.broadcast_event(message, player_ids=[self.host.id] )
