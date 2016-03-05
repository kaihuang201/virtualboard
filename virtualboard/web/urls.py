from django.conf.urls import patterns, include, url
from web import views
from . import views

urlpatterns = patterns('',
        url(r'^$', views.index, name='index'),
        url(r'^signin/$', views.signin, name='signin'),
        url(r'^signup/$', views.signup, name='signup'),
        url(r'^signout/$', views.signout, name='signout'),
        #url(r'^profile/$', views.profile, name='profile'),
        url(r'^lobbies/$', views.lobby_list, name='lobbies'),
        # ex: /createlobby/
        url(r'^createlobby/$', views.create_lobby, name='createlobby'),
        # ex: /12345/
        url(r'^(?P<lobby_id>[0-9]+)/$', views.view_lobby, name='lobby'),
        url(r'^(?P<lobby_id>[0-9]+)/join/$', views.join_lobby, name='joinlobby'),
        url(r'^(?P<lobby_id>[0-9]+)/leave/$', views.leave_lobby, name='leavelobby'),

        # for frontend tests purpose
        url(r'^frontendtests/$', views.frontendtests, name='frontendtests'),
)
