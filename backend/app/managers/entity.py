from backend.app.util.util import generate_id


# this class keeps definition of all small bean-like classes without complex logic

class Player:
    def __init__(self, name: str, game_id: str):
        self.score:int = 0
        self.id = generate_id()
        self.name = name
        self.game_id=game_id
