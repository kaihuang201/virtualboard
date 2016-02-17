{% extends 'web/base.tpl' %}

{% block title %}list of lobbies{% endblock %}


{% block content %}

  <div class="container container-table">
      <div class="row vertical-center-row">
          <div class="text-center col-md-4 col-md-offset-4">
            {% if lobby_list %}
              <a href="{% url 'web:createlobby' %}" class="btn btn-default">create a lobby</a>
              <p>or click on a lobby name to join :)</p>
              <div class="btn-group-vertical">
                {% for lobby in lobby_list %}
                  
                    <a href="{% url 'web:joinlobby' lobby.id %}" class="btn btn-default">
                      {{ lobby.name }} ({{ lobby.num_members }} people)
                    </a>
                  
                {% endfor %}
              </div>
            {% else %}
                <p> No lobby exists <p>
                <a href="{% url 'web:createlobby' %}" class="btn btn-default">create a lobby</a>
            {% endif %}

          </div>
      </div>
  </div>
  

{% endblock %}
