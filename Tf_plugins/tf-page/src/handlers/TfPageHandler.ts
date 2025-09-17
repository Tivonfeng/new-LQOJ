import { Handler } from 'hydrooj';

export class TfPageHandler extends Handler {
    async prepare() {
        // 无需特殊权限验证，允许所有用户访问
    }

    async get() {
        // 获取用户信息
        const user = this.user;

        // 准备页面数据
        const pageData = {
            title: 'TF\'s Page',
            description: '这是 TF 的个人页面',
            user,
            showUserInfo: !!user, // 是否显示用户信息
            stats: {
                totalUsers: await this.ctx.db.collection('user').countDocuments(),
                totalProblems: await this.ctx.db.collection('document').countDocuments({ docType: 10 }),
                // 可以添加更多统计信息
            },
        };

        this.response.template = 'tf_page.html';
        this.response.body = pageData;
    }

    async post() {
        // 处理POST请求，比如留言功能
        const { action } = this.request.body;

        if (action === 'leave_message') {
            if (!this.user) {
                this.response.body = { success: false, message: '请先登录' };
                return;
            }

            // 这里可以实现留言功能
            // 暂时只返回成功消息
            this.response.body = {
                success: true,
                message: '留言功能暂未实现，感谢您的关注！',
            };
        }
    }
}
