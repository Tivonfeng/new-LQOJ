import { Handler, PRIV } from 'hydrooj';
import { PresetService } from '../services/PresetService';

/**
 * 序列化对象为 JSON 兼容格式
 * 处理 BigInt 和 Date 对象
 */
function serializeForJSON(obj: any): any {
    if (obj === null || obj === undefined) {
        return obj;
    }
    if (typeof obj === 'bigint') {
        return obj.toString();
    }
    if (obj instanceof Date) {
        return obj.toISOString();
    }
    if (Array.isArray(obj)) {
        return obj.map(serializeForJSON);
    }
    if (typeof obj === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
            result[key] = serializeForJSON(value);
        }
        return result;
    }
    return obj;
}

/**
 * 证书管理后台页面处理器
 * 渲染管理界面，需要管理员权限
 */
export class CertificateManagementPageHandler extends Handler {
    async get() {
        // 权限检查 - 只有管理员可以访问
        this.checkPriv(PRIV.PRIV_EDIT_SYSTEM);

        try {
            const presetService = new PresetService(this.ctx);
            const UserModel = (global as any).Hydro.model.user;
            const certCollection = this.ctx.db.collection('exam.certificates' as any);

            // 并行获取初始数据
            const [rawCertificates, allPresets] = await Promise.all([
                // 获取证书列表（限制前100条，前端可以分页）
                certCollection
                    .find({ domainId: this.ctx.domain!._id })
                    .sort({ createdAt: -1 })
                    .limit(100)
                    .toArray(),
                // 获取所有预设
                presetService.getAllPresets(false),
            ]);

            // 为证书添加用户名
            const certificatesWithUsernames = await Promise.all(
                rawCertificates.map(async (cert: any) => {
                    try {
                        const user = await UserModel.getById('system', cert.uid);
                        return {
                            ...cert,
                            username: user?.uname || `User#${cert.uid}`,
                        };
                    } catch (err) {
                        return {
                            ...cert,
                            username: `User#${cert.uid}`,
                        };
                    }
                }),
            );

            // 准备传递给前端的数据对象
            const managementData = {
                certificates: serializeForJSON(certificatesWithUsernames),
                presets: serializeForJSON(allPresets),
                examHallUrl: this.url('exam_hall'),
            };

            // 返回管理后台 HTML 模板
            this.response.template = 'certificate-management.html';
            this.response.body = {
                title: '证书管理',
                domainId: this.domain._id,
                uid: this.user._id,
                isAdmin: this.user.role === 'admin' || !!(this.user.perm & BigInt(PRIV.PRIV_EDIT_SYSTEM)),
                managementDataJson: JSON.stringify(managementData),
            };
        } catch (error: any) {
            console.error('[CertificateManagement] 加载初始数据失败:', error);
            // 即使出错也返回模板，前端会通过 API 获取数据
            this.response.template = 'certificate-management.html';
            this.response.body = {
                title: '证书管理',
                domainId: this.domain._id,
                uid: this.user._id,
                isAdmin: this.user.role === 'admin' || !!(this.user.perm & BigInt(PRIV.PRIV_EDIT_SYSTEM)),
                managementDataJson: JSON.stringify({
                    certificates: [],
                    presets: [],
                    examHallUrl: this.url('exam_hall'),
                }),
            };
        }
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
