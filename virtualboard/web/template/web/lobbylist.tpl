{% extends 'web/base.tpl' %}

{% block title %}<h2>list of lobbies</h2>{% endblock %}


{% block content %}
  {% if lobby_list %}
    {% for lobby in lobby_list %}
        <h3>click on lobby name to join :)</h3>
        <li>
              {{ lobby.name }} ({{ lobby.num_members }} people)
        </li>
    {% endfor %}
  {% else %}
      <p> No lobby exists <p>
  {% endif %}

{% endblock %}
