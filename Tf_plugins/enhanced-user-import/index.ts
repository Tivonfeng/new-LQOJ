import {
    Context,
    Handler,
    param,
    Types,
    PRIV,
    user,
    domain,
} from 'hydrooj';

class EnhancedUserImportHandler extends Handler {
    async prepare() {
        this.checkPriv(PRIV.PRIV_EDIT_SYSTEM);
    }

    async get() {
        this.response.body.users = [];
        this.response.template = 'enhanced_user_import.html';
    }

    @param('users', Types.Content)
    @param('draft', Types.Boolean)
    @param('batchSize', Types.UnsignedInt, true)
    async post(domainId: string, _users: string, draft: boolean, batchSize: number = 50) {
        // 复用原有的用户导入逻辑，但添加批次处理
        const users = _users.split('\n');
        const udocs: { email: string, username: string, password: string, displayName?: string, [key: string]: any; }[] = [];
        const messages = [];
        const mapping = Object.create(null);
        const groups: Record<string, string[]> = Object.create(null);

        // 数据验证逻辑（复用原有逻辑）
        for (const i in users) {
            const u = users[i];
            if (!u.trim()) continue;
            let [email, username, password, displayName, extra] = u.split('\t').map((t) => t.trim());
            if (!email || !username || !password) {
                const data = u.split(',').map((t) => t.trim());
                [email, username, password, displayName, extra] = data;
                if (data.length > 5) extra = data.slice(4).join(',');
            }
            if (email && username && password) {
                if (!Types.Email[1](email)) {
                    messages.push(`Line ${+i + 1}: Invalid email.`);
                } else if (!Types.Username[1](username)) {
                    messages.push(`Line ${+i + 1}: Invalid username`);
                } else if (!Types.Password[1](password)) {
                    messages.push(`Line ${+i + 1}: Invalid password`);
                } else if (udocs.find((t) => t.email === email) || await user.getByEmail('system', email)) {
                    messages.push(`Line ${+i + 1}: Email ${email} already exists.`);
                } else if (udocs.find((t) => t.username === username) || await user.getByUname('system', username)) {
                    messages.push(`Line ${+i + 1}: Username ${username} already exists.`);
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
                    await this.ctx.serial('user/import/parse', payload);
                    udocs.push(payload);
                }
            } else {
                messages.push(`Line ${+i + 1}: Input invalid.`);
            }
        }

        messages.push(`${udocs.length} users found.`);

        if (!draft) {
            // 批次处理导入
            const batches = [];
            for (let i = 0; i < udocs.length; i += batchSize) {
                batches.push(udocs.slice(i, i + batchSize));
            }

            let importedCount = 0;
            for (const batch of batches) {
                for (const udoc of batch) {
                    try {
                        const uid = await user.create(udoc.email, udoc.username, udoc.password);
                        mapping[udoc.email] = uid;
                        if (udoc.displayName) {
                            await domain.setUserInDomain(domainId, uid, { displayName: udoc.displayName });
                        }
                        if (udoc.school) await user.setById(uid, { school: udoc.school });
                        if (udoc.studentId) await user.setById(uid, { studentId: udoc.studentId });
                        importedCount++;
                        await this.ctx.serial('user/import/create', uid, udoc);
                    } catch (e) {
                        messages.push(`Error importing ${udoc.email}: ${e.message}`);
                    }
                }
                // 发送进度更新 - 在有WebSocket连接时
                if (this.send) {
                    this.send({ type: 'progress', current: importedCount, total: udocs.length });
                }
            }

            // 处理组
            const existing = await user.listGroup(domainId);
            for (const name in groups) {
                const uids = groups[name].map((i) => mapping[i]).filter((i) => i);
                const current = existing.find((i) => i.name === name)?.uids || [];
                if (uids.length) {
                    await user.updateGroup(domainId, name, Array.from(new Set([...current, ...uids])));
                }
            }
        }

        this.response.body.users = udocs;
        this.response.body.messages = messages;
        this.response.body.imported = !draft;
    }
}

