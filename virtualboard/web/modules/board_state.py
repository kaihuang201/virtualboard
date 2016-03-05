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

    def __eq__(self, other):
        if isinstance(other, self.__class__):
            return self.__dict__ == other.__dict__
        else:
            return False

    def __ne__(self, other):
        return not self.__eq__(other)

    def set_name(self, new_name):
        self.name = new_name

    def set_x(self, new_x):
        self.x = new_x

    def set_y(self, new_y):
        self.y = new_y

    def set_z(self, new_z):
        self.z = new_z

    def set_user(self, new_user):
        self.user = new_user

    def set_icon(self, new_icon):
        self.icon = new_icon

    def set_piece_id(self, new_id):
        self.piece_id = new_id

    def get_name(self):
        return self.name

    def get_x(self):
        return self.x

    def get_y(self):
        return self.y

    def get_z(self):
        return self.z

    def get_user(self):
        return self.user

    def get_icon(self):
        return self.icon

    def get_piece_id(self):
        return self.piece_id

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

    def get_pieces(self):
        return self.pieces

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
            return True
        except ValueError:
            print("invalid json")
            return False
            #return other sorts of error message BTW

    def __str__(self):
    	return self.dump_json()

