import unittest
import time
from board_state import *
from lobby import *
from socketHandler import *

class fakeClient():

    def __init__(self):
        self.spam_amount = 0
        self.user_id = 0

class TestTimer(unittest.TestCase):

    lobby = Game("name", "", 0, 0)
    jsonTimer = {
                "timerData" :
                    {
                        "time" : 100,
                    },
                "pos" : [0.5, 0.5],
                "icon" : "static.img/someimg.png",
                "color" : WHITE,
                "static" : 0,
                "r" : 0,
                "s" : 7
            }

    def test_create_timer(self):
        timer = Piece(self.jsonTimer, 0)
        self.assertTrue(timer.isTimer)
        self.assertFalse(timer.isRunning)
        self.assertTrue(timer.time == 100)

    def test_create_timer_too_big(self):
        timer = Piece({
                "timerData" :
                    {
                        "time" : 9001,
                    },
                "pos" : [0.5, 0.5],
                "icon" : "static.img/someimg.png",
                "color" : WHITE,
                "static" : 0,
                "r" : 0,
                "s" : 7
            }, 0)
        self.assertTrue(timer.time == 3600)

    def test_start_timer(self):
        client = fakeClient()
        self.lobby.pieceAdd(client, [self.jsonTimer])
        timer = self.lobby.board_state.get_piece(0)
        self.lobby.startTimer(self, 0)
        self.assertTrue(timer.isRunning)
        self.lobby.stopTimer(self, 0)

    def test_stop_timer(self):
        client = fakeClient()
        self.lobby.pieceAdd(client, [self.jsonTimer])
        timer = self.lobby.board_state.get_piece(1)
        self.lobby.startTimer(self, 1)
        self.assertTrue(timer.isRunning)
        self.lobby.stopTimer(self, 1)
        self.assertFalse(timer.isRunning)

    def test_timer_countdown(self):
        client = fakeClient()
        self.lobby.pieceAdd(client, [self.jsonTimer])
        timer = self.lobby.board_state.get_piece(2)
        self.lobby.updateTimer(2)
        self.assertTrue(timer.time < 100)



if __name__ == '__main__':
        unittest.main()