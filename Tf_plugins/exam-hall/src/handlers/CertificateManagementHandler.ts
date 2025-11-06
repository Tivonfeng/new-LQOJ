import { Handler, PRIV } from 'hydrooj';

/**
 * 证书管理后台页面处理器
 * 渲染管理界面，需要管理员权限
 */
export class CertificateManagementPageHandler extends Handler {
    async get() {
        // 权限检查 - 只有管理员可以访问
        this.checkPriv(PRIV.PRIV_EDIT_SYSTEM);

        // 返回管理后台 HTML 模板
        this.response.template = 'certificate-management.html';
        this.response.body = {
            title: '证书管理',
            domainId: this.domain._id,
            uid: this.user._id,
            isAdmin: this.user.role === 'admin' || !!(this.user.perm & BigInt(PRIV.PRIV_EDIT_SYSTEM)),
        };
    }
}

export class CertificateManagementListHandler extends Handler {
    async get() {
        // 权限检查 - 只有管理员可以访问
        this.checkPriv(PRIV.PRIV_EDIT_SYSTEM);

        try {
            // 获取查询参数
            const uid = this.request.query?.uid ? Number(this.request.query.uid as string) : null;
            const skip = this.request.query?.skip ? Math.max(0, Number(this.request.query.skip as string)) : 0;
            const limit = this.request.query?.limit ? Math.min(1000, Math.max(1, Number(this.request.query.limit as string))) : 100;

            // 验证 UID 参数
            if (uid !== null && (Number.isNaN(uid) || uid < 0)) {
                this.response.status = 400;
                this.response.body = {
                    success: false,
                    error: '无效的 uid 参数',
                };
                return;
            }

            const certCollection = this.ctx.db.collection('exam.certificates' as any);

            // 构建查询条件
            const queryCondition: any = { domainId: this.ctx.domain!._id };
            if (uid !== null) {
                queryCondition.uid = uid;
            }

            // 并行获取证书列表和总数
            const [certificates, total] = await Promise.all([
                certCollection
                    .find(queryCondition)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .toArray(),
                certCollection.countDocuments(queryCondition),
            ]);

            // 获取用户模型以查询用户名
            const UserModel = (global as any).Hydro.model.user;

            // 为每个证书添加用户名
            const certificatesWithUsernames = await Promise.all(
                certificates.map(async (cert: any) => {
                    try {
                        const user = await UserModel.getById('system', cert.uid);
                        return {
                            ...cert,
                            username: user?.uname || `User#${cert.uid}`,
                        };
                    } catch (err) {
                        console.warn(`[ExamHall] 无法获取用户 ${cert.uid} 的用户名: ${err}`);
                        return {
                            ...cert,
                            username: `User#${cert.uid}`,
                        };
                    }
                }),
            );

            this.response.type = 'application/json';
            this.response.body = {
                success: true,
                data: certificatesWithUsernames,
                total,
                skip,
                limit,
            };
        } catch (error: any) {
            this.response.status = 500;
            this.response.type = 'application/json';
            this.response.body = {
                success: false,
                error: error.message || '获取证书列表失败',
            };
        }
    }
}
