{% extends 'web/base.tpl' %}
{% load staticfiles %}
{% block title %}list of lobbies{% endblock %}


{% block content %}

<!-- <<<<<<< HEAD
  {% if current_lobby %} 
    <h3>Your Lobby</h3>
    <p id="current-lobby" data-lobbyid={{current_lobby.id}} data-isprotected={{current_lobby.is_passcode_protected}}>
      {{ current_lobby.name }} ({{current_lobby.num_members}}/8 people)
    </p>
  {% endif %}

  <br/>
  
  <br/>
  
  {% if lobby_list %}
    <h3>Or Join an Existing Lobby</h3>
    {% for lobby in lobby_list %}
      <li>
        <p class="joinable-lobby" data-lobbyid={{lobby.id}} data-isprotected={{lobby.is_passcode_protected}}>
          {{ lobby.name }} ({{ lobby.num_members }}/8 people)
        </p>
      </li>
    {% endfor %}
  {% else %}
      <p>There are no other lobbies.<p>
  {% endif %}
======= -->
  <div class="container container-table">
      <div class="row vertical-center-row">
          <div class="text-center col-md-4 col-md-offset-4">
            {% if current_lobby %} 
              <h3>Your Lobby</h3>
              <p id="current-lobby" data-lobbyid={{current_lobby.id}} data-isprotected={{current_lobby.is_passcode_protected}}>
                {{ current_lobby.name }} ({{current_lobby.num_members}}/8 people)
              </p>
            {% endif %}

            <a href="{% url 'web:createlobby' %}" class="btn btn-default">Create New Lobby</a>

            {% if lobby_list %}
              <h3>Or Join an Existing Lobby</h3>
              <div class="btn-group-vertical">
                {% for lobby in lobby_list %}
                  
                    <p class="joinable-lobby" data-lobbyid={{lobby.id}} data-isprotected={{lobby.is_passcode_protected}}>
                      {{ lobby.name }} ({{ lobby.num_members }}/8 people)
                    </p>
                  
                {% endfor %}
              </div>
            {% else %}
                <p> No lobby exists <p>
                <a href="{% url 'web:createlobby' %}" class="btn btn-default">create a lobby</a>
            {% endif %}

          </div>
      </div>
  </div>
  
<!-- >>>>>>> origin/master -->

  <!-- Confirm Modal -->
  <div class="modal fade" id="confirmJoinModal" role="dialog">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <button class="close-modal" type="button" class="close" data-dismiss="modal">&times;</button>
          <h4 id="confirmJoinModalTitle"style="color:red;">Join Lobby</h4>
        </div>
        <div class="modal-body">
          <div class="join-lobby-errors"></div>
          <input id="join_lobby_id" type="hidden">
          <button type="submit" value="Join Lobby" id="submit_join_lobby">Join</button>
          <button class="close-modal" type="button" data-dismiss="modal">Cancel</button>
        </div>
        <div class="modal-footer">
        </div>
      </div>
    </div>
  </div> 


  <!-- Passcode Modal -->
  <div class="modal fade" id="passcodeConfirmJoinModal" role="dialog">
    <div class="modal-dialog">
      <!-- Modal content-->
      <div class="modal-content">
        <div class="modal-header">
          <button class="close-modal" type="button" class="close" data-dismiss="modal">&times;</button>
          <h4 style="color:red;">Join Lobby</h4>
        </div>
        <div class="modal-body">
          <div class="join-lobby-errors"></div>
          <form id="passcode-join-lobby-form" action="/join/" role="form">
            {% csrf_token %}
            {{ form.as_p }}
            <button type="submit" value="Join Lobby">Join</button>
            <button class="close-modal" type="button" data-dismiss="modal">Cancel</button>
          </form>
        </div>
        <div class="modal-footer">
        </div>
      </div>
    </div>
  </div> 

  

  <script src="{% static 'lobbyList.js' %}" type="text/javascript"></script>

{% endblock %}
