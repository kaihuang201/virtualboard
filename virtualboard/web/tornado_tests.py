import unittest, urllib, tornado.wsgi, django.core.handlers.wsgi, os, sys, re, time, threading

from tornado.testing import AsyncHTTPTestCase, gen_test, AsyncHTTPClient
from tornado.httputil import HTTPServerRequest
from django.core.wsgi import get_wsgi_application
from tornado_handlers import *
from modules.board_state import BoardState, Piece

sys.path.append("./..")
os.environ['DJANGO_SETTINGS_MODULE'] = 'virtualboard.settings'

django_wsgi_app = tornado.wsgi.WSGIContainer(get_wsgi_application())
settings = dict(
        template_path=os.path.join(os.path.dirname(__file__), "./template/web"),
        static_path=os.path.join(os.path.dirname(__file__), "./static"),
        xsrf_cookies=False,
        #debug=True,
        #cookie_secret=")r&u2_gbw4%wiyrv!7#6u0a-_axtp!i5j=q*ph-)p))yn_dk61",
    )
tornado_app = tornado.web.Application(
    [
        (r'^/([0-9]+)/message/new/$', MessageNewHandler),
        (r'^/([0-9]+)/message/updates/$', MessageUpdatesHandler),
        (r'^/([0-9]+)/message/loadcache/$', MessageCacheHandler),
        (r'^/([0-9]+)/save/$', DownloadStateHandler),
        (r'^/([0-9]+)/load/$', UploadStateHandler),
        ('.*', tornado.web.FallbackHandler, dict(fallback=django_wsgi_app)),
    ], **settings)

class TornadoBaseTest(AsyncHTTPTestCase):
    def setUp(self):
        AsyncHTTPTestCase.setUp(self)

    def get_app(self):
        return tornado_app

def new_message_request(self, lobby_id, message):
    post_args = {
        'body': message,
        'user_id': 'testuser',
    }
    response = self.fetch(
        '/' + lobby_id + '/message/new/',
        method='POST',
        body=urllib.urlencode(post_args),
        follow_redirects=False,
    )

    return response

class MessageNewHandlerTest(TornadoBaseTest):
    def test_new_message(self):
        response = new_message_request(self, '1', "This is a chat message")

        self.assertEquals(response.code, 200)
        response_buffer = response.buffer.read()
        expected = '^\{"body": "This is a chat message", "html": "<div class=\\\\"message\\\\" ' \
                    + 'id=\\\\".*\\\\">testuser: This is a chat message<\\\\/div>\\\\n", "user_id": '  \
                    + '"testuser", "id": ".*"\}'

        self.assertFalse(re.compile(expected).match(response_buffer) == None)

    def test_message_escaping(self):
        response = new_message_request(self, '2', "This <div> is </div> a \n chat message with ' special \" characters")

        self.assertEquals(response.code, 200)
        response_buffer = response.buffer.read()
        expected = '^\{"body": "This <div> is <\\\\/div> a \\\\n chat message with \' special \\\\" characters", "html": ' \
                    + '"<div class=\\\\"message\\\\" id=\\\\".*\\\\">testuser: This &lt;div&gt; is &lt;/div&gt; ' \
                    + 'a \\\\n chat message with &#39; special &quot; characters<\\\\/div>\\\\n", "user_id": '  \
                    + '"testuser", "id": ".*"\}'

        self.assertFalse(re.compile(expected).match(response_buffer) == None)

    def test_empty_message(self):
        response = new_message_request(self, '3', "")

        self.assertEquals(response.code, 200)
        response_buffer = response.buffer.read()
        self.assertEquals(response_buffer, "")


