import { yaml } from '@hydrooj/utils';
import {
    ContestModel, Handler, PERM, RecordModel,
    PermissionError, RecordNotFoundError, ValidationError,
} from 'hydrooj';
import { Types, param, query, route } from 'hydrooj';
import { ObjectiveAnalysisService } from '../services/ObjectiveAnalysisService';

function jsonResponse(that: Handler, obj: any) {
    that.response.type = 'application/json';
    that.response.body = obj;
}

/**
 * 读取解析：集合为权威；旧数据兼容——集合为空时回退 config.yaml 的 analysis 并同步到集合
 */
async function loadAnalysis(svc: ObjectiveAnalysisService, domainId: string, pid: string | number, config: any) {
    const backup = await svc.getBackup(domainId, pid);
    if (backup?.analysis && Object.keys(backup.analysis).length) return backup.analysis;
    const legacy = config?.analysis || {};
    if (Object.keys(legacy).length) {
        await svc.setBackup(domainId, pid, legacy, 0);
        return legacy;
    }
    return {};
}

/**
 * 组装答案解析返回数据
 */
async function buildResult(
    svc: ObjectiveAnalysisService, domainId: string,
    pdoc: any, config: any, rdoc: any | null, isOwner: boolean,
) {
    const answers = config?.answers || {};
    const analysis = await loadAnalysis(svc, domainId, pdoc.docId, config);
    const results: Record<string, any> = {};
    for (const tc of rdoc?.testCases || []) {
        const key = tc.id ? `${tc.subtaskId}-${tc.id}` : `${tc.subtaskId}`;
        results[key] = { statusCode: tc.status, score: tc.score, message: tc.message };
    }
    let userAnswers: Record<string, any> = {};
    if (rdoc?.code) {
        try {
            userAnswers = yaml.load(rdoc.code) || {};
        } catch (e) { /* 用户答案解析失败则忽略 */ }
    }
    return {
        submitted: !!rdoc,
        answers,
        analysis,
        userAnswers,
        results,
        isOwner,
    };
}

/**
 * GET /objective-analysis/:pid?rid=&tid=
 * 做题页/编辑页：提交后查看答案解析的展示数据接口
 */
export class ObjectiveAnalysisHandler extends Handler {
    private svc: ObjectiveAnalysisService;
    private pid: string | number;

    @route('pid', Types.ProblemId, true)
    async _prepare(domainId: string, pid: string | number) {
        this.svc = new ObjectiveAnalysisService(this.ctx);
        this.pid = pid;
    }

    @query('rid', Types.ObjectId, true)
    @query('tid', Types.ObjectId, true)
    async get(domainId: string, rid?: string, tid?: string) {
        // 多域环境下前端显式传 domainId（全局路由不带 /d/ 前缀时默认域可能不是题目所在域）
        domainId = (this.request.query.domainId || domainId) as string;
        const info = await this.svc.getConfig(domainId, this.pid);
        if (!info || info.config?.type !== 'objective') return jsonResponse(this, { submitted: false });
        const { pdoc, config } = info;
        const isOwner = this.user.own(pdoc) || this.user.hasPerm(PERM.PERM_EDIT_PROBLEM);

        // 找到要展示的记录：rid 参数优先，否则取本人最新一条
        let rdoc: any = null;
        if (rid) {
            rdoc = await RecordModel.get(domainId, rid as any);
            if (rdoc && rdoc.uid !== this.user._id && !isOwner) throw new PermissionError(PERM.PERM_READ_RECORD_CODE);
        } else if (this.user._id != null) {
            rdoc = await this.svc.getLatestRecord(domainId, pdoc.docId, this.user._id);
        }

        // 可见性：作者始终可见；普通用户需已提交且（比赛进行中时不可见）
        let visible = isOwner || !!rdoc;
        if (visible && tid && !isOwner) {
            let tdoc: any = null;
            try {
                tdoc = await ContestModel.get(domainId, tid as any);
            } catch (e) { /* tid 无效时按无比赛处理 */ }
            if (tdoc && tdoc.rule !== 'homework' && !ContestModel.isDone(tdoc)) visible = false;
        }
        if (!visible) return jsonResponse(this, { submitted: false, isOwner });

        return jsonResponse(this, await buildResult(this.svc, domainId, pdoc, config, rdoc, isOwner));
    }

    /**
     * POST /objective-analysis/:pid
     * 作者保存解析：仅写插件集合（不触碰 config.yaml，与核心配置编辑器零冲突）
     */
    @param('analysis', Types.String, true)
    async post(domainId: string, analysis?: string) {
        domainId = (this.request.query.domainId || this.request.body?.domainId || domainId) as string;
        const info = await this.svc.getConfig(domainId, this.pid);
        if (!info) throw new PermissionError(PERM.PERM_EDIT_PROBLEM);
        if (!this.user.own(info.pdoc) && !this.user.hasPerm(PERM.PERM_EDIT_PROBLEM)) {
            throw new PermissionError(PERM.PERM_EDIT_PROBLEM);
        }
        if (info.config?.type !== 'objective') throw new ValidationError('pid');
        let analysisObj: Record<string, string> = {};
        if (analysis) {
            try {
                analysisObj = JSON.parse(analysis);
            } catch (e) {
                throw new ValidationError('analysis');
            }
        }
        await this.svc.setBackup(info.pdoc.domainId, info.pdoc.docId, analysisObj, this.user._id);
        return jsonResponse(this, { success: true });
    }
}

/**
 * GET /objective-analysis/r/:rid
 * 记录页展示数据（按 rid 反查题目）
 */
export class ObjectiveAnalysisByRidHandler extends Handler {
    private svc: ObjectiveAnalysisService;
    private rdoc: any;
    private rdocDomain: string;

    @route('rid', Types.ObjectId, true)
    async _prepare(domainId: string, rid: string) {
        const realDomain = (this.request.query.domainId || domainId) as string;
        this.svc = new ObjectiveAnalysisService(this.ctx);
        this.rdoc = await RecordModel.get(realDomain, rid as any);
        this.rdocDomain = realDomain;
        if (!this.rdoc) throw new RecordNotFoundError(rid);
        if (this.rdoc.uid !== this.user._id) throw new PermissionError(PERM.PERM_READ_RECORD_CODE);
    }

    async get() {
        const domainId = this.rdocDomain;
        const info = await this.svc.getConfig(domainId, this.rdoc.pid);
        if (!info || info.config?.type !== 'objective') return jsonResponse(this, { submitted: false });
        const { pdoc, config } = info;
        // 比赛进行中不展示（作业除外）
        if (this.rdoc.contest && !this.rdoc.contest.toString().startsWith('0'.repeat(23))) {
            const tdoc = await ContestModel.get(domainId, this.rdoc.contest);
            if (tdoc && tdoc.rule !== 'homework' && !ContestModel.isDone(tdoc)) {
                return jsonResponse(this, { submitted: false });
            }
        }
        const isOwner = this.user.own(pdoc) || this.user.hasPerm(PERM.PERM_EDIT_PROBLEM);
        return jsonResponse(this, await buildResult(this.svc, domainId, pdoc, config, this.rdoc, isOwner));
    }
}
