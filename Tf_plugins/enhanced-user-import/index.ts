import * as fs from 'fs';
import * as path from 'path';
import {
    Context,
    Handler,
    PRIV,
} from 'hydrooj';
import { EnhancedUserImportHandler } from './src/handlers';

// 静态文件处理器
class StaticHandler extends Handler {
    async get(_domainId: string, file: string) {
        const filePath = path.resolve(__dirname, 'frontend', file);

        // 安全检查，确保文件在frontend目录内
        if (!filePath.startsWith(path.resolve(__dirname, 'frontend'))) {
            throw new Error('Access denied');
        }

        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath);
            const ext = path.extname(file);

            // 设置正确的Content-Type
            if (ext === '.css') {
                this.response.type = 'text/css';
            } else if (ext === '.js') {
                this.response.type = 'application/javascript';
            }

            this.response.body = content;
        } else {
            this.response.status = 404;
            this.response.body = 'File not found';
        }
    }
}

export default function apply(ctx: Context) {
    console.log('Quick User Creation plugin loading...');

    // 注册路由 - 用户快速创建功能
    ctx.Route('manage_user_import_enhanced', '/manage/userimport/enhanced', EnhancedUserImportHandler, PRIV.PRIV_EDIT_SYSTEM);

    // 注册静态文件路由
    ctx.Route('enhanced_user_import_static', '/tf_plugins/enhanced-user-import/frontend/:file', StaticHandler);

    // 注入到控制面板侧边栏
    ctx.injectUI('ControlPanel', 'manage_user_import_enhanced');

    console.log('Quick User Creation plugin loaded successfully!');
}
