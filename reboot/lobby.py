import tornado.web
import tornado.websocket
import json
import time
import random

from board_state_reboot import *

json.encoder.FLOAT_REPR = lambda o: format(o, '.3f')

games = {}
next_game_id = 0

class Game:
	def __init__(self, name, password, host, id):
		self.clients = {}
		self.name = name
		self.password = password
		self.next_user_id = 0
		self.host = host
		self.game_id = id
		self.board_state = BoardState()

	def get_basic_info(self):
		data = {
			"id" : self.game_id,
			"name" : self.name,
			"players" : len(self.clients),
			"password" : 0 if self.password == "" else 1
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

	#an unfortunate mix of camelCase and snake_case
	def get_client_from_id(self, id):
		if id in self.clients:
			return self.clients[id];
		return None

	def connect(self, new_client, name, color, password):

		if not (self.host == new_client or (self.password and password == self.password)):
			response = {
				"type" : "initFailure",
				"data" : {
					"msg" : "Wrong password"
				}
			}
			new_client.write_message(json.dumps(response));
			return
		new_client.name = name;
		new_client.color = color;
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
		client.game = None
		#socket handler will take care of closing the connection

		if client.user_id == self.host.user_id:
			if len(self.clients) == 0:
				#rip server
				del games[self.game_id]
				return
			else:
				self.host = self.clients[0]
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
			response = {
				"type" : "error",
				"data" : [
					{
						"msg" : "Only the host can use that command"
					}
				]
			}
			client.write_message(json.dumps(response))

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
			response = {
				"type" : "error",
				"data" : [
					{
						"msg" : "Only the host can use that command"
					}
				]
			}
			client.write_message(json.dumps(response))

	def kickUser(self, client, target, message):
		if client is None or self.host.user_id == client.user_id:
			#yes the host can kick himself, why not
			victim = self.get_client_from_id(target)

			if victim is None:
				return
			self.disconnect(victim, "Kicked by host: " + message)
			victim.close()
		else:
			response = {
				"type" : "error",
				"data" : [
					{
						"msg" : "Only the host can use that command"
					}
				]
			}
			client.write_message(json.dumps(response))

	def changeServerInfo(self, client, data):
		if client is None or self.host.user_id == client.user_id:

			if "name" in data:
				self.name = data["name"]

			if "password" in data:
				self.password = data["password"]

			self.announce(None, "Server Information updated.");
		else:
			response = {
				"type" : "error",
				"data" : [
					{
						"msg" : "Only the host can use that command"
					}
				]
			}
			client.write_message(json.dumps(response))

	def loadBoardState(self, client, boardData):
		if client is None or self.host.user_id == client.user_id:
			#set background
			self.setBackground(self.host, {
				"icon" : boardData["background"]
			})

			#load pieces
			pieces = boardData["pieces"]
			self.pieceAdd(self.host, pieces);

			#TODO: private zones
		else:
			response = {
				"type" : "error",
				"data" : [
					{
						"msg" : "Only the host can use that command"
					}
				]
			}
			client.write_message(json.dumps(response))

	def clearBoard(self, client):
		if client is None or self.host.user_id == client.user_id:
			return
			#TODO

	def closeServer(self, client):
		if client is None or self.host.user_id == client.user_id:
			return
			#TODO
		else:
			response = {
				"type" : "error",
				"data" : [
					{
						"msg" : "Only the host can use that command"
					}
				]
			}
			client.write_message(json.dumps(response))

	#==========
	# general commands
	#==========

	def chat(self, client, messages):
		response_data = []
		current_time = time.time()

		for message_data in messages:
			response_data.append({
				"user" : client.user_id,
				"time" : current_time,
				"msg" : message_data["msg"]
			})

		response = {
			"type" : "chat",
			"data" : response_data
		}
		self.message_all(response)

	def beacon(self, client, beacons):
		response_data = []

		for beacon_data in beacons:
			response_data.append({
				"user" : client.user_id,
				"pos" : beacon_data["pos"]
			})

		response = {
			"type" : "beacon",
			"data" : response_data
		}
		self.message_all(response)

	def pieceTransform(self, client, pieces):
		response_data = []

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

				if "s" in pieceData:
					data_entry["s"] = piece.size

				if "static" in pieceData:
					data_entry["static"] = 1 if piece.static else 0

				if "color" in pieceData:
					data_entry["color"] = piece.color

				if "icon" in pieceData:
					data_entry["icon"] = piece.icon

				response_data.append(data_entry)
			else:
				error_data = {
					"type" : "error",
					"data" : [
						{
							"msg" : "invalid piece id " + id
						}
					]
				}
				client.write_message(json.dumps(error_data))

		response = {
			"type" : "pt",
			"data" : response_data
		}
		self.message_all(response);

	def pieceAdd(self, client, pieces):
		response_data = []

		for pieceData in pieces:
			piece = self.board_state.generate_new_piece(pieceData)
			data_entry = piece.get_json_obj()
			data_entry["user"] = client.user_id
			response_data.append(data_entry)

		response = {
			"type" : "pieceAdd",
			"data" : response_data
		}
		self.message_all(response)

	def pieceRemove(self, client, pieces):
		response_data = []

		for pieceData in pieces:
			id = pieceData["piece"]

			if self.board_state.remove_piece(id):
				response_data.append({
					"user" : client.user_id,
					"piece" : id
				})
			else:
				error_data = {
					"type" : "error",
					"data" : [
						{
							"msg" : "invalid piece id " + id
						}
					]
				}
				client.write_message(json.dumps(error_data))

		response = {
			"type" : "pieceRemove",
			"data" : response_data
		}
		self.message_all(response);


	#==========
	# special pieces
	#==========

	def rollDice(self, client, pieces):
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
				response_data.append({
					"user": client.user_id,
					"piece": piece_id,
					"result": new_value
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

	def flipCard(self, client, pieces):
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
				response_data.append({
					"user": client.user_id,
					"piece": piece_id,
					"front_icon": piece.front_icon
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


	#def toggleStatic(self, client, pieces):
	#	#TODO
	#	return

	def setBackground(self, client, backgroundData):
		self.board_state.background = backgroundData["icon"];

		response = {
			"type" : "setBackground",
			"data" : {
				"icon" : self.board_state.background
			}
		}
		self.message_all(response);

	#someone can give themselves a rainbow color by spamming this
	#whatever it probably looks sweet
	def changeColor(self, client, colorData):
		client.color = colorData["color"];

		response = {
			"type" : "changeColor",
			"data" : [
				{
					"user" : client.user_id,
					"color" : client.color
				}
			]
		}
		self.message_all(response);

	def dump_json(self):
		return self.board_state.dump_json()

	def load_json(self, json_string):
		self.board_state.load_json(json_string)

