import {
    BadRequestError,
    Context,
    Handler,
    PRIV,
    Types,
} from 'hydrooj';

// 通过全局对象访问模型
const user = global.Hydro.model.user;
const domain = global.Hydro.model.domain;


// 生成随机密码
function generateRandomPassword(length: number = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

class EnhancedUserImportHandler extends Handler {
    async prepare() {
        this.checkPriv(PRIV.PRIV_EDIT_SYSTEM);
    }

    async get() {
        // 获取所有可用的域
        const domains = await domain.getMulti({}, {}, {}).toArray();
        const availableDomains = [];
        
        // 为每个域获取角色列表
        for (const d of domains) {
            const roles = await domain.getRoles(d._id);
            availableDomains.push({
                _id: d._id,
                name: d.name || d._id,
                roles: roles.map(r => ({
                    _id: r._id,
                    name: r._id,
                    perm: r.perm.toString()
                }))
            });
        }

        this.response.template = 'enhanced_user_import_react.html';
        this.response.body = {
            domains: availableDomains,
            currentDomain: this.domainId,
        };
    }

    async post() {
        const selectedDomainId = this.request.body.domainId || this.domainId;
        const selectedRole = this.request.body.role || 'default';
        const _users = this.request.body.users || '';
        const draft = this.request.body.draft === 'true' || this.request.body.draft === true;
        const batchSize = parseInt(this.request.body.batchSize, 10) || 50;
        const format = this.request.body.format || 'quick';
        const singleUsername = this.request.body.username || '';

        // 获取快速输入的密码配置
        const passwordMode = this.request.body.passwordMode || 'fixed';
        const fixedPasswordValue = this.request.body.fixedPasswordValue || '123456';

        let usersData = _users;

        // 处理快速输入的用户名
        if (format === 'quick' && singleUsername) {
            try {
                const userNameList = [singleUsername.trim()];
                
                usersData = userNameList.map((userNameItem) => {
                    const email = `${userNameItem}@lqcode.fun`;
                    let password = '';

                    // 根据密码模式生成密码
                    if (passwordMode === 'random') {
                        password = generateRandomPassword();
                    } else if (passwordMode === 'fixed') {
                        password = fixedPasswordValue || '123456';
                    } else if (passwordMode === 'username') {
                        password = userNameItem;
                    } else {
                        password = '123456';
                    }

                    return `${email}\t${userNameItem}\t${password}\t${userNameItem}\t{}`;
                }).join('\n');
            } catch (e) {
                throw new BadRequestError(`快速输入解析错误：${e instanceof Error ? e.message : String(e)}`);
            }
        }

        // 复用原有的用户导入逻辑，但添加批次处理
        const users = usersData.split('\n');
        const udocs: {
            email: string,
            username: string,
            password: string,
            displayName?: string,
            [key: string]: any;
        }[] = [];
        const messages: string[] = [];
        const mapping = Object.create(null);
        const groups: Record<string, string[]> = Object.create(null);
        const statistics = {
            valid: 0,
            invalid: 0,
            duplicates: 0,
            total: 0,
        };

        // 数据验证逻辑（批量处理避免循环中的await）
        const validUsers: Array<{
            email: string;
            username: string;
            password: string;
            displayName: string;
            extra: string;
            lineNum: number;
        }> = [];
        for (const i in users) {
            const u = users[i];
            statistics.total++;

            if (!u.trim()) {
                statistics.invalid++;
                continue;
            }

            let [email, username, password, displayName, extra] = u.split('\t').map((t) => t.trim());
            if (!email || !username || !password) {
                const data = u.split(',').map((t) => t.trim());
                [email, username, password, displayName, extra] = data;
                if (data.length > 5) extra = data.slice(4).join(',');
            }

            if (email && username && password) {
                if (!Types.Email[1](email)) {
                    messages.push(`第 ${+i + 1} 行：邮箱格式无效`);
                    statistics.invalid++;
                } else if (!Types.Username[1](username)) {
                    messages.push(`第 ${+i + 1} 行：用户名格式无效`);
                    statistics.invalid++;
                } else if (!Types.Password[1](password)) {
                    messages.push(`第 ${+i + 1} 行：密码格式无效`);
                    statistics.invalid++;
                } else {
                    validUsers.push({
                        email, username, password, displayName, extra, lineNum: +i + 1,
                    });
                }
            } else {
                messages.push(`第 ${+i + 1} 行：输入格式无效`);
                statistics.invalid++;
            }
        }

        // 批量检查用户是否存在
        const emailChecks = await Promise.all(validUsers.map((u) => user.getByEmail('system', u.email)));
        const usernameChecks = await Promise.all(validUsers.map((u) => user.getByUname('system', u.username)));

        for (let i = 0; i < validUsers.length; i++) {
            const userInfo = validUsers[i];
            const {
                email, username, password, displayName, extra, lineNum,
            } = userInfo;

            if (udocs.find((t) => t.email === email) || emailChecks[i]) {
                messages.push(`第 ${lineNum} 行：邮箱 ${email} 已存在`);
                statistics.duplicates++;
            } else if (udocs.find((t) => t.username === username) || usernameChecks[i]) {
                messages.push(`第 ${lineNum} 行：用户名 ${username} 已存在`);
                statistics.duplicates++;
            } else {
                const payload: any = {};
                try {
                    const data = JSON.parse(extra || '{}');
                    if (data.group) {
                        groups[data.group] ||= [];
                        groups[data.group].push(email);
                    }
                    Object.assign(payload, data);
                } catch (e) { }

                Object.assign(payload, {
                    email, username, password, displayName,
                });

                udocs.push(payload);
                statistics.valid++;
            }
        }

        if (format === 'quick' && udocs.length <= 1) {
            if (udocs.length === 1) {
                messages.push(`用户 ${udocs[0].username} 准备就绪`);
            } else {
                messages.push(`没有找到有效用户`);
            }
        } else {
            messages.push(`共找到 ${udocs.length} 个有效用户`);
            messages.push(`有效：${statistics.valid}，无效：${statistics.invalid}，重复：${statistics.duplicates}`);
        }

        if (!draft && udocs.length > 0) {
            // 批次处理导入
            const batches: typeof udocs[] = [];
            for (let i = 0; i < udocs.length; i += batchSize) {
                batches.push(udocs.slice(i, i + batchSize));
            }

            let importedCount = 0;
            const importErrors: string[] = [];

            for (const batch of batches) {
                const batchResults = await Promise.allSettled(
                    batch.map(async (udoc) => {
                        const uid = await user.create(udoc.email, udoc.username, udoc.password);
                        mapping[udoc.email] = uid;

                        const promises: Promise<any>[] = [];
                        
                        // 设置域内角色
                        promises.push(domain.setUserRole(selectedDomainId, uid, selectedRole));
                        
                        if (udoc.displayName) {
                            promises.push(domain.setUserInDomain(selectedDomainId, uid, { displayName: udoc.displayName }));
                        }
                        if (udoc.school) promises.push(user.setById(uid, { school: udoc.school }));
                        if (udoc.studentId) promises.push(user.setById(uid, { studentId: udoc.studentId }));

                        promises.push(this.ctx.serial('user/import/create', uid, udoc));

                        await Promise.all(promises);
                        return { success: true, email: udoc.email };
                    }),
                );

                for (const result of batchResults) {
                    if (result.status === 'fulfilled') {
                        importedCount++;
                    } else {
                        importErrors.push(`导入用户时出错：${result.reason}`);
                    }
                }
            }

            // 处理组
            const existing = await user.listGroup(selectedDomainId);
            for (const name in groups) {
                const uids = groups[name].map((i) => mapping[i]).filter((i) => i);
                const current = existing.find((i) => i.name === name)?.uids || [];
                if (uids.length) {
                    await user.updateGroup(selectedDomainId, name, Array.from(new Set([...current, ...uids])));
                }
            }

            if (format === 'quick' && importedCount <= 1) {
                if (importedCount === 1) {
                    messages.push(`用户创建成功！`);
                } else {
                    messages.push(`用户创建失败`);
                }
            } else {
                messages.push(`成功导入 ${importedCount} 个用户`);
            }
            if (importErrors.length > 0) {
                messages.push(...importErrors);
            }
        }

        this.response.body = {
            users: udocs,
            messages,
            imported: !draft,
            statistics,
        };
        this.response.type = 'application/json';
    }
}

export async function apply(ctx: Context) {
    // 注册增强版用户导入路由
    ctx.Route('manage_user_import_enhanced', '/manage/userimport/enhanced', EnhancedUserImportHandler, PRIV.PRIV_EDIT_SYSTEM);

    // 将菜单项注入到控制面板中
    ctx.injectUI('ControlPanel', 'manage_user_import_enhanced');

    console.log('Enhanced User Import Plugin loaded successfully!');
}
