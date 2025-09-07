/* eslint-disable no-await-in-loop */
import {
    BadRequestError,
    Handler,
    PRIV,
    Types,
} from 'hydrooj';

const user = global.Hydro.model.user;
const domain = global.Hydro.model.domain;


export class EnhancedUserImportHandler extends Handler {
    async prepare() {
        this.checkPriv(PRIV.PRIV_EDIT_SYSTEM);
    }

    async get() {
        const domains = await domain.getMulti().toArray();
        const availableDomains: Array<{
            _id: string;
            name: string;
            roles: Array<{
                _id: string;
                name: string;
                perm: string;
            }>;
        }> = [];

        for (const d of domains) {
            const roles = await domain.getRoles(d._id);
            availableDomains.push({
                _id: d._id,
                name: d.name || d._id,
                roles: roles.map((r) => ({
                    _id: r._id,
                    name: r._id,
                    perm: r.perm.toString(),
                })),
            });
        }

        // 检查是否是API请求
        if (this.request.headers.accept?.includes('application/json')
            || this.request.headers['content-type']?.includes('application/json')) {
            this.response.body = {
                domains: availableDomains,
                currentDomain: this.domain._id,
            };
            this.response.type = 'application/json';
        } else {
            this.response.template = 'enhanced_user_import.html';
            this.response.body = {
                domains: availableDomains,
                currentDomain: this.domain._id,
                page_name: 'manage_user_import_enhanced',
            };
        }
    }

    async post() {
        const selectedDomainId = this.request.body.domainId || this.domain._id;
        const selectedRole = this.request.body.role || 'default';
        const singleUsername = this.request.body.username || '';
        const draft = this.request.body.draft === 'true' || this.request.body.draft === true;

        if (!singleUsername.trim()) {
            throw new BadRequestError('用户名不能为空');
        }

        const username = singleUsername.trim();
        // 自动生成邮箱和密码
        const email = `${username}@lqcode.fun`;
        const password = '123456';

        const userDoc = {
            email,
            username,
            password,
            displayName: username,
        };

        const messages: string[] = [];

        // 验证输入格式
        if (!Types.Email[1](email)) {
            messages.push('邮箱格式无效');
        } else if (!Types.Username[1](username)) {
            messages.push('用户名格式无效');
        } else if (!Types.Password[1](password)) {
            messages.push('密码格式无效');
        } else {
            // 检查用户是否已存在
            const existingEmailUser = await user.getByEmail('system', email);
            const existingUsernameUser = await user.getByUname('system', username);

            if (existingEmailUser) {
                messages.push(`邮箱 ${email} 已存在`);
            } else if (existingUsernameUser) {
                messages.push(`用户名 ${username} 已存在`);
            } else if (!draft) {
                // 创建用户
                try {
                    const uid = await user.create(email, username, password);
                    await domain.setUserRole(selectedDomainId, uid, selectedRole);

                    if (userDoc.displayName) {
                        await domain.setUserInDomain(selectedDomainId, uid, { displayName: userDoc.displayName });
                    }

                    await this.ctx.serial('user/import/create', uid, userDoc);

                    messages.push(`用户 ${username} 创建成功！`);

                    this.response.body = {
                        users: [userDoc],
                        messages,
                        imported: true,
                        success: true,
                    };
                    this.response.type = 'application/json';
                    return;
                } catch (error) {
                    messages.push(`创建用户失败: ${error instanceof Error ? error.message : String(error)}`);
                }
            } else {
                messages.push(`用户 ${username} 准备就绪`);
            }
        }

        this.response.body = {
            users: messages.length === 0 || (messages.length === 1 && messages[0].includes('准备就绪')) ? [userDoc] : [],
            messages,
            imported: !draft && messages.length === 1 && messages[0].includes('创建成功'),
            success: messages.length === 0 || messages.some((msg) => msg.includes('准备就绪') || msg.includes('创建成功')),
        };
        this.response.type = 'application/json';
    }
}
