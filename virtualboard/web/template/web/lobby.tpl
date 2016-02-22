{% extends 'web/base.tpl' %}

{% block content %}
  {% if not lobby_instance %}
    <h1>critical error: lobby instance not ready</h1>
    
  {% else %}
    <h1>welcome to lobby #{{ lobby_instance.id }} {{ lobby_instance.name }}<h1>
    <p>{{ lobby_instance.num_members }} players</p>

    <button type="button" class="btn btn-primary">start game</button>
    <a href="{% url 'web:leavelobby' lobby_instance.id %}" class="btn btn-danger">leave</a>
  {% endif %}
{% endblock %}
