import { Context, PRIV } from 'hydrooj';
// 导入处理器
import {
    CertificateBatchDeleteHandler,
    CertificateCreateHandler,
    CertificateDetailHandler,
    CertificateGetHandler,
    CertificateManagementListHandler,
    CertificateManagementPageHandler,
    CertificateStatsHandler,
    CertificateUploadHandler,
    ExamHallHandler,
    PresetDetailHandler,
    PresetListHandler,
    PresetToggleHandler,
} from './src/handlers';
// 导入服务层 - 仅导入类型定义用于数据库集合声明
import type { Certificate } from './src/services';
import type { CertificatePreset } from './src/services/PresetService';

// 声明数据库集合类型
declare module 'hydrooj' {
    interface Collections {
        'exam.certificates': Certificate;
        'exam.presets': CertificatePreset;
    }
}

/**
 * 赛考大厅插件主入口
 * 处理线下赛考证书管理和七牛云存储
 * Exam Hall Plugin - Manage offline exam certificates and cloud storage
 */
export default async function apply(ctx: Context, _config: any = {}) {
    console.log('[ExamHall] 🚀 赛考大厅插件正在加载... (Exam Hall Plugin Loading...)');

    // 🗄️ 初始化数据库集合和索引 - Initialize database collections and indexes
    try {
        const db = ctx.db;

        // 并行创建所有索引以加快启动速度 - Parallelize index creation for faster startup
        const certCollection = db.collection('exam.certificates' as any);
        const presetCollection = db.collection('exam.presets' as any);
        const statsCollection = db.collection('exam.user_stats' as any);

        await Promise.all([
            // 证书集合索引 - Certificate collection indexes
            certCollection.createIndex({ domainId: 1, uid: 1 }),
            certCollection.createIndex({ domainId: 1, status: 1 }),
            certCollection.createIndex({ domainId: 1, category: 1 }),
            certCollection.createIndex({ domainId: 1, uid: 1, status: 1 }),
            certCollection.createIndex({ issueDate: -1 }),
            certCollection.createIndex({ createdAt: -1 }),
            certCollection.createIndex({ domainId: 1, createdAt: -1 }),

            // 新增优化索引 - New optimization indexes
            certCollection.createIndex({ domainId: 1, presetId: 1 }),
            certCollection.createIndex({ domainId: 1, examType: 1 }),
            certCollection.createIndex({ domainId: 1, competitionName: 1 }),
            certCollection.createIndex({ domainId: 1, certificationSeries: 1 }),
            certCollection.createIndex({ domainId: 1, examType: 1, issueDate: -1 }),

            // 预设集合索引 - Preset collection indexes
            presetCollection.createIndex({ domainId: 1, type: 1 }),
            presetCollection.createIndex({ domainId: 1, enabled: 1 }),
            presetCollection.createIndex({ domainId: 1, createdAt: -1 }),

            // 用户统计集合索引 - User stats collection indexes
            statsCollection.createIndex({ domainId: 1, uid: 1 }, { unique: true }),
            statsCollection.createIndex({ domainId: 1, totalCertificates: -1 }),
        ]);

        console.log('[ExamHall] ✅ 数据库集合和索引初始化完成 (Database initialized successfully)');
    } catch (error: any) {
        console.error('[ExamHall] ❌ 数据库初始化失败 (Database init failed):', error.message);
    }

    // 🧭 注入导航栏入口 - Inject navigation entry (similar to score-hall style)
    ctx.injectUI('Nav', 'exam_hall', {
        prefix: 'exam',
        before: 'ranking',
    }, PRIV.PRIV_USER_PROFILE);

    // 通过 inject 获取 scoreCore 和 qiniuCore 服务并存储到 global
    try {
        if (typeof ctx.inject === 'function') {
            // 注入 scoreCore 服务
            ctx.inject(['scoreCore'], ({ scoreCore }: any) => {
                (global as any).scoreCoreService = scoreCore;
                if (scoreCore) {
                    console.log('[ExamHall] ✅ scoreCore service injected to global');
                } else {
                    console.warn('[ExamHall] ⚠️ scoreCore service injected but is null');
                }
            });

            // 注入 qiniuCore 服务
            ctx.inject(['qiniuCore'], ({ qiniuCore }: any) => {
                (global as any).qiniuCoreService = qiniuCore;
                if (qiniuCore) {
                    console.log('[ExamHall] ✅ qiniuCore service injected to global');
                } else {
                    console.warn('[ExamHall] ⚠️ qiniuCore service injected but is null');
                }
            });
        } else if ((ctx as any).scoreCore) {
            (global as any).scoreCoreService = (ctx as any).scoreCore;
            console.log('[ExamHall] ✅ scoreCore service available via ctx');
        } else {
            console.warn('[ExamHall] ⚠️ ctx.inject not available and services not found');
        }
    } catch (e) {
        console.warn('[ExamHall] ⚠️ Failed to inject services:', e);
    }

    console.log('[ExamHall] ✅ 导航栏入口注册完成 (Nav entry registered)');

    // 📍 注册路由 - Register routes
    // 赛考大厅主页 - Main exam hall page
    ctx.Route('exam_hall', '/exam/hall', ExamHallHandler);

    // 证书上传 - Certificate upload
    ctx.Route('exam_upload_certificate', '/exam/admin/upload-certificate', CertificateUploadHandler);

    // 证书CRUD操作 - Certificate CRUD operations
    ctx.Route('exam_create_certificate', '/exam/admin/certificates', CertificateCreateHandler);
    ctx.Route('exam_batch_delete_certificate', '/exam/admin/certificates', CertificateBatchDeleteHandler);
    // CertificateDetailHandler 已支持 GET, PUT, DELETE 三个方法
    ctx.Route('exam_detail_certificate', '/exam/admin/certificates/:id', CertificateDetailHandler);

    // 证书查询 - Certificate queries
    ctx.Route('exam_list_certificate', '/exam/certificates', CertificateGetHandler);
    ctx.Route('exam_get_certificate', '/exam/certificates/:id', CertificateDetailHandler);
    ctx.Route('exam_user_stats', '/exam/stats/certificates', CertificateStatsHandler);

    // 证书管理后台 - Certificate management admin
    ctx.Route('exam_certificate_management', '/exam/admin/manage', CertificateManagementPageHandler);
    ctx.Route('exam_certificate_management_list', '/exam/admin/certificates-list', CertificateManagementListHandler);

    // 预设 API - Preset APIs
    ctx.Route('exam_list_presets', '/exam/admin/presets', PresetListHandler);
    ctx.Route('exam_detail_preset', '/exam/admin/presets/:id', PresetDetailHandler);
    ctx.Route('exam_toggle_preset', '/exam/admin/presets/:id/toggle', PresetToggleHandler);

    console.log('[ExamHall] ✅ 赛考大厅插件加载完成，已注册 13 个路由 (Plugin loaded, 13 routes registered)');
}
