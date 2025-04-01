import logging
from threading import Timer
from abc import abstractmethod
from enum import Enum, auto
from typing import Dict, Optional, List, Iterable, Union

from backend.app.managers.entity import Player, Signal
from backend.app.util.util import generate_id, generate_token, now, to_dict, DEFAULT_NUMBER_OF_ROUNDS

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
    # abstract class to represent games (SI, Brain, Erudit Quartet, etc.)

    def __init__(self, server_manager, game_save_handler):
        self.game_id = generate_id()
        self.token = generate_token()
        self.host: Optional[Player] = None
        self.players: Dict[str, Player] = dict()
        self.server_manager = server_manager
        self.game_state = GameState.running.name
        self.finalized = False  # if game is finalized, no new entries are allowed        
        self.player_ids_list = []
        self.game_save_handler = game_save_handler

    def restore_from_data(self, game_data: dict):
        self.game_id = game_data["game_id"]
        self.token = game_data["token"]
        self.game_state = game_data["status"]
        raw_game_data = game_data["data"]["status"]
        self.finalized = raw_game_data.get("finalized", 0) == 1
        self.host = Player(game_id = self.game_id,existing_id=game_data["host_user_id"], name=game_data.get("host_name", ""))
        self.players = {p['player_id']: Player(game_id = self.game_id,existing_id=p['player_id'], name=p['name'], restore_score=p.get('score',0)) for p in raw_game_data['players']}
        self.player_ids_list = list(self.players.keys())


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
    def process_signal(self, signal: Signal):
        pass

    @abstractmethod
    def generate_game_status(self):
        # generates game type specific status to be broadcast to all players/host
        pass

    @abstractmethod
    def reset(self):
        # after all answers got received or time has expired, we need to clean up all variables
        # affecting state of the game
        pass

    @abstractmethod
    def start_timer(self):
        pass

    @abstractmethod
    def log_stats(self):
        pass

    def broadcast_event(self, message: any, player_ids: Optional[Iterable[str]] = None):
        # sends a message to all or subset of players
        # examples:
        # - send update with new score/stats -> all players
        # - send notification that the player won the battle for the button (to a single player)
        # - send notification that the player lost the battle for the button (to all players who tried to win)
        for p in list(self.players.keys()) + [self.host.player_id]:
            if player_ids is None or p in player_ids:
                socket = self.server_manager.get_socket_by_player_id(p)
                if socket is not None and socket.connected:
                    try:
                        socket.send(message)
                    except Exception as e:
                        logger.error(f"Error sending message to {p}: {e}")
                        # if socket is not available, remove it from the list of players
                        if p in self.players:
                            del self.players[p]
                # Disabled this for now as it block reconnect
                # else:
                #    self.server_manager.unregister_player(p)

    def finalize_game(self):
        # if game is finalized no new players can join
        self.finalized = True

    def finish_game(self):
        self.game_state = GameState.finished.name

    def update_status(self):
        status = self.generate_game_status()
        self.broadcast_event(status)

        game_data = {
            "name": self.host.name,
            "status":self.game_state,
            "token": self.token,
            "data":  status,
        }
        self.game_save_handler(
            game_id=self.game_id,
            user_id=self.host.player_id,
            tournament_id="", #todo: pick it up from host
            game_data=game_data,
            
        )

    def register_player(self, player: Player):
        if not self.finalized:
            player_id = player.player_id
            if player_id in self.players:
                # if player is already registered, restore it's score
                player.score = self.players[player_id].score
            self.players[player.player_id] = player
            if player_id not in self.player_ids_list:
                self.player_ids_list.append(player.player_id)

    def unregister_player(self, player: Player):
        if player is not None:
            if isinstance(player, str):
                player_id = player
            else:
                player_id = player.player_id
            del self.players[player_id]
            if player_id in self.player_ids_list:
                self.player_ids_list.remove(player_id)

    def register_host(self, player: Player):
        self.host = player
        self.update_status()


