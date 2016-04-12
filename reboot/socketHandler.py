import tornado.web
import tornado.websocket
import json
import jsonschema

from lobby import *

class WebSocketGameHandler(tornado.websocket.WebSocketHandler):
	def open(self, *args):
		self.game = None
		self.name = None
		self.user_id = None

	def on_message(self, message):
		print(message)
		message_length = len(message)

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

		#Checking whether the message follows the protocol
		#schema = open("socket_protocol_schema.json").read()
		#try:
		#    jsonschema.validate(data, json.loads(schema))
		#except:
		#	print "bad json input, continuing anyway"
		#except jsonschema.ValidationError as e:
    	#	print e.message
		#except jsonschema.SchemaError as e:
    	#	print e

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
				hostData = data["data"]
				global next_game_id
				game = Game(hostData["gameName"], hostData["password"], self, next_game_id)
				games[game.game_id] = game
				next_game_id += 1
				game.connect(self, hostData["name"], hostData["color"], hostData["password"])
			elif data["type"] == "initJoin":
				game_id = data["data"]["gameID"];

				if game_id in games:
					game = games[game_id]
					joinData = data["data"]
					game.connect(self, joinData["name"], joinData["color"], joinData["password"]);
				else:
					response = {
						"type" : "error",
						"data" : [
							{
								"msg" : "Invalid game id"
							}
						]
					}
					self.write_message(json.dumps(response))
			elif data["type"] == "listGames":
				game_list = []

				for game_id, game in games.iteritems():
					game_list.append(game.get_basic_info())
				response = {
					"type" : "listGames",
					"data" : game_list
				}
				self.write_message(json.dumps(response))
			elif data["type"] == "gameIDExists":
				# check if a specific id exists
				targetID = data["data"]["gameID"]
				gameExists = 1 if targetID in games else 0
				pwd = (1 if games[targetID].password else 0) if gameExists else 0

				response = {
					"type" : "gameIDExists",
					"data" : {
							"gameIDExists" : gameExists,
							"name" : games[targetID].name if gameExists else "",
							"password" : pwd
					}
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

			if data["type"] == "chat":
				game.chat(self, data["data"])
			elif data["type"] == "beacon":
				game.beacon(self, data["data"])
			elif data["type"] == "pieceTransform" or data["type"] == "pt":

				#since pieceTransform messages make up >95% of all messages,
				#	it makes sense to have shorthands available
				for entry in data["data"]:
					if "p" in entry:
						entry["piece"] = entry["p"]

				game.pieceTransform(self, data["data"])
			elif data["type"] == "pieceAdd":
				game.pieceAdd(self, data["data"])
			elif data["type"] == "pieceRemove":
				game.pieceRemove(self, data["data"])
			elif data["type"] == "setBackground":
				game.setBackground(self, data["data"])
			elif data["type"] == "disconnect":
				game.disconnect(self, data["data"]["msg"])
				self.close() #maybe keep connection open instead for other stuff
			elif data["type"] == "changeColor":
				game.changeColor(self, data["data"])
			elif data["type"] == "listClients":
				#maybe the Game class should handle this too
				abridged_clients = game.get_abridged_clients(self)
				response = {
					"type" : "listClients",
					"data" : abridged_clients
				}
				self.write_message(json.dumps(response))

			#special piece interactions

			elif data["type"] == "rollDice":
				game.rollDice(self, data["data"])
			elif data["type"] == "flipCard":
				game.flipCard(self, data["data"])
			elif data["type"] == "addCardToDeck":
				game.addCardToDeck(self, data["data"])
			elif data["type"] == "drawCard":
				game.drawCard(self, data["data"])
			elif data["type"] == "shuffleDeck":
				game.shuffleDeck(self, data["data"])
			elif data["type"] == "drawScribble":
				print "todo"
				#Todo: Needs to be implemented
			elif data["type"] == "startTimer":
				game.startTimer(self, data["data"]["id"])
			elif data["type"] == "stopTimer":
				game.stopTimer(self, data["data"]["id"])
			elif data["type"] == "setTimer":
				game.setTimer(self, data["data"])

			#save and load related commands
			elif data["type"] == "requestSave":
				game.prepareToSave(self)
			elif data["type"] == "requestLoad":
				game.prepareToLoad(self)

			#host only commands
			#do not need to determine if client is host in this function, that is handled by the Game class

			elif data["type"] == "addPrivateZone":
				game.add_private_zone(self, data["data"])
			elif data["type"] == "removePrivateZone":
				game.remove_private_zone(self, data["data"])
			elif data["type"] == "changeHost":
				target = data["data"]["user"]
				message = data["data"]["msg"]
				game.chageHost(self, target, message)
			elif data["type"] == "announcement":
				game.announcement(self, data["data"]["msg"])
			elif data["type"] == "changeServerInfo":
				game.changeServerInfo(self, data["data"])
			elif data["type"] == "kickUser":
				target = data["data"]["user"]
				message = data["data"]["msg"]
				game.kickUser(self, target, message)
			elif data["type"] == "clearBoard":
				game.clearBoard(self);
			elif data["type"] == "closeServer":
				game.closeServer(self);
			elif data["type"] == "loadBoardState":
				game.loadBoardState(self, data["data"]);
			else:
				response = {
					"type" : "error",
					"data" : [
						{
							"msg" : "unknown command: " + data["type"]
						}
					]
				}
				self.write_message(json.dumps(response))

	def on_close(self):
		if self.game is not None:
			self.game.disconnect(self, "socket terminated")

class IndexHandler(tornado.web.RequestHandler):
	@tornado.web.asynchronous
	def get(request):
		request.render("index.html")

class IconProxyHandler(tornado.web.RequestHandler):
	@tornado.web.asynchronous
	def get(request):
		pass

class TestHandler(tornado.web.RequestHandler):
	@tornado.web.asynchronous
	def get(request):
		request.render("static/test/runalltests.html")