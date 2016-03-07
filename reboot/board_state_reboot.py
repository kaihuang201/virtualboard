import json

class Piece:
    def __init__(self, name, x, y, icon, color, piece_id):
        self.name = name
        self.x = x
        self.y = y
        self.icon = icon
        self.piece_id = piece_id
		self.color = color
		self.static = False

	def get_json_obj(self):
		return {
			"name" : self.name,
			"x" : self.x,
			"y" : self.y,
			"id" : self.piece_id,
			"icon" : self.icon,
			"color" : self.color,
			"static" : 1 if self.static else 0
		}

class BoardState:
	def __init__(self):
		#ordered list of pieces on board, with first element on bottom and last element on top
		self.pieces = []

		#a map from piece ids to indices in the pieces array
		self.piecemap = {}

		self.next_piece_id = 0

	#returns the newly generated piece
	def generate_new_piece(self, name="", x=0, y=0, icon="", color):
		piece = Piece(name, x, y, icon, color, self.next_piece_id)
		self.piecemap[self.next_piece_id] = len(self.pieces)
		self.pieces.append(piece)
		self.next_piece_id += 1
		return piece

	#returns false if the piece is not found, true otherwise
	def remove_piece(self, piece_id):
		if piece_id in self.piecemap:
			index = self.piecemap[piece_id]
			piece = self.pieces[index]
			self.bring_to_front(index)
			self.pieces.pop()
			del self.piecemap(piece.piece_id)
			return True
		else:
			return False

	#returns false if the piece is not found, true otherwise
	def push_to_back(self, piece_id):
		if piece_id in self.piecemap:
			index = self.piecemap[piece_id]
			piece = self.pieces[index]

			for i in range(index, 0, -1):
				self.pieces[i] = self.pieces[i-1]
				self.piecemap[self.pieces[i].piece_id] = i
			self.pieces[0] = piece
			self.piecemap[piece.piece_id] = 0
			return True
		else:
			return False

	#returns false if the piece is not found, true otherwise
	def bring_to_front(self, piece_id):
		if piece_id in self.piecemap:
			index = self.piecemap[piece_id]
			piece = self.pieces[index]

			for i in range(index, len(self.pieces)-1):
				self.pieces[i] = self.pieces[i+1]
				self.piecemap[self.pieces[i].piece_id] = i
			self.pieces[len(self.pieces)-1] = piece
			self.piecemap[piece.piece_id] = len(self.pieces)-1
			return True
		else:
			return False

	def get_json_obj(self):
		pieces_json = []

		for piece in self.pieces:
			pieces_json.append(piece.get_json())
		return {
			"board" : {
				"pieces" : pieces_json
			}
		}
