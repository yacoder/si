import uuid
import json

from backend.api.generic_data_provider import GenericDataProvider
from backend.api.generic_validator import validate_record_for_mandatory_fields




class GameDataProvider:    
    def __init__(self, data_provider:GenericDataProvider):
        self.data_provider = data_provider

    def get_list_of_tournaments_by_user(self, user_id:str):
        """
        Fetch a list of tournaments hosted by the user with the given user ID.
        Returns a list of game IDs.
        """
        if not user_id:
            return []
        return self.data_provider.lookup_many_by_field("tournaments", "host_user_id", user_id)
    

    
    def set_tournament_data(self, tournament_id:str, user_id:str, tournament_data:dict):
        """
        Set the tournament data for the given tournament ID.
        Returns the ID of the upserted tournament.
        """
        if not tournament_data:
            raise ValueError("Tournament data is required")

        if tournament_id:
            existing_tournament = self.data_provider.lookup_one_by_id("tournaments", tournament_id)
            if existing_tournament:
                for key in ["type", "name", "status", "num_parts"]:
                    if key not in tournament_data:
                        tournament_data[key] = existing_tournament[key]
        

        if not validate_record_for_mandatory_fields(tournament_data, ["type"]):
            raise ValueError("Tournament data is missing mandatory fields")

        record = {
            "host_user_id": user_id,
            "type": tournament_data["type"],
            "name": tournament_data.get("name", ""),
            "status": tournament_data.get("status", "CREATED"),
            "num_parts": tournament_data.get("num_parts", 1),
        }
        tournament_id = self.data_provider.upsert_one("tournaments", tournament_id, record)
        updated_tournament = self.data_provider.lookup_one_by_id("tournaments", tournament_id)
        return updated_tournament
    
    def set_game_data(self, game_id:str, tournament_id:str, game_data:dict):
        """
        Set the game data for the given game ID.
        Returns the ID of the upserted game.
        """
        if not game_data:
            raise ValueError("Game data is required")
        if not tournament_id:
            raise ValueError("Game data is missing mandatory fields")
        
        if game_id:
            existing_game = self.data_provider.lookup_one_by_id("games", game_id)
            if existing_game:
                for key in ["tournament_id", "name", "status", "part_number", "num_rounds", "current_round", "game_questions", "game_answers"]:
                    if key not in game_data:
                        game_data[key] = existing_game[key]

        record = {
            "tournament_id": tournament_id,
            "name": game_data.get("name", ""),
            "status": game_data.get("status", "CREATED"),
            "part_number": game_data.get("part_number", 0),
            "token": game_data.get("token", str(uuid.uuid4())),
            "num_rounds": game_data.get("num_rounds", 0),
            "current_round": game_data.get("current_round", 0),
            "game_questions": game_data.get("game_questions", "{}"),
            "game_answers": game_data.get("game_answers", "{}"),
        }
        game_id = self.data_provider.upsert_one("games", game_id, record)
        updated_game = self.data_provider.lookup_one_by_id("games", game_id)
        return updated_game
    

    def add_player_to_game(self, game_id:str, player_data:dict):
        if not player_data:
            raise ValueError("Player data is required")
        player_name = player_data.get("name")
        all_players = self.data_provider.lookup_many_by_field("players", "game_id", game_id)
        # if player with such name already exists in the game, return the player
        for player in all_players:
            if player["name"] == player_name:
                return player
        # if player with such name does not exist, create a new player
        record = {
            "game_id": game_id,
            "name": player_data["name"],
            "player_user_id": player_data.get("player_user_id", ""),
            "score": player_data.get("score", 0),
            "tournament_player_id": player_data.get("tournament_player_id", "")
        }
        record["id"] = self.data_provider.upsert_one("players", None, record)  
        return record        
        
    
    def set_player_data(self, player_id:str, player_data:dict):
        """
        Set the player data for the given player ID.
        Updates player score only, requires the ID of the upserted player.
        """
        if not player_data:
            raise ValueError("Player data is required")
        
        if player_id:
            player = self.data_provider.lookup_one_by_id("players", player_id)
            if not player:
                raise ValueError("Player data is missing mandatory fields")
            player['score'] = player_data.get("score", 0)
            updated_player = self.data_provider.lookup_one_by_id("players", player_id)
            return updated_player

    
    def generate_questions_based_on_tournament_type(self, tournament_type:str, num_rounds:int):
        """
        Generate questions based on the tournament type and number of rounds.
        Returns a list of questions.
        """
        if num_rounds <= 0:
            return "{}"
        questions = []
        if tournament_type == "si":
            for i in range(num_rounds):
                for j in range(4):
                    questions.append({
                        "id": str(uuid.uuid4()),
                        "round_number": i + 1,
                        "question_number": j + 1,
                        "value": 10 * (i + 1),
                    })
        # convert questions to JSON string 
        return json.dumps(questions)
            
    
    def create_tournament_and_game(self, user_id:str, tournament_data:dict):
        tournament = self.set_tournament_data(None, user_id, tournament_data)
        for i in range(tournament["num_parts"]):
            rounds = tournament_data.get("num_rounds", 0)
            default_questions = self.generate_questions_based_on_tournament_type(tournament["type"], rounds)
            game_data = {
                "name": tournament["name"],
                "status": "GAME_CREATED",
                "part_number": i + 1,
                "num_rounds": rounds,
                "current_round": 0,
                "game_questions": tournament_data.get("game_questions", default_questions),
                "game_answers": tournament_data.get("game_answers", "{}"),
            }
            self.set_game_data(None, tournament["id"], game_data)
        return self.get_tournament_data(tournament["id"])
    

    def get_game_data(self, game_id:str):
        """
        Fetch the game data for the given game ID.
        Returns the game data as a dictionary.
        """
        if not game_id:
            return {}
        game = self.data_provider.lookup_one_by_id("games", game_id)
        if not game:
            return {}
        tournament = self.data_provider.lookup_one_by_id("tournaments", game["tournament_id"])
        players = self.data_provider.lookup_many_by_field("players", "game_id", game_id)
        return {
            "tournament": tournament,
            "game": game,
            "players": players,
        }
    
    def get_tournament_data(self, tournament_id:str):
        """
        Fetch the tournament data for the given tournament ID.
        Returns the tournament data as a dictionary.
        """
        if not tournament_id:
            return {}
        tournament = self.data_provider.lookup_one_by_id("tournaments", tournament_id)
        if not tournament:
            return {}
        games = self.data_provider.lookup_many_by_field("games", "tournament_id", tournament_id)
        players = []
        
        for game in games:
            players_in_game = self.data_provider.lookup_many_by_field("players", "game_id", game["id"])
            players.extend(players_in_game)

        return {
            "tournament": tournament,
            "games": games,
            "players": players,
        }
    
     

    
    




        
            
            

        

