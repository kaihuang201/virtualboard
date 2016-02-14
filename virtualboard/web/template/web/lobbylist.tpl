{% extends 'web/base.tpl' %}

{% block title %}<h2>list of lobbies</h2>{% endblock %}


{% block content %}
  {% if lobby_list %}
    <a href="{% url 'web:createlobby' %}" class="btn btn-default">create a lobby</a>
    <h3>or click on a lobby name to join :)</h3>
    {% for lobby in lobby_list %}
      <li>
        <a href="{% url 'web:lobby' lobby.id %}">
          {{ lobby.name }} ({{ lobby.num_members }} people)
        </a>
      </li>
    {% endfor %}
  {% else %}
      <p> No lobby exists <p>
  {% endif %}

{% endblock %}
