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

            // 🔐 检查管理权限
            const canManage = this.checkManagePermission();

            // 获取最近一个季度的证书
            const certService = new CertificateService(this.ctx);
            const recentCompetitions = await certService.getRecentQuarterCertificates('competition', 20);
            const recentCertifications = await certService.getRecentQuarterCertificates('certification', 20);

            // 处理竞赛证书数据（获取用户名）
            const processedCompetitions = await Promise.all(
                recentCompetitions.map(async (cert) => ({
                    _id: cert._id?.toString(),
                    username: cert.uid ? await this.getUsername(cert.uid) : undefined,
                    certificateName: cert.certificateName,
                    certifyingBody: cert.certifyingBody,
                    category: cert.category,
                    level: cert.level,
                    issueDate: cert.issueDate,
                    certificateImageUrl: cert.certificateImageUrl,
                    competitionName: cert.competitionName,
                })),
            );

            // 处理考级证书数据（获取用户名）
            const processedCertifications = await Promise.all(
                recentCertifications.map(async (cert) => ({
                    _id: cert._id?.toString(),
                    username: cert.uid ? await this.getUsername(cert.uid) : undefined,
                    certificateName: cert.certificateName,
                    certifyingBody: cert.certifyingBody,
                    category: cert.category,
                    level: cert.level,
                    issueDate: cert.issueDate,
                    certificateImageUrl: cert.certificateImageUrl,
                    certificationSeries: cert.certificationSeries,
                })),
            );

            const examHallData = {
                isLoggedIn: !!uid,
                canManage,
                managementUrl: '/exam/admin/manage',
                recentCompetitions: processedCompetitions,
                recentCertifications: processedCertifications,
            };

            // 返回HTML模板渲染
            this.response.template = 'exam_hall.html';
            this.response.body = {
                canManage,
                isLoggedIn: !!uid,
                managementUrl: '/exam/admin/manage',
                examHallDataJSON: JSON.stringify(examHallData),
            };
        } catch (error: any) {
            this.response.status = 500;
            this.response.body = `加载赛考大厅失败: ${(error as any).message}`;
        }
    }

    /**
     * 获取用户名
     */
    private async getUsername(uid: number): Promise<string | undefined> {
        try {
            const UserModel = (global as any).Hydro.model.user;
            const user = await UserModel.getById(this.ctx.domain!.id, uid);
            return user?.uname || user?.username;
        } catch {
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
