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
                for key in ["type", "name", "status", "num_games"]:
                    if key not in tournament_data:
                        tournament_data[key] = existing_tournament[key]
        

        if not validate_record_for_mandatory_fields(tournament_data, ["type"]):
            raise ValueError("Tournament data is missing mandatory fields")

        record = {
            "host_user_id": user_id,
            "type": tournament_data["type"],
            "name": tournament_data.get("name", ""),
            "status": tournament_data.get("status", "CREATED"),
            "num_games": tournament_data.get("num_games", 1),
        }
        tournament_id = self.data_provider.upsert_one("tournaments", tournament_id, record)
        updated_tournament = self.data_provider.lookup_one_by_id("tournaments", tournament_id)
        return updated_tournament
    
    def set_game_data(self, user_id:str, game_id:str, tournament_id:str, game_data:dict, transient:bool=False):
        """
        Set the game data for the given game ID.
        Returns the ID of the upserted game.
        """
        if not game_data:
            raise ValueError("Game data is required")
        # if not tournament_id:
        #    raise ValueError("Game data is missing mandatory fields")
        
        if game_id:
            existing_game = self.data_provider.lookup_one_by_id("games", game_id)
            if existing_game:
                for key in ["name", "status", "token", "data"]:
                    if key not in game_data:
                        game_data[key] = existing_game[key]

        data = game_data.get("data", {})
        if isinstance(data, dict):
            data = json.dumps(data)
        elif not isinstance(data, str):
            raise ValueError("Game data must be a string or a dictionary")
        
        record = {
            "host_user_id": user_id,
            "tournament_id": tournament_id,
            "name": game_data.get("name", ""),
            "status": game_data.get("status", ""),
            "token": game_data.get("token", ""),
            "data": data,

        }
        game_id = self.data_provider.upsert_one("games", game_id, record, use_transient=transient)
        updated_game = self.data_provider.lookup_one_by_id("games", game_id)
        return updated_game
    


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
        return {
            "tournament": tournament,
            "game": game,
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


        return {
            "tournament": tournament,
            "games": games,
            
        }
    
     

    
    




        
            
            

        

