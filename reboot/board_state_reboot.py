class Piece:
	def __init__(self, pieceData, id):
		#TODO: check for reasonable values

		self.pos = pieceData["pos"]
		self.icon = pieceData["icon"]
		self.piece_id = id
		self.color = pieceData["color"]
		self.static = pieceData["static"] == 1
		self.rotation = pieceData["r"]
		self.size = pieceData["s"]

		if "front_icon" in pieceData:
			#TODO
			self.isCard = True

			#front_icon is not in the socket protocol
			#if you want to change the protocol that is fine, but make sure to keep it consistent
			#and preferably run it by me first
			self.front_icon = pieceData["front_icon"]
		else:
			self.isCard = False

		#I know dice is plural but "isDie" sounds awkward here, but still, it's proper english

		#max_roll is also not part of the api
		#I also highly suggest you think about the values of cards and dice mainly in terms of images
		#and not in terms of values since images are what we really care about in the end
		#I strongly recommend you use the protocol I outlined, especially because many dice start from 0 and not 1
		if "max_roll" in pieceData:
			#TODO
			self.isDie = True
			self.max_roll = pieceData["max_roll"]
		else:
			self.isDie = False

		#We don't save the icon of a die because depending on its max value we may use text for it
		#just use an image with the number on it or ignore the icon field
		#we are definitely not going to throw exceptions everywhere in our code so we don't have to store a string
		#if not self.isDie:
		#	self.icon = pieceData["icon"]

	def get_json_obj(self):
		data = {
			"pos" : self.pos,
			"piece" : self.piece_id,
			"icon" : self.icon,
			"color" : self.color,
			"static" : 1 if self.static else 0,
			"r" : self.rotation,
			"s" : self.size
		}

		if self.isCard:
			data["front_icon"] = self.front_icon

		if self.isDie:
			data["max_roll"] = self.max_roll

		#if not self.isDie:
		#	data["icon"] = self.icon

		return data

class BoardState:
	def __init__(self):
		#ordered list of pieces on board, with first element on bottom and last element on top
		self.pieces = []

		#a map from piece ids to indices in the pieces array
		self.piecemap = {}

		self.next_piece_id = 0
		self.background = ""

	#returns the newly generated piece
	#color is an array, but if you define an array as a default parameter it is static to the class, not the object
	def generate_new_piece(self, pieceData): #name="", x=0, y=0, icon="", color):
		piece = Piece(pieceData, self.next_piece_id)
		self.piecemap[self.next_piece_id] = len(self.pieces)
		self.pieces.append(piece)
		self.next_piece_id += 1
		return piece

	#returns the piece corresponding to piece_id, or None if it does not exist
	def get_piece(self, piece_id):
		if piece_id in self.piecemap:
			index = self.piecemap[piece_id]
			piece = self.pieces[index]
			return piece
		else:
			return None

	#returns false if the piece is not found, true otherwise
	def remove_piece(self, piece_id):
		if piece_id in self.piecemap:
			index = self.piecemap[piece_id]
			piece = self.pieces[index]
			self.bring_to_front(index)
			self.pieces.pop()
			del self.piecemap[piece.piece_id]
			return True
		else:
			return False

	#returns false if the piece is not found, true otherwise
	#if we had the client's color, we could also do private zone filtering here block cheating, but oh well
	def transform_piece(self, pieceData):
		piece_id = pieceData["piece"]

		if piece_id in self.piecemap:
			index = self.piecemap[piece_id]
			piece = self.pieces[index]

			if "pos" in pieceData:
				piece.pos = pieceData["pos"]

				#only for positional changes do we bring the piece to the front
				#note that this also invalidates the index variable we have
				if not self.bring_to_front(piece.piece_id):
					print "error bringing transformed piece to front"

			if "r" in pieceData:
				piece.rotation = pieceData["r"]

			if "s" in pieceData:
				piece.size = pieceData["s"]

			if "static" in pieceData:
				piece.static = pieceData["s"] == 1

			if "color" in pieceData:
				piece.color = pieceData["color"]

			if "icon" in pieceData:
				piece.icon = pieceData["icon"]
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

	def clear_board(self):
		#TODO: maybe it's better to iterate through pieces and call remove_piece for each one
		self.pieces = [];
		self.piecemap = {};

		#TODO: clear private zones

	def get_json_obj(self):
		pieces_json = []

		for piece in self.pieces:
			pieces_json.append(piece.get_json_obj())

		return {
			"background" : self.background,
			"privateZones" : [], #TODO
			"pieces" : pieces_json
		}

