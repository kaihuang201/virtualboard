import tornado.web
import tornado.websocket
import tornado.ioloop
import json
import time
import datetime
import numpy
import os

from board_state import *
from movebuffer import *

json.encoder.FLOAT_REPR = lambda o: format(o, '.3f')

games = {}
next_game_id = 0

MOVE_TICK_DURATION = 0.05 #50 ms

#maximum allowed "spammable" actions per timeout
SPAM_FILTER_TIMEOUT = 1
SPAM_THRESHOLD_WARNING = 15
SPAM_THRESHOLD_KICK = 30

class Game:
	def __init__(self, name, password, host, id):
		self.clients = {}
		self.name = name
		self.password = password
		self.next_user_id = 0
		self.host = host
		self.game_id = id
		self.board_state = BoardState()
		self.movebuffer = MoveBuffer()
		self.spam_timeout = None

		#this is just to get the loop going
		tornado.ioloop.IOLoop.instance().add_callback(self.check_spam)

	def get_basic_info(self):
		data = {
			"id" : self.game_id,
			"name" : self.name,
			"players" : len(self.clients),
			"password" : 0 if self.password else 1
		}
		return data

	def get_abridged_clients(self, local):
		abridged_users = []

		for user_id, client in self.clients.iteritems():
			abridged_users.append({
				"user" : client.user_id,
				"name" : client.name,
				"color" : client.color,
				"host" : 1 if client.user_id == self.host.user_id else 0,
				"local" : 1 if local is not None and client.user_id == local.user_id else 0
			})
		return abridged_users

	def get_client_from_id(self, id):
		if id in self.clients:
			return self.clients[id]
		return None

	#this function must run on the main thread
	def check_spam(self):
		if self.spam_timeout is not None:
			tornado.ioloop.IOLoop.instance().remove_timeout(self.spam_timeout)

		victims = []
		for user_id, client in self.clients.iteritems():
			if user_id != self.host.user_id:
				if client.spam_amount >= SPAM_THRESHOLD_KICK:
					victims.append(user_id)
				elif client.spam_amount >= SPAM_THRESHOLD_WARNING:
					self.send_error(client, "Stop spamming or you may be kicked automatically")
			client.spam_amount = 0

		for user_id in victims:
			self.kickUser(None, user_id, "Excessive spamming")
		tornado.ioloop.IOLoop.instance().add_timeout(datetime.timedelta(seconds=SPAM_FILTER_TIMEOUT), self.check_spam)

	def connect(self, new_client, name, color, password):
		if self.password and not (self.host == new_client or password == self.password):
			response = {
				"type" : "initFailure",
				"data" : {
					"msg" : "Wrong password"
				}
			}
			new_client.write_message(json.dumps(response))
			return
		new_client.name = name
		new_client.color = color
		new_client.spam_amount = 0
		new_client.user_id = self.next_user_id
		self.next_user_id += 1
		new_client.game = self

		groupResponse = {
			"type" : "userConnect",
			"data" : [
				{
					"user" : new_client.user_id,
					"name" : new_client.name,
					"color" : new_client.color
				}
			]
		}
		self.message_all(groupResponse)

		#we add the client to self.clients after the message_all to avoid issues
		self.clients[new_client.user_id] = new_client
		self.movebuffer.add_client(new_client.user_id)

		abridged_users = self.get_abridged_clients(new_client)
		board_data = self.board_state.get_json_obj()
		mainResponse = {
			"type" : "initSuccess",
			"data" : {
				"gameName" : self.name,
				"gameID" : self.game_id,
				"users" : abridged_users,
				"board" : board_data
			}
		}
		new_client.write_message(json.dumps(mainResponse))

	def disconnect(self, client, reason):
		del self.clients[client.user_id]
		self.movebuffer.remove_client(client.user_id)
		client.game = None
		#socket handler will take care of closing the connection

		if client.user_id == self.host.user_id:
			if len(self.clients) == 0:
				#rip server
				if self.spam_timeout is not None:
					tornado.ioloop.IOLoop.instance().remove_timeout(self.spam_timeout)

				if self.movebuffer.flush_timeout is not None:
					instance.remove_timeout(self.movebuffer.flush_timeout)

				del games[self.game_id]
				return
			else:
				self.host = self.clients.itervalues().next()
				newHostMessage = {
					"type" : "changeHost",
					"data" : {
						"user" : self.host.user_id,
						"msg" : "Host disconnecting"
					}
				}
				self.message_all(newHostMessage)

		groupResponse = {
			"type" : "userDisconnect",
			"data" : [
				{
					"user" : client.user_id,
					"msg" : reason
				}
			]
		}
		self.message_all(groupResponse)

	def message_all(self, response):
		for user_id, client in self.clients.iteritems():
			client.write_message(json.dumps(response))

	def send_error(self, client, message):
		error_message = {
			"type" : "error",
			"data" : [
				{
					"msg" : message
				}
			]
		}
		client.write_message(json.dumps(error_message))

	#==========
	# host only commands
	#==========

	def changeHost(self, client, target, message):
		if self.host.user_id == client.user_id:
			new_host = self.get_client_from_id(target)

			if new_host is None or new_host.user_id == self.host.user_id:
				return
			self.host = new_host
			newHostMessage = {
				"type" : "changeHost",
				"data" : {
					"user" : self.host.user_id,
					"msg" : message
				}
			}
			self.message_all(newHostMessage)
		else:
			self.send_error(client, "Only the host can use that command")

	def announce(self, client, message):
		if client is None or self.host.user_id == client.user_id:
			announcement = {
				"type" : "announcement",
				"data" : [
					{
						"msg" : message
					}
				]
			}
			self.message_all(announcement)
		else:
			self.send_error(client, "Only the host can use that command")

	def kickUser(self, client, target, message):
		if client is None or self.host.user_id == client.user_id:
			#yes the host can kick himself, why not
			victim = self.get_client_from_id(target)

			if victim is None:
				return

			if client is None:
				self.disconnect(victim, "Kicked by server: " + message)
			else:
				self.disconnect(victim, "Kicked by host: " + message)
			victim.close()
		else:
			self.send_error(client, "Only the host can use that command")

	def changeServerInfo(self, client, data):
		if client is None or self.host.user_id == client.user_id:

			if "name" in data:
				self.name = data["name"]

			if "password" in data:
				self.password = data["password"]

			self.announce(None, "Server Information updated.")
		else:
			self.send_error(client, "Only the host can use that command")

	def loadBoardState(self, client, boardData):
		if client is None or self.host.user_id == client.user_id:
			#set background
			self.setBackground(self.host, {
				"icon" : boardData["background"]
			})

			#load pieces
			pieces = boardData["pieces"]
			self.pieceAdd(self.host, pieces)

			#TODO: private zones
		else:
			self.send_error(client, "Only the host can use that command")

	def clearBoard(self, client):
		if client is None or self.host.user_id == client.user_id:
			return
			#TODO
			#note that movebuffer needs to be cleared too

	def closeServer(self, client):
		if client is None or self.host.user_id == client.user_id:
			return
			#TODO
		else:
			self.send_error(client, "Only the host can use that command")

	#==========
	# general commands
	#==========

	def chat(self, client, messages):
		client.spam_amount += 1 + 1*len(messages)
		response_data = []
		current_time = time.time()

		for message_data in messages:
			response_data.append({
				"user" : client.user_id,
				"time" : current_time,
				"msg" : message_data["msg"]
			})

		if len(response_data) == 0:
			return

		response = {
			"type" : "chat",
			"data" : response_data
		}
		self.message_all(response)

	def beacon(self, client, beacons):
		client.spam_amount += 0.5 + 0.5*len(beacons)
		response_data = []

		for beacon_data in beacons:
			response_data.append({
				"user" : client.user_id,
				"pos" : beacon_data["pos"]
			})

		if len(response_data) == 0:
			return

		response = {
			"type" : "beacon",
			"data" : response_data
		}
		self.message_all(response)

	def pieceTransform(self, client, pieces):
		#client.spam_amount += 0.1 + 0.1*len(pieces)
		response_data = []
		move_only = True

		for pieceData in pieces:
			if self.board_state.transform_piece(pieceData):
				piece = self.board_state.get_piece(pieceData["piece"])
				data_entry = {
					"u" : client.user_id,
					"p" : piece.piece_id
				}

				if "pos" in pieceData:
					data_entry["pos"] = piece.pos

				if "r" in pieceData:
					data_entry["r"] = piece.rotation
					move_only = False

				if "s" in pieceData:
					data_entry["s"] = piece.size
					move_only = False

				if "static" in pieceData:
					data_entry["static"] = 1 if piece.static else 0
					move_only = False

				if "color" in pieceData:
					data_entry["color"] = piece.color
					move_only = False

				if "icon" in pieceData:
					data_entry["icon"] = piece.icon
					move_only = False

				response_data.append(data_entry)
			else:
				self.send_error(client, "invalid piece id " + str(id))

		if len(response_data) == 0:
			return

		if move_only:
			#buffer magic
			for pieceData in pieces:
				self.movebuffer.add(pieceData["piece"], pieceData["pos"], client.user_id)

			if self.movebuffer.flush_timeout is None:
				self.movebuffer.flush_timeout = tornado.ioloop.IOLoop.instance().add_callback(self.end_move_timeout)
		else:
			response = {
				"type" : "pt",
				"data" : response_data
			}
			self.message_all(response)

	#this function must run on the main thread
	def end_move_timeout(self):
		instance = tornado.ioloop.IOLoop.instance()

		if self.movebuffer.flush_timeout is not None:
			instance.remove_timeout(self.movebuffer.flush_timeout)

		if self.movebuffer.has_entries():
			for user_id, client in self.clients.iteritems():
				if self.movebuffer.has_entries(user_id):
					piece_data = self.movebuffer.flush(user_id)

					data = {
						"type" : "pt",
						"data" : piece_data
					}
					client.write_message(json.dumps(data))
			self.movebuffer.flush_timeout = instance.add_timeout(datetime.timedelta(seconds=MOVE_TICK_DURATION), self.end_move_timeout)
		else:
			#server is not very lively, we can just sit around
			self.movebuffer.flush_timeout = None

	def pieceAdd(self, client, pieces):
		client.spam_amount += 3 + 1.5*len(pieces)
		response_data = []

		for pieceData in pieces:
			piece = self.board_state.generate_new_piece(pieceData)
			data_entry = piece.get_json_obj()
			data_entry["user"] = client.user_id
			response_data.append(data_entry)

		if len(response_data) == 0:
			return

		response = {
			"type" : "pieceAdd",
			"data" : response_data
		}
		self.message_all(response)

	def pieceRemove(self, client, pieces):
		client.spam_amount += 0.5 + 0.1*len(pieces) #less spammable because it requires spam to already exist
		response_data = []

		for pieceData in pieces:
			id = pieceData["piece"]

			if self.board_state.remove_piece(id):
				self.movebuffer.remove(id)
				response_data.append({
					"user" : client.user_id,
					"piece" : id
				})
			else:
				self.send_error(client, "invalid piece id " + str(id))

		if len(response_data) == 0:
			return

		response = {
			"type" : "pieceRemove",
			"data" : response_data
		}
		self.message_all(response)


	#==========
	# special pieces
	#==========

	def rollDice(self, client, pieces):
		client.spam_amount += 0.5 + 0.25*len(pieces)
		response_data = []
		for pieceData in pieces:
			piece_id = pieceData["piece"]
			piece = self.board_state.get_piece(piece_id)
			if piece is None:
				error_data = {
					"type" : "error",
					"data" : [
						{
							"msg" : "invalid piece id " + id
						}
					]
				}
				client.write_message(json.dumps(error_data))
				return
			if piece.isDie:
				max_value = piece.max_roll
				new_value = random.randint(1, int(max_value))
				if int(max_value) < 7:
					new_img = "/static/img/die_face/small_die_face_" + str(new_value) + ".png"
				elif int(max_value) <= 24:
					new_img = "/static/img/die_face/big_die_face_" + str(new_value) + ".png"
				piece.icon = new_img
				response_data.append({
					"user": client.user_id,
					"piece": piece_id,
					"result": new_img
				})
			else:
				error_data = {
					"type" : "error",
					"data" : [
						{
							"msg" : "piece id " + id + " is not a die"
						}
					]
				}
				client.write_message(json.dumps(error_data))
				return

		response = {
			"type": "rollDice",
			"data": response_data
		}
		self.message_all(response)


	def createDeck(self, client, pieces):
		filename = os.path.abspath(os.path.join(os.path.dirname(__file__), 'static/json/cardmap.json'))
		with open(filename, "r") as card_json:
			card_map = json.loads(card_json.read())
		card_icons = []
		for key, val in card_map.iteritems():
			card_icons.append(val["front_clubs"])
			card_icons.append(val["front_diamonds"])
			card_icons.append(val["front_hearts"])
			card_icons.append(val["front_spades"])
		for piece in pieces:
			cards = card_icons
			numpy.random.shuffle(cards)
			piece["cards"] = cards
		self.pieceAdd(client, pieces)


	def drawCard(self, client, pieces):
		response_data = []
		for piece in pieces:
			piece_id = piece["piece"]
			deck_piece = self.board_state.get_piece(piece_id)
			if piece == None:
				error_data = {
					"type" : "error",
					"data" : [
						{
							"msg" : "invalid piece id " + id
						}
					]
				}
				client.write_message(json.dumps(error_data))
				return
			if deck_piece.isDeck:
				if len(deck_piece.cards) == 0:
					error_data = {
						"type" : "error",
						"data" : [
							{
								"msg" : "this deck (id = " + id +") is empty"
							}
						]
					}
					client.write_message(json.dumps(error_data))
					return
				new_card_icon = deck_piece.cards.pop(0)
				deck_count = len(deck_piece.cards)
				if deck_count == 0:
					self.pieceRemove(client, [{"piece" : piece_id}])
				new_card_data = {
					"pos" : [deck_piece.pos[0] + deck_piece.size + 1, deck_piece.pos[1]],
					"icon" : "/static/img/card/cardback.png",
					"front_icon" : new_card_icon,
					"color" : deck_piece.color,
					"static" : False,
					"s" : deck_piece.size,
					"r" : deck_piece.rotation
				}
				self.pieceAdd(client, [new_card_data])
				response_data.append({
					"id" : piece_id,
					"count" : deck_count
				})
			else:
				error_data = {
					"type" : "error",
					"data" : [
						{
							"msg" : "this piece (id = " + id +") is not a deck"
						}
					]
				}
				client.write_message(json.dumps(error_data))
				return
		'''response = {
			"type": "drawCard",
			"data": response_data
		}
		self.message_all(response)'''
				

	def flipCard(self, client, pieces):
		client.spam_amount += 0.5 + 0.5*len(pieces)
		response_data = []
		for pieceData in pieces:
			piece_id = pieceData["piece"]
			piece = self.board_state.get_piece(piece_id)
			if piece is None:
				error_data = {
					"type" : "error",
					"data" : [
						{
							"msg" : "invalid piece id " + id
						}
					]
				}
				client.write_message(json.dumps(error_data))
				return
			if piece.isCard:
				piece.faceup = not piece.faceup
				new_icon = piece.icon
				if piece.faceup:
					new_icon = piece.front_icon
				response_data.append({
					"user": client.user_id,
					"piece": piece_id,
					"front_icon": new_icon,
					"faceup": piece.faceup
				})
			else:
				error_data = {
					"type" : "error",
					"data" : [
						{
							"msg" : "piece id " + id + " is not a card"
						}
					]
				}
				client.write_message(json.dumps(error_data))
				return

		response = {
			"type": "flipCard",
			"data": response_data
		}
		self.message_all(response)

	def addCardToDeck(self, client, pieces):
		print pieces
		response_data = []
		for data in pieces:
			deck_id = data["deck"]
			deck = self.board_state.get_piece(deck_id)
			card_id = data["card"]
			card = self.board_state.get_piece(card_id)
			if deck == None:
				ids = deck_id
				if card == None:
					ids += ", " + card_id
				error_data = {
					"type" : "error",
					"data" : [
						{
							"msg" : "invalid piece id " + ids
						}
					]
				}
				client.write_message(json.dumps(error_data))
				return
			if deck.isDeck:
				if card.isCard:
					deck.cards.append(card.front_icon)
					self.pieceRemove(client, [{"piece" : card_id}])
					response_data.append({
						"id" : deck_id,
						"count" : len(deck.cards)
					})
				else:
					error_data = {
						"type" : "error",
						"data" : [
							{
								"msg" : "piece id " + card_id + " is not a card"
							}
						]
					}
					client.write_message(json.dumps(error_data))
					return
			else:
				msg = "piece id " + deck_id + " is not a deck"
				if not card.isCard:
					msg += ", piece_id " + card_id + " is not a card"
				error_data = {
					"type" : "error",
					"data" : [
						{
							"msg" : msg
						}
					]
				}
				client.write_message(json.dumps(error_data))
				return
		response = {
			"type" : "addCardToDeck",
			"data" : response_data
		}
		self.message_all(response)

	def shuffleDeck(self, client, pieces):
		response_data = []
		for piece in pieces:
			piece_id = pieceData["piece"]
			piece = self.board_state.get_piece(piece_id)
			if piece is None:
				error_data = {
					"type" : "error",
					"data" : [
						{
							"msg" : "invalid piece id " + id
						}
					]
				}
				client.write_message(json.dumps(error_data))
				return
			if piece.isDeck:
				numpy.shuffle(piece.cards)
				response_data.append({
					"user": client.user_id,
					"piece": piece_id
				})
			else:
				error_data = {
					"type" : "error",
					"data" : [
						{
							"msg" : "piece id " + id + " is not a deck"
						}
					]
				}
				client.write_message(json.dumps(error_data))
				return

		response = {
			"type" : "shuffleDeck",
			"data" : response_data
		}
		self.message_all(response)

	def setBackground(self, client, backgroundData):
		client.spam_amount += 3
		self.board_state.background = backgroundData["icon"]

		response = {
			"type" : "setBackground",
			"data" : {
				"icon" : self.board_state.background
			}
		}
		self.message_all(response)

	#someone can give themselves a rainbow color by spamming this
	#whatever it probably looks sweet
	def changeColor(self, client, colorData):
		client.spam_amount += 0.25
		client.color = colorData["color"]

		response = {
			"type" : "changeColor",
			"data" : [
				{
					"user" : client.user_id,
					"color" : client.color
				}
			]
		}
		self.message_all(response)

	def dump_json(self):
		return self.board_state.dump_json()

	def load_json(self, json_string):
		self.board_state.load_json(json_string)

