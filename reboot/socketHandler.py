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
					game_list.append(game.getBasicInfo())
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

			if data["type"] == "chat":
				game.chat(self, data["data"])
			elif data["type"] == "beacon":
				game.beacon(self, data["data"])
			elif data["type"] == "pieceTransform":
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
			elif data["type"] == "listClients":
				abridged_clients = game.get_abridged_clients(self)
				response = {
					"type" : "listClients",
					"data" : abridged_clients
				}
				self.write_message(json.dumps(response))

			#special piece interactions

			elif data["type"] == "rollDice":
				print "todo"
				#Todo: Needs to be implemented
			elif data["type"] == "flipCard":
				print "todo"
				#Todo: Needs to be implemented
			elif data["type"] == "createDeck":
				print "todo"
				#Todo: Needs to be implemented
			elif data["type"] == "addCardPieceToDeck":
				print "todo"
				#Todo: Needs to be implemented
			elif data["type"] == "addCardTypeToDeck":
				print "todo"
				#Todo: Needs to be implemented
			elif data["type"] == "drawCard":
				print "todo"
				#Todo: Needs to be implemented
			elif data["type"] == "createPrivateZone":
				print "todo"
				#Todo: Needs to be implemented
			elif data["type"] == "removePrivateZone":
				print "todo"
				#Todo: Needs to be implemented
			elif data["type"] == "drawScribble":
				print "todo"
				#Todo: Needs to be implemented

			#host only commands
			#do not need to determine if client is host in this function, that is handled by the Game class

			elif data["type"] == "changeHost":
				target = data["data"]["id"]
				message = data["data"]["msg"]
				game.chageHost(self, target, message)
			elif data["type"] == "announcement":
				game.announcement(self, data["data"]["msg"])
			elif data["type"] == "changeServerInfo":
				game.changeServerInfo(self, data["data"])
			elif data["type"] == "kickUser":
				target = data["data"]["id"]
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
							"msg" : "unknown command"
						}
					]
				}
				self.write_message(json.dumps(response))

	def on_close(self):
		if self.game is not None:
			self.game.disconnect(self, "socket terminated")

class SaveGameHandler(tornado.web.RequestHandler):
	def post(self):
		lobby_id = self.get_parameter("lobby_id")
		filename = "save.vb"
		self.set_header('Content-Type', 'application/octet-stream')
		self.set_header('Content-Disposition', 'attachment; filename=' + filename)
		if (games.has_key(lobby_id)):
			self.write(games[lobby_id].dump_json())

class LoadGameHandler(tornado.web.RequestHandler):
	def post(self):
		lobby_id = self.get_parameter("lobby_id")
		savefile = self.request.files['upload'][0]
		filename = savefile['filename']
		extn = os.path.splitext(filename)[1]
		if (not extn == '.vb'):
			self.write("Incorrect file format, please upload a .vb save file")
			return

		save = savefile['body']

		if (games.has_key(lobby_id)):
			success = games[lobby_id].load_json(save)
			if (not success):
				self.write("Save file is improperly formatted, VirtualBoard could not load the saved game")

class SetupHandler(tornado.web.RequestHandler):
	@tornado.web.asynchronous
	def get(request):
		request.render("setup.html")

class IndexHandler(tornado.web.RequestHandler):
	@tornado.web.asynchronous
	def get(request):
		request.render("index.html")
