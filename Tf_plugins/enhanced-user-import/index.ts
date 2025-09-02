import {
    Context,
    PRIV,
} from 'hydrooj';
import { EnhancedUserImportHandler } from './src/handlers';

export default function apply(ctx: Context) {
    console.log('Enhanced User Import plugin loading...');

    // 注册路由
    ctx.Route('manage_user_import_enhanced', '/manage/userimport/enhanced', EnhancedUserImportHandler, PRIV.PRIV_EDIT_SYSTEM);

    // 测试注入到导航栏而不是控制面板
    ctx.injectUI('Nav', 'manage_user_import_enhanced', {
        icon: 'user-plus',
        name: '用户导入',
    });

    console.log('Enhanced User Import plugin loaded successfully!');
}
