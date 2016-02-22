import os
import tornado.httpserver
import tornado.ioloop
import tornado.wsgi
import django.core.handlers.wsgi
from django.core.wsgi import get_wsgi_application
from tornado.options import options, define, parse_command_line
from web.tornado_handlers import *

os.environ['DJANGO_SETTINGS_MODULE'] = 'virtualboard.settings'

def main():
    django_wsgi_app = tornado.wsgi.WSGIContainer(get_wsgi_application())
    settings = dict(
            template_path=os.path.join(os.path.dirname(__file__), "web/template/web"),
            static_path=os.path.join(os.path.dirname(__file__), "web/static"),
            xsrf_cookies=False,
            #debug=True,
            #cookie_secret=")r&u2_gbw4%wiyrv!7#6u0a-_axtp!i5j=q*ph-)p))yn_dk61",
        )
    tornado_app = tornado.web.Application(
        [
            (r'^/([0-9]+)/message/new/$', MessageNewHandler),
            (r'^/([0-9]+)/message/updates/$', MessageUpdatesHandler),
            (r'^/([0-9]+)/message/loadcache/$', MessageCacheHandler),
            ('.*', tornado.web.FallbackHandler, dict(fallback=django_wsgi_app)),
        ], **settings)
    tornado.options.parse_command_line()
    server = tornado.httpserver.HTTPServer(tornado_app)
    server.listen(8000)
    tornado.ioloop.IOLoop.instance().start()

if __name__ == "__main__":
    main()