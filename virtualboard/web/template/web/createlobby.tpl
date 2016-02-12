{% extends 'web/base.tpl' %}

{% block content %}
    <div class="container">
      <div class="row">
  <div class="col-md-4 col-md-offset-4">
      <form class="form-signin" role="form" 
{% block action %}
action= {% url 'web:signin' %} 
{% endblock %}
method="post">
{% block pagetitle %}
        <h2 class="form-signin-heading">Name your lobby:</h2>
{% endblock %}

{% block message %}
    {% if authfail %}
      <div class="alert alert-danger" role="alert">
        <strong>Authentication Failure</strong> The user name or password is incorrect.
      </div>      
    {% endif %}
{% endblock %}

        {% csrf_token %}

        {{ form.as_p }}
        <input type="hidden" name="next" value="{{next}}" />
      <button type="submit" class="btn btn-default">Submit</button>

      </form>
      </div>
      </div>
    </div> <!-- /container -->
{% endblock %}
