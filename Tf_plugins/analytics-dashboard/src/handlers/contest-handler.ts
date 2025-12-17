import { Handler } from 'hydrooj';
import { AnalyticsDashboardService } from '../services/dashboard-service';

export class AnalyticsContestHandler extends Handler {
    async get() {
        const cid = Number(this.args.cid);
        if (Number.isNaN(cid)) {
            this.response.body = { ok: false, message: 'invalid cid' };
            return;
        }
        if (!this.user?._id) {
            this.response.body = { ok: false, message: 'unauthorized' };
            return;
        }

        const service = new AnalyticsDashboardService(this.ctx);
        const perf = await service.getContestPerf(this.user._id, cid);

        this.response.body = { ok: true, perf };
    }
}
