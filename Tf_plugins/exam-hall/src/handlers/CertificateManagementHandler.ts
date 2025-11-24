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
    /**
     * 解析用户搜索参数为 uid
     * @param searchParam 可以是数字 uid 或用户名
     * @returns 用户 uid，如果用户不存在返回 undefined
     */
    private async resolveUserIdFromParam(searchParam: string): Promise<number | undefined> {
        const UserModel = (global as any).Hydro.model.user;

        // 先尝试数字 uid
        if (/^\d+$/.test(searchParam)) {
            return Number.parseInt(searchParam);
        }

        // 尝试按用户名搜索
        try {
            const user = await UserModel.getByUname('system', searchParam.trim());
            return user?._id;
        } catch (err) {
            // 搜索用户失败，返回 undefined
            return undefined;
        }
    }

    /**
     * 返回空结果响应
     */
    private returnEmptyResult(skip: number, limit: number) {
        this.response.type = 'application/json';
        this.response.body = {
            success: true,
            data: [],
            total: 0,
            skip,
            limit,
        };
    }

    async get() {
        // 权限检查 - 只有管理员可以访问
        this.checkPriv(PRIV.PRIV_EDIT_SYSTEM);

        try {
            // 获取查询参数
            const searchParam = (this.request.query?.uid as string) || undefined;
            const skip = this.request.query?.skip ? Math.max(0, Number(this.request.query.skip as string)) : 0;
            const limit = this.request.query?.limit ? Math.min(1000, Math.max(1, Number(this.request.query.limit as string))) : 100;

            const certCollection = this.ctx.db.collection('exam.certificates' as any);
            const UserModel = (global as any).Hydro.model.user;

            // 构建查询条件
            const queryCondition: any = { domainId: this.ctx.domain!._id };
            let targetUid: number | undefined;

            // 如果有搜索参数，解析为 uid
            if (searchParam) {
                targetUid = await this.resolveUserIdFromParam(searchParam);
                if (targetUid === undefined) {
                    // 用户不存在，返回空结果
                    this.returnEmptyResult(skip, limit);
                    return;
                }

                queryCondition.uid = targetUid;
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
