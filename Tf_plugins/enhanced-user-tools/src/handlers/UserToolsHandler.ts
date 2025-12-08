import {
    Handler,
    PERM,
    PRIV,
    requireSudo,
} from 'hydrooj';
import { UserImportService } from '../services/UserImportService';

export class UserToolsHandler extends Handler {
    async prepare() {
        this.checkPriv(PRIV.PRIV_EDIT_SYSTEM);
    }

    // @ts-ignore - requireSudo 使用旧式装饰器签名
    @requireSudo
    async get() {
        const availableDomains = await UserImportService.getAvailableDomains();

        // 检查是否是API请求
        if (this.request.headers.accept?.includes('application/json')
            || this.request.headers['content-type']?.includes('application/json')) {
            this.response.body = {
                domains: availableDomains,
                currentDomain: this.domain._id,
            };
            this.response.type = 'application/json';
        } else {
            // 读取配置并传递给前端
            const config = UserImportService.getConfig();

            this.response.template = 'user_tools.html';
            this.response.body = {
                domains: availableDomains,
                currentDomain: this.domain._id,
                page_name: 'manage_user_tools',
                config,
            };
        }
    }

    // @ts-ignore - requireSudo 使用旧式装饰器签名
    @requireSudo
    async post() {
        const action = this.request.body.action;

        // 根据 action 分发到不同的处理逻辑
        if (action === 'import') {
            // 用户导入功能
            const selectedDomainId = this.request.body.domainId || this.domain._id;
            const selectedRole = this.request.body.role || 'default';
            const singleUsername = this.request.body.username || '';
            const draft = this.request.body.draft === 'true' || this.request.body.draft === true;

            const result = await UserImportService.processUserCreation({
                username: singleUsername,
                domainId: selectedDomainId,
                role: selectedRole,
                draft,
            }, this.ctx);

            this.response.body = result;
            this.response.type = 'application/json';
        } else if (action === 'password') {
            // 密码修改功能
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

                const minPasswordLength = 6; // 硬编码最小密码长度
                if (newPassword.length < minPasswordLength) {
                    this.response.body = { success: false, message: `密码长度至少为${minPasswordLength}位` };
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
                    ? '密码修改成功'
                    : `用户 ${targetUser.uname} 的密码修改成功`;

                this.response.body = { success: true, message };
                this.response.type = 'application/json';
            } catch (error) {
                this.response.body = { success: false, message: error.message };
                this.response.type = 'application/json';
            }
        } else {
            this.response.body = { success: false, message: '未知的操作类型' };
            this.response.type = 'application/json';
        }
    }
}
