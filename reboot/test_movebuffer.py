import unittest
from movebuffer import *

class TestMoveBuffer(unittest.TestCase):


    # test add when the buffer is empty
    def test_add_empty(self):
        mb = MoveBuffer()
        mb.add_client(1)
        mb.add(0, [0, 0], 1)
        self.assertTrue(mb.has_entries())


    # test remove from buffer
    def test_remove_client(self):
        mb = MoveBuffer()
        mb.add_client(1)
        mb.add(0, [0, 0], 1)
        mb.remove_client(1)
        self.assertFalse(mb.has_entries())


    # test flushing buffer
    def test_flush(self):
        mb = MoveBuffer()
        mb.add_client(1)
        mb.add(0, [0, 0], 1)
        mb.flush(1)
        self.assertFalse(mb.has_entries(1))
        

    # test add_client
    def test_add_client(self):
        mb = MoveBuffer()
        mb.add_client(1)
        mb.add(0, [0, 0], 1)
        self.assertTrue(mb.has_entries(1))
        

if __name__ == '__main__':
        unittest.main()
