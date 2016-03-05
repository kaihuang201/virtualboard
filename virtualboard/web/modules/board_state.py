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

    def get_dict(self):
        return self.__dict__

    def load_from_dict(self,dict_obj):
        self.__dict__.update(dict_obj)

    def load_from_json(self, json_string):
    	try:
    		self.load_from_dict(json.loads(json_string))
    	except ValueError:
    		print("invalid json for Piece class")

    def get_json(self):
    	return json.dumps(self.get_dict())

    def __str__(self):
        return self.get_json()

class BoardState(object):

    pieces = []

    def __init__(self):
        self.pieces = []

    def add_piece(self, piece):
        self.pieces.append(piece)

    def remove_piece(self, piece):
        self.pieces.remove(piece)

    def dump_json(self):
    	ret_str = '['
        for each_piece in self.pieces:
        	ret_str += each_piece.get_json()
        	ret_str += ','
        if len(self.pieces) > 0:
            ret_str = ret_str[:-1]	# get rid of the last comma
        ret_str += ']'
        return ret_str

    def load_json(self,json_string):
        try:
            temp_dict = json.loads(json_string)
            for each_entry in temp_dict:
                new_piece = Piece()
                new_piece.load_from_dict(each_entry)
                self.add_piece(new_piece)
        except ValueError:
            print("invalid json")
            #return other sorts of error message BTW

    def __str__(self):
    	return self.dump_json()

