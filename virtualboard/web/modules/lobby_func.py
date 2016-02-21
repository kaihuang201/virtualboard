from django.contrib.auth import authenticate, logout, login
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.db.models import Q
from django.core.exceptions import ObjectDoesNotExist


from django.core.urlresolvers import reverse
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger

from django.shortcuts import get_object_or_404, render
from django.http import HttpResponseRedirect, HttpResponse, JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from django.utils import timezone

from datetime import datetime
from django.db import connection

from web.forms import *
from web.models import *

def lobby_list_func(request):
    """
        View page with list of list of lobbies
    """
    current_user = Profile.objects.get(user=request.user)
    current_lobby = current_user.current_lobby
    lobby_list = Lobby.objects.order_by('-num_members')
    # existing lobbies current user doesn't already belong to 
    joinable_lobbies = [lobby for lobby in lobby_list if (not lobby == current_lobby)]
    form = JoinLobbyForm()
    context = {
        'lobby_list': joinable_lobbies,
        'current_lobby': current_lobby,
        'form': form,
    }

    return render(request, 'web/lobbylist.tpl', context)

def view_lobby_func(request, lobby_id):
    """
        View a specific lobby
    """
    lobby_instance = get_object_or_404(Lobby, pk=lobby_id)
    context = {"lobby_instance": lobby_instance}
    return render(request, 'web/lobby.tpl', context)

def create_lobby_func(request):
    """
        create lobby view, take an input of name for the lobby
    """
    if request.method == 'POST':
        form = LobbyCreationForm(request.POST)
        if form.is_valid():
            fetched_name = form.cleaned_data['lobby_name']
            fetched_passcode = form.cleaned_data['passcode']
            # check that lobby with this name doesn't already exist, return with error if it does
            try:
                temp_lobby = Lobby.objects.get(name=fetched_name)
            except ObjectDoesNotExist:
                temp_lobby = None

            if not temp_lobby == None:
                return render(request, 'web/createlobby.tpl', {
                    'error_msg': 'lobby with selected name already exists'
                })
            else:
                # save new lobby, update user profile, update user's current lobby 
                if fetched_passcode == None or len(fetched_passcode) == 0:
                    new_lobby = Lobby(
                        name=fetched_name, 
                        num_members=1,
                        is_passcode_protected=False,
                        passcode=None,
                    )
                else:
                    new_lobby = Lobby(
                        name=fetched_name, 
                        num_members=1, 
                        is_passcode_protected=True, 
                        passcode=fetched_passcode,
                    )
                new_lobby.save()
                cur_user_profile = Profile.objects.get(user=request.user)
                existing_lobby = cur_user_profile.current_lobby
                if not existing_lobby == None:
                    existing_lobby.remove_one()  
                cur_user_profile.current_lobby = new_lobby
                cur_user_profile.save()
                return HttpResponseRedirect(reverse('web:lobby', args=(new_lobby.id,)))
        else:
            return render(request,'web/createlobby.tpl',{'form': form})
    # Load new form on GET
    else:
        form = LobbyCreationForm()
        return render(request,'web/createlobby.tpl',{'form': form})
    
def leave_lobby_func(request, lobby_id):
    cur_user_profile = Profile.objects.get(user=request.user)
    cur_lobby = Lobby.objects.get(pk=lobby_id)
    # ensure user can only leave the lobby they're in
    if cur_lobby == cur_user_profile.current_lobby:
        cur_user_profile.current_lobby = None
        cur_user_profile.save()
        cur_lobby.remove_one()
    return HttpResponseRedirect(reverse('web:lobbies'))

def join_lobby_func(request, lobby_id):
    #TODO : add some back end validation to this form
    form = LobbyCreationForm(request.POST)
    new_lobby = Lobby.objects.get(pk=lobby_id)
    # Enforce maximum of 8 players
    if new_lobby.num_members > 7:
        return JsonResponse({
            "status" : "error",
            "message" : "This lobby is already full. Please choose another or create your own.",
        })
    current_user = Profile.objects.get(user=request.user)
    existing_lobby = current_user.current_lobby
    if (new_lobby.is_passcode_protected and form.data['passcode'] == new_lobby.passcode) or not new_lobby.is_passcode_protected:
        if existing_lobby == None:
            new_lobby.num_members += 1
            new_lobby.save()
        elif not existing_lobby == new_lobby:
            existing_lobby_obj = Lobby.objects.get(pk=existing_lobby.id)
            existing_lobby_obj.remove_one()
            new_lobby.num_members += 1
            new_lobby.save()
        current_user.current_lobby = new_lobby
        current_user.save()
        redirect_url= "/" + lobby_id
        return JsonResponse({
            "status" : "success", 
            "url" : redirect_url,
        })
    else:
        return JsonResponse({
            "status" : "error",
            "message" : "Invalid Passcode",
        })

