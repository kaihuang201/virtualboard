import os
import tornado.ioloop

from socketHandler import *

settings = {
	"debug" : True
}

app = tornado.web.Application([
	(r"/socket", WebSocketGameHandler),
	(r"/game", IndexHandler),
	(r"/", IndexHandler),
	(r"/static/(.*)", tornado.web.StaticFileHandler, {"path": os.path.join(os.path.dirname(__file__), "static")}),
], settings)
app.listen(80)
tornado.ioloop.IOLoop.instance().start()
