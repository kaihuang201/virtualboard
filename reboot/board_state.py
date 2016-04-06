import random
import math

from deck import *
from private_zone import *

class Piece:
	def __init__(self, pieceData, id):
		#TODO: check for reasonable values
		print pieceData
		self.pos = pieceData["pos"]
		self.icon = pieceData["icon"]
		self.piece_id = id
		self.color = pieceData["color"]
		self.static = pieceData["static"] == 1
		self.rotation = pieceData["r"]
		self.size = pieceData["s"]

		self.isCard = False
		self.isDie = False

		if "cardData" in pieceData:
			self.isCard = True

			#cards are just a special case of decks where there is only one card
			self.cardData = Deck(pieceData["cardData"], self.icon)
			self.icon = self.cardData.get_icon()

		#I know dice is plural but "isDie" sounds awkward here, but still, it's proper english
		if "diceData" in pieceData:
			self.isDie = True
			self.max = pieceData["diceData"]["max"]

			#maybe also enforce positive integer here?
			#hopefully we can enforce that in json schema
			if self.max > 24:
				self.max = 24
			self.faces = []

			for i in range(0, 1 + self.max):
				if i >= len(pieceData["diceData"]["faces"]):
					break
				self.faces.append(pieceData["diceData"]["faces"][i])
		else:
			self.isDie = False
			self.icon = pieceData["icon"]

			if "cards" in pieceData:
				self.isDeck = True
				self.cards = pieceData["cards"]
			else:
				self.isDeck = False

	#complete - True for downloading the board state, false for sending to clients
	def get_json_obj(self, complete=False):
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
			data["cardData"] = self.cardData.get_json_obj(complete)

		if self.isDie:
			data["diceData"] = {
				"max" : self.max,
				"faces" : self.faces
			}
		return data

class BoardState:
	def __init__(self):
		#ordered list of pieces on board, with first element on bottom and last element on top
		self.pieces = []

		#a map from piece ids to indices in the pieces array
		self.piecemap = {}

		self.next_piece_id = 0

		self.private_zones = {}
		self.next_zone_id = 0
		self.background = ""

	#returns the newly generated piece
	#color is an array, but if you define an array as a default parameter it is static to the class, not the object
	def generate_new_piece(self, pieceData):
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
			self.bring_to_front(piece_id)
			self.pieces.pop()
			del self.piecemap[piece.piece_id]
			return True
		else:
			return False

	#returns the id of new zone
	def add_private_zone(self, x, y, width, height, rotation, color):
		new_zone = PrivateZone(x, y, width, height, rotation, color)
		self.private_zones[self.next_zone_id] = new_zone
		self.next_zone_id += 1
		return new_zone.id

	#returns false if the piece is not found, true otherwise
	def transform_piece(self, client, pieceData):
		piece_id = pieceData["piece"]

		if piece_id in self.piecemap:
			index = self.piecemap[piece_id]
			piece = self.pieces[index]

			if piece.color == [255, 255, 255] or piece.color == client.color:
				if "pos" in pieceData:
					piece.pos = pieceData["pos"]
					for zone in self.private_zones.iteritems():
						if zone.contains(piece.pos.x, piece.pos.y):
							piece.color = zone.color

					#only for positional changes do we bring the piece to the front
					#note that this also invalidates the index variable we have
					if not self.bring_to_front(piece.piece_id):
						raise Exception("error bringing transformed piece to front")

				if "r" in pieceData:
					piece.rotation = pieceData["r"]

				if "s" in pieceData:
					piece.size = pieceData["s"]

				if "static" in pieceData:
					piece.static = pieceData["static"] == 1

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
		self.pieces = []
		self.piecemap = {}

		#TODO: clear private zones

	#special pieces

	#returns value on success, None otherwise
	def roll_dice(self, piece_id):
		if piece_id in self.piecemap:
			index = self.piecemap[piece_id]
			piece = self.pieces[index]

			if piece.isDie:
				value = random.randint(0, piece.max-1)

				if value < len(piece.faces):
					piece.icon = faces[value]
				else:
					if piece.max < 7:
						piece.icon = "/static/img/die_face/small_die_face_" + str(value) + ".png"
					else:
						piece.icon = "/static/img/die_face/big_die_face_" + str(value) + ".png"
				return value
		return None

	#returns the revealed icon on success, None otherwise
	def flip_card(self, piece_id):
		if piece_id in self.piecemap:
			index = self.piecemap[piece_id]
			piece = self.pieces[index]

			if piece.isCard:
				piece.cardData.flip()
				piece.icon = piece.cardData.get_icon()
				return piece.icon
		return None

	#returns an object {new_piece, count, icon} on success, None otherwise
	#icon will be None if it does not change
	def draw_card(self, piece_id, rotation):
		if piece_id in self.piecemap:
			index = self.piecemap[piece_id]
			piece = self.pieces[index]

			if piece.isCard:
				data = piece.cardData.draw()

				if data is not None:
					icon_changed = False

					if piece.icon != piece.cardData.get_icon():
						piece.icon = piece.cardData.get_icon()
						icon_changed = True

					pos = list(piece.pos)

					if rotation is not None:
						#TODO: this may need adjusting
						pos[0] -= piece.size * math.cos(rotation)
						pos[1] -= piece.size * math.sin(rotation)

					new_piece = self.generate_new_piece({
						"icon" : data["back"] if data["face_down"] else data["icon"],
						"pos" : pos,
						"color" : list(piece.color),
						"r" : piece.rotation,
						"s" : piece.size,
						"static" : 0,
						"cardData" : {
							"count" : 1,
							"cards" : [
								{
									"faceDown" : data["face_down"],
									"icon" : data["icon"],
									"back" : data["back"]
								}
							]
						}
					})
					return {
						"new_piece" : new_piece,
						"icon" : piece.icon if icon_changed else None,
						"count" : piece.cardData.get_size()
					}
		return None

	#returns the revealed icon on success, None otherwise
	def shuffle_deck(self, piece_id):
		if piece_id in self.piecemap:
			index = self.piecemap[piece_id]
			piece = self.pieces[index]

			if piece.isCard:
				piece.cardData.shuffle()
				piece.icon = piece.cardData.get_icon()
				return piece.icon
		return None

	#returns an object {icon, count} describing the deck on success, None otherwise
	#note that the 'card' can actually be a deck of cards too
	def add_card_to_deck(self, card_id, deck_id):
		if card_id in self.piecemap and deck_id in self.piecemap:
			card_index = self.piecemap[card_id]
			deck_index = self.piecemap[deck_id]
			card = self.pieces[card_index]
			deck = self.pieces[deck_index]

			if card.isCard and deck.isCard and card_id != deck_id:
				deck.cardData.absorb(card.cardData)
				deck.icon = deck.cardData.get_icon()

				if not self.remove_piece(card_id):
					raise Exception("unable to remove absorbed card")
				return {
					"icon" : deck.icon,
					"count" : deck.cardData.get_size()
				}
		return None

	#complete is set to true when the board state is being saved
	def get_json_obj(self, complete=False):
		pieces_json = []

		for piece in self.pieces:
			pieces_json.append(piece.get_json_obj(complete))

		return {
			"background" : self.background,
			"privateZones" : [], #TODO
			"pieces" : pieces_json
		}

	def load_from_json(self, json_obj):
		self.background = json_obj["background"]
		self.pieces = []
		self.piecemap = {}
		self.next_piece_id = 0
		for piece_json in json_obj["pieces"]:
			self.generate_new_piece(piece_json)
