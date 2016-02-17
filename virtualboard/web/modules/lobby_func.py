from django.contrib.auth import authenticate, logout, login
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.db.models import Q
from django.core.exceptions import ObjectDoesNotExist


from django.core.urlresolvers import reverse
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger

from django.shortcuts import get_object_or_404, render
from django.http import HttpResponseRedirect, HttpResponse
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from django.utils import timezone

from datetime import datetime
from django.db import connection

from web.forms import *
from web.models import *

def listoflobbies_func(request):
    """
    List of Lobbies view
    """
    lobby_list = Lobby.objects.order_by('-num_members')
    context = {'lobby_list': lobby_list}
    return render(request, 'web/lobbylist.tpl', context)

def lobby_func(request,lobby_id):
    lobby_instance = get_object_or_404(Lobby, pk=lobby_id)
    context = {"lobby_instance":lobby_instance}
    return render(request, 'web/lobby.tpl', context)

def createlobby_func(request):
    """
    create lobby view, take an input of name for the lobby
    """
    if request.user.is_authenticated():
        if request.method == 'POST':
            form = lobbyCreationForm(request.POST)
            if form.is_valid():
                fetchedName = form.cleaned_data['lobbyName']
                
                try:
                    tempLobby = Lobby.objects.get(name=fetchedName)
                except ObjectDoesNotExist:
                    tempLobby = None

                if tempLobby != None:
                    return render(request, 'web/createlobby.tpl', {
                        'error_msg': 'lobby with selected name already exists'
                        })
                else:
                    new_lobby = Lobby(name = fetchedName, num_members = 1)
                    new_lobby.save()
                    curUserProfile = Profile.objects.get(user=request.user)
                    curUserProfile.currentLobby = new_lobby
                    curUserProfile.save()
                    return HttpResponseRedirect(reverse('web:lobby', args=(new_lobby.id,)))
        else:
            form = lobbyCreationForm()
            return render(request,'web/createlobby.tpl',{'form': form})
    else:
        return HttpResponseRedirect(reverse('web:index'))
    


def leavelobby_func(request,lobby_id):
    curUserProfile = Profile.objects.get(user=request.user)
    curLobby = Lobby.objects.get(pk=lobby_id)
    # when in the lobby the player belongs to
    if curLobby == curUserProfile.currentLobby:
        curUserProfile.currentLobby = None
        curUserProfile.save()
        curLobby.num_members -= 1
        curLobby.save()
        if curLobby.num_members <= 0:
            curLobby.delete()

    return HttpResponseRedirect(reverse('web:listoflobbies'))

def joinlobby_func(request,lobby_id):
    if request.user.is_authenticated():
        curLobby = Lobby.objects.get(pk=lobby_id)
        # test if user is in another lobby 
        curUserProfile = Profile.objects.get(user=request.user)       
        usersLobby = curUserProfile.currentLobby
        if usersLobby == None:
            curLobby.num_members += 1
            curLobby.save()
        elif usersLobby != curLobby:
            #leave the prev lobby
            prevLobby = Lobby.objects.get(pk=usersLobby.id)
            prevLobby.num_members -= 1
            prevLobby.save()
            if prevLobby.num_members <= 0:
                prevLobby.delete()
            curLobby.num_members += 1
            curLobby.save()

        curUserProfile.currentLobby =  curLobby
        curUserProfile.save()

        return HttpResponseRedirect(reverse('web:lobby', args=(lobby_id,)))
    else:
        return HttpResponseRedirect(reverse('web:signin'))
