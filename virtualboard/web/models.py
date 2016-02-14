from django.db import models
from django.contrib.auth.models import User

class Lobby(models.Model):
	name = models.CharField(max_length=30)
	num_members = models.PositiveIntegerField()

	def __unicode__(self):
		return self.name

	def __str__(self):
		return "Lobby " + self.id + ": " + self.name

class Profile(models.Model):
    user = models.ForeignKey(User)
    motto = models.CharField(max_length=200, blank=True)
    currentLobby = models.ForeignKey(Lobby,
    								on_delete=models.SET_NULL,
    								blank=True,
    								null=True,)

