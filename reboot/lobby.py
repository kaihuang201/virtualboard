import tornado.web
import tornado.websocket
import json
import time

from board_state_reboot import *

games = {}
next_game_id = 0

class Game:
	def __init__(self, name, password, host, id):
		self.clients = []
		self.name = name
		self.password = password
		self.next_user_id = 0
		self.host = host
		self.game_id = id
		self.board_state = BoardState()

	def get_abridged_clients(self, local):
		abridged_users = []

		for client in self.clients:
			abridged_users.append({
				"id" : client.user_id,
				"name" : client.name,
				"color" : client.color,
				"host" : 1 if client.user_id == self.host.user_id else 0,
				"local" : 1 if local is not None and client.user_id == local.user_id else 0
			})
		return abridged_users

	def getClientFromID(self, id):
		for client in self.clients:
			if client.user_id == id:
				return client
		return None

	def connect(self, new_client):
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
		self.clients.append(new_client)

		abridged_users = self.get_abridged_clients(new_client)
		mainResponse = {
			"type" : "initSuccess",
			"data" : {
				"gameName" : self.name,
				"users" : abridged_users
			}
		}
		new_client.write_message(json.dumps(mainResponse))

	def disconnect(self, client, reason):
		self.clients.remove(client)

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
		for client in self.clients:
			client.write_message(json.dumps(response))

	#host only commands
	def changeHost(self, client, target, message):
		if self.host.user_id == client.user_id:
			new_host = self.getClientFromID(target)

			if new_host is None:
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

	def announce(self, client, message):
		if client is None or self.host.user_id == client.user_id:
			announcement = {
				"type" : "announcement",
				"data" : [
					{
						"msg", message
					}
				]
			}
			self.message_all(announcement)

	def kickUser(self, client, target, message):
		if client is None or self.host.user_id == client.user_id:
			#yes the host can kick himself
			victim = self.getClientFromID(target)

			if victim is None:
				return
			self.disconnect(victim, "Kicked by host: " + message)
			victim.close()

	def changeInfo(self, client, name, password):
		if client is None or self.host.user_id == client.user_id:
			self.name = name
			self.password = password

			self.announce(None, "Server Information updated.");

	def loadBoardState(self, client, boardInfo):
		if client is None or self.host.user_id == client.user_id:
			return
			#TODO

	def clearBoard(self, client):
		if client is None or self.host.user_id == client.user_id:
			return
			#TODO

	#general commands
	def chat(self, client, message):
		response = {
			"type" : "chat",
			"data" : [
				{
					"user" : client.user_id,
					"time" : time.time(),
					"msg" : message
				}
			]
		}
		self.message_all(response)

	def dump_json(self):
		return self.board_state.dump_json()

	def load_json(self, json_string):
		self.board_state.load_json(json_string)
