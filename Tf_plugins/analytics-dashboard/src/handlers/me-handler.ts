import { Handler } from 'hydrooj';
import { AnalyticsDashboardService } from '../services/dashboard-service';

export class AnalyticsMeHandler extends Handler {
    async get() {
        if (!this.user?._id) {
            this.response.body = { ok: false, message: 'unauthorized' };
            return;
        }
        const service = new AnalyticsDashboardService(this.ctx);
        const [phaseProgress, daily, tags] = await Promise.all([
            service.getPhaseProgress(this.user._id),
            service.getDaily(this.user._id),
            service.getTagMastery(this.user._id),
        ]);

        this.response.body = {
            ok: true,
            phaseProgress,
            daily,
            tags,
        };
    }
}

