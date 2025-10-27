import { Context, PRIV, Schema } from 'hydrooj';
// 导入处理器
import {
    BatchImportHandler,
    CertificateBatchDeleteHandler,
    CertificateCreateHandler,
    CertificateDeleteHandler,
    CertificateDetailHandler,
    CertificateGetHandler,
    CertificateStatsHandler,
    CertificateUpdateHandler,
    CertificateUploadHandler,
    DomainStatsHandler,
    ExamHallHandler,
    GrowthTrendHandler,
    ImportHistoryHandler,
    LeaderboardHandler,
    PopularCategoriesHandler,
    UserRankHandler,
} from './src/handlers';

// 赛考大厅配置Schema
const Config = Schema.object({
    enabled: Schema.boolean().default(true).description('是否启用赛考大厅'),
    qiniu: Schema.object({
        enabled: Schema.boolean().default(false),
        accessKey: Schema.string().default(''),
        secretKey: Schema.string().default(''),
        bucket: Schema.string().default('exam-certificates'),
        domain: Schema.string().default(''),
        zone: Schema.string().default('Zone_CN_East'),
    }).default({
        enabled: false,
        accessKey: '',
        secretKey: '',
        bucket: 'exam-certificates',
        domain: '',
        zone: 'Zone_CN_East',
    }),
    certificateMaxSize: Schema.number().default(10 * 1024 * 1024),
    uploadTimeout: Schema.number().default(30000),
});

// 声明数据库集合类型
declare module 'hydrooj' {
    interface Collections {
        'exam.certificates': any;
        'exam.user_stats': any;
        'exam.import_history': any;
    }
}

/**
 * 赛考大厅插件主入口
 * 处理线下赛考证书管理、七牛云存储和排行榜统计
 */
export default async function apply(ctx: Context, _config: any = {}) {
    // 设置默认配置
    // const defaultConfig = {
    //     enabled: true,
    //     qiniu: {
    //         enabled: false,
    //     },
    // };

    // const finalConfig = { ...defaultConfig, ..._config };

    console.log('[ExamHall] 赛考大厅插件正在加载...');

    // 初始化数据库集合和索引
    try {
        const db = ctx.db;

        // 创建证书集合索引
        const certCollection = db.collection('exam.certificates');
        await certCollection.createIndex({ domainId: 1, uid: 1 });
        await certCollection.createIndex({ domainId: 1, status: 1 });
        await certCollection.createIndex({ domainId: 1, category: 1 });
        await certCollection.createIndex({ issueDate: -1 });
        await certCollection.createIndex({ createdAt: -1 });

        // 创建用户统计集合索引
        const statsCollection = db.collection('exam.user_stats');
        await statsCollection.createIndex({ domainId: 1, uid: 1 }, { unique: true });
        await statsCollection.createIndex({ domainId: 1, totalCertificates: -1 });

        // 创建导入历史集合索引
        const historyCollection = db.collection('exam.import_history');
        await historyCollection.createIndex({ domainId: 1, createdAt: -1 });

        console.log('[ExamHall] ✅ 数据库集合和索引初始化完成');
    } catch (error: any) {
        console.error('[ExamHall] ❌ 数据库初始化失败:', error.message);
    }

    // 注入导航栏入口 - 模仿打字大厅风格
    ctx.injectUI('Nav', 'exam_hall', {
        prefix: 'exam',
        before: 'ranking',
    }, PRIV.PRIV_USER_PROFILE);

    console.log('[ExamHall] ✅ 导航栏入口注册完成');

    // 注册路由 - 使用标准 HydroOJ 路由格式
    // 赛考大厅主页
    ctx.Route('exam_hall', '/exam/hall', ExamHallHandler);

    ctx.Route('exam_upload_certificate', '/exam/admin/upload-certificate', CertificateUploadHandler);

    ctx.Route('exam_create_certificate', '/exam/admin/certificates', CertificateCreateHandler);

    ctx.Route('exam_batch_delete_certificate', '/exam/admin/certificates', CertificateBatchDeleteHandler);

    ctx.Route('exam_detail_certificate', '/exam/admin/certificates/:id', CertificateDetailHandler);

    ctx.Route('exam_update_certificate', '/exam/admin/certificates/:id', CertificateUpdateHandler);

    ctx.Route('exam_delete_certificate', '/exam/admin/certificates/:id', CertificateDeleteHandler);

    ctx.Route('exam_list_certificate', '/exam/certificates', CertificateGetHandler);

    ctx.Route('exam_get_certificate', '/exam/certificates/:id', CertificateDetailHandler);

    ctx.Route('exam_user_stats', '/exam/stats/certificates', CertificateStatsHandler);

    // 批量导入路由
    ctx.Route('exam_batch_import', '/exam/admin/batch-import', BatchImportHandler);

    ctx.Route('exam_import_history', '/exam/admin/import-history', ImportHistoryHandler);

    // 排行榜和统计路由
    ctx.Route('exam_leaderboard', '/exam/leaderboard', LeaderboardHandler);

    ctx.Route('exam_user_rank', '/exam/rank/:uid', UserRankHandler);

    ctx.Route('exam_domain_stats', '/exam/stats/domain', DomainStatsHandler);

    ctx.Route('exam_growth_trend', '/exam/stats/trend', GrowthTrendHandler);

    ctx.Route('exam_popular_categories', '/exam/stats/popular-categories', PopularCategoriesHandler);

    console.log('[ExamHall] ✅ 赛考大厅插件加载完成，已注册 16 个路由和导航栏入口');
}

// 导出配置Schema
export { Config };
