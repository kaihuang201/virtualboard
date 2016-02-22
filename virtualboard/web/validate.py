from django.core.exceptions import ValidationError
from django.utils.translation import ugettext_lazy as _

def AlphaNumValidator(value):
    if not value.isalnum():
        raise ValidationError(
            _('%(value)s is not alpha numeric'),
            params={'value': value},
        )
    