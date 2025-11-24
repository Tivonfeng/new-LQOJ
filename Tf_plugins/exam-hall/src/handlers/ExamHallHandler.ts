import { Handler, PRIV } from 'hydrooj';

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

            // 返回HTML模板渲染
            this.response.template = 'exam_hall.html';
            this.response.body = {
                canManage,
                isLoggedIn: !!uid,
                managementUrl: '/exam/admin/manage',
            };
        } catch (error: any) {
            this.response.status = 500;
            this.response.body = `加载赛考大厅失败: ${(error as any).message}`;
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
