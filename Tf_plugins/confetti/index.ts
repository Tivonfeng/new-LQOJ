import { Handler } from 'hydrooj';

// 简单的状态处理器（可选，用于测试）
class ConfettiStatusHandler extends Handler {
    async get() {
        this.response.body = {
            status: 'active',
            message: 'Confetti plugin is running',
        };
    }
}

// 导出插件
export default function apply(ctx: any) {
    // 注册一个简单的状态接口（可选）
    ctx.Route('confetti_status', '/confetti/status', ConfettiStatusHandler);

    console.log('Confetti plugin loaded successfully!');
}
