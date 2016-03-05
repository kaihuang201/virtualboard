#!/usr/bin/env python
import datetime
import json
import logging
import tornado.websocket
import uuid
import os
 
from tornado import gen
from django.utils.timezone import utc
from modules.message_buffer import MessageBuffer
from modules.board_state import BoardState

message_buffers = dict()
board_states = dict()
 
def create_board_state(lobby_id):
    if (not board_states.has_key(lobby_id)):
        board_states[lobby_id] = BoardState()

class MessageNewHandler(tornado.web.RequestHandler):
    def post(self, lobby_id):
        message = {
            "id": str(uuid.uuid4()),
            "body": self.get_argument("body"),
            "user_id": self.get_argument("user_id"),
        }
        # to_basestring is necessary for Python 3's json encoder,
        # which doesn't accept byte strings.
        if (message["body"] == None or message["body"] == ""):
            self.write("")
            return
        message["html"] = tornado.escape.to_basestring(
            self.render_string("message.html", message=message))
        if self.get_argument("next", None):
            self.redirect(self.get_argument("next"))
        else:
            self.write(message)
        if (not message_buffers.has_key(lobby_id)):
            logging.info("Creating buffer for lobby " + lobby_id)
            message_buffers[lobby_id] = MessageBuffer()
        logging.info("New message in lobby " + lobby_id)
        message_buffers[lobby_id].new_messages([message])


class MessageUpdatesHandler(tornado.web.RequestHandler):
    @gen.coroutine
    def post(self, lobby_id):
        cursor = self.get_argument("cursor", None)
        self.lobby_id = lobby_id
        # Save the future returned by wait_for_messages so we can cancel
        # it in wait_for_messages
        if (not message_buffers.has_key(self.lobby_id)):
            logging.info("Creating buffer for lobby " + self.lobby_id)
            message_buffers[self.lobby_id] = MessageBuffer()
        logging.info("Listening on lobby " + self.lobby_id)
        self.future = message_buffers[self.lobby_id].wait_for_messages(cursor=cursor)
        messages = yield self.future
        logging.info("Recieved message")
        if self.request.connection.stream.closed():
            return
        self.write(dict(messages=messages))

    def on_connection_close(self):
        if (message_buffers.has_key(self.lobby_id)):
            message_buffers[self.lobby_id].cancel_wait(self.future)

class MessageCacheHandler(tornado.web.RequestHandler):
    @gen.coroutine
    def post(self, lobby_id):
        if (message_buffers.has_key(lobby_id)):
            self.write(dict(messages=message_buffers[lobby_id].cache))
        else:
            self.write(dict(messages=[]))

class DownloadStateHandler(tornado.web.RequestHandler):
    def post(self, lobby_id):
        filename = "save.vb"
        self.set_header('Content-Type', 'application/octet-stream')
        self.set_header('Content-Disposition', 'attachment; filename=' + filename)
        create_board_state(lobby_id)
        self.write(board_states[lobby_id].dump_json())

class UploadStateHandler(tornado.web.RequestHandler):
    def post(self, lobby_id):
        savefile = self.request.files['upload'][0]
        filename = savefile['filename']
        extn = os.path.splitext(filename)[1]
        if (not extn == '.vb'):
            self.write("Incorrect file format, please upload a .vb save file")
            return

        save = savefile['body']

        create_board_state(lobby_id)
        success = board_states[lobby_id].load_json(save)
        if (not success):
            self.write("Save file is improperly formatted, VirtualBoard could not load the saved game")