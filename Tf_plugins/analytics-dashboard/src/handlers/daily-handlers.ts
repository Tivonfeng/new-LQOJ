import { Handler } from 'hydrooj';
import { AnalyticsDashboardService } from '../services/dashboard-service';

export class AnalyticsDailyHandler extends Handler {
    async get() {
        if (!this.user?._id) {
            this.response.body = { ok: false, message: 'unauthorized' };
            return;
        }
        const { start, end } = this.request.query as { start?: string; end?: string };
        const service = new AnalyticsDashboardService(this.ctx);
        const daily = await service.getDaily(this.user._id, start, end);
        this.response.body = { ok: true, daily };
    }
}