class SIGame(AGame):

    DEFAULT_SIGNAL_ACCUMULATION_TIME = 1  # seconds
    DEFAULT_TIMER_COUNTDOWN = 5  # seconds
    DEFAULT_NOMINALS = [10, 20, 30,40, 50]


    def __init__(self, server_manager, game_save_handler, number_of_rounds=DEFAULT_NUMBER_OF_ROUNDS):
        super().__init__(server_manager, game_save_handler)

        self.nominals: List[int] = SIGame.DEFAULT_NOMINALS
        self.nominal_index: int = 0
        self.question_number = 0
        self.current_nominal: int = self.nominals[self.nominal_index]
        self.current_round = 1
        self.allow_multiple_answers = False
        self.game_stats = list()

        self.number_of_rounds = number_of_rounds
        self.round_stats = [[{} for _ in range(len(self.nominals))] for _ in range(self.number_of_rounds)]
        self.current_round_stats = self.round_stats[self.current_round]
        self.number_of_question_in_round = 0
        self.round_names = ["Тема #" + str(i+1) for i in range(0, self.number_of_rounds)]

        # resettable variables
        self.is_host_notified_on_first_signal: bool = False
        self.signals: Dict[str, any] = dict()  # map of [player_id -> ts of response]
        self.first_signal_ts = None
        # after first signal is received, we wait certain time to allow other signals accumulate
        self.is_accepting_signals: bool = True
        self.question_state: QuestionState = QuestionState.running
        self.responders: List[Player] = []
        self.failed_responders_ids: List[int] = []
        self.time_left: int = SIGame.DEFAULT_TIMER_COUNTDOWN
        self.question_stats: Dict[str, int] = dict()

        # keeps question stats: for each answered player it shows whether answer was correct (True) or not (False)

    def restore_from_data(self, game_data: dict):
        super().restore_from_data(game_data)
        
        raw_game_data = game_data["data"]["status"]

        self.number_of_rounds = raw_game_data["number_of_rounds"]
        self.current_nominal = raw_game_data["nominal"]
        self.current_round = raw_game_data["round_number"]
        self.game_stats = raw_game_data["game_stats"]
        self.round_name = raw_game_data["round_name"]
        self.round_names = raw_game_data.get("round_names", self.round_names)

        number_of_questions_in_round = len(self.nominals)

        # reconstruct round stats values based on game data
        for r in self.game_stats:
            if r['player_stats'] is not None:
                qn = r['question_number']
                nominal = r['nominal']
                qi = self.nominals.index(nominal) 
                qr = qn // number_of_questions_in_round + 1
                for (p,v) in r['player_stats'].items():
                    self.round_stats[qr][qi][p] = 1 if v > 0 else -1

        self.current_round_stats = self.round_stats[self.current_round]       


        self.nominal_index  = self.nominals.index(self.current_nominal)
        self.number_of_question_in_round = self.nominal_index - 1
        self.question_number = (self.current_round - 1) * number_of_questions_in_round + self.number_of_question_in_round
        self.question_state = QuestionState[raw_game_data['question_state']]

    def apply_round_names_as_text(self,round_names_as_text):
        self.round_names = ["Тема #" + str(i+1) for i in range(0, self.number_of_rounds)]
        if round_names_as_text is not None:
            # break down the string into list of strings
            round_names_as_lines = round_names_as_text.split("\n")            
            for i in range(0, min(len(round_names_as_lines), self.number_of_rounds)):
                if len(round_names_as_lines[i]) > 0:
                    self.round_names[i] = round_names_as_lines[i]
                

    def set_round_names(self, round_names_as_text):
        self.apply_round_names_as_text(round_names_as_text)
        self.update_status()

    def reset(self, is_after_incorrect_answer: bool = False):
        self.signals = dict()
        self.is_host_notified_on_first_signal = False
        self.first_signal_ts = None
        self.is_accepting_signals: bool = True
        self.question_state = QuestionState.running
        self.failed_responders_ids.clear()
        self.responders.clear()
        self.time_left: int = SIGame.DEFAULT_TIMER_COUNTDOWN
        if not is_after_incorrect_answer:
            self.question_stats: Dict[str, int] = dict()

    def generate_game_status(self):
        players = list(self.players.values())
        players.sort(key=lambda pl: pl.name)
        status = dict()
        players_stat = list()
        for p in players:
            players_stat.append(dict(name=p.name, player_id=p.player_id, score=p.score))
        status['players'] = players_stat
        status['number_of_rounds'] = self.number_of_rounds
        status['nominal'] = self.current_nominal
        status['game_state'] = self.game_state
        status['question_state'] = self.question_state.name
        status['responders'] = self.responders
        status['time_left'] = self.time_left
        status['finalized'] = 1 if self.finalized else 0
        status["game_stats"] = self.game_stats
        status['game_id'] = self.game_id
        status["game_token"] = self.token
        status['round_number'] = self.current_round
        status['nominals'] = self.nominals
        status['number_of_question_in_round'] = self.number_of_question_in_round
        status['round_name'] = self.round_names[self.current_round - 1] if self.round_names is not None and len(self.round_names) > 0 else None
        status['round_names'] = self.round_names
        status['current_round_stats'] = self._generate_current_round_array()
        result = dict(status=status)
        result = to_dict(result)
        return result

    def _generate_current_round_array(self):
        result = list()
        for p in self.player_ids_list:
            player_data = list()
            player = self.players[p]
            player_data.append(player.name)
            player_data.append(player.score)
            for s in self.current_round_stats:
                if p in s:
                    player_data.append(s[p])
                else:
                    player_data.append(0)
            result.append(player_data)
        return result

    def log_stats(self):
        stats = dict(question_number=self.question_number, player_stats=self.question_stats,
                     nominal=self.current_nominal)
        self.game_stats.append(stats)

    def roll_to_next_question(self):
        self.log_stats()
        self.question_number += 1

        self.number_of_question_in_round += 1
        self.number_of_question_in_round = self.number_of_question_in_round % len(self.nominals)

        self.nominal_index = (self.nominal_index + 1) % len(self.nominals)
        if self.current_round < self.number_of_rounds:
            if self.nominal_index == 0:
                self.current_round += 1
            self.current_nominal = self.nominals[self.nominal_index]
            self.current_round_stats = self.round_stats[self.current_round]
            self.reset()
        else:
            self.reset()
            self.finish_game()
        self.update_status()

    def process_host_decision(self, decision: Union[HostDecision, str]):
        if self.question_state != QuestionState.answering:
            logger.info(f"Cannot accept host decision in {self.question_state.name} state")
            # cannot accept decision if noone is answering
            return
        if isinstance(decision, str):
            decision = HostDecision[decision]

        logger.info(f"decision: {decision}")
        responder = self.responders[0]
        if decision == HostDecision.cancel:
            self.reset()
            self.update_status()
        else:
            if decision == HostDecision.accept:
                responder.score += self.current_nominal
                self.question_stats[responder.player_id] = 1
                self.current_round_stats[self.number_of_question_in_round] = self.question_stats
                self.roll_to_next_question()
            else:
                responder.score -= self.current_nominal
                self.question_stats[responder.player_id] = -1
                self.failed_responders_ids.append(responder.player_id)
                self.is_accepting_signals = True
                self.question_state = QuestionState.running
                self.reset(is_after_incorrect_answer=True)
                self.current_round_stats[self.number_of_question_in_round] = self.question_stats
                self.update_status()

    def process_signal(self, signal: Signal):
        player_id = signal.player_id
        if player_id in self.signals:
            # not allowing double count from the same player
            return

        if not self.allow_multiple_answers and player_id in self.failed_responders_ids:
            # don't allow same person answer twice
            return

        if not self.is_accepting_signals:
            return

        if len(self.signals) == 0:
            self.question_state = QuestionState.awaiting_more_signals
            self.first_signal_ts = now()
        self.signals[player_id] = signal
        self.broadcast_event(self.signals, [self.host.player_id])

    def _detect_responders_list(self) -> List[Player]:
        responders: List[Player] = list()
        first_signal_ts = None
        for s in self.signals.keys():
            player = self.players.get(s)
            if player is not None:
                if first_signal_ts is None:
                    first_signal_ts = self.signals[s].server_ts
                lag = int(self.signals[s].server_ts - first_signal_ts)
                player.lag = lag
                responders.append(player)
        return responders

    def _sort_signals(self):
        self.signals = dict(sorted(self.signals.items(), key=lambda x: x[1].adjusted_ts))

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
                self.is_accepting_signals = False
                logger.info(f"signal accumulation time expired, notifying players")
                self.question_state = QuestionState.answering
                self._sort_signals()
                self.responders = self._detect_responders_list()
                self.update_status()

            else:
                logger.info(f"delta = {delta}; keep signals accumulation")

    def notify_host(self, message):
        logger.info(f"notifying host")
        self.broadcast_event(message, player_ids=[self.host.player_id])

    def _run_timer(self, timer: Timer, interval:int):
        logger.info(f"running _run_timer")
        if self.question_state != QuestionState.running:
            # if signal is received, stopping countdown
            timer.cancel()
        if self.time_left > 0:
            self.update_status()
            self.time_left -= interval
        else:
            self.roll_to_next_question()
            self.update_status()
            timer.cancel()

    def start_timer(self, interval=1):
        timer = Timer(interval, self.start_timer, [interval])
        self._run_timer(timer, interval)
        timer.start()
