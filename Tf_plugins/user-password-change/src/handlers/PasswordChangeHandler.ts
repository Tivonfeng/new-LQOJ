import {
    Handler,
    PERM,
    PRIV,
} from 'hydrooj';

export class PasswordChangeHandler extends Handler {
    async get() {
        this.response.template = 'user_password_change.html';
        this.response.body = {};
    }

    async post() {
        const { uid, currentPassword = '', newPassword, confirmPassword } = this.request.body;
        const domainId = this.domain._id;

        try {
            if (!uid || !newPassword || !confirmPassword) {
                this.response.body = { success: false, message: '参数不完整' };
                return;
            }

            if (newPassword !== confirmPassword) {
                this.response.body = { success: false, message: '密码确认不匹配' };
                return;
            }

            if (newPassword.length < 6) {
                this.response.body = { success: false, message: '密码长度至少为6位' };
                return;
            }

            const UserModel = global.Hydro.model.user;
            const uidNum = Number.parseInt(uid);
            const targetUser = await UserModel.getById(domainId, uidNum);
            if (!targetUser) {
                this.response.body = { success: false, message: '用户不存在' };
                return;
            }

            if (this.user._id === uidNum) {
                if (!currentPassword) {
                    this.response.body = { success: false, message: '修改自己的密码需要输入当前密码' };
                    return;
                }
                await this.user.checkPassword(currentPassword);
            } else {
                // 检查是否有系统权限或域内的编辑权限
                if (!(this.user?.priv & PRIV.PRIV_EDIT_SYSTEM)) {
                    this.checkPerm(PERM.PERM_EDIT_DOMAIN);
                }
            }

            await UserModel.setPassword(uidNum, newPassword);

            const message = this.user._id === uidNum
                ? 'Password changed successfully'
                : `Password changed successfully for user: ${targetUser.uname}`;

            // 检查请求是否期望JSON响应
            if (this.request.headers.accept?.includes('application/json')
                || this.request.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
                this.response.body = { success: true, message };
                this.response.type = 'application/json';
            } else {
                this.response.body = { success: true, message, uid: uidNum, username: targetUser.uname };
                this.response.template = 'user_password_change_success.html';
            }
        } catch (error) {
            if (this.request.headers.accept?.includes('application/json')
                || this.request.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
                this.response.body = { success: false, message: error.message };
                this.response.type = 'application/json';
            } else {
                throw error;
            }
        }
    }
}