export function apply(ctx: Context) {
    // 注册增强版用户导入路由
    ctx.Route('manage_user_import_enhanced', '/manage/userimport/enhanced', EnhancedUserImportHandler);

    // 注册菜单项
    ctx.inject('ControlPanel', 'manage_user_import_enhanced', {
        icon: 'fas fa-user-plus',
        text: 'Enhanced User Import',
        href: '/manage/userimport/enhanced',
        order: 101,
    });

    // 注册静态文件路由
    ctx.i18n.load('zh', {
        'Enhanced User Import': '增强版用户导入',
        'File Upload': '文件上传',
        'Paste Text': '粘贴文本',
        'CSV Format': 'CSV格式',
        'TSV Format': 'TSV格式',
        'Select File': '选择文件',
        'Upload CSV/TSV File': '上传CSV/TSV文件',
        'Or paste user data below': '或在下方粘贴用户数据',
        'Format Help': '格式帮助',
        'Sample Data': '示例数据',
        'Validation': '验证',
        'Progress': '进度',
        'Import Progress': '导入进度',
        'Validating data...': '验证数据中...',
        'Importing users...': '导入用户中...',
        'Import completed!': '导入完成！',
        'Real-time Validation': '实时验证',
        'Line {0}: {1}': '第 {0} 行：{1}',
        'Valid format': '格式正确',
        'Invalid format': '格式错误',
        'Download Sample CSV': '下载示例CSV',
        'Download Sample TSV': '下载示例TSV',
        'File size limit: 5MB': '文件大小限制：5MB',
        'Supported formats: CSV, TSV': '支持格式：CSV, TSV',
        'Drag and drop files here': '拖拽文件到这里',
        'or click to browse': '或点击浏览',
        'Processing file...': '处理文件中...',
        'Preview Results': '预览结果',
        'Import Now': '立即导入',
        'Clear Data': '清除数据',
        'Export Template': '导出模板',
        'Import History': '导入历史',
        'User data format': '用户数据格式',
        'Each line should contain': '每行应包含',
        'email, username, password, displayName, extra': '邮箱, 用户名, 密码, 显示名, 额外信息',
        'Extra field can be JSON with group, school, studentId': '额外字段可以是包含组、学校、学号的JSON',
        'Example': '示例',
        'Batch size': '批次大小',
        'Import in batches of': '每批导入',
        'users': '用户',
        'Tips': '提示',
        'Use CSV or TSV format for best results': '使用CSV或TSV格式以获得最佳效果',
        'Maximum 5MB file size': '最大5MB文件大小',
        'Batch import for large datasets': '大数据集的批量导入',
        'Preview before importing': '导入前预览',
        'Total Users': '用户总数',
        'Valid Users': '有效用户',
        'Invalid Users': '无效用户',
        'Duplicates': '重复项',
        'Email': '邮箱',
        'Username': '用户名',
        'Display Name': '显示名',
        'Extra Info': '额外信息',
        'Status': '状态',
        'Import Statistics': '导入统计',
        'CSV Template': 'CSV模板',
        'TSV Template': 'TSV模板',
    });

    ctx.i18n.load('en', {
        'Enhanced User Import': 'Enhanced User Import',
        'File Upload': 'File Upload',
        'Paste Text': 'Paste Text',
        'CSV Format': 'CSV Format',
        'TSV Format': 'TSV Format',
        'Select File': 'Select File',
        'Upload CSV/TSV File': 'Upload CSV/TSV File',
        'Or paste user data below': 'Or paste user data below',
        'Format Help': 'Format Help',
        'Sample Data': 'Sample Data',
        'Validation': 'Validation',
        'Progress': 'Progress',
        'Import Progress': 'Import Progress',
        'Validating data...': 'Validating data...',
        'Importing users...': 'Importing users...',
        'Import completed!': 'Import completed!',
        'Real-time Validation': 'Real-time Validation',
        'Line {0}: {1}': 'Line {0}: {1}',
        'Valid format': 'Valid format',
        'Invalid format': 'Invalid format',
        'Download Sample CSV': 'Download Sample CSV',
        'Download Sample TSV': 'Download Sample TSV',
        'File size limit: 5MB': 'File size limit: 5MB',
        'Supported formats: CSV, TSV': 'Supported formats: CSV, TSV',
        'Drag and drop files here': 'Drag and drop files here',
        'or click to browse': 'or click to browse',
        'Processing file...': 'Processing file...',
        'Preview Results': 'Preview Results',
        'Import Now': 'Import Now',
        'Clear Data': 'Clear Data',
        'Export Template': 'Export Template',
        'Import History': 'Import History',
        'User data format': 'User data format',
        'Each line should contain': 'Each line should contain',
        'email, username, password, displayName, extra': 'email, username, password, displayName, extra',
        'Extra field can be JSON with group, school, studentId': 'Extra field can be JSON with group, school, studentId',
        'Example': 'Example',
        'Batch size': 'Batch size',
        'Import in batches of': 'Import in batches of',
        'users': 'users',
        'Tips': 'Tips',
        'Use CSV or TSV format for best results': 'Use CSV or TSV format for best results',
        'Maximum 5MB file size': 'Maximum 5MB file size',
        'Batch import for large datasets': 'Batch import for large datasets',
        'Preview before importing': 'Preview before importing',
        'Total Users': 'Total Users',
        'Valid Users': 'Valid Users',
        'Invalid Users': 'Invalid Users',
        'Duplicates': 'Duplicates',
        'Email': 'Email',
        'Username': 'Username',
        'Display Name': 'Display Name',
        'Extra Info': 'Extra Info',
        'Status': 'Status',
        'Import Statistics': 'Import Statistics',
        'CSV Template': 'CSV Template',
        'TSV Template': 'TSV Template',
    });
}

export default apply;
