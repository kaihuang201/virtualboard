import json
import os
import datetime

from lobby import *

class DownloadStateHandler(tornado.web.RequestHandler):
	#TODO: we should probably use the server password instead of a key
    def get(self):
        lobby_id = int(self.get_argument("lobbyId"))
        key = self.get_argument("key")
        if games.has_key(lobby_id):
            if games[lobby_id].password == key:
                filename = str(datetime.datetime.now()) + ".vb"
                self.set_header('Content-Type', 'application/json')
                self.set_header('Content-Disposition', 'attachment; filename=' + filename)
                self.write(json.dumps(games[lobby_id].board_state.get_json_obj(True)))