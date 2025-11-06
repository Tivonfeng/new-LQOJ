import json
from model import Handler
from service import UserService
from ..services import PasswordChangeService


class PasswordChangeHandler(Handler):
    """Handler for user password change operations"""

    async def prepare(self):
        """Prepare handler - check authentication"""
        self.check_user()
        self.render_arguments['currentUid'] = self.current_user.uid

    async def get(self):
        """Display password change page"""
        service = PasswordChangeService(self.db)

        # Get user account info
        user = await UserService(self.db).get_user_by_id(self.current_user.uid)

        self.render_arguments['user'] = user
        self.render_arguments['hasPassword'] = bool(user and user.get('password'))

        self.render('password_change.html', **self.render_arguments)

    async def post(self):
        """Handle password change request"""
        service = PasswordChangeService(self.db)

        old_password = self.get_argument('old_password', None)
        new_password = self.get_argument('new_password', None)
        confirm_password = self.get_argument('confirm_password', None)

        # Validation
        result = service.validate_password_change(
            self.current_user.uid,
            old_password,
            new_password,
            confirm_password
        )

        if not result['success']:
            self.write({
                'success': False,
                'message': result['message'],
                'code': result.get('code', 'validation_error')
            })
            return

        # Change password
        change_result = await service.change_password(
            self.current_user.uid,
            new_password
        )

        if change_result['success']:
            self.write({
                'success': True,
                'message': self._('Password changed successfully'),
                'code': 'success'
            })
        else:
            self.write({
                'success': False,
                'message': change_result.get('message', self._('Failed to change password')),
                'code': change_result.get('code', 'error')
            })
