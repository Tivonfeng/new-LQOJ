/* eslint-disable no-await-in-loop */
import {
    BadRequestError,
    DomainModel,
    SystemModel,
    Types,
    UserModel,
} from 'hydrooj';

export interface UserImportConfig {
    defaultEmailDomain: string;
    defaultPassword: string;
}

export interface UserCreationRequest {
    username: string;
    domainId: string;
    role: string;
    draft: boolean;
}

export interface UserCreationResult {
    users: Array<{
        username: string;
        email: string;
        password: string;
        displayName: string;
    }>;
    messages: string[];
    imported: boolean;
    success: boolean;
}

export class UserImportService {
    /**
     * 获取系统配置
     */
    static getConfig(): UserImportConfig {
        return {
            defaultEmailDomain: SystemModel.get('enhanced_user_import.defaultEmailDomain') || 'lqcode.fun',
            defaultPassword: SystemModel.get('enhanced_user_import.defaultPassword') || '123456',
        };
    }

    /**
     * 生成用户数据
     */
    static generateUserData(username: string, config: UserImportConfig) {
        return {
            username: username.trim(),
            email: `${username.trim()}@${config.defaultEmailDomain}`,
            password: config.defaultPassword,
            displayName: username.trim(),
        };
    }

    /**
     * 验证用户数据格式
     */
    static validateUserData(userDoc: { username: string, email: string, password: string }) {
        const errors: string[] = [];

        if (!Types.Email[1](userDoc.email)) {
            errors.push('邮箱格式无效');
        }
        if (!Types.Username[1](userDoc.username)) {
            errors.push('用户名格式无效');
        }
        if (!Types.Password[1](userDoc.password)) {
            errors.push('密码格式无效');
        }

        return errors;
    }

    /**
     * 检查用户是否已存在
     */
    static async checkUserExists(email: string, username: string) {
        const existingEmailUser = await UserModel.getByEmail('system', email);
        const existingUsernameUser = await UserModel.getByUname('system', username);

        const errors: string[] = [];
        if (existingEmailUser) {
            errors.push(`邮箱 ${email} 已存在`);
        }
        if (existingUsernameUser) {
            errors.push(`用户名 ${username} 已存在`);
        }

        return errors;
    }

    /**
     * 创建单个用户
     */
    static async createUser(
        userDoc: { username: string, email: string, password: string, displayName: string },
        domainId: string,
        role: string,
        ctx: any,
    ) {
        const uid = await UserModel.create(userDoc.email, userDoc.username, userDoc.password);
        await DomainModel.setUserRole(domainId, uid, role);

        if (userDoc.displayName) {
            await DomainModel.setUserInDomain(domainId, uid, { displayName: userDoc.displayName });
        }

        await ctx.serial('user/import/create', uid, userDoc);
        return uid;
    }

    /**
     * 处理用户创建请求
     */
    static async processUserCreation(
        request: UserCreationRequest,
        ctx: any,
    ): Promise<UserCreationResult> {
        if (!request.username.trim()) {
            throw new BadRequestError('用户名不能为空');
        }

        const config = this.getConfig();
        const userDoc = this.generateUserData(request.username, config);
        const messages: string[] = [];

        // 验证格式
        const formatErrors = this.validateUserData(userDoc);
        if (formatErrors.length > 0) {
            return {
                users: [],
                messages: formatErrors,
                imported: false,
                success: false,
            };
        }

        // 检查重复
        const duplicateErrors = await this.checkUserExists(userDoc.email, userDoc.username);
        if (duplicateErrors.length > 0) {
            return {
                users: [],
                messages: duplicateErrors,
                imported: false,
                success: false,
            };
        }

        // 预览模式
        if (request.draft) {
            messages.push(`用户 ${userDoc.username} 准备就绪`);
            return {
                users: [userDoc],
                messages,
                imported: false,
                success: true,
            };
        }

        // 创建用户
        try {
            await this.createUser(userDoc, request.domainId, request.role, ctx);
            messages.push(`用户 ${userDoc.username} 创建成功！`);
            return {
                users: [userDoc],
                messages,
                imported: true,
                success: true,
            };
        } catch (error) {
            messages.push(`创建用户失败: ${error instanceof Error ? error.message : String(error)}`);
            return {
                users: [],
                messages,
                imported: false,
                success: false,
            };
        }
    }

    /**
     * 获取可用域列表
     */
    static async getAvailableDomains() {
        const domains = await DomainModel.getMulti().toArray();
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
            const roles = await DomainModel.getRoles(d._id);
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

        return availableDomains;
    }
}
