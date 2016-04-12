import tornado.web
import tornado.websocket
import tornado.ioloop
import json
import time
import datetime
import random

from board_state import *
from movebuffer import *

json.encoder.FLOAT_REPR = lambda o: format(o, '.3f')

games = {}
next_game_id = 0

MOVE_TICK_DURATION = 0.05 #50 ms
KEY_MAX = 1000000000000000
SAVE_RETRY_TIME = 1

WHITE = [255, 255, 255]

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
		self.save_key = 0
		self.load_key = 0
		self.save_in_process = False

		#this is just to get the loop going
		tornado.ioloop.IOLoop.instance().add_callback(self.check_spam)

	def get_basic_info(self):
		data = {
			"id" : self.game_id,
			"name" : self.name,
			"players" : len(self.clients),
			"password" : 1 if self.password else 0
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
		board_data = self.board_state.get_json_obj(color=new_client.color)
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

	def message_color(self, color, response, compliment=False):
		for client in self.clients.itervalues():
			if (client.color == color) ^ compliment or color == WHITE:
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

	def add_private_zone(self, client, zoneData):
		if self.host.user_id == client.user_id:
			zoneData["id"], pieces = self.board_state.add_private_zone(zoneData["pos"]["x"], zoneData["pos"]["y"], \
				zoneData["width"], zoneData["height"], zoneData["rotation"], zoneData["color"])
			response = {
				"type" : "addPrivateZone",
				"data" : [zoneData]
			}
			self.message_all(response)

			response_data = []

			for piece in pieces:
				response_data.append({
					"user" : client.user_id,
					"piece" : piece.piece_id
				})

			response = {
				"type" : "pieceRemove",
				"data" : response_data
			}

			self.message_color(zoneData["color"], response, True)

		else:
			self.send_error(client, "Only the host can use that command")

	def remove_private_zone(self, client, zoneData):
		if self.host.user_id == client.user_id:
			color, pieces = self.board_state.remove_private_zone(zoneData["id"])
			if color != WHITE:
				if len(pieces) > 0:
					response_data = []

					for piece in pieces:
						data_entry = piece.get_json_obj()
						data_entry["user"] = client.user_id
						response_data.append(data_entry)

					if len(response_data) > 0:
						response = {
							"type" : "pieceAdd",
							"data" : response_data
						}
						self.message_color(color, response, True)

				response = {
					"type" : "removePrivateZone",
					"data" : {
						"id" : zoneData["id"]
					}
				}
				self.message_all(response)
		else:
			self.send_error(client, "Only the host can use that command")

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
		client.spam_amount += 0.1 + 0.1*len(pieces)
		response_data = []
		colored_response = dict()
		remove_response = dict()
		add_response = dict()
		response_empty = True
		move_only = True

		for pieceData in pieces:
			piece = self.board_state.get_piece(pieceData["piece"])
			if piece.color == WHITE or piece.color == client.color:
				was_in_private_zone = piece.in_private_zone
				old_color = piece.color
				if self.board_state.transform_piece(client, pieceData):
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

					# If the piece is in a private zone we need to tell all clients other
					# than the zone's owner that it is removed
					if piece.in_private_zone:
						if not remove_response.has_key(str(piece.color)):
							remove_response[str(piece.color)] = []

						if not colored_response.has_key(str(piece.color)):
							colored_response[str(piece.color)] = []

						remove_response[str(piece.color)].append({
							"user" : client.user_id,
							"piece" : piece.piece_id
						})
						colored_response[str(piece.color)].append(data_entry)
						response_empty = False
					else:
						if was_in_private_zone:
							if not add_response.has_key(str(old_color)):
								add_response[str(old_color)] = []

							add_data_entry = piece.get_json_obj()
							add_data_entry["user"] = client.user_id
							add_response[str(old_color)].append(add_data_entry)

						response_data.append(data_entry)
						response_empty = False
				else:
					self.send_error(client, "invalid piece id " + str(id))

		if response_empty:
			return

		if move_only:
			#buffer magic
			for pieceData in pieces:
				piece = self.board_state.get_piece(pieceData["piece"])
				if piece.color == WHITE or piece.color == client.color:
					self.movebuffer.add(pieceData["piece"], pieceData["pos"], client.user_id)

			if self.movebuffer.flush_timeout is None:
				self.movebuffer.flush_timeout = tornado.ioloop.IOLoop.instance().add_callback(self.end_move_timeout)
		else:
			client.spam_amount += 0.4 + 0.4*len(pieces)
			response = {
				"type" : "pt",
				"data" : response_data
			}
			self.message_all(response)

			for color, colored_response_data in colored_response.iteritems():
				response = {
					"type" : "pt",
					"data" : colored_response_data
				}
				self.message_color(eval(color), response)

		for color, remove_response_data in remove_response.iteritems():
			response = {
				"type" : "pieceRemove",
				"data" : remove_response_data
			}
			self.message_color(eval(color), response, True)

		for color, add_response_data in add_response.iteritems():
			response = {
				"type" : "pieceAdd",
				"data" : add_response_data
			}
			self.message_color(eval(color), response, True)

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
		self.message_color(piece.color, response)

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

	def updateTimer(self, timer_id):
		timer = self.board_state.get_piece(timer_id)
		if timer == None:
			return

		timer.time -= 1

		if timer.time == 0:
			tornado.ioloop.IOLoop.instance().remove_timeout(timer.timeout)
			timer.timeout = None
			timer.isRunning = False

		response = {
			"type" : "updateTimer",
			"data" : {
				"piece" : timer_id,
				"newTime" : timer.time
			}
		}
		self.message_all(response)

	def startTimer(self, client, timer_id):
		timer = self.board_state.get_piece(timer_id)
		if timer == None:
			self.send_error(client, "Timer does not exist")
			return

		timer.isRunning = True
		timer.timeout = tornado.ioloop.IOLoop.instance().add_timeout(datetime.timedelta(seconds=1), self.updateTimer, timer_id)

	def stopTimer(self, client, timer_id):
		timer = self.board_state.get_piece(timer_id)
		if timer == None:
			self.send_error(client, "Timer does not exist")
			return

		tornado.ioloop.IOLoop.instance().remove_timeout(timer.timeout)
			timer.timeout = None
			timer.isRunning = False

	def setTimer(self, client, timer_data):
		timer_id = timer_data["id"]
		time = timer_data["time"]

		timer = self.board_state.get_piece(timer_id)
		if timer == None:
			self.send_error(client, "Timer does not exist")
			return

		if timer.isRunning:
			self.stopTimer(client, timer_id)

		timer.time = time

	def rollDice(self, client, pieces):
		client.spam_amount += 0.5 + 0.25*len(pieces)
		response_data = []
		for pieceData in pieces:
			piece_id = pieceData["piece"]
			result = self.board_state.roll_dice(client, piece_id)
			if result is not None:
				response_data.append({
					"user" : client.user_id,
					"piece" : piece_id,
					"result" : result
				})
			else:
				self.send_error(client, "Invalid dice: " + str(piece_id))

		if len(response_data) == 0:
			return

		response = {
			"type" : "rollDice",
			"data" : response_data
		}
		self.message_all(response)

	def drawCard(self, client, pieces):
		#TODO: spam protection needs to be more advanced here

		#should technically be an ordered dictionary but bleh
		deck_results = {}
		piece_add_data = []

		for piece in pieces:
			piece_id = piece["piece"]

			if "cameraRotation" in piece:
				rotation = piece["cameraRotation"]
			else:
				rotation = None
			response = self.board_state.draw_card(client, piece_id, rotation)

			if response is not None:
				data = response["new_piece"].get_json_obj()
				data["user"] = client.user_id
				piece_add_data.append(data)

				deck_results[piece_id] = {
					"icon" : response["icon"],
					"count" : response["count"]
				}
			else:
				self.send_error(client, "invalid deck: " + str(piece_id))

		if len(piece_add_data) == 0:
			return

		#send the addpiece response first
		#this avoids some annoying edge cases
		deckcount_response = {
			"type" : "changeDeckCount",
			"data" : []
		}

		decktransform_response = {
			"type" : "pieceTransform",
			"data" : []
		}

		addpiece_response = {
			"type" : "pieceAdd",
			"data" : piece_add_data
		}

		for deck_id, result in deck_results.iteritems():
			deckcount_response["data"].append({
				"user" : client.user_id,
				"piece" : deck_id,
				"count" : result["count"]
			})
			if result["icon"] is not None:
				decktransform_response["data"].append({
					"user" : client.user_id,
					"piece" : deck_id,
					"icon" : result["icon"]
				})

		#TODO: don't generate decktransform responses when not needed
		self.message_all(addpiece_response)
		self.message_all(deckcount_response)

		if len(decktransform_response["data"]) > 0:
			self.message_all(decktransform_response)

	def addTimer(self, client, data):


	def flipCard(self, client, pieces):
		client.spam_amount += 0.5 + 0.25*len(pieces)
		colored_response_data = {}
		response_data = []
		for pieceData in pieces:
			piece_id = pieceData["piece"]
			result = self.board_state.flip_card(client, piece_id)

			if result is None:
				self.send_error(client, "invalid deck: " + str(piece_id))
			else:
				color = self.board_state.get_piece(piece_id).color
				if color == WHITE:
					response_data.append({
						"user" : client.user_id,
						"piece" : piece_id,
						"icon" : result
					})
				else:
					if not colored_response_data.has_key(str(color)):
						colored_response_data[str(color)] = []

					colored_response_data[str(color)].append({
						"user" : client.user_id,
						"piece" : piece_id,
						"icon" : result
					})

		if len(response_data) > 0:
			response = {
				"type" : "flipCard",
				"data" : response_data
			}
			self.message_all(response)

		if len(colored_response_data) > 0:
			for color, response_data in colored_response_data:
				response = {
					"type" : "flipCard",
					"data" : response_data
				}
				self.message_color(eval(color), response)

	def addCardToDeck(self, client, pieces):
		#TODO: spam protection needs to be more advanced here

		#should technically be an ordered dictionary but bleh
		deck_results = {}
		piece_remove_data = []

		for entry in pieces:
			deck_id = entry["deck"]
			card_id = entry["card"]

			result = self.board_state.add_card_to_deck(client, card_id, deck_id)

			if result is not None:
				deck_results[deck_id] = result
				piece_remove_data.append({
					"user" : client.user_id,
					"piece" : card_id
				})
			else:
				self.send_error(client, "Invalid card and/or deck: " + str(card_id) + " " + str(deck_id))

		if len(piece_remove_data) == 0:
			return

		#send the changeDeckCount and pieceTransform messages first
		#this avoids any edge cases caused by the pieceRemove messages
		deckcount_response = {
			"type" : "changeDeckCount",
			"data" : []
		}

		decktransform_response = {
			"type" : "pieceTransform",
			"data" : []
		}

		removepiece_response = {
			"type" : "pieceRemove",
			"data" : piece_remove_data
		}

		for deck_id, result in deck_results.iteritems():
			deckcount_response["data"].append({
				"user" : client.user_id,
				"piece" : deck_id,
				"count" : result["count"]
			})
			if result["icon"] is not None:
				decktransform_response["data"].append({
					"user" : client.user_id,
					"piece" : deck_id,
					"icon" : result["icon"]
				})

		#TODO: don't generate decktransform responses when not needed
		self.message_all(deckcount_response)

		if len(decktransform_response["data"]) > 0:
			self.message_all(decktransform_response)
		self.message_all(removepiece_response)

	def shuffleDeck(self, client, pieces):
		response_data = []
		for piece in pieces:
			piece_id = piece["piece"]
			new_icon = self.board_state.shuffle_deck(client, piece_id)

			if new_icon is not None:
				response_data.append({
					"user" : client.user_id,
					"piece" : piece_id,
					"icon" : new_icon
				})
			else:
				self.send_error(client, "invalid deck id: " + piece_id)

		if len(response_data) == 0:
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

	def prepareToSave(self, client):
		if not self.save_in_process:
			self.save_in_process = True
			self.save_key = random.randint(0, KEY_MAX)

			response = {
				"type" : "savePrep",
				"data" : {
						"lobbyId" : self.game_id,
						"key" : self.save_key
					}
			}
			client.write_message(json.dumps(response))
		else:
			tornado.ioloop.IOLoop.instance().add_timeout(datetime.timedelta(seconds=SAVE_RETRY_TIME), self.prepareToSave, client)

	def prepareToLoad(self, client):
		if client.user_id == self.host.user_id:
			self.load_key = random.randint(0, KEY_MAX)
			response = {
				"type" : "loadPrep",
				"data" : {
					"lobbyId" : self.game_id,
					"key" : self.load_key
				}
			}
			client.write_message(json.dumps(response))
		else:
			response = {
				"type" : "error",
				"data" : [
					{
						"msg": "Only host can load a game"
					}
				]
			}
			client.write_message(json.dumps(response))

	def load(self, json_str):
		for client in self.clients:
			self.movebuffer.flush(client)
		self.board_state.load_from_json(json.loads(json_str))

		clearResponse = {
			"type" : "clearBoard"
		}

		self.message_all(clearResponse)

		#set background
		self.setBackground(self.host, {
			"icon" : self.board_state.background
		})

		colors = set()
		for user_id, client in self.clients.iteritems():
			colors.add(str(client.color))

		for color in colors:
			response_data = []

			for piece in self.board_state.pieces:
				data_entry = piece.get_json_obj()
				data_entry["user"] = self.host.user_id
				if data_entry["color"] == WHITE or data_entry["color"] == eval(color):
					response_data.append(data_entry)

			if len(response_data) > 0:
				response = {
					"type" : "pieceAdd",
					"data" : response_data
				}
				self.message_color(eval(color), response)

		response_data = []

		for zone_id, zone in self.board_state.private_zones.iteritems():
			zoneData = zone.get_json_obj()
			zoneData["id"] = zone_id
			response_data.append(zoneData)

		if len(response_data) > 0:
			response = {
				"type" : "addPrivateZone",
				"data" : response_data
			}
			self.message_all(response)

