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

            // 获取最近一个季度的证书和排行榜
            const [recentCompetitions, recentCertifications, recentCertificates, leaderboard] = await Promise.all([
                certService.getRecentQuarterCertificates('competition', 20, { includeAllDomains: true }),
                certService.getRecentQuarterCertificates('certification', 20, { includeAllDomains: true }),
                certService.getRecentCertificates(10, { includeAllDomains: true }),
                certService.getLeaderboard(20, { includeAllDomains: true }),
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

            // 处理最近证书记录（包含创建时间）
            const processRecentRecord = async (cert: any) => {
                const username = await this.lookupUsername(cert.uid, this.normalizeDomainId(cert.domainId)) || '优秀学员';
                return {
                    _id: cert._id?.toString(),
                    uid: cert.uid,
                    username,
                    certificateName: cert.certificateName,
                    certifyingBody: cert.certifyingBody,
                    category: cert.category,
                    level: cert.level,
                    issueDate: cert.issueDate,
                    certificateImageUrl: cert.certificateImageUrl,
                    examType: cert.examType,
                    competitionName: cert.competitionName,
                    certificationSeries: cert.certificationSeries,
                    createdAt: cert.createdAt?.toISOString(),
                    createdAtFormatted: cert.createdAt?.toLocaleString('zh-CN', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                    }),
                };
            };

            const [processedCompetitions, processedCertifications, processedRecentRecords] = await Promise.all([
                Promise.all(recentCompetitions.map((cert) => processCert(cert, 'competitionName'))),
                Promise.all(recentCertifications.map((cert) => processCert(cert, 'certificationSeries'))),
                Promise.all(recentCertificates.map((cert) => processRecentRecord(cert))),
            ]);

            // 获取用户信息（用于最近记录显示和排行榜）
            const UserModel = (global as any).Hydro.model.user;
            const recentRecordUids = [...new Set(processedRecentRecords.map((r) => r.uid))];
            const leaderboardUids = leaderboard.map((item) => item.uid);
            const allUids = [...new Set([...recentRecordUids, ...leaderboardUids])];

            // 查询多个域中的用户信息，优先获取 displayName
            const udocs: Record<string, any> = {};
            const domainUserCollection = this.ctx.db.collection('domain.user');

            // 先查询当前域的用户信息
            const rawUdocs = await UserModel.getList(this.domain._id, allUids);
            for (const userId in rawUdocs) {
                const user = rawUdocs[userId];
                if (user) {
                    // 处理头像 URL，移除可能的 "url:" 前缀
                    let avatarUrl = user.avatar || user.avatarUrl || '';
                    if (avatarUrl && avatarUrl.startsWith('url:')) {
                        avatarUrl = avatarUrl.substring(4); // 移除 "url:" 前缀
                    }
                    udocs[String(userId)] = {
                        uname: user.uname || '',
                        displayName: user.displayName || user.uname || '',
                        avatarUrl,
                        bio: user.bio || '',
                    };
                }
            }

            // 对于没有 displayName 的用户，查询所有域中的 displayName
            const uidsWithoutDisplayName = allUids.filter((userId) => {
                const user = udocs[String(userId)];
                return !user || !user.displayName || user.displayName === user.uname;
            });

            if (uidsWithoutDisplayName.length > 0) {
                const allDomainUsers = await domainUserCollection
                    .find({ uid: { $in: uidsWithoutDisplayName } })
                    .toArray() as any[];

                for (const domainUser of allDomainUsers) {
                    const userIdStr = String(domainUser.uid);
                    const hasDisplayName = domainUser?.displayName;
                    const userDoc = udocs[userIdStr];
                    const needsDisplayName = !userDoc
                        || !userDoc.displayName
                        || userDoc.displayName === userDoc.uname;
                    if (hasDisplayName && needsDisplayName) {
                        if (!udocs[userIdStr]) {
                            // 如果用户不存在，创建基本结构
                            const user = rawUdocs[domainUser.uid];
                            let avatarUrl = user?.avatar || user?.avatarUrl || '';
                            if (avatarUrl && avatarUrl.startsWith('url:')) {
                                avatarUrl = avatarUrl.substring(4);
                            }
                            udocs[userIdStr] = {
                                uname: user?.uname || '',
                                displayName: domainUser.displayName,
                                avatarUrl,
                                bio: user?.bio || '',
                            };
                        } else {
                            // 更新 displayName
                            udocs[userIdStr].displayName = domainUser.displayName;
                        }
                    }
                }
            }

            // 处理排行榜数据，添加用户名
            const processedLeaderboard = await Promise.all(
                leaderboard.map(async (item) => {
                    const username = await this.lookupUsername(item.uid, this.normalizeDomainId(this.domain._id)) || `User#${item.uid}`;
                    return {
                        ...item,
                        username,
                    };
                }),
            );

            const examHallData = {
                isLoggedIn: !!uid,
                canManage,
                managementUrl: '/exam/admin/manage',
                recentCompetitions: processedCompetitions,
                recentCertifications: processedCertifications,
                recentRecords: processedRecentRecords,
                leaderboard: processedLeaderboard,
                udocs,
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
