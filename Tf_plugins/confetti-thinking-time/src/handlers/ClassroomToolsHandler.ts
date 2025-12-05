import { ForbiddenError, Handler, PRIV } from 'hydrooj';
import { ClassroomToolsService } from '../services/ClassroomToolsService';

export class ClassroomToolsHandler extends Handler {
    async prepare() {
        if (!(this.user?.priv & PRIV.PRIV_EDIT_SYSTEM)) {
            throw new ForbiddenError('Not available');
        }
    }

    async get() {
        this.response.body = {
            success: true,
            message: 'Classroom tools endpoint is online',
        };
    }

    async post() {
        const { action } = this.request.body;

        try {
            if (action === 'random_number') {
                await this.handleRandomNumber();
                return;
            }

            this.response.body = {
                success: false,
                message: 'Unknown action',
            };
        } catch (error) {
            this.response.body = {
                success: false,
                message: error.message || 'Unexpected error',
            };
        }
    }

    private async handleRandomNumber() {
        const { min, max, count, allowDuplicate } = this.request.body;
        const toolsService = new ClassroomToolsService(this.ctx);

        const safeConfig = {
            min: Number.parseInt(min, 10) || 1,
            max: Number.parseInt(max, 10) || 100,
            count: Number.parseInt(count, 10) || 1,
            allowDuplicate: allowDuplicate === 'true' || allowDuplicate === true,
        };

        const numbers = toolsService.generateRandomNumbers(safeConfig);

        this.response.body = {
            success: true,
            data: {
                numbers,
                config: safeConfig,
            },
        };
    }
}

