{% extends 'web/base.tpl' %}

{% block title %}<h2>list of lobbies</h2>{% endblock %}


{% block content %}
  {% if lobby_list %}
    <h3>click on lobby name to join :)</h3>
    {% for lobby in lobby_list %}
      <li>
        <a href="/{{ lobby.id }}">
          {{ lobby.name }} ({{ lobby.num_members }} people)
        </a>
      </li>
    {% endfor %}
  {% else %}
      <p> No lobby exists <p>
  {% endif %}

{% endblock %}
