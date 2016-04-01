import json
import os
import datetime

from lobby import *

class DownloadStateHandler(tornado.web.RequestHandler):
    def get(self):
        lobby_id = int(self.get_argument("lobbyId"))
        key = int(self.get_argument("key"))
        if games.has_key(lobby_id):
            if games[lobby_id].save_key == key:
                filename = str(datetime.datetime.now()) + ".vb"
                self.set_header('Content-Type', 'application/virtualboard')
                self.set_header('Content-Disposition', 'attachment; filename=' + filename)
                self.write(json.dumps(games[lobby_id].board_state.get_json_obj(True)))
            else:
                self.write("Incorrect key, expected " + str(games[lobby_id].save_key) + " but got " + str(key))
        else:
            self.write("Lobby " + str(lobby_id) + " does not exist")


class UploadStateHandler(tornado.web.RequestHandler):
    def post(self):
        lobby_id = int(self.get_argument("lobbyId"))
        key = int(self.get_argument("key"))
        if games.has_key(lobby_id):
            if games[lobby_id].load_key == key:
                savefile = self.request.files['upload'][0]
                filename = savefile['filename']
                extn = os.path.splitext(filename)[1]
                if (not extn == '.vb'):
                    self.write("Incorrect file format, please upload a .vb save file")
                    return

                save = savefile['body']
                games[lobby_id].load(save)
            else:
                self.write("Incorrect key, expected " + str(games[lobby_id].save_key) + " but got " + str(key))
        else:
            self.write("Lobby " + str(lobby_id) + " does not exist")
