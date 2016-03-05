from django.test import TestCase

from modules.board_state import *


class TestBoardState(TestCase):
	def test_piece_funcitons(self):
		a = Piece('a',1,2,3,'sd','abcicon',321)
		a_expected_output = '{"name": "a", "user": "sd", "y": 2, "x": 1, "z": 3, "piece_id": 321, "icon": "abcicon"}'
		self.assertEqual(a.get_json(),a_expected_output)

		b = Piece()
		b.load_from_json(a.get_json())
		self.assertEqual(b.get_json(),a.get_json())
		self.assertEqual(a.get_dict(),b.get_dict())

		c = Piece('c',3,2,3,'sd','bbbbbicon',12)
		self.assertNotEqual(c.get_json(),b.get_json())

	def test_board_state_json_functions(self):
		test_board = BoardState()
		self.assertEqual(test_board.dump_json(),'[]')
		a = Piece('a',1,2,3,'sd','abcicon',321)
		b = Piece('b',2,2,3,'sd','bbbicon',1)
		test_board.add_piece(a)
		self.assertEqual(test_board.dump_json(),'[{"name": "a", "user": "sd", "y": 2, "x": 1, "z": 3, "piece_id": 321, "icon": "abcicon"}]')
		test_board.add_piece(b)
		self.assertEqual(test_board.dump_json(),'[{"name": "a", "user": "sd", "y": 2, "x": 1, "z": 3, "piece_id": 321, "icon": "abcicon"},{"name": "b", "user": "sd", "y": 2, "x": 2, "z": 3, "piece_id": 1, "icon": "bbbicon"}]')


		test_board2 = BoardState()
		self.assertNotEqual(test_board.dump_json(),test_board2.dump_json())
		test_board2.add_piece(a)
		test_board2.add_piece(b)
		self.assertEqual(test_board.dump_json(),test_board2.dump_json())

		test_board3 = BoardState()
		self.assertNotEqual(test_board3.dump_json(),test_board.dump_json())
		test_board3.load_json(test_board.dump_json())
		self.assertEqual(test_board3.dump_json(),test_board.dump_json())

	def test_board_add_remove_piece(self):
		test_board = BoardState()
		test_board2 = BoardState()
		a = Piece('a',1,2,3,'sd','abcicon',321)
		b = Piece('b',2,2,3,'sd','bbbicon',1)

		test_board.add_piece(a)
		print test_board
		self.assertNotEqual(test_board.dump_json(),test_board2.dump_json())
		test_board.remove_piece(a)
		self.assertEqual(test_board.dump_json(),test_board2.dump_json())

		for i in range(100):
			test_board.add_piece(a)
		for i in range(100):
			test_board.remove_piece(a)
		self.assertEqual(test_board.dump_json(),test_board2.dump_json())

	def test_board_capacity(self):
		test_board = BoardState()
		a = Piece('a',1,2,3,'sd','abcicon',321)

		for i in range(10000):
			test_board.add_piece(a)
		for i in range(10000):
			test_board.remove_piece(a)
		self.assertEqual(test_board.dump_json(),'[]')