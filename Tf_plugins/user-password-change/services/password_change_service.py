import re
import hashlib
from datetime import datetime


class PasswordChangeService:
    """Service for password change operations"""

    # Password validation constraints
    MIN_PASSWORD_LENGTH = 8
    MAX_PASSWORD_LENGTH = 128
    PASSWORD_PATTERN = re.compile(r'^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]).{8,}$')

    def __init__(self, db):
        self.db = db
        self.users_collection = db['user.users']
        self.password_history_collection = db['user.password_history']

    def validate_password_change(self, uid, old_password, new_password, confirm_password):
        """Validate password change request"""

        # Check old password provided
        if not old_password or not old_password.strip():
            return {
                'success': False,
                'message': 'Old password is required',
                'code': 'old_password_required'
            }

        # Check new password provided
        if not new_password or not new_password.strip():
            return {
                'success': False,
                'message': 'New password is required',
                'code': 'new_password_required'
            }

        # Check confirm password provided
        if not confirm_password or not confirm_password.strip():
            return {
                'success': False,
                'message': 'Password confirmation is required',
                'code': 'confirm_password_required'
            }

        # Check password length
        if len(new_password) < self.MIN_PASSWORD_LENGTH:
            return {
                'success': False,
                'message': f'Password must be at least {self.MIN_PASSWORD_LENGTH} characters',
                'code': 'password_too_short'
            }

        if len(new_password) > self.MAX_PASSWORD_LENGTH:
            return {
                'success': False,
                'message': f'Password must not exceed {self.MAX_PASSWORD_LENGTH} characters',
                'code': 'password_too_long'
            }

        # Check password complexity
        if not self.PASSWORD_PATTERN.match(new_password):
            return {
                'success': False,
                'message': 'Password must contain letters, numbers, and special characters',
                'code': 'password_weak'
            }

        # Check passwords match
        if new_password != confirm_password:
            return {
                'success': False,
                'message': 'New password and confirm password do not match',
                'code': 'password_mismatch'
            }

        # Check new password not same as old
        if old_password == new_password:
            return {
                'success': False,
                'message': 'New password must be different from old password',
                'code': 'password_same'
            }

        return {
            'success': True,
            'message': 'Validation passed'
        }

    def _hash_password(self, password):
        """Hash password using SHA256"""
        return hashlib.sha256(password.encode()).hexdigest()

    async def change_password(self, uid, new_password):
        """Change user password"""
        try:
            # Get current user
            user = await self.users_collection.find_one({'_id': uid})
            if not user:
                return {
                    'success': False,
                    'message': 'User not found',
                    'code': 'user_not_found'
                }

            # Hash new password
            hashed_password = self._hash_password(new_password)

            # Save to password history before changing
            history_doc = {
                'uid': uid,
                'password_hash': hashed_password,
                'changed_at': datetime.utcnow(),
                'old_password_hash': user.get('password', None)
            }
            await self.password_history_collection.insert_one(history_doc)

            # Update user password
            result = await self.users_collection.update_one(
                {'_id': uid},
                {
                    '$set': {
                        'password': hashed_password,
                        'password_changed_at': datetime.utcnow()
                    }
                }
            )

            if result.modified_count > 0:
                return {
                    'success': True,
                    'message': 'Password changed successfully',
                    'code': 'success'
                }
            else:
                return {
                    'success': False,
                    'message': 'Failed to update password',
                    'code': 'update_failed'
                }

        except Exception as e:
            return {
                'success': False,
                'message': f'Error changing password: {str(e)}',
                'code': 'error'
            }

    async def verify_old_password(self, uid, old_password):
        """Verify that the old password is correct"""
        try:
            user = await self.users_collection.find_one({'_id': uid})
            if not user or 'password' not in user:
                return False

            hashed_old = self._hash_password(old_password)
            return user['password'] == hashed_old
        except Exception:
            return False

    async def get_password_history(self, uid, limit=10):
        """Get user's password change history"""
        try:
            history = await self.password_history_collection.find(
                {'uid': uid}
            ).sort('changed_at', -1).limit(limit).to_list(length=limit)
            return history
        except Exception:
            return []

    async def check_password_reuse(self, uid, new_password, history_limit=5):
        """Check if new password was used in recent history"""
        try:
            history = await self.get_password_history(uid, history_limit)
            hashed_new = self._hash_password(new_password)

            for entry in history:
                if entry.get('password_hash') == hashed_new:
                    return True
            return False
        except Exception:
            return False
