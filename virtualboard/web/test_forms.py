from django.test import TestCase
from django.contrib.auth import get_user_model

from web.forms import *
from web.models import *

class TestLobbyCreationForm(TestCase):

	def test_valid_data_with_passcode(self):
		form = LobbyCreationForm({
			'lobby_name' : 'TestName',
			'passcode' : 'abcd'
		})
		self.assertTrue(form.is_valid())

	def test_valid_data_without_passcode(self):
		form = LobbyCreationForm({
			'lobby_name' : 'TestName',
		})
		self.assertTrue(form.is_valid())

	def test_invalid_data(self):
		form = LobbyCreationForm({
			"lobby_name" : "#%(OI@#",
			"passcode" : "abcd"
		})
		self.assertFalse(form.is_valid())

class TestJoinLobbyForm(TestCase):

	def test_valid_data(self):
		form = JoinLobbyForm({
			"lobby_id" : 1,
			"passcode" : "abcd"
		})
		self.assertTrue(form.is_valid())

	def test_invalid_data_missing_id(self):
		form = JoinLobbyForm({
			"passcode" : "abcd"
		})
		self.assertFalse(form.is_valid())

	def test_invalid_data_missing_passcode(self):
		form = JoinLobbyForm({
			"lobby_id" : 1
		})
		self.assertFalse(form.is_valid())