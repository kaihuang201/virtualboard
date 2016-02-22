from django.db import models
from django.contrib.auth.models import User

class Lobby(models.Model):
	name = models.CharField(max_length=30)
	num_members = models.PositiveIntegerField()
	passcode = models.CharField(max_length=20, default=None, null=True)
	is_passcode_protected = models.BooleanField(default=False)

	def __unicode__(self):
		return self.name

	def __str__(self):
		return "Lobby " + str(self.id) + ": " + self.name

	def remove_one(self):
		"""
			remove one member from the Lobby, delete if no members remaining
		"""
		self.num_members -= 1
		if self.num_members <= 0:
			self.delete()
		else:
			self.save()


class Profile(models.Model):
    user = models.ForeignKey(User)
    motto = models.CharField(max_length=200, blank=True)
    current_lobby = models.ForeignKey(Lobby,
    								on_delete=models.SET_NULL,
    								blank=True,
    								null=True,)

