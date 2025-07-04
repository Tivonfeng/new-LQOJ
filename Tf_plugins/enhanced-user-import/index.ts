import {
    BadRequestError,
    Context,
    domain,
    Handler,
    param,
    PRIV,
    Types,
    user,
} from 'hydrooj';

// 解析CSV格式数据
function parseCSV(csvData: string): string[][] {
    const lines = csvData.split('\n');
    const result: string[][] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // 简单的CSV解析（处理逗号分隔）
        const fields = line.split(',').map((field) => field.trim().replace(/^"|"$/g, ''));
        result.push(fields);
    }

    return result;
}

// 解析TSV格式数据
function parseTSV(tsvData: string): string[][] {
    const lines = tsvData.split('\n');
    const result: string[][] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const fields = line.split('\t').map((field) => field.trim());
        result.push(fields);
    }

    return result;
}

// 生成示例数据
function generateSampleData(format: 'csv' | 'tsv'): string {
    const separator = format === 'csv' ? ',' : '\t';
    const samples = [
        ['user1@example.com', 'user1', 'password123', '用户1', '{"group":"students","school":"北京大学","studentId":"2023001"}'],
        ['user2@example.com', 'user2', 'password456', '用户2', '{"group":"students","school":"清华大学","studentId":"2023002"}'],
        ['teacher@example.com', 'teacher1', 'teacher123', '教师1', '{"group":"teachers","school":"北京大学"}'],
    ];

    return samples.map((row) => row.join(separator)).join('\n');
}

class EnhancedUserImportHandler extends Handler {
    async prepare() {
        this.checkPriv(PRIV.PRIV_EDIT_SYSTEM);
    }

    async get() {
        this.response.template = 'enhanced_user_import.html';
        this.response.body = {
            users: [],
            sampleCSV: generateSampleData('csv'),
            sampleTSV: generateSampleData('tsv'),
        };
    }

    @param('users', Types.Content)
    @param('draft', Types.Boolean)
    @param('batchSize', Types.UnsignedInt, true)
    @param('format', Types.String, true)
    @param('fileContent', Types.String, true)
    async post(domainId: string, _users: string, draft: boolean, batchSize: number = 50, format: string = 'manual', fileContent: string = '') {
        let usersData = _users;

        // 处理文件上传的内容
        if (fileContent && format !== 'manual') {
            try {
                let parsedData: string[][];
                if (format === 'csv') {
                    parsedData = parseCSV(fileContent);
                } else if (format === 'tsv') {
                    parsedData = parseTSV(fileContent);
                } else {
                    throw new BadRequestError('Unsupported format');
                }

                // 转换为标准格式
                usersData = parsedData.map((row) => {
                    const [email, username, password, displayName, extra] = row;
                    return `${email}\t${username}\t${password}\t${displayName || ''}\t${extra || ''}`;
                }).join('\n');
            } catch (e) {
                throw new BadRequestError(`文件解析错误：${e instanceof Error ? e.message : String(e)}`);
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
        const messages = [];
        const mapping = Object.create(null);
        const groups: Record<string, string[]> = Object.create(null);
        const statistics = {
            valid: 0,
            invalid: 0,
            duplicates: 0,
            total: 0,
        };

        // 数据验证逻辑（复用原有逻辑，增加统计）
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
                } else if (udocs.find((t) => t.email === email) || await user.getByEmail('system', email)) {
                    messages.push(`第 ${+i + 1} 行：邮箱 ${email} 已存在`);
                    statistics.duplicates++;
                } else if (udocs.find((t) => t.username === username) || await user.getByUname('system', username)) {
                    messages.push(`第 ${+i + 1} 行：用户名 ${username} 已存在`);
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

                    await this.ctx.serial('user/import/parse', payload);
                    udocs.push(payload);
                    statistics.valid++;
                }
            } else {
                messages.push(`第 ${+i + 1} 行：输入格式无效`);
                statistics.invalid++;
            }
        }

        messages.push(`共找到 ${udocs.length} 个有效用户`);
        messages.push(`有效：${statistics.valid}，无效：${statistics.invalid}，重复：${statistics.duplicates}`);

        if (!draft && udocs.length > 0) {
            // 批次处理导入
            const batches = [];
            for (let i = 0; i < udocs.length; i += batchSize) {
                batches.push(udocs.slice(i, i + batchSize));
            }

            let importedCount = 0;
            const importErrors = [];

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
                        importErrors.push(`导入 ${udoc.email} 时出错：${e instanceof Error ? e.message : String(e)}`);
                    }
                }

                // 发送进度更新 - 在有WebSocket连接时
                if (this.send) {
                    this.send({
                        type: 'progress',
                        current: importedCount,
                        total: udocs.length,
                        errors: importErrors.length,
                    });
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

            messages.push(`成功导入 ${importedCount} 个用户`);
            if (importErrors.length > 0) {
                messages.push(...importErrors);
            }
        }

        this.response.body = {
            users: udocs,
            messages,
            imported: !draft,
            statistics,
            sampleCSV: generateSampleData('csv'),
            sampleTSV: generateSampleData('tsv'),
        };
    }
}

// 下载模板文件处理器
class TemplateDownloadHandler extends Handler {
    async prepare() {
        this.checkPriv(PRIV.PRIV_EDIT_SYSTEM);
    }

    @param('format', Types.String)
    async get(domainId: string, format: string) {
        if (!['csv', 'tsv'].includes(format)) {
            throw new BadRequestError('Invalid format');
        }

        const sampleData = generateSampleData(format as 'csv' | 'tsv');
        const fileName = `user_import_template.${format}`;

        this.response.body = sampleData;
        this.response.type = 'text/plain';
        this.response.header = {
            'Content-Disposition': `attachment; filename="${fileName}"`,
        };
    }
}

export async function apply(ctx: Context) {
    // 注册增强版用户导入路由
    ctx.Route('manage_user_import_enhanced', '/manage/userimport/enhanced', EnhancedUserImportHandler, PRIV.PRIV_EDIT_SYSTEM);
    ctx.Route('user_import_template', '/manage/userimport/template/:format', TemplateDownloadHandler, PRIV.PRIV_EDIT_SYSTEM);

    // 菜单项可以通过直接访问 /manage/userimport/enhanced 路径来使用
    // 国际化内容已移至 locales/ 文件夹，系统会自动加载

    console.log('Enhanced User Import Plugin loaded successfully!');
}
