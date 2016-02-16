#!/usr/bin/env python
import datetime
import json
import logging
import tornado.websocket
 
from django.utils.timezone import utc
 
class HelloHandler(tornado.web.RequestHandler):
  def get(self):
    self.write('Hello from tornado')