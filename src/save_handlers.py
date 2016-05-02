import json
import os
import datetime

from lobby import *

class DownloadStateHandler(tornado.web.RequestHandler):
	#Checks that the given key matches the lobby's password, and if it does initiates a download of the board state
    def get(self):
        lobby_id = int(self.get_argument("lobbyId"))
        key = self.get_argument("key")
        if games.has_key(lobby_id):
            if games[lobby_id].password == key:
                filename = str(datetime.datetime.now()) + ".vb"
                self.set_header('Content-Type', 'application/json')
                self.set_header('Content-Disposition', 'attachment; filename=' + filename)
                self.write(json.dumps(games[lobby_id].board_state.get_json_obj(True)))