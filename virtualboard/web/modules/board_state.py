import json

class Piece(object):
    name = ""
    x = 0
    y = 0
    z = 0
    user = ""
    icon = ""
    piece_id = 0

    def __init__(self, name="", x=0, y=0, z=0, user="", icon="", piece_id=0):
        self.name = name
        self.x = x
        self.y = y
        self.z = z
        self.user = user
        self.icon = icon
        self.piece_id = piece_id

    def set_name(new_name):
        name = new_name

    def set_x(new_x):
        x = new_x

    def set_y(new_y):
        y = new_y

    def set_z(new_z):
        z = new_z

    def set_user(new_user):
        user = new_user

    def set_icon(new_icon):
        icon = new_icon

    def set_piece_id(new_id):
        piece_id = new_id

    def get_name():
        return name

    def get_x():
        return x

    def get_y():
        return y

    def get_z():
        return z

    def get_user():
        return user

    def get_icon():
        return icon

    def get_piece_id():
        return piece_id

class BoardState(object):
    pieces = []

    def add_piece(self, piece):
        self.pieces.add(piece)

    def remove_piece(self, piece):
        self.pieces.remove(piece)

    def dump_json(self):
        return json.dumps(self.pieces)

    def load_json(self, json_string):
        self.pieces = json.load(json_string)
