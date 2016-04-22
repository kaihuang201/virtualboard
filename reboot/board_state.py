import random
import math

from copy import copy

from deck import *
from private_zone import *

#WHITE = [255, 255, 255]

class Piece:
	def __init__(self, pieceData, id):
		#TODO: check for reasonable values
		print pieceData
		self.pos = pieceData["pos"]
		self.icon = pieceData["icon"]
		self.piece_id = id
		self.color = tuple(pieceData["color"])
		self.static = pieceData["static"] == 1
		self.rotation = pieceData["r"]
		self.size = pieceData["s"]

		#set of zone objects this piece is in
		self.zones = set()

		#the set of PERMANENT colors that can interact with this piece
		#users with a color in private_colors or zones can interact with this piece
		self.private_colors = set()

		#changes that have been made to this piece while in a private zone
		#not yet implemented
		self.private_changes = {}

		self.isTimer = False
		self.isCard = False
		self.isDie = False
		self.isRunning = False
		self.timeout = None

		#TODO: NOT YET IMPLEMENTED ON FRONT END
		if "private" in pieceData:
			#self.always_private = pieceData["private"] == 1
			for color in pieceData["private"]:
				self.private_colors.add(tuple(color))

		if "timerData" in pieceData:
			self.isTimer = True
			self.time = min(pieceData["timerData"]["time"], 3600)
			self.isRunning = False
			self.timeout = None

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

	def get_private_colors(self):
		s = copy(self.private_colors)

		for zone in self.zones:
			s.add(zone.color)
		return s

	#complete - True for downloading the board state, false for sending to clients
	def get_json_obj(self, complete=False):
		data = self.get_transform_json()

		if self.isCard:
			data["cardData"] = self.cardData.get_json_obj(complete)

		if self.isDie:
			data["diceData"] = {
				"max" : self.max,
				"faces" : self.faces
			}

		if self.isTimer:
			data["timerData"] = {
				"time" : self.time,
				"running" : self.isRunning
			}

		if complete:
			if self.private_colors:
				data["private"] = []

				for color in self.private_colors:
					data["private"].append(list(color))
		return data

	def get_transform_json(self):
		data = {
			"pos" : self.pos,
			"piece" : self.piece_id,
			"icon" : self.icon,
			"color" : list(self.color),
			"static" : 1 if self.static else 0,
			"r" : self.rotation,
			"s" : self.size
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

	#Game has a similar function
	#should probably be rewritten to avoid duplicaton, oh well
	def color_can_interact(self, color, piece_id):
		piece = self.get_piece(piece_id)

		if not piece:
			return False
		private_colors = piece.get_private_colors()

		if private_colors:
			if color in private_colors:
				return True
			return False
		return True

	#returns the newly generated piece
	#color is an array, but if you define an array as a default parameter it is static to the class, not the object
	def generate_new_piece(self, pieceData):
		piece = Piece(pieceData, self.next_piece_id)
		self.piecemap[self.next_piece_id] = len(self.pieces)
		self.pieces.append(piece)
		self.next_piece_id += 1

		for zone in self.private_zones.itervalues():
			if zone.contains(piece.pos[0], piece.pos[1]):
				zone.add_piece(piece)

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

			for zone in piece.zones:
				zone.remove_piece(piece)

			self.bring_to_front(piece_id)
			self.pieces.pop()
			del self.piecemap[piece.piece_id]
			return True
		else:
			return False

	#returns the id of new zone
	def add_private_zone(self, zoneData):
		new_zone = PrivateZone(zoneData, self.next_zone_id)
		self.private_zones[self.next_zone_id] = new_zone
		self.next_zone_id += 1

		for piece in self.pieces:
			if new_zone.contains(piece.pos[0], piece.pos[1]):
				new_zone.add_piece(piece)

		return new_zone

	# returns all pieces in the zone, and the color of the zone
	def remove_private_zone(self, zone_id):
		if self.private_zones.has_key(zone_id):
			zone = self.private_zones[zone_id]
			color = zone.color
			pieces = zone.pieces

			for piece in pieces:
				piece.zones.remove(zone)

			del self.private_zones[zone_id]
			return pieces
		else:
			return None

	#returns None if the piece is not found, otherwise:
	# {"zones_entered": [], "zones_left" : []}
	def transform_piece(self, pieceData):
		piece_id = pieceData["piece"]

		if piece_id in self.piecemap:
			index = self.piecemap[piece_id]
			piece = self.pieces[index]
			zones_left = []
			zones_entered = []

			if "pos" in pieceData:
				piece.pos = pieceData["pos"]

				for zone in self.private_zones.itervalues():
					if zone in piece.zones:
						if not zone.contains(piece.pos[0], piece.pos[1]):
							zone.remove_piece(piece)
							zones_left.append(zone.zone_id)
					else:
						if zone.contains(piece.pos[0], piece.pos[1]):
							zone.add_piece(piece)
							zones_entered.append(zone.zone_id)

				#piece.in_private_zone = False

				# Typically we will reset the piece's color to white until we determine if it is
				# stil in a private zone, however if it is a permanently private piece, we do not
				# reset the color 
				#if piece.zone != None:
				#	piece.zone.remove_piece(piece)

				#for zone in self.private_zones.itervalues():
				#	if zone.contains(piece.pos[0], piece.pos[1]):
				#		zone.add_piece(piece)

				#only for positional changes do we bring the piece to the front
				#note that this also invalidates the index variable we have
				#if not self.bring_to_front(piece.piece_id):
				#	raise Exception("error bringing transformed piece to front")

			if "r" in pieceData:
				piece.rotation = pieceData["r"]

			if "s" in pieceData:
				piece.size = pieceData["s"]

			if "static" in pieceData:
				piece.static = pieceData["static"] == 1

			if "color" in pieceData and not piece.in_private_zone:
				piece.color = pieceData["color"]
				piece.always_private = True

			if "icon" in pieceData:
				piece.icon = pieceData["icon"]

			#who needs tuples anyway
			return {
				"zones_entered" : zones_entered,
				"zones_left" : zones_left
			}
		else:
			return None

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
		#NOTE: do not reset piece ids or zone ids
		self.pieces = []
		self.piecemap = {}
		self.private_zones = {}

	#==========
	#special pieces
	#==========

	#returns value on success, None otherwise
	def roll_dice(self, piece_id):
		if piece_id in self.piecemap:
			index = self.piecemap[piece_id]
			piece = self.pieces[index]

			if piece.isDie: # and (piece.color == WHITE or piece.color == client.color):
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

			if piece.isCard: # and (piece.color == WHITE or piece.color == client.color):
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

			if piece.isCard: # and (piece.color == WHITE or piece.color == client.color):
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

			if piece.isCard: # and (piece.color == WHITE or piece.color == client.color):
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
				#and (card.color == WHITE or card.color == client.color)
				#and (deck.color == WHITE or deck.color == client.color)):
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
			#if color == WHITE or color == piece.color or piece.color == WHITE or not piece.in_private_zone:
			pieces_json.append(piece.get_json_obj(complete))

		zones_json = []

		for zone_id, zone in self.private_zones.iteritems():
			zone_json = zone.get_json_obj()
			zone_json["id"] = zone_id
			zones_json.append(zone_json)

		return {
			"background" : self.background,
			"privateZones" : zones_json,
			"pieces" : pieces_json
		}

