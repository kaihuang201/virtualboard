from django.db import models
from django.contrib.auth.models import User


class Profile(models.Model):
    user = models.ForeignKey(User)
    motto = models.CharField(max_length=200, blank=True)
