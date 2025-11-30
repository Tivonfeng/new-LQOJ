import { Handler, PRIV } from 'hydrooj';
import { CertificateService } from '../services/CertificateService';

/**
 * 赛考大厅主页处理器
 * 路由: /exam/hall
 * 功能: 赛考系统总入口，提供证书管理功能
 */
export class ExamHallHandler extends Handler {
    /**
     * GET /exam/hall
     * 赛考大厅主页 - 提供证书管理功能入口
     */
    async get() {
        try {
            const uid = this.user?._id;
            const canManage = this.checkManagePermission();
            const certService = new CertificateService(this.ctx);

            // 获取最近一个季度的证书
            const [recentCompetitions, recentCertifications] = await Promise.all([
                certService.getRecentQuarterCertificates('competition', 20, { includeAllDomains: true }),
                certService.getRecentQuarterCertificates('certification', 20, { includeAllDomains: true }),
            ]);

            // 处理证书数据（统一处理逻辑）
            const processCert = async (cert: any, extraField: string) => {
                const username = await this.lookupUsername(cert.uid, this.normalizeDomainId(cert.domainId)) || '优秀学员';
                return {
                    _id: cert._id?.toString(),
                    username,
                    certificateName: cert.certificateName,
                    certifyingBody: cert.certifyingBody,
                    category: cert.category,
                    level: cert.level,
                    issueDate: cert.issueDate,
                    certificateImageUrl: cert.certificateImageUrl,
                    [extraField]: cert[extraField],
                };
            };

            const [processedCompetitions, processedCertifications] = await Promise.all([
                Promise.all(recentCompetitions.map((cert) => processCert(cert, 'competitionName'))),
                Promise.all(recentCertifications.map((cert) => processCert(cert, 'certificationSeries'))),
            ]);

            const examHallData = {
                isLoggedIn: !!uid,
                canManage,
                managementUrl: '/exam/admin/manage',
                recentCompetitions: processedCompetitions,
                recentCertifications: processedCertifications,
            };

            this.response.template = 'exam_hall.html';
            this.response.body = {
                ...examHallData,
                examHallDataJSON: JSON.stringify(examHallData),
            };
        } catch (error: any) {
            this.response.status = 500;
            this.response.body = `加载赛考大厅失败: ${error.message}`;
        }
    }

    /**
     * 标准化 domainId
     */
    private normalizeDomainId(value: any): string | undefined {
        if (!value) return undefined;
        if (typeof value === 'string') return value;
        if (typeof value === 'number') return value.toString();
        if (typeof value === 'object') {
            return value.toHexString?.() || value._id || value.toString?.();
        }
        return undefined;
    }

    /**
     * 获取用户名
     */
    private async lookupUsername(uid: number, preferredDomainId?: string): Promise<string | undefined> {
        try {
            const domainUserCollection = this.ctx.db.collection('domain.user');

            // 优先查询特定域的用户信息
            if (preferredDomainId) {
                const domainUser = await domainUserCollection.findOne({
                    domainId: preferredDomainId,
                    uid,
                }) as any;

                if (domainUser?.displayName) {
                    return domainUser.displayName;
                }
            }

            // 查询当前上下文域的用户信息
            const currentDomainId = this.ctx.domain?._id || this.ctx.domain?.id;
            if (currentDomainId && currentDomainId !== preferredDomainId) {
                const domainUser = await domainUserCollection.findOne({
                    domainId: currentDomainId,
                    uid,
                }) as any;

                if (domainUser?.displayName) {
                    return domainUser.displayName;
                }
            }

            // 查询所有域中有该用户的 displayName
            const allDomainUsers = await domainUserCollection.find({ uid }).toArray() as any[];
            for (const domainUser of allDomainUsers) {
                if (domainUser?.displayName) {
                    return domainUser.displayName;
                }
            }

            return undefined;
        } catch (error) {
            console.error('[ExamHall] lookupUsername failed', { uid, error: (error as any)?.message });
            return undefined;
        }
    }

    /**
     * 检查当前用户是否有管理权限
     */
    private checkManagePermission(): boolean {
        return !!(
            this.user
            && (
                this.user.role === 'admin'
                || (this.user.perm && (this.user.perm & BigInt(PRIV.PRIV_EDIT_SYSTEM)))
            )
        );
    }
}
