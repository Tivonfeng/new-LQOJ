import { Handler } from 'hydrooj';

export class ConfettiStatusHandler extends Handler {
    async get() {
        this.response.body = {
            status: 'active',
            message: 'Confetti thinking time plugin is running',
        };
    }
}
