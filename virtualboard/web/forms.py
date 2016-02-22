from django import forms
from validate import *
from django.core.validators import MaxLengthValidator, MinLengthValidator

class signinForm(forms.Form):
    username_widget = forms.TextInput(attrs={
                        'class' : 'form-control',
                        'placeholder' : 'Username',
                    })
    username = forms.CharField(max_length=30, widget=username_widget)


    password_widget=forms.PasswordInput(attrs={
                'class' : 'form-control',
                'placeholder' : 'Password',
            })
    password = forms.CharField(max_length=30, widget=password_widget)


class signupForm(signinForm):
    widget = forms.PasswordInput(attrs={
                'class' : 'form-control',
                'placeholder' : 'Password Again',
            })
    password_again = forms.CharField(max_length=30, widget=widget)

class LobbyCreationForm(forms.Form):
    lobby_name_widget = forms.TextInput(attrs={
        'class' : "form-control",
        'placeholder' : 'name of your lobby',
        })
    lobby_name = forms.CharField(
        max_length=30, 
        widget=lobby_name_widget, 
        validators=[AlphaNumValidator, MaxLengthValidator(30), MinLengthValidator(1)]
    )
    passcode_widget = forms.PasswordInput(attrs={
        'class' : 'form-control',
        'placeholder' : '(optional)'
    })
    passcode = forms.CharField(
        max_length=20,
        widget=passcode_widget,
        required=False,
        validators=[AlphaNumValidator],
        help_text='If you enter a passcode, it will be required for other users to join this lobby'
    )

class JoinLobbyForm(forms.Form):
    lobby_id_widget = forms.HiddenInput(attrs={
        'id':'passcode_join_lobby_id',
    })
    lobby_id = forms.CharField(widget=lobby_id_widget)
    passcode_widget = forms.PasswordInput(attrs={
        'class' : 'form-control',
        'id' : 'passcode',
    })
    passcode = forms.CharField(
        widget=passcode_widget,
        required=True,
        help_text="A passcode is required to join this lobby."
    )




