{% extends 'web/base.tpl' %}
{% load staticfiles %}


{% block content %}
  <link rel="stylesheet" type="text/css" href="{% static 'lobby.css' %}">
  {% if not lobby_instance %}
    <h1>critical error: lobby instance not ready</h1>
    
  {% else %}
    

    <div class="container container-table">
        <div class="row vertical-center-row">
            <div class="text-center col-md-4 col-md-offset-4">
              <h1 id="welcome">Hi {{ user_id }}! Welcome to lobby #{{ lobby_instance.id }}『{{ lobby_instance.name }}』<h1>
              <p>{{ lobby_instance.num_members }} players</p>

              <button type="button" class="btn btn-primary">start game</button>
              <a href="{% url 'web:leavelobby' lobby_instance.id %}" class="btn btn-danger">leave</a>
            </div>
        </div>
    </div>


    <div id="chatbox">
      <div id="inbox">
      </div>
      <div id="input">
        <form action="message/new/" method="post" id="messageform">
          <table>
            <tr id="text-entry">
              <td><input name="body" id="message" style="width:500px"></td>
              <td style="padding-left:5px">
                <input type="submit" value="{{ _("Post") }}">
                <input type="hidden" name="user_id" value="{{ user_id }}">
                <input type="hidden" name="next" value="{{ request.path }}">
              </td>
            </tr>
          </table>
        </form>
      </div>
    </div>

    <script src="http://ajax.googleapis.com/ajax/libs/jquery/1.3/jquery.min.js" type="text/javascript"></script>
    <script>
      var lobby_id = {{ lobby_instance.id }};
    </script>
    <script src="{% static "chat.js" %}" type="text/javascript"></script>
    

  {% endif %}
{% endblock %}
