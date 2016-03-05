import os
import tornado.ioloop
import tornado.web
import tornado.websocket
import json
import time

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

	def get_abridged_clients(self, local):
		abridged_users = []

		for client in self.clients:
			abridged_users.append({
				"id" : client.user_id,
				"name" : client.name,
				"host" : 1 if client.user_id == self.host.user_id else 0,
				"local" : 1 if local is not None and client.user_id == local.user_id else 0
			})
		return abridged_users

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
					"color" : [
						255,
						0,
						0
					]
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
		#TODO: host reassignment
		self.clients.remove(client)

		groupResponse = {
			"type" : "userDisconnect",
			"data" : [
				{
					"user" : client.user_id,
					"message" : reason
				}
			]
		}
		self.message_all(groupResponse)

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

	def message_all(self, response):
		for client in self.clients:
			client.write_message(json.dumps(response))

class WebSocketGameHandler(tornado.websocket.WebSocketHandler):
	def open(self, *args):
		self.game = None
		self.name = None
		self.user_id = None

	def on_message(self, message):
		print(message)

		try:
			data = json.loads(message);
		except ValueError, e:
			response = {
				"type" : "error",
				"data" : [
					{
						"msg" : "invalid json message"
					}
				]
			}
			self.write_message(json.dumps(response));
			return

		if data["type"] == "ping":
			response = {
				"type" : "pong",
				"data" : data["data"]
			}
			self.write_message(json.dumps(response))
		elif self.game is None:
			#TODO: error checking
			if data["type"] == "initHost":
				self.name = data["data"]["name"]
				global next_game_id
				game = Game(data["data"]["gameName"], data["data"]["password"], self, next_game_id)
				games[game.game_id] = game
				next_game_id += 1
				game.connect(self)
			elif data["type"] == "initJoin":
				self.name = data["data"]["name"]
				game = games[data["data"]["gameID"]]
				game.connect(self)
			elif data["type"] == "listGames":
				game_list = []

				for game_id, game in games.iteritems():
					game_list.append({
						"id" : game_id,
						"name" : game.name,
						"players" : len(game.clients),
						"password" : 1 #to do clearly
					})
				response = {
					"type" : "listGames",
					"data" : game_list
				}
				self.write_message(json.dumps(response))
			else:
				response = {
					"type" : "error",
					"data" : [
						{
							"msg" : "unknown command"
						}
					]
				}
				self.write_message(json.dumps(response))
		else:
			game = self.game;
			#TODO: probably should use a switch statement instead
			if data["type"] == "chat":
				game.chat(self, data["data"]["msg"])
			elif data["type"] == "disconnect":
				game.disconnect(self, data["data"]["msg"])
				self.close()
			elif data["type"] == "listClients":
				abridged_clients = game.get_abridged_clients(self)
				response = {
					"type" : "listClients",
					"data" : abridged_clients
				}
				self.write_message(json.dumps(response))
			else:
				response = {
					"type" : "error",
					"data" : [
						{
							"msg" : "unknown command"
						}
					]
				}
				self.write_message(json.dumps(response))

	def on_close(self):
		if self.game is not None:
			self.game.disconnect(self, "socket terminated")

class SetupHandler(tornado.web.RequestHandler):
	@tornado.web.asynchronous
	def get(request):
		request.render("setup.html")

class IndexHandler(tornado.web.RequestHandler):
	@tornado.web.asynchronous
	def get(request):
		request.render("index.html")

settings = {
	"debug" : True
}

app = tornado.web.Application([
	(r"/game", WebSocketGameHandler),
	(r"/setup", SetupHandler),
	(r"/", IndexHandler),
	(r"/static/(.*)", tornado.web.StaticFileHandler, {"path": os.path.join(os.path.dirname(__file__), "static")}),
], settings)
app.listen(8000)
tornado.ioloop.IOLoop.instance().start()
