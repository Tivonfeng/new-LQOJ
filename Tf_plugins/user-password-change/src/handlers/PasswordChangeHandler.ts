import {
    Handler,
    param,
    Types,
    ValidationError,
    VerifyPasswordError,
    ForbiddenError,
    UserNotFoundError,
    user,
    PRIV,
} from 'hydrooj';

export class PasswordChangeHandler extends Handler {
    async get() {
        this.response.template = 'user_password_change.html';
        this.response.body = {};
    }

    @param('uid', Types.Int)
    @param('currentPassword', Types.Password, true)
    @param('newPassword', Types.Password)
    @param('confirmPassword', Types.Password)
    async post(domainId: string, uid: number, currentPassword = '', newPassword: string, confirmPassword: string) {
        try {
            if (newPassword !== confirmPassword) {
                throw new VerifyPasswordError();
            }

            if (newPassword.length < 6) {
                throw new ValidationError('newPassword', 'Password too short');
            }

            const targetUser = await user.getById(domainId, uid);
            if (!targetUser) {
                throw new UserNotFoundError(uid);
            }

            if (this.user._id === uid) {
                if (!currentPassword) {
                    throw new ValidationError('currentPassword', 'Current password required');
                }
                await this.user.checkPassword(currentPassword);
            } else {
                if (!this.user.hasPerm('PERM_EDIT_SYSTEM') && !this.user.hasPriv(PRIV.PRIV_EDIT_SYSTEM)) {
                    throw new ForbiddenError('Permission denied');
                }
            }

            await user.setPassword(uid, newPassword);
            
            const message = this.user._id === uid 
                ? 'Password changed successfully' 
                : `Password changed successfully for user: ${targetUser.uname}`;

            // 检查请求是否期望JSON响应
            if (this.request.headers.accept?.includes('application/json') || 
                this.request.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
                this.response.body = { success: true, message };
                this.response.type = 'application/json';
            } else {
                this.response.body = { success: true, message, uid, username: targetUser.uname };
                this.response.template = 'user_password_change_success.html';
            }
        } catch (error) {
            if (this.request.headers.accept?.includes('application/json') || 
                this.request.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
                this.response.body = { success: false, message: error.message };
                this.response.type = 'application/json';
            } else {
                throw error;
            }
        }
    }
}

