import unittest
from private_zone import *
from board_state import *

WHITE = [255, 255, 255]

class TestPrivateZone(unittest.TestCase):

    def test_contains_simple(self):
        p = PrivateZone(0,0,1,1,0,[0,0,0])
        self.assertTrue(p.contains(0.49,0))
        self.assertTrue(p.contains(-0.49,0))
        self.assertTrue(p.contains(0,0.49))
        self.assertTrue(p.contains(0,-0.49))
        self.assertFalse(p.contains(1,1))

    def test_contains_rotated(self):
        p = PrivateZone(0,0,1,1,math.pi,[0,0,0])
        self.assertTrue(p.contains(0.49,0))
        self.assertTrue(p.contains(-0.49,0))
        self.assertTrue(p.contains(0,0.49))
        self.assertTrue(p.contains(0,-0.49))
        self.assertFalse(p.contains(1,1))

    def test_contains_translated(self):
        p = PrivateZone(1,1,1,1,0,[0,0,0])
        self.assertTrue(p.contains(1.49,1))
        self.assertTrue(p.contains(0.51,1))
        self.assertTrue(p.contains(1,1.49))
        self.assertTrue(p.contains(1, 0.51))
        self.assertFalse(p.contains(2,2))

    def test_contains_rotated_and_trandlated(self):
        p = PrivateZone(1,1,1,1,math.pi,[0,0,0])
        self.assertTrue(p.contains(1.49,1))
        self.assertTrue(p.contains(0.51,1))
        self.assertTrue(p.contains(1,1.49))
        self.assertTrue(p.contains(1, 0.51))
        self.assertFalse(p.contains(2,2))

    def test_add_piece(self):
        z = PrivateZone(0,0,1,1,0,[0,0,0])
        p = Piece({
                "pos" : [0.5, 0.5],
                "icon" : "static.img/someimg.png",
                "color" : WHITE,
                "static" : 0,
                "private" : 0,
                "r" : 0,
                "s" : 1
            }, 0)
        z.add_piece(p)
        expected = set()
        expected.add(p)
        self.assertTrue(z.pieces == expected)
        self.assertTrue(p.zone == z)
        self.assertTrue(p.color == z.color)

    def test_add_pieces(self):
        z = PrivateZone(0,0,1,1,0,[0,0,0])
        p1 = Piece({
                "pos" : [0.5, 0.5],
                "icon" : "static.img/someimg.png",
                "color" : WHITE,
                "static" : 0,
                "private" : 0,
                "r" : 0,
                "s" : 1
            }, 0)
        p2 = Piece({
                "pos" : [0.5, 0.5],
                "icon" : "static.img/someimg.png",
                "color" : WHITE,
                "static" : 0,
                "private" : 0,
                "r" : 0,
                "s" : 1
            }, 1)
        z.add_piece(p1)
        z.add_piece(p2)
        expected = set()
        expected.add(p1)
        expected.add(p2)
        self.assertTrue(z.pieces == expected)

    def test_add_duplicates(self):
        z = PrivateZone(0,0,1,1,0,[0,0,0])
        p = Piece({
                "pos" : [0.5, 0.5],
                "icon" : "static.img/someimg.png",
                "color" : WHITE,
                "static" : 0,
                "private" : 0,
                "r" : 0,
                "s" : 1
            }, 0)
        z.add_piece(p)
        z.add_piece(p)
        expected = set()
        expected.add(p)
        self.assertTrue(z.pieces == expected)
        self.assertTrue(p.zone == z)
        self.assertTrue(p.color == z.color)

    def test_remove_piece(self):
        z = PrivateZone(0,0,1,1,0,[0,0,0])
        p = Piece({
                "pos" : [0.5, 0.5],
                "icon" : "static.img/someimg.png",
                "color" : WHITE,
                "static" : 0,
                "private" : 0,
                "r" : 0,
                "s" : 1
            }, 0)
        z.add_piece(p)
        z.remove_piece(p)
        expected = set()
        self.assertTrue(z.pieces == expected)
        self.assertTrue(p.zone == None)
        self.assertTrue(p.color == WHITE)

    def test_remove_pieces(self):
        z = PrivateZone(0,0,1,1,0,[0,0,0])
        p1 = Piece({
                "pos" : [0.5, 0.5],
                "icon" : "static.img/someimg.png",
                "color" : WHITE,
                "static" : 0,
                "private" : 0,
                "r" : 0,
                "s" : 1
            }, 0)
        p2 = Piece({
                "pos" : [0.5, 0.5],
                "icon" : "static.img/someimg.png",
                "color" : WHITE,
                "static" : 0,
                "private" : 0,
                "r" : 0,
                "s" : 1
            }, 1)
        z.add_piece(p1)
        z.add_piece(p2)
        z.remove_piece(p1)
        z.remove_piece(p2)
        expected = set()
        self.assertTrue(z.pieces == expected)

    def test_remove_duplicates(self):
        z = PrivateZone(0,0,1,1,0,[0,0,0])
        p = Piece({
                "pos" : [0.5, 0.5],
                "icon" : "static.img/someimg.png",
                "color" : WHITE,
                "static" : 0,
                "private" : 0,
                "r" : 0,
                "s" : 1
            }, 0)
        z.add_piece(p)
        z.add_piece(p)
        z.remove_piece(p)
        expected = set()
        self.assertTrue(z.pieces == expected)
        self.assertTrue(p.zone == None)
        self.assertTrue(p.color == WHITE)


if __name__ == '__main__':
        unittest.main()