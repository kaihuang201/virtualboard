from django import forms


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
