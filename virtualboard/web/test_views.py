from django.test import TestCase
from django.contrib.auth import get_user_model

import json

from web.forms import *
from web.models import *
from web.views import * 

class TestLobbyViews(TestCase):

    def setUp(self):
        self.newuser = User.objects.create_user("username", password="password")
        self.newuser.save()
        self.profile = Profile.objects.create(user=self.newuser, motto='', current_lobby=None)
        self.profile.save()
        self.one_member_lobby = Lobby.objects.create(
            name="onememberlobby",
            num_members=1,
            is_passcode_protected=False,
            passcode=None
        )
        self.one_member_lobby.save()
        self.profile.current_lobby = self.one_member_lobby
        self.profile.save()
        self.another_lobby = Lobby.objects.create(
            name="anotherlobby",
            num_members=1,
            is_passcode_protected=False,
            passcode=None
        )
        self.another_lobby.save()
        self.passcode_lobby = Lobby.objects.create(
            name="passcodelobby",
            num_members=1,
            is_passcode_protected=True,
            passcode="passcode"
        )
        self.passcode_lobby.save()


    def test_lobby_list_denies_anonymous(self):
        response = self.client.get("/lobbies/", follow=True)
        self.assertContains(response, "<h2>Please sign in to view this page.</h2>", status_code=403, html=True)

    def test_lobby_denies_anonymous(self):
        response = self.client.get("/1/", follow=True)
        self.assertContains(response, "<h2>Please sign in to view this page.</h2>", status_code=403, html=True)

    def test_join_lobby_denies_anonymous(self):
        response = self.client.get("/1/join/", follow=True)
        self.assertContains(response, "<h2>Please sign in to view this page.</h2>", status_code=403, html=True)

    def test_leave_lobby_denies_anonymous(self):
        response = self.client.get("/1/leave/", follow=True)
        self.assertContains(response, "<h2>Please sign in to view this page.</h2>", status_code=403, html=True)

    def test_lobby_list_auth(self):
        self.client.login(username='username', password='password')
        response = self.client.get("/lobbies/", follow=True)
        lobby_html = '<p id="current-lobby" data-lobbyid=1 data-isprotected=False> onememberlobby (1/8 people) </p>'
        self.assertContains(response, lobby_html, html=True)

    def test_lobby_auth(self):
        self.client.login(username='username', password='password')
        response = self.client.get("/1/", follow=True)
        self.assertContains(response, "onememberlobby")
        self.assertContains(response, "1 players")

    def test_join_lobby_auth_no_passcode(self):
        self.client.login(username='username', password='password')
        response = self.client.post("/2/join", follow=True)
        self.assertContains(response, "success")
        self.assertContains(response, "/2")
        profile = Profile.objects.get(user=self.newuser)
        self.assertEqual(profile.current_lobby, self.another_lobby)


    def test_join_full_lobby(self):
        full_lobby = Lobby.objects.create(
            name="passcodelobby",
            num_members=8,
            is_passcode_protected=False,
            passcode=None,
        )
        full_lobby.save()
        self.client.login(username='username', password='password')
        response = self.client.post("/4/join", follow=True)
        self.assertContains(response, "error")


    def test_leave_current_lobby(self):
        self.client.login(username='username', password='password')
        lobby1 = Lobby.objects.get(pk=self.one_member_lobby.pk)
        response = self.client.get("/1/leave", follow=True)
        self.assertRedirects(response, "/lobbies/", status_code=301)
        new_profile = Profile.objects.get(pk=self.profile.pk)
        self.assertEqual(new_profile.current_lobby, None)
        try:
            lobby1 = Lobby.objects.get(pk=self.one_member_lobby.pk)
        except Lobby.DoesNotExist:
            lobby1 = None
        self.assertEqual(lobby1, None)


    def test_leave_another_lobby(self):
        self.client.login(username='username', password='password')
        response = self.client.get("/3/leave", follow=True)
        self.assertRedirects(response, "/lobbies/", status_code=301)
        try:
            lobby3 = Lobby.objects.get(pk=self.passcode_lobby.pk)
        except:
            lobby3 = None
        self.assertNotEqual(lobby3, None)
        try:
            lobby1 = Lobby.objects.get(pk=self.one_member_lobby.pk)
        except:
            lobby1 = None
        self.assertNotEqual(lobby1, None)


