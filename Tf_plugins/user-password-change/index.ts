import * as fs from 'fs';
import * as path from 'path';
import {
    Context,
    Handler,
    PRIV,
    SettingModel,
} from 'hydrooj';
import { PasswordChangeHandler } from './src/handlers';

class StaticHandler extends Handler {
    noCheckPermView = true;

    async get(_domainId: string, file: string) {
        const filePath = path.resolve(__dirname, 'frontend', file);

        if (!filePath.startsWith(path.resolve(__dirname, 'frontend'))) {
            throw new Error('Access denied');
        }

        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath);
            const ext = path.extname(file);

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
    console.log('Admin Password Change plugin loading...');

    SettingModel.SystemSetting(
        SettingModel.Setting('admin_password_change', 'minPasswordLength', 6, 'number',
            'Minimum Password Length', 'Minimum length required for passwords'),
    );

    ctx.Route('manage_user_password_change', '/manage/user/password', PasswordChangeHandler, PRIV.PRIV_EDIT_SYSTEM);
    ctx.Route('admin_password_change_static', '/tf_plugins/user-password-change/frontend/:file', StaticHandler);

    ctx.injectUI('ControlPanel', 'manage_user_password_change');

    console.log('Admin Password Change plugin loaded successfully!');
}
