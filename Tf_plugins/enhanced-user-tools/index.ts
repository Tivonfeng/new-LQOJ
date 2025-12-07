import {
    Context,
} from 'hydrooj';
import { UserToolsHandler } from './src/handlers';

export default function apply(ctx: Context) {
    console.log('Enhanced User Tools plugin loading...');

    // 注册统一路由 - 用户管理工具（包含用户导入和密码修改）
    // 权限验证在 Handler 的 prepare 方法中进行，参考系统设置和配置管理的方式
    ctx.Route('manage_user_tools', '/manage/user/tools', UserToolsHandler);

    // 注入到控制面板侧边栏
    ctx.injectUI('ControlPanel', 'manage_user_tools');

    // 注册中文翻译
    ctx.i18n.load('zh', {
        manage_user_tools: '高级用户管理工具',
    });

    console.log('Enhanced User Tools plugin loaded successfully!');
}
