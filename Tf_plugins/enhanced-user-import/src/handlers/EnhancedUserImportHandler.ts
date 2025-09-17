import {
    Handler,
    PRIV,
} from 'hydrooj';
import { UserImportService } from '../services/UserImportService';

export class EnhancedUserImportHandler extends Handler {
    async prepare() {
        this.checkPriv(PRIV.PRIV_EDIT_SYSTEM);
    }

    async get() {
        const availableDomains = await UserImportService.getAvailableDomains();

        // 检查是否是API请求
        if (this.request.headers.accept?.includes('application/json')
            || this.request.headers['content-type']?.includes('application/json')) {
            this.response.body = {
                domains: availableDomains,
                currentDomain: this.domain._id,
            };
            this.response.type = 'application/json';
        } else {
            // 读取配置并传递给前端
            const config = UserImportService.getConfig();

            this.response.template = 'enhanced_user_import.html';
            this.response.body = {
                domains: availableDomains,
                currentDomain: this.domain._id,
                page_name: 'manage_user_import_enhanced',
                config,
            };
        }
    }

    async post() {
        const selectedDomainId = this.request.body.domainId || this.domain._id;
        const selectedRole = this.request.body.role || 'default';
        const singleUsername = this.request.body.username || '';
        const draft = this.request.body.draft === 'true' || this.request.body.draft === true;

        const result = await UserImportService.processUserCreation({
            username: singleUsername,
            domainId: selectedDomainId,
            role: selectedRole,
            draft,
        }, this.ctx);

        this.response.body = result;
        this.response.type = 'application/json';
    }
}
