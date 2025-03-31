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
        required_fields = ["name"]
        if user_data.get("simple_game_start") is not True:
            if not user_data or not user_data.get("email"):
                raise ValueError("User data is required")
            existing_user = self.data_provider.lookup_one_by_field("users", "email", user_data["email"])
            if existing_user:
                return existing_user
            required_fields.append("email")
            
       
        if not validate_record_for_mandatory_fields(user_data, required_fields):
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
    
            

    
    def init_player(self, player_token:str, player_data:dict, transient_game = None):
        # check if it's a transient token
        if player_token is not None and player_token.startswith("transient_"):
            # split the token to get the game id
            token_split = player_token.split("_")
            if not 'game_id' in player_data:
                player_data["game_id"] = token_split[1]
            if not 'name' in player_data:
                player_data["name"] = token_split[2]
            if not 'player_id' in player_data:
                player_data["player_id"] = player_data["game_id"] + '_' + player_data["name"]
            player_data['token'] = player_token
            return player_data

        if player_token and player_token != "":
            # Check if the user already exists by token
            existing_player = self.data_provider.lookup_one_by_field("players", "player_token", player_token)
            if existing_player:
                return existing_player
        
        if not validate_record_for_mandatory_fields(player_data, [ "name"]):
            raise ValueError("Player data is missing mandatory fields")
        
        player_name = player_data.get("name")
        if transient_game is not None:
            game_id = transient_game.game_id
            player_data["game_id"] = game_id
            player_data["player_id"] = game_id + '_' + player_name
            player_data["token"] = f"transient_{player_data['player_id']}"
            return player_data
            

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

        # if player with such name already exists in the game: set it's token and return the player
        for player in all_players:
            if player["name"] == player_name:
                player["player_token"] = player_token
                self.data_provider.upsert_one("players", player["id"], player)
                return player       
               
        record = {
            "game_id": game_id,
            "name": player_name,
            "player_user_id": player_data.get("player_user_id", ""),
            "score": player_data.get("score", 0),
            "tournament_player_id": player_data.get("tournament_player_id", ""),
            "player_token": player_token,

        }
        record["id"] = self.data_provider.upsert_one("players", None, record)  

        return record
    



        
            
            

        

