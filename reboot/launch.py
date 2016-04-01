import os
import tornado.ioloop

from socketHandler import *
from save_handlers import *

settings = {
	"debug" : True
}

app = tornado.web.Application([
	(r"/socket", WebSocketGameHandler),
	(r"/game", IndexHandler),
	(r"/", IndexHandler),
    (r"/save", DownloadStateHandler),
    (r"/load", UploadStateHandler),
	(r"/static/(.*)", tornado.web.StaticFileHandler, {"path": os.path.join(os.path.dirname(__file__), "static")}),
	(r"/icon-proxy/(.*)", IconProxyHandler)
], settings)
app.listen(8000)
tornado.ioloop.IOLoop.instance().start()
print "Systems are go, captain"
