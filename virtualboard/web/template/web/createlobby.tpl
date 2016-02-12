{% extends 'web/base.tpl' %}

{% block content %}
  {% if not error_msg %}
    <h3>Please choose a name for the lobby</h3>
  {% else %}
    <div class="alert alert-warning">
      {{ error_msg }}
    </div>
  {% endif %}
  
  <form action="{% url 'web:createlobby' %}" method="post">
  {% csrf_token %}
    <input type="text" name="lobbyname" />
    <input type="submit" value="Create Lobby" />
    <input type="button" value="Go Back" />
  </form>

{% endblock %}
