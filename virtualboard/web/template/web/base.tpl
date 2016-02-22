{% load staticfiles %}

<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="utf-8">
  <title>{% block title %} Virtual Board {% endblock %}</title>
  <link rel="stylesheet" type="text/css" href="{% static 'bootstrap.min.css' %}">
  <link rel="stylesheet" type="text/css" href="{% static 'style.css' %}">
  <script src="{% static 'jquery-1.11.0.min.js' %}" type="text/javascript"></script>
  <script src="{% static 'bootstrap.min.js' %}" type="text/javascript"></script>
  <link rel="stylesheet" type="text/css" href="{% static 'main.css' %}">
</head>

<body>

<nav class="navbar navbar-default navbar-fixed-bottom" role="navigation">
  <div class="container-fluid">
    <!-- Brand and toggle get grouped for better mobile display -->
    <div class="navbar-header">
      <a class="navbar-brand" href="/"><b>Virtual Board</b>  </a>
    </div>

    <!-- Collect the nav links, forms, and other content for toggling -->
    <div class="collapse navbar-collapse" id="nav-test bs-example-navbar-collapse-1">
      <ul class="nav navbar-nav navbar-right">
        {% if user.is_authenticated %}
          {% block status %}
          {% endblock status %}
          <li><a >You are signed in as <b>{{user.username}}</b></a></li>
          <li><a style="color:#eee" href="/lobbies/">Lobbies</a></li>
          <li><a  href="/profile/">My Profile</a></li>
          <li><a  href="/signout/">Sign Out</a></li>
        {% else %}
          <li><a  href="/signin/">Sign In</a></li>
          <li><a  href="/signup/">Sign Up</a></li>
        {% endif %}
        
      </ul>
    </div><!-- /.navbar-collapse -->
  </div><!-- /.container-fluid -->
</nav>

{% block content %}
  <h1> Welcome to Virtual Board! </h1>
{% endblock %}		

</body>
</html>
