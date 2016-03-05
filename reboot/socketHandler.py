import tornado.web
import tornado.websocket
import json

from lobby import *

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
				"data" : [
					data["data"]
				]
			}
			self.write_message(json.dumps(response))
		elif self.game is None:
			#TODO: error checking and format validation
			if data["type"] == "initHost":
				self.name = data["data"]["name"]
				self.color = data["data"]["color"]
				global next_game_id
				game = Game(data["data"]["gameName"], data["data"]["password"], self, next_game_id)
				games[game.game_id] = game
				next_game_id += 1
				game.connect(self)
			elif data["type"] == "initJoin":
				self.name = data["data"]["name"]
				self.color = data["data"]["color"]
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
				self.close() #maybe keep connection open instead for other stuff
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
