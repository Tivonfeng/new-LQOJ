import { Handler } from 'hydrooj';
import { AnalyticsDashboardService } from '../services/dashboard-service';
import { AnalyticsPhase } from '../types/analytics';

export class AnalyticsPhaseListHandler extends Handler {
    async get() {
        const domainId = this.domain?._id;
        const phases = await this.ctx.db.collection('analytics.phases' as any)
            .find(domainId ? { domainId } : {})
            .sort({ createdAt: -1 })
            .toArray();

        const service = new AnalyticsDashboardService(this.ctx);
        const progress = this.user?._id
            ? await service.getPhaseProgress(this.user._id)
            : [];

        this.response.body = { ok: true, phases, progress };
    }
}

export class AnalyticsPhaseDetailHandler extends Handler {
    async get() {
        const { phaseId } = this.args;
        const phase = await this.ctx.db.collection('analytics.phases' as any).findOne({ phaseId });
        if (!phase) {
            this.response.body = { ok: false, message: 'phase not found' };
            return;
        }
        const service = new AnalyticsDashboardService(this.ctx);
        const progress = this.user?._id
            ? await service.getPhaseProgress(this.user._id, phaseId)
            : [];
        this.response.body = { ok: true, phase, progress };
    }
}

export class AnalyticsPhaseAdminHandler extends Handler {
    async get() {
        this.checkPerm(PERM.PERM_EDIT_DOMAIN);
        const domainId = this.domain?._id;
        const phases = await this.ctx.db.collection('analytics.phases' as any)
            .find(domainId ? { domainId } : {})
            .sort({ order: 1, createdAt: -1 })
            .toArray();
        this.response.body = { ok: true, phases };
    }

    async post() {
        this.checkPerm(PERM.PERM_EDIT_DOMAIN);
        const body = this.request.body as Partial<AnalyticsPhase> & { phaseId: string; title: string };
        if (!body.phaseId || !body.title) {
            this.response.body = { ok: false, message: 'phaseId and title required' };
            return;
        }
        const doc: AnalyticsPhase = {
            phaseId: body.phaseId,
            title: body.title,
            description: body.description || '',
            domainId: this.domain?._id || body.domainId || 'default',
            problemIds: body.problemIds || [],
            tagRules: body.tagRules || [],
            targets: body.targets,
            contestId: body.contestId,
            order: body.order ?? Date.now(),
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        await this.ctx.db.collection('analytics.phases' as any).updateOne(
            { phaseId: doc.phaseId },
            { $set: doc },
            { upsert: true },
        );
        this.response.body = { ok: true };
    }

    async put() {
        this.checkPerm(PERM.PERM_EDIT_DOMAIN);
        const body = this.request.body as Partial<AnalyticsPhase> & { phaseId: string };
        if (!body.phaseId) {
            this.response.body = { ok: false, message: 'phaseId required' };
            return;
        }
        const updates: any = {
            ...(body.title && { title: body.title }),
            ...(body.description && { description: body.description }),
            ...(body.problemIds && { problemIds: body.problemIds }),
            ...(body.tagRules && { tagRules: body.tagRules }),
            ...(body.targets && { targets: body.targets }),
            ...(body.contestId !== undefined && { contestId: body.contestId }),
            ...(body.order !== undefined && { order: body.order }),
            updatedAt: new Date(),
        };
        await this.ctx.db.collection('analytics.phases' as any).updateOne(
            { phaseId: body.phaseId },
            { $set: updates },
        );
        this.response.body = { ok: true };
    }

    async delete() {
        this.checkPerm(PERM.PERM_EDIT_DOMAIN);
        const { phaseId } = this.args;
        if (!phaseId) {
            this.response.body = { ok: false, message: 'phaseId required' };
            return;
        }
        await this.ctx.db.collection('analytics.phases' as any).deleteOne({ phaseId });
        this.response.body = { ok: true };
    }
}

