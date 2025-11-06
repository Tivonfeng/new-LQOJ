import { Context, PRIV } from 'hydrooj';
// 导入处理器
import {
    BatchImportHandler,
    CertificateBatchDeleteHandler,
    CertificateCreateHandler,
    CertificateDetailHandler,
    CertificateGetHandler,
    CertificateManagementListHandler,
    CertificateManagementPageHandler,
    CertificateStatsHandler,
    CertificateUploadHandler,
    DomainStatsHandler,
    ExamHallHandler,
    GrowthTrendHandler,
    ImportHistoryHandler,
    LeaderboardHandler,
    PopularCategoriesHandler,
    PresetBatchDeleteHandler,
    PresetCreateHandler,
    PresetDetailHandler,
    PresetListHandler,
    PresetToggleHandler,
    UserRankHandler,
} from './src/handlers';
// 导入服务层 - 仅导入类型定义用于数据库集合声明
import type { Certificate } from './src/services';
import type { CertificatePreset } from './src/services/PresetService';

// 声明数据库集合类型
declare module 'hydrooj' {
    interface Collections {
        'exam.certificates': Certificate;
        'exam.presets': CertificatePreset;
        'exam.user_stats': any;
        'exam.import_history': any;
    }
}

/**
 * 赛考大厅插件主入口
 * 处理线下赛考证书管理、七牛云存储和排行榜统计
 * Exam Hall Plugin - Manage offline exam certificates, cloud storage, and leaderboard statistics
 */
export default async function apply(ctx: Context, _config: any = {}) {
    console.log('[ExamHall] 🚀 赛考大厅插件正在加载... (Exam Hall Plugin Loading...)');

    // 🗄️ 初始化数据库集合和索引 - Initialize database collections and indexes
    try {
        const db = ctx.db;

        // 创建证书集合索引 - Create certificate collection indexes
        const certCollection = db.collection('exam.certificates' as any);
        await certCollection.createIndex({ domainId: 1, uid: 1 });
        await certCollection.createIndex({ domainId: 1, status: 1 });
        await certCollection.createIndex({ domainId: 1, category: 1 });
        // 复合索引用于用户证书过滤查询
        await certCollection.createIndex({ domainId: 1, uid: 1, status: 1 });
        await certCollection.createIndex({ issueDate: -1 });
        await certCollection.createIndex({ createdAt: -1 });
        // 用于排序和分页查询
        await certCollection.createIndex({ domainId: 1, createdAt: -1 });

        // 创建用户统计集合索引 - Create user stats collection indexes
        const statsCollection = db.collection('exam.user_stats' as any);
        await statsCollection.createIndex({ domainId: 1, uid: 1 }, { unique: true });
        await statsCollection.createIndex({ domainId: 1, totalCertificates: -1 });
        // 用于统计聚合查询
        await statsCollection.createIndex({ domainId: 1, createdAt: -1 });

        // 创建导入历史集合索引 - Create import history collection indexes
        const historyCollection = db.collection('exam.import_history' as any);
        await historyCollection.createIndex({ domainId: 1, createdAt: -1 });
        // 用于用户操作审计
        await historyCollection.createIndex({ domainId: 1, importedBy: 1 });

        // 创建预设集合索引 - Create presets collection indexes
        const presetCollection = db.collection('exam.presets' as any);
        await presetCollection.createIndex({ domainId: 1, type: 1 });
        await presetCollection.createIndex({ domainId: 1, enabled: 1 });
        await presetCollection.createIndex({ domainId: 1, createdAt: -1 });

        console.log('[ExamHall] ✅ 数据库集合和索引初始化完成 (Database initialized successfully)');
    } catch (error: any) {
        console.error('[ExamHall] ❌ 数据库初始化失败 (Database init failed):', error.message);
    }

    // 🧭 注入导航栏入口 - Inject navigation entry (similar to score-hall style)
    ctx.injectUI('Nav', 'exam_hall', {
        prefix: 'exam',
        before: 'ranking',
    }, PRIV.PRIV_USER_PROFILE);

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

    // 批量导入 - Batch import
    ctx.Route('exam_batch_import', '/exam/admin/batch-import', BatchImportHandler);
    ctx.Route('exam_import_history', '/exam/admin/import-history', ImportHistoryHandler);

    // 排行榜和统计 - Leaderboard and statistics
    ctx.Route('exam_leaderboard', '/exam/leaderboard', LeaderboardHandler);
    ctx.Route('exam_user_rank', '/exam/rank/:uid', UserRankHandler);
    ctx.Route('exam_domain_stats', '/exam/stats/domain', DomainStatsHandler);
    ctx.Route('exam_growth_trend', '/exam/stats/trend', GrowthTrendHandler);
    ctx.Route('exam_popular_categories', '/exam/stats/popular-categories', PopularCategoriesHandler);

    // 证书管理后台 - Certificate management admin
    ctx.Route('exam_certificate_management', '/exam/admin/manage', CertificateManagementPageHandler);
    ctx.Route('exam_certificate_management_list', '/exam/admin/certificates-list', CertificateManagementListHandler);

    // 预设 API - Preset APIs
    ctx.Route('exam_list_presets', '/exam/admin/presets', PresetListHandler);
    // ctx.Route('exam_create_preset', '/exam/admin/presets', PresetCreateHandler); // Merged into PresetListHandler
    // ctx.Route('exam_batch_delete_presets', '/exam/admin/presets', PresetBatchDeleteHandler); // Not used in frontend
    ctx.Route('exam_detail_preset', '/exam/admin/presets/:id', PresetDetailHandler);
    ctx.Route('exam_toggle_preset', '/exam/admin/presets/:id/toggle', PresetToggleHandler);

    console.log('[ExamHall] ✅ 赛考大厅插件加载完成，已注册 20 个路由 (Plugin loaded, 20 routes registered)');
}
