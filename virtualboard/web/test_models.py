from django.test import TestCase
from web.models import *

class LobbyTestCase(TestCase):

	def test_remove_one_from_one(self):
		one_member_lobby = Lobby.objects.create(
			name="onememberlobby",
			num_members=1,
			is_passcode_protected=False,
			passcode=None
		)
		one_member_lobby.save()
		before = Lobby.objects.get(pk=one_member_lobby.pk)
		before.remove_one()
		try:
			after = Lobby.objects.get(pk=one_member_lobby.pk)
		except Lobby.DoesNotExist:
			after = None
		self.assertEqual(after, None)


	def test_remove_one_from_multi(self):
		initial_num_members = 3
		expected_final_num_members = 2
		multi_member_lobby = Lobby.objects.create(
			name="multimemberlobby",
			num_members=initial_num_members,
			is_passcode_protected=False,
			passcode=None
		)
		multi_member_lobby.save()
		before = Lobby.objects.get(pk=multi_member_lobby.pk)
		before.remove_one()
		after = Lobby.objects.get(pk=multi_member_lobby.pk)
		self.assertEqual(after.num_members, expected_final_num_members)


