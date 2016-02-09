from django.conf.urls import patterns, include, url
from web import views

urlpatterns = patterns('',
        url(r'^$', views.index, name='index'),
        url(r'^signin/$', views.signin, name='signin'),
        url(r'^signup/$', views.signup, name='signup'),
        url(r'^signout/$', views.signout, name='signout'),
        #url(r'^profile/$', views.profile, name='profile'),
)