class MessageCacheHandlerTest(TornadoBaseTest):
    def test_load_cache(self):
        new_message_request(self, '1', "test message")

        post_args = {}
        response = self.fetch(
            '/1/message/loadcache/',
            method='POST',
            body=urllib.urlencode(post_args),
            follow_redirects=False,
        )

        self.assertEquals(response.code, 200)
        response_buffer = response.buffer.read()
        expected = '^\{"messages": \[\{"body": "test message", "html": ' \
                    + '"<div class=\\\\"message\\\\" id=\\\\".*\\\\">testuser: ' \
                    + 'test message<\\\\/div>\\\\n", "user_id": '  \
                    + '"testuser", "id": ".*"\}\]\}'

        self.assertFalse(re.compile(expected).match(response_buffer) == None)

    def test_load_many_from_cache(self):
        new_message_request(self, '2', "test message 1")
        new_message_request(self, '2', "test message 2")
        new_message_request(self, '2', "test message 3")
        new_message_request(self, '2', "test message 4")

        post_args = {}
        response = self.fetch(
            '/2/message/loadcache/',
            method='POST',
            body=urllib.urlencode(post_args),
            follow_redirects=False,
        )

        self.assertEquals(response.code, 200)
        response_buffer = response.buffer.read()
        expected = '^\{"messages": \[\{.*\}, \{.*\}, \{.*\}, \{.*\}]\}'

        self.assertFalse(re.compile(expected).match(response_buffer) == None)

    def test_load_none_from_cache(self):
        post_args = {}
        response = self.fetch(
            '/3/message/loadcache/',
            method='POST',
            body=urllib.urlencode(post_args),
            follow_redirects=False,
        )

        self.assertEquals(response.code, 200)
        response_buffer = response.buffer.read()
        expected = '^\{"messages": \[\]\}'

        self.assertFalse(re.compile(expected).match(response_buffer) == None)

class DownloadStateHandlerTest(TornadoBaseTest):
    def test_download_empty_state(self):
        post_args = {}
        response = self.fetch(
            '/1/save/',
            method='POST',
            body=urllib.urlencode(post_args),
            follow_redirects=False,
        )

        self.assertEquals(response.code, 200)
        response_buffer = response.buffer.read()
        self.assertEquals(response_buffer, '[]')

    def test_dump_non_empty(self):
        b = BoardState()
        p1 = Piece("pawn", 1, 1, 0, "", "nbpawn.png", 1)
        p2 = Piece("rook", 1, 2, 1, "", "nwrook.png", 2)
        p3 = Piece("knight", 2, 1, 3, "", "nbknight.png", 3)
        b.add_piece(p1)
        b.add_piece(p2)
        b.add_piece(p3)

        self.assertEquals(b.dump_json(), '[{"name": "pawn", "user": "", "y": 1, "x": 1, "z": 0, "piece_id": 1,' \
            + ' "icon": "nbpawn.png"},{"name": "rook", "user": "", "y": 2, "x": 1, "z": 1, "piece_id": 2, ' \
            + '"icon": "nwrook.png"},{"name": "knight", "user": "", "y": 1, "x": 2, "z": 3, "piece_id": 3, ' \
            + '"icon": "nbknight.png"}]')

class UploadStateHandler(TornadoBaseTest):
    def test_load_empty_save(self):
        b = BoardState()
        success = b.load_json("[]")

        self.assertTrue(success)
        self.assertEquals(b.get_pieces(), [])

    def test_load_non_empty_save(self):
        b = BoardState()
        success = b.load_json('[{"name": "pawn", "user": "", "y": 1, "x": 1, "z": 0, "piece_id": 1,' \
            + ' "icon": "nbpawn.png"},{"name": "rook", "user": "", "y": 2, "x": 1, "z": 1, "piece_id": 2, ' \
            + '"icon": "nwrook.png"},{"name": "knight", "user": "", "y": 1, "x": 2, "z": 3, "piece_id": 3, ' \
            + '"icon": "nbknight.png"}]')

        self.assertTrue(success)
        self.assertEquals(len(b.get_pieces()), 3)

        p1 = Piece("pawn", 1, 1, 0, "", "nbpawn.png", 1)
        p2 = Piece("rook", 1, 2, 1, "", "nwrook.png", 2)
        p3 = Piece("knight", 2, 1, 3, "", "nbknight.png", 3)

        b.remove_piece(p1)
        b.remove_piece(p2)
        b.remove_piece(p3)

        self.assertEquals(len(b.get_pieces()), 0)

    def test_load_bad_json(self):
        b = BoardState()
        success = b.load_json('[this isn;t how json should be formatted}')

        self.assertFalse(success)



if __name__ == '__main__':
    unittest.main()