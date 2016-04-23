import tornado.web
import tornado.websocket
import tornado.ioloop
import json
import time
import datetime
import random
from copy import copy

from board_state import *
from movebuffer import *

json.encoder.FLOAT_REPR = lambda o: format(o, '.3f')

games = {}
next_game_id = 0

MOVE_TICK_DURATION = 0.05 #50 ms
#SAVE_RETRY_TIME = 1

#WHITE = [255, 255, 255]

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
		#self.save_key = 0
		#self.load_key = 0
		#self.save_in_process = False

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
				"color" : list(client.color),
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
		self.spam_timeout = tornado.ioloop.IOLoop.instance().add_timeout(datetime.timedelta(seconds=SPAM_FILTER_TIMEOUT), self.check_spam)

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
		new_client.color = tuple(color)
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
		board_data = self.board_state.get_json_obj(False)
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
					tornado.ioloop.IOLoop.instance().remove_timeout(self.movebuffer.flush_timeout)

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

	def message_colors(self, response, colors):
		for client in self.clients.itervalues():
			if client.color in colors:
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

	#BoardState has a similar function
	#should probably be rewritten to avoid duplicaton, oh well
	def client_can_interact(self, client, piece):
		private_colors = piece.get_private_colors()

		if private_colors:
			if client.color in private_colors:
				return True
			return False
		return True


	#==========
	# host only commands
	#==========

	def add_private_zone(self, client, zones):
		if client is None or self.host.user_id == client.user_id:
			new_zone_response = []
			enter_zone_response = []

			for zoneData in zones:
				zone = self.board_state.add_private_zone(zoneData)
				pieces = zone.pieces
				zone_response = zone.get_json_obj()

				if client:
					zone_response["user"] = client.user_id
				else:
					#technically this should be left out if the client is None
					zone_response["user"] = self.host.user_id

				new_zone_response.append(zone_response)

				for piece in pieces:
					entry = {
						"piece" : piece.piece_id,
						"zone" : zone.zone_id
					}

					if client:
						entry["user"] = client.user_id
					else:
						entry["user"] = self.host.user_id
					enter_zone_response.append(entry)

			if new_zone_response:
				response = {
					"type" : "addPrivateZone",
					"data" : new_zone_response
				}
				self.message_all(response);

			if enter_zone_response:
				response = {
					"type" : "enterPrivateZone",
					"data" : enter_zone_response
				}
				self.message_all(response);

		else:
			self.send_error(client, "Only the host can use that command")

	def remove_private_zone(self, client, zones):
		if client is None or self.host.user_id == client.user_id:
			remove_zone_response = []
			leave_zone_response = []
			piece_transform_response = []

			for zoneData in zones:
				zone_id = zoneData["id"]
				pieces = self.board_state.remove_private_zone(zone_id)

				if pieces is not None:
					remove_zone_response.append({
						"user" : client.user_id,
						"id" : zone_id
					})

					for piece in pieces:
						leave_zone_response.append({
							"piece" : piece.piece_id,
							"zone" : zone_id,
							"user" : client.user_id,
							"changes" : {} #TODO
						})

						#TODO: MAINTAIN ORDER
						transform_data = piece.get_transform_json()
						transform_data["user"] = client.user_id
						piece_transform_response.append(transform_data)

			if piece_transform_response:
				response = {
					"type" : "pieceTransform",
					"data" : piece_transform_response
				}
				self.message_all(response)

			#in theory we don't need this since if a zone is removed we know all the pieces in it are leaving
			if leave_zone_response:
				response = {
					"type" : "leavePrivateZone",
					"data" : leave_zone_response
				}
				self.message_all(response)

			if remove_zone_response:
				response = {
					"type" : "removePrivateZone",
					"data" : remove_zone_response
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
			#self.board_state.clear_board();
			#clearResponse = {
			#	"type" : "clearBoard"
			#}

			#self.message_all(clearResponse)


			#set background
			self.setBackground(self.host, {
				"icon" : boardData["background"]
			})

			zones = boardData["privateZones"]
			self.add_private_zone(self.host, zones)

			#load pieces
			pieces = boardData["pieces"]
			self.pieceAdd(self.host, pieces)
		else:
			self.send_error(client, "Only the host can use that command")

	def clearBoard(self, client):
		if client is None or self.host.user_id == client.user_id:
			for user_id, user in self.clients.iteritems():
				self.movebuffer.flush(user_id)

			self.board_state.clear_board()

			response = {
				"type" : "clearBoard"
			}
			self.message_all(response)

	def closeServer(self, client):
		if client is None or self.host.user_id == client.user_id:
			for user_id, user in self.clients.iteritems():
				self.kickUser(None, user_id, "Server is closing")
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

		for pieceData in pieces:
			piece_id = pieceData["piece"]
			piece = self.board_state.get_piece(piece_id)

			if piece and self.client_can_interact(client, piece):
				#was_in_private_zone = piece.in_private_zone
				#old_color = piece.color

				old_private_colors = piece.get_private_colors()
				result = self.board_state.transform_piece(pieceData)

				if result is not None:
					#print("TRANSFORM RESULT: " + str(result));

					#step 1: update private zones
					enter_zone_response = []
					leave_zone_response = []

					for zone_id in result["zones_entered"]:
						enter_zone_response.append({
							"piece" : piece_id,
							"zone" : zone_id,
							"user" : client.user_id
						})

					for zone_id in result["zones_left"]:
						leave_zone_response.append({
							"piece" : piece_id,
							"zone" : zone_id,
							"user" : client.user_id,
							"changes" : {} #TODO
						})

					if enter_zone_response:
						enter_response = {
							"type" : "enterPrivateZone",
							"data" : enter_zone_response
						}
						self.message_all(enter_response)

					if leave_zone_response:
						leave_response = {
							"type" : "leavePrivateZone",
							"data" : leave_zone_response
						}
						self.message_all(leave_response)

					#step 2: check to see if this piece needs a full transform

					#technically this can be done more efficiently, but it's still linear runtime
					new_private_colors = piece.get_private_colors()
					removed_colors = old_private_colors - new_private_colors

					if removed_colors:
						#print("REMOVED COLORS: " + str(removed_colors))
						#this is potentially inefficient, but the simplest way to maintain ordering
						transform_message = piece.get_transform_json()
						transform_message["user"] = client.user_id

						response = {
							"type" : "pt",
							"data" : [
								transform_message
							]
						}
						self.message_all(response)

						#since we are doing a full update, we can forget about the current move buffer
						self.movebuffer.remove(piece_id)
						continue

					data_entry = {
						"u" : client.user_id,
						"p" : piece_id
					}
					has_entries = False

					if "pos" in pieceData:
						#data_entry["pos"] = piece.pos
						self.movebuffer.add(piece_id, piece.pos, client.user_id)

						if self.movebuffer.flush_timeout is None:
							self.movebuffer.flush_timeout = tornado.ioloop.IOLoop.instance().add_callback(self.end_move_timeout)

					if "r" in pieceData:
						data_entry["r"] = piece.rotation
						has_entries = True

					if "s" in pieceData:
						data_entry["s"] = piece.size
						has_entries = True

					if "static" in pieceData:
						data_entry["static"] = 1 if piece.static else 0
						has_entries = True

					if "color" in pieceData:
						data_entry["color"] = piece.color
						has_entries = True

					if "icon" in pieceData:
						data_entry["icon"] = piece.icon
						has_entries = True

					if has_entries:
						response = {
							"type" : "pt",
							"data" : [
								data_entry
							]
						}

						if new_private_colors:
							self.message_colors(response, new_private_colors)
						else:
							self.message_all(response)
					'''
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
					'''
				else:
					self.send_error(client, "invalid action")
			else:
				self.send_error(client, "invalid piece id " + str(pieceData["piece"]))
	'''
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
	'''

	#this function must run on the main thread
	def end_move_timeout(self):
		instance = tornado.ioloop.IOLoop.instance()

		if self.movebuffer.flush_timeout is not None:
			instance.remove_timeout(self.movebuffer.flush_timeout)

		if self.movebuffer.has_entries():
			for user_id, client in self.clients.iteritems():
				if self.movebuffer.has_entries(user_id):
					piece_data_raw = self.movebuffer.flush(user_id)
					piece_data = []

					for item in piece_data_raw:
						if self.board_state.color_can_interact(client.color, item["p"]):
							piece_data.append(item)
					if piece_data:
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
		#self.message_color(piece.color, response)
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

	def updateTimer(self, timer_id):
		timer = self.board_state.get_piece(timer_id)
		if timer == None:
			return

		if timer.time == 0:
			tornado.ioloop.IOLoop.instance().remove_timeout(timer.timeout)
			timer.timeout = None
			timer.isRunning = False
		else:
			timer.time -= 1
			timer.timeout = tornado.ioloop.IOLoop.instance().add_timeout(datetime.timedelta(seconds=1), self.updateTimer, timer_id)

		response = {
			"type" : "setTimer",
			"data" : {
				"id" : timer_id,
				"time" : timer.time,
				"running" : 1 if timer.isRunning else 0
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

		response = {
			"type" : "setTimer",
			"data" : {
				"id" : timer_id,
				"time" : timer.time,
				"running" : 1 if timer.isRunning else 0
			}
		}
		self.message_all(response)

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

		response_data = {
			"type" : "setTimer",
			"data" : {
				"id" : timer_id,
				"time" : time
			}
		}

		self.message_all(response_data)

	def rollDice(self, client, pieces):
		client.spam_amount += 0.5 + 0.25*len(pieces)
		response_data = []
		for pieceData in pieces:
			piece_id = pieceData["piece"]
			result = self.board_state.roll_dice(piece_id)
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
			response = self.board_state.draw_card(piece_id, rotation)

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

	def flipCard(self, client, pieces):
		client.spam_amount += 0.5 + 0.25*len(pieces)
		#colored_response_data = {}
		#response_data = []
		for pieceData in pieces:
			piece_id = pieceData["piece"]
			piece = self.board_state.get_piece(piece_id)

			if piece and self.client_can_interact(client, piece):
				result = self.board_state.flip_card(piece_id)

				if result is not None:
					response = {
						"type" : "flipCard",
						"data" : [
							{
								"user" : client.user_id,
								"piece" : piece_id,
								"icon" : result
							}
						]
					}

					private_colors = piece.get_private_colors()

					if private_colors:
						self.message_colors(response, private_colors)
					else:
						self.message_all(response)
				else:
					self.send_error(client, "invalid move")

			else:
				self.send_error(client, "invalid deck: " + str(piece_id))
	'''




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
	'''

	def addCardToDeck(self, client, pieces):
		#TODO: spam protection needs to be more advanced here

		#should technically be an ordered dictionary but bleh
		deck_results = {}
		piece_remove_data = []

		for entry in pieces:
			deck_id = entry["deck"]
			card_id = entry["card"]

			if self.board_state.color_can_interact(client.color, card_id) and self.board_state.color_can_interact(client.color, deck_id):

				result = self.board_state.add_card_to_deck(card_id, deck_id)

				if result is not None:
					deck_results[deck_id] = result
					piece_remove_data.append({
						"user" : client.user_id,
						"piece" : card_id
					})
				else:
					self.send_error(client, "Invalid card and/or deck: " + str(card_id) + " " + str(deck_id))
			else:
				self.send_error(client, "You do not have permission to do this.")

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
			new_icon = self.board_state.shuffle_deck(piece_id)

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
		client.spam_amount += 10
		old_color = client.color
		client.color = tuple(colorData["color"])

		#TODO: this can potentially cause ordering desyncs, needs fix
		piece_updates = []

		for piece in self.board_state.pieces:
			piece_colors = piece.get_private_colors()

			if client.color in piece_colors and old_color not in piece_colors:
				transform_data = piece.get_transform_json()
				transform_data["user"] = client.user_id

				piece_updates.append(transform_data)

		if piece_updates:
			response = {
				"type" : "pt",
				"data" : piece_updates
			}
			client.write_message(json.dumps(response))

		response = {
			"type" : "changeColor",
			"data" : [
				{
					"user" : client.user_id,
					"color" : colorData["color"]
				}
			]
		}
		self.message_all(response)

	def prepareToSave(self, client):
		#if not self.save_in_process:
			#self.save_in_process = True
			#self.save_key = random.randint(0, KEY_MAX)
			#self.save_key = self.password

			response = {
				"type" : "savePrep",
				"data" : {
						"lobbyId" : self.game_id,
						"key" : self.password
				}
			}
			client.write_message(json.dumps(response))
		#else:
		#	tornado.ioloop.IOLoop.instance().add_timeout(datetime.timedelta(seconds=SAVE_RETRY_TIME), self.prepareToSave, client)
'''
	def prepareToLoad(self, client):
		if client.user_id == self.host.user_id:
			response = {
				"type" : "loadPrep",
				"data" : {
					"lobbyId" : self.game_id,
					"key" : self.password
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
'''
