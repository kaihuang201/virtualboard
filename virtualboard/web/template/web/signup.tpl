{% extends "web/accountform.tpl" %}

{% block pagetitle %}
    <h2 class="form-signin-heading">Sign Up</h2>
{% endblock %}
 
{% block message %}
    {% if error %}
    <div class="alert alert-danger" role="alert">
        <strong>Error:</strong>
        {{ error }}
    </div>
    {% endif %}
{% endblock %}

{% block action %} 
    action= {% url 'web:signup' %}
{% endblock %}
