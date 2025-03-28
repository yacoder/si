import uuid

from backend.api.generic_data_provider import GenericDataProvider
from backend.api.generic_validator import validate_record_for_mandatory_fields


class UserDataProvider:    
    def __init__(self, data_provider:GenericDataProvider):
        self.data_provider = data_provider

    def init_user(self, user_token:str, user_data:dict):
        if not user_token or user_token == "":
            raise ValueError("User token is required")
        # Check if the user already exists by token
        existing_user = self.data_provider.lookup_one_by_field("users", "token", user_token)
        if existing_user:
            return existing_user
        # check if the user already exists by email if email is provided
        if not user_data or not user_data.get("email"):
            raise ValueError("User data is required")
        existing_user = self.data_provider.lookup_one_by_field("users", "email", user_data["email"])
        if existing_user:
            return existing_user
        if not validate_record_for_mandatory_fields(user_data, ["email", "name"]):
            raise ValueError("User data is missing mandatory fields")
        # Create a new user if it doesn't exist
        record = {
            "token": user_token,
            "email": user_data["email"],
            "name": user_data["name"],
            "ratingid": user_data.get("ratingid", 0),
        }
        record["id"] = self.data_provider.upsert_one("users", None, record)
        return record
    
    def enforce_player_token(self,player_token:str):
        if player_token and player_token != "":
            return player_token
        
        return "player_" + str(uuid.uuid4())
    
    def init_player(self, player_token:str, player_data:dict):
        if not player_token or player_token == "":
            raise ValueError("Player token is required")            
        
        # Check if the user already exists by token
        existing_player = self.data_provider.lookup_one_by_field("players", "player_token", player_token)
        if existing_player:
            return existing_player
        
        if not validate_record_for_mandatory_fields(player_data, [ "name"]):
            raise ValueError("Player data is missing mandatory fields")
        
        # check to see if game token was provided
        game_token = player_data.get("game_token")
        if not game_token:
            raise ValueError("Game token is required")
        
        game = self.data_provider.lookup_one_by_field("games", "token", game_token)
        if not game:
            raise ValueError("Valid Game token is required")
        
        
        game_id = game["id"]
        # check to see if host added the player to the game by name
        all_players = self.data_provider.lookup_many_by_field("players", "game_id", game_id)
        player_name = player_data.get("name")
        # if player with such name already exists in the game: set it's token and return the player
        for player in all_players:
            if player["name"] == player_name:
                player["player_token"] = player_token
                self.data_provider.upsert_one("players", player["id"], player)
                return player       
               
        record = {
            "game_id": game_id,
            "name": player_data["name"],
            "player_user_id": player_data.get("player_user_id", ""),
            "score": player_data.get("score", 0),
            "tournament_player_id": player_data.get("tournament_player_id", ""),
            "player_token": player_token,

        }
        record["id"] = self.data_provider.upsert_one("players", None, record)  

        return record
    



        
            
            

        

