import {
    Context,
    Handler,
    PRIV,
    PERM,
    RecordDoc,
    ProblemDoc,
    Schema,
    STATUS,
    ObjectId,
} from 'hydrooj';

// 积分系统配置Schema
const Config = Schema.object({
    baseScore: Schema.number().default(10).description('基础AC积分'),
    difficultyMultiplier: Schema.object({
        '1': Schema.number().default(1).description('难度1倍数'),
        '2': Schema.number().default(1.2).description('难度2倍数'),
        '3': Schema.number().default(1.5).description('难度3倍数'),
        '4': Schema.number().default(2).description('难度4倍数'),
        '5': Schema.number().default(3).description('难度5倍数'),
    }).default({ '1': 1, '2': 1.2, '3': 1.5, '4': 2, '5': 3 }),
    firstACBonus: Schema.number().default(5).description('首次AC额外奖励'),
    enabled: Schema.boolean().default(true).description('是否启用积分系统'),
});

// 积分记录接口
interface ScoreRecord {
    _id?: any;
    uid: number;
    domainId: string;
    pid: number;
    recordId: any;
    score: number;
    reason: string;
    createdAt: Date;
    problemTitle?: string;
}

// 用户积分统计接口
interface UserScore {
    _id?: any;
    uid: number;
    domainId: string;
    totalScore: number;
    acCount: number;
    lastUpdated: Date;
}

// 抽奖奖品接口
interface LotteryPrize {
    _id?: any;
    domainId?: string; // 可选，支持全域统一
    name: string;
    icon: string;
    description: string;
    type: 'coin' | 'badge' | 'privilege' | 'virtual';
    value: any;
    probability: number;
    weight: number;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    enabled: boolean;
    totalStock: number;
    currentStock: number;
    createdAt: Date;
    updatedAt: Date;
}

// 抽奖记录接口
interface LotteryRecord {
    _id?: any;
    uid: number;
    domainId: string;
    prizeId?: any;
    prizeName?: string;
    prizeIcon?: string;
    prizeRarity?: string;
    cost: number;
    lotteryType: 'basic' | 'premium';
    result: 'win' | 'lose';
    drawTime: Date;
    claimed: boolean;
    claimTime?: Date;
}

// 用户抽奖统计接口
interface UserLotteryStats {
    _id?: any;
    uid: number;
    domainId: string;
    totalDraws: number;
    totalWins: number;
    totalSpent: number;
    totalValue: number;
    currentStreak: number;
    lastDrawTime: Date;
    rarityStats: {
        common: number;
        rare: number;
        epic: number;
        legendary: number;
    };
}

declare module 'hydrooj' {
    interface Collections {
        'score.records': ScoreRecord;
        'score.users': UserScore;
        'lottery.prizes': LotteryPrize;
        'lottery.records': LotteryRecord;
        'lottery.stats': UserLotteryStats;
    }
}

// 积分计算服务
class ScoreService {
    private config: any;
    private ctx: Context;

    constructor(config: any, ctx: Context) {
        this.config = config;
        this.ctx = ctx;
    }

    // 计算AC积分
    calculateACScore(pdoc: ProblemDoc, isFirstAC: boolean): number {
        if (!this.config.enabled) return 0;
        
        // 只有首次AC才得分，防止恶意刷题
        if (!isFirstAC) return 0;
        
        // 固定每AC一题10分
        return 10;
    }

    // 检查是否为首次AC
    async isFirstAC(domainId: string, uid: number, pid: number): Promise<boolean> {
        const existingRecord = await this.ctx.db.collection('score.records').findOne({
            domainId,
            uid,
            pid,
        });
        return !existingRecord;
    }

    // 添加积分记录
    async addScoreRecord(record: Omit<ScoreRecord, '_id' | 'createdAt'>): Promise<void> {
        await this.ctx.db.collection('score.records').insertOne({
            ...record,
            createdAt: new Date(),
        });
    }


    // 更新用户总积分
    async updateUserScore(domainId: string, uid: number, scoreChange: number): Promise<void> {
        await this.ctx.db.collection('score.users').updateOne(
            { domainId, uid },
            {
                $inc: { totalScore: scoreChange, acCount: scoreChange > 0 ? 1 : 0 },
                $set: { lastUpdated: new Date() },
            },
            { upsert: true }
        );
    }

    // 获取用户积分
    async getUserScore(domainId: string, uid: number): Promise<UserScore | null> {
        return await this.ctx.db.collection('score.users').findOne({ domainId, uid });
    }

    // 获取积分排行榜
    async getScoreRanking(domainId: string, limit: number = 50): Promise<UserScore[]> {
        return await this.ctx.db.collection('score.users')
            .find({ domainId })
            .sort({ totalScore: -1, lastUpdated: 1 })
            .limit(limit)
            .toArray();
    }
}

// 抽奖系统常量
const LOTTERY_TYPES = {
    basic: {
        id: 'basic',
        name: '普通抽奖',
        cost: 10,
        icon: '🎲',
        description: '消耗10绿旗币，有机会获得各种奖励'
    },
    premium: {
        id: 'premium',
        name: '高级抽奖',
        cost: 50,
        icon: '💎',
        description: '消耗50绿旗币，获得稀有奖励概率更高',
        guaranteeDraws: 10
    }
} as const;

const PRIZE_RARITY = {
    common: { name: '普通', color: '#9E9E9E', weight: 60 },
    rare: { name: '稀有', color: '#2196F3', weight: 25 },
    epic: { name: '史诗', color: '#9C27B0', weight: 12 },
    legendary: { name: '传说', color: '#FF9800', weight: 3 }
} as const;

// 抽奖服务类
class LotteryService {
    private ctx: Context;
    private scoreService: ScoreService;

    constructor(ctx: Context, scoreService: ScoreService) {
        this.ctx = ctx;
        this.scoreService = scoreService;
    }

    // 初始化默认奖品(全域统一)
    async initializePrizes() {
        const existingPrizes = await this.ctx.db.collection('lottery.prizes')
            .countDocuments({});
        
        if (existingPrizes > 0) return; // 已有奖品，跳过初始化

        const defaultPrizes = [
            // 普通奖品
            { name: '绿旗币 x5', icon: '🪙', type: 'coin' as const, value: 5, rarity: 'common' as const, weight: 30 },
            { name: '绿旗币 x8', icon: '💰', type: 'coin' as const, value: 8, rarity: 'common' as const, weight: 20 },
            { name: '新手徽章', icon: '🔰', type: 'badge' as const, value: 'newbie', rarity: 'common' as const, weight: 15 },
            
            // 稀有奖品
            { name: '绿旗币 x20', icon: '💎', type: 'coin' as const, value: 20, rarity: 'rare' as const, weight: 15 },
            { name: '解题达人徽章', icon: '🎯', type: 'badge' as const, value: 'solver', rarity: 'rare' as const, weight: 8 },
            
            // 史诗奖品
            { name: '绿旗币 x50', icon: '💍', type: 'coin' as const, value: 50, rarity: 'epic' as const, weight: 7 },
            { name: '编程大师徽章', icon: '👑', type: 'badge' as const, value: 'master', rarity: 'epic' as const, weight: 3 },
            
            // 传说奖品
            { name: '绿旗币 x100', icon: '🏆', type: 'coin' as const, value: 100, rarity: 'legendary' as const, weight: 2 },
            { name: '传说程序员徽章', icon: '🌟', type: 'badge' as const, value: 'legend', rarity: 'legendary' as const, weight: 1 }
        ];

        for (const prize of defaultPrizes) {
            await this.ctx.db.collection('lottery.prizes').insertOne({
                ...prize,
                description: `${prize.name}奖励`,
                probability: prize.weight / 100,
                enabled: true,
                totalStock: -1, // 无限库存
                currentStock: -1,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }
    }

    // 执行抽奖
    async drawLottery(domainId: string, uid: number, lotteryType: 'basic' | 'premium'): Promise<{
        success: boolean;
        message?: string;
        result?: {
            won: boolean;
            prize?: LotteryPrize;
            record: LotteryRecord;
        };
    }> {
        const lotteryConfig = LOTTERY_TYPES[lotteryType];
        const cost = lotteryConfig.cost;

        // 检查用户积分
        const userScore = await this.scoreService.getUserScore(domainId, uid);
        if (!userScore || userScore.totalScore < cost) {
            return { success: false, message: '绿旗币不足' };
        }

        // 检查保底机制
        const shouldGuaranteeWin = await this.checkGuarantee(domainId, uid, lotteryType);
        
        // 获取可用奖品(全域统一)
        const availablePrizes = await this.getAvailablePrizes(lotteryType, shouldGuaranteeWin);
        if (availablePrizes.length === 0) {
            return { success: false, message: '暂无可用奖品' };
        }

        // 执行抽奖算法
        const drawnPrize = this.performDraw(availablePrizes, shouldGuaranteeWin);
        const won = drawnPrize !== null;

        // 扣除积分并记录
        await this.scoreService.updateUserScore(domainId, uid, -cost);
        await this.scoreService.addScoreRecord({
            uid,
            domainId,
            pid: 0,
            recordId: null,
            score: -cost,
            reason: `${lotteryType === 'basic' ? '普通' : '高级'}抽奖消费`,
            problemTitle: '抽奖系统'
        });

        // 创建抽奖记录
        const record: Omit<LotteryRecord, '_id'> = {
            uid,
            domainId,
            prizeId: drawnPrize?._id,
            prizeName: drawnPrize?.name,
            prizeIcon: drawnPrize?.icon,
            prizeRarity: drawnPrize?.rarity,
            cost,
            lotteryType,
            result: won ? 'win' : 'lose',
            drawTime: new Date(),
            claimed: false
        };

        const recordResult = await this.ctx.db.collection('lottery.records').insertOne(record);
        const finalRecord = { ...record, _id: recordResult.insertedId };

        // 更新用户统计
        await this.updateUserStats(domainId, uid, cost, won ? drawnPrize : null);

        // 更新奖品库存
        if (won && drawnPrize && drawnPrize.currentStock > 0) {
            await this.ctx.db.collection('lottery.prizes').updateOne(
                { _id: drawnPrize._id },
                { $inc: { currentStock: -1 } }
            );
        }

        return {
            success: true,
            result: {
                won,
                prize: drawnPrize || undefined,
                record: finalRecord
            }
        };
    }

    // 抽奖算法
    private performDraw(prizes: LotteryPrize[], guarantee: boolean): LotteryPrize | null {
        if (guarantee) {
            // 保底情况下，只从稀有以上奖品中选择
            const guaranteePrizes = prizes.filter(p => 
                p.rarity === 'rare' || p.rarity === 'epic' || p.rarity === 'legendary'
            );
            if (guaranteePrizes.length > 0) {
                prizes = guaranteePrizes;
            }
        }

        const totalWeight = prizes.reduce((sum, prize) => sum + prize.weight, 0);
        if (totalWeight === 0) return null;

        const random = Math.random() * totalWeight;
        let currentWeight = 0;

        for (const prize of prizes) {
            currentWeight += prize.weight;
            if (random <= currentWeight) {
                return prize;
            }
        }

        return null; // 未中奖
    }

    // 检查保底机制
    private async checkGuarantee(domainId: string, uid: number, lotteryType: string): Promise<boolean> {
        if (lotteryType !== 'premium') return false;

        const recentRecords = await this.ctx.db.collection('lottery.records')
            .find({ 
                domainId, 
                uid, 
                lotteryType: 'premium', 
                result: 'lose' 
            })
            .sort({ drawTime: -1 })
            .limit(LOTTERY_TYPES.premium.guaranteeDraws)
            .toArray();

        return recentRecords.length >= LOTTERY_TYPES.premium.guaranteeDraws;
    }

    // 获取可用奖品
    private async getAvailablePrizes(lotteryType: string, guaranteeMode: boolean = false): Promise<LotteryPrize[]> {
        let query: any = { 
            enabled: true,
            $or: [
                { currentStock: -1 }, // 无限库存
                { currentStock: { $gt: 0 } } // 有库存
            ]
        };

        // 高级抽奖提高稀有奖品权重
        if (lotteryType === 'premium' && !guaranteeMode) {
            // 可以在这里调整权重逻辑
        }

        return await this.ctx.db.collection('lottery.prizes')
            .find(query)
            .toArray();
    }

    // 更新用户统计
    private async updateUserStats(domainId: string, uid: number, cost: number, prize: LotteryPrize | null) {
        const updateData: any = {
            $inc: {
                totalDraws: 1,
                totalSpent: cost,
                ...(prize ? {
                    totalWins: 1,
                    currentStreak: 0, // 中奖后重置连续未中奖次数
                    [`rarityStats.${prize.rarity}`]: 1,
                    ...(prize.type === 'coin' ? { totalValue: prize.value } : {})
                } : {
                    currentStreak: 1 // 未中奖增加连续次数
                })
            },
            $set: { lastDrawTime: new Date() }
        };

        await this.ctx.db.collection('lottery.stats').updateOne(
            { domainId, uid },
            updateData,
            { upsert: true }
        );
    }

    // 领取奖品
    async claimPrize(domainId: string, uid: number, recordId: any): Promise<{
        success: boolean;
        message?: string;
    }> {
        // 确保 recordId 是正确的格式
        if (!recordId) {
            return { success: false, message: '记录ID不能为空' };
        }

        // 正确的 ObjectId 转换方式
        let queryId = recordId;
        
        // 如果是字符串，尝试转换为ObjectId
        if (typeof recordId === 'string') {
            if (ObjectId.isValid(recordId)) {
                queryId = new ObjectId(recordId);
            } else {
                return { success: false, message: '无效的记录ID格式' };
            }
        }

        const record = await this.ctx.db.collection('lottery.records').findOne({
            _id: queryId,
            uid,
            domainId,
            result: 'win',
            claimed: false
        });

        if (!record) {
            return { success: false, message: '记录不存在或已领取' };
        }

        // 发放奖品
        if (record.prizeId) {
            const prize = await this.ctx.db.collection('lottery.prizes').findOne({ _id: record.prizeId });
            if (prize) {
                await this.givePrize(domainId, uid, prize);
            }
        }

        // 标记为已领取，使用相同的queryId确保一致性
        await this.ctx.db.collection('lottery.records').updateOne(
            { _id: queryId },
            { $set: { claimed: true, claimTime: new Date() } }
        );

        return { success: true, message: '奖品领取成功' };
    }

    // 发放奖品
    private async givePrize(domainId: string, uid: number, prize: LotteryPrize) {
        if (prize.type === 'coin') {
            // 发放绿旗币
            await this.scoreService.updateUserScore(domainId, uid, prize.value);
            await this.scoreService.addScoreRecord({
                uid,
                domainId,
                pid: 0,
                recordId: null,
                score: prize.value,
                reason: `抽奖获得 ${prize.name}`,
                problemTitle: '抽奖奖励'
            });
        } else if (prize.type === 'badge') {
            // 发放徽章 (可以根据实际需求实现徽章系统)
            console.log(`用户 ${uid} 获得徽章: ${prize.value}`);
        }
        // 其他类型奖品的发放逻辑...
    }

    // 获取用户抽奖历史
    async getUserLotteryHistory(domainId: string, uid: number, limit: number = 20): Promise<LotteryRecord[]> {
        return await this.ctx.db.collection('lottery.records')
            .find({ domainId, uid })
            .sort({ drawTime: -1 })
            .limit(limit)
            .toArray();
    }

    // 获取用户抽奖统计
    async getUserLotteryStats(domainId: string, uid: number): Promise<UserLotteryStats | null> {
        return await this.ctx.db.collection('lottery.stats').findOne({ domainId, uid });
    }
}

// 抽奖大厅处理器
class LotteryHallHandler extends Handler {
    async get() {
        const uid = this.user?._id;
        
        if (!uid) {
            this.response.redirect = this.url('user_login');
            return;
        }

        // 获取用户积分
        const scoreService = new ScoreService({}, this.ctx);
        const userScore = await scoreService.getUserScore(this.domain._id, uid);
        const currentCoins = userScore?.totalScore || 0;

        // 获取抽奖服务
        const lotteryService = new LotteryService(this.ctx, scoreService);
        
        // 初始化奖品(如果需要)
        await lotteryService.initializePrizes();

        // 获取用户抽奖统计
        const userStats = await lotteryService.getUserLotteryStats(this.domain._id, uid);
        
        // 获取最近抽奖记录
        const recentRecords = await lotteryService.getUserLotteryHistory(this.domain._id, uid, 10);

        // 获取所有可用奖品用于展示(全域统一)
        const allPrizes = await this.ctx.db.collection('lottery.prizes')
            .find({ enabled: true })
            .sort({ rarity: 1, weight: -1 })
            .toArray();

        // 按稀有度分组奖品，每组最多显示6个
        const prizesByRarity = {
            common: allPrizes.filter(p => p.rarity === 'common').slice(0, 6),
            rare: allPrizes.filter(p => p.rarity === 'rare').slice(0, 6),
            epic: allPrizes.filter(p => p.rarity === 'epic').slice(0, 6),
            legendary: allPrizes.filter(p => p.rarity === 'legendary').slice(0, 6)
        };

        // 格式化抽奖记录时间
        const formattedRecords = recentRecords.map(record => ({
            ...record,
            drawTime: record.drawTime.toLocaleString('zh-CN', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            })
        }));

        this.response.template = 'lottery_hall.html';
        this.response.body = {
            currentCoins,
            userStats: userStats || {
                totalDraws: 0,
                totalWins: 0,
                currentStreak: 0,
                rarityStats: { common: 0, rare: 0, epic: 0, legendary: 0 }
            },
            recentRecords: formattedRecords,
            prizesByRarity,
            lotteryTypes: LOTTERY_TYPES,
            rarityInfo: PRIZE_RARITY
        };
    }
}

// 抽奖执行处理器
class LotteryDrawHandler extends Handler {
    async prepare() {
        if (!this.user._id) throw new Error('未登录');
    }

    async post() {
        const { lotteryType } = this.request.body;
        
        if (!lotteryType || !['basic', 'premium'].includes(lotteryType)) {
            this.response.body = { success: false, message: '无效的抽奖类型' };
            return;
        }

        const scoreService = new ScoreService({}, this.ctx);
        const lotteryService = new LotteryService(this.ctx, scoreService);

        const result = await lotteryService.drawLottery(
            this.domain._id,
            this.user._id,
            lotteryType as 'basic' | 'premium'
        );

        this.response.body = result;
    }
}

// 奖品领取处理器
class LotteryClaimHandler extends Handler {
    async prepare() {
        if (!this.user._id) throw new Error('未登录');
    }

    async post() {
        const { recordId } = this.request.body;
        
        if (!recordId) {
            this.response.body = { success: false, message: '记录ID不能为空' };
            return;
        }

        const scoreService = new ScoreService({}, this.ctx);
        const lotteryService = new LotteryService(this.ctx, scoreService);

        const result = await lotteryService.claimPrize(
            this.domain._id,
            this.user._id,
            recordId
        );

        this.response.body = result;
    }
}

// 抽奖历史处理器
class LotteryHistoryHandler extends Handler {
    async prepare() {
        if (!this.user._id) throw new Error('未登录');
    }

    async get() {
        const page = Math.max(1, parseInt(this.request.query.page as string) || 1);
        const limit = 20;
        const skip = (page - 1) * limit;

        const records = await this.ctx.db.collection('lottery.records')
            .find({ domainId: this.domain._id, uid: this.user._id })
            .sort({ drawTime: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        const total = await this.ctx.db.collection('lottery.records')
            .countDocuments({ domainId: this.domain._id, uid: this.user._id });

        // 格式化时间
        const formattedRecords = records.map(record => ({
            ...record,
            drawTime: record.drawTime.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit', 
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            })
        }));

        this.response.template = 'lottery_history.html';
        this.response.body = {
            records: formattedRecords,
            page,
            total,
            totalPages: Math.ceil(total / limit)
        };
    }
}

// 积分管理页面处理器
class ScoreManageHandler extends Handler {
    async prepare() {
        this.checkPriv(PRIV.PRIV_EDIT_SYSTEM);
    }

    async get() {
        const recentRecords = await this.ctx.db.collection('score.records')
            .find({ domainId: this.domain._id })
            .sort({ createdAt: -1 })
            .limit(20)
            .toArray();
            
        const topUsers = await this.ctx.db.collection('score.users')
            .find({ domainId: this.domain._id })
            .sort({ totalScore: -1 })
            .limit(10)
            .toArray();

        // 格式化日期
        const formattedRecords = recentRecords.map(record => ({
            ...record,
            createdAt: record.createdAt.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            })
        }));

        this.response.template = 'score_manage.html';
        this.response.body = {
            recentRecords: formattedRecords,
            topUsers,
        };
    }
}

// 积分排行榜处理器
class ScoreRankingHandler extends Handler {
    async get() {
        const page = Math.max(1, parseInt(this.request.query.page as string) || 1);
        const limit = 50;
        const skip = (page - 1) * limit;

        const users = await this.ctx.db.collection('score.users')
            .find({ domainId: this.domain._id })
            .sort({ totalScore: -1, lastUpdated: 1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        const total = await this.ctx.db.collection('score.users')
            .countDocuments({ domainId: this.domain._id });

        // 获取用户信息
        const uids = users.map(u => u.uid);
        const UserModel = global.Hydro.model.user;
        const udocs = await UserModel.getList(this.domain._id, uids);

        // 检查是否有管理权限
        const canManage = this.user?.priv && this.user.priv & PRIV.PRIV_EDIT_SYSTEM;

        // 格式化日期
        const formattedUsers = users.map(user => ({
            ...user,
            lastUpdated: user.lastUpdated.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            })
        }));

        this.response.template = 'score_ranking.html';
        this.response.body = {
            users: formattedUsers,
            udocs,
            page,
            total,
            totalPages: Math.ceil(total / limit),
            canManage,
        };
    }
}

// 积分大厅处理器
class ScoreHallHandler extends Handler {
    async get() {
        const uid = this.user?._id;
        let userScore: UserScore | null = null;
        let userRank: number | string = '-';
        let recentRecords: any[] = [];

        if (uid) {
            // 获取用户积分信息
            userScore = await this.ctx.db.collection('score.users').findOne({
                domainId: this.domain._id,
                uid,
            });

            // 获取用户排名
            if (userScore) {
                const higherRankCount = await this.ctx.db.collection('score.users')
                    .countDocuments({
                        domainId: this.domain._id,
                        totalScore: { $gt: userScore.totalScore }
                    });
                userRank = higherRankCount + 1;
            }

            // 获取最近积分记录
            const rawRecords = await this.ctx.db.collection('score.records')
                .find({ domainId: this.domain._id, uid })
                .sort({ createdAt: -1 })
                .limit(5)
                .toArray();

            recentRecords = rawRecords.map(record => ({
                ...record,
                createdAt: record.createdAt.toLocaleString('zh-CN', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                })
            }));
        }

        // 获取积分排行榜前10
        const topUsers = await this.ctx.db.collection('score.users')
            .find({ domainId: this.domain._id })
            .sort({ totalScore: -1, lastUpdated: 1 })
            .limit(10)
            .toArray();

        // 获取用户信息
        const uids = topUsers.map(u => u.uid);
        const UserModel = global.Hydro.model.user;
        const udocs = await UserModel.getList(this.domain._id, uids);

        // 获取今日新增积分统计
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayScores = await this.ctx.db.collection('score.records')
            .find({ 
                domainId: this.domain._id,
                createdAt: { $gte: today }
            })
            .toArray();

        const todayTotalScore = todayScores.reduce((sum, record) => sum + record.score, 0);
        const todayActiveUsers = new Set(todayScores.map(record => record.uid)).size;

        // 检查是否有管理权限
        const canManage = this.user?.priv && this.user.priv & PRIV.PRIV_EDIT_SYSTEM;

        this.response.template = 'score_hall.html';
        this.response.body = {
            userScore: userScore || { totalScore: 0, acCount: 0 },
            currentCoins: userScore?.totalScore || 0,
            userRank,
            recentRecords,
            topUsers,
            udocs,
            todayTotalScore,
            todayActiveUsers,
            canManage,
            isLoggedIn: !!uid,
        };
    }
}

// 用户积分查看处理器
class UserScoreHandler extends Handler {
    async get() {
        const uid = this.user._id;
        const userScore = await this.ctx.db.collection('score.users').findOne({
            domainId: this.domain._id,
            uid,
        });

        const recentRecords = await this.ctx.db.collection('score.records')
            .find({ domainId: this.domain._id, uid })
            .sort({ createdAt: -1 })
            .limit(20)
            .toArray();

        // 格式化日期
        const formattedRecords = recentRecords.map(record => ({
            ...record,
            createdAt: record.createdAt.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            })
        }));

        const userScoreData = userScore || { totalScore: 0, acCount: 0 };
        const averageScore = userScoreData.acCount > 0 
            ? (userScoreData.totalScore / userScoreData.acCount).toFixed(1)
            : '0';

        this.response.template = 'user_score.html';
        this.response.body = {
            userScore: userScoreData,
            averageScore,
            recentRecords: formattedRecords,
        };
    }
}

// 管理员奖品管理处理器
class LotteryAdminHandler extends Handler {
    async get() {
        this.checkPerm(PERM.PERM_EDIT_DOMAIN);
        
        // 获取所有奖品(全域统一)
        const prizes = await this.ctx.db.collection('lottery.prizes')
            .find({})
            .sort({ rarity: 1, createdAt: -1 })
            .toArray();

        // 获取抽奖统计(全域统一)
        const stats = await this.ctx.db.collection('lottery.records').aggregate([
            { $match: {} },
            {
                $group: {
                    _id: null,
                    totalDraws: { $sum: 1 },
                    totalWins: { $sum: { $cond: [{ $eq: ['$result', 'win'] }, 1, 0] } },
                    totalCost: { $sum: '$cost' },
                    basicDraws: { $sum: { $cond: [{ $eq: ['$lotteryType', 'basic'] }, 1, 0] } },
                    premiumDraws: { $sum: { $cond: [{ $eq: ['$lotteryType', 'premium'] }, 1, 0] } }
                }
            }
        ]).toArray();

        const lotteryStats = stats[0] || {
            totalDraws: 0,
            totalWins: 0,
            totalCost: 0,
            basicDraws: 0,
            premiumDraws: 0
        };

        // 按稀有度分组奖品
        const prizesByRarity = {
            common: prizes.filter(p => p.rarity === 'common'),
            rare: prizes.filter(p => p.rarity === 'rare'),
            epic: prizes.filter(p => p.rarity === 'epic'),
            legendary: prizes.filter(p => p.rarity === 'legendary')
        };

        this.response.template = 'lottery_admin.html';
        this.response.body = {
            prizes,
            prizesByRarity,
            lotteryStats,
            rarityInfo: PRIZE_RARITY
        };
    }

    async post() {
        try {
            this.checkPerm(PERM.PERM_EDIT_DOMAIN);
            
            const { action } = this.request.body;
            console.log('[Lottery Admin] 收到请求:', action, this.request.body);
            
            switch (action) {
                case 'addPrize':
                    await this.handleAddPrize();
                    break;
                case 'updatePrize':
                    await this.handleUpdatePrize();
                    break;
                case 'deletePrize':
                    await this.handleDeletePrize();
                    break;
                default:
                    console.log('[Lottery Admin] 未知操作:', action);
                    this.response.body = { success: false, message: '未知操作: ' + action };
            }
        } catch (error) {
            console.error('[Lottery Admin] 处理请求失败:', error);
            this.response.body = { success: false, message: '服务器内部错误: ' + error.message };
        }
    }

    async handleAddPrize() {
        const { name, icon, description, type, value, rarity, weight, stock } = this.request.body;
        
        // 验证输入
        if (!name || !icon || !type || !rarity || !weight) {
            this.response.body = { success: false, message: '请填写完整信息' };
            return;
        }

        const prize = {
            name: name.trim(),
            icon: icon.trim(),
            description: description?.trim() || '',
            type,
            value: type === 'coin' ? parseInt(value) || 0 : value || '',
            rarity,
            weight: parseInt(weight) || 1,
            probability: 0, // 将在后台计算
            enabled: true,
            totalStock: parseInt(stock) || -1,
            currentStock: parseInt(stock) || -1,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await this.ctx.db.collection('lottery.prizes').insertOne(prize);
        
        this.response.body = { success: true, message: '奖品添加成功' };
    }

    async handleUpdatePrize() {
        const { prizeId, enabled, weight, stock } = this.request.body;
        console.log('[Lottery Admin] 更新奖品:', { prizeId, enabled, weight, stock });
        
        if (!ObjectId.isValid(prizeId)) {
            console.log('[Lottery Admin] 无效的奖品ID:', prizeId);
            this.response.body = { success: false, message: '无效的奖品ID' };
            return;
        }

        const updateData: any = { updatedAt: new Date() };
        
        if (enabled !== undefined) updateData.enabled = enabled === 'true' || enabled === true;
        if (weight !== undefined) updateData.weight = parseInt(weight) || 1;
        if (stock !== undefined) {
            const newStock = parseInt(stock);
            updateData.totalStock = newStock;
            updateData.currentStock = newStock;
        }

        console.log('[Lottery Admin] 更新数据:', updateData);

        const result = await this.ctx.db.collection('lottery.prizes').updateOne(
            { _id: ObjectId.createFromHexString(prizeId) },
            { $set: updateData }
        );
        
        console.log('[Lottery Admin] 数据库更新结果:', result);
        
        if (result.matchedCount === 0) {
            console.log('[Lottery Admin] 奖品不存在');
            this.response.body = { success: false, message: '奖品不存在' };
            return;
        }
        
        if (result.modifiedCount === 0) {
            console.log('[Lottery Admin] 没有数据被修改（可能数据相同）');
            this.response.body = { success: true, message: '奖品状态未变更（数据相同）' };
            return;
        }
        
        this.response.body = { success: true, message: '奖品更新成功' };
    }

    async handleDeletePrize() {
        const { prizeId } = this.request.body;
        console.log('[Lottery Admin] 删除奖品:', prizeId);
        
        if (!ObjectId.isValid(prizeId)) {
            console.log('[Lottery Admin] 无效的奖品ID:', prizeId);
            this.response.body = { success: false, message: '无效的奖品ID' };
            return;
        }

        const result = await this.ctx.db.collection('lottery.prizes').deleteOne({
            _id: ObjectId.createFromHexString(prizeId)
        });
        
        console.log('[Lottery Admin] 删除结果:', result);
        
        if (result.deletedCount === 0) {
            console.log('[Lottery Admin] 奖品不存在或已被删除');
            this.response.body = { success: false, message: '奖品不存在或已被删除' };
            return;
        }
        
        this.response.body = { success: true, message: '奖品删除成功' };
    }
}

// 插件主函数
export default function apply(ctx: Context, config: any = {}) {
    // 设置默认配置
    const defaultConfig = {
        enabled: true,
        baseScore: 10,
        firstACBonus: 5,
        difficultyMultiplier: {
            '1': 1,
            '2': 1.2,
            '3': 1.5,
            '4': 2,
            '5': 3
        }
    };
    
    const finalConfig = { ...defaultConfig, ...config };
    
    console.log('Score System plugin loading...');
    console.log('Score System config:', JSON.stringify(finalConfig, null, 2));
    
    const scoreService = new ScoreService(finalConfig, ctx);

    // 监听判题完成事件 - 尝试多个事件名称
    console.log('Setting up event listeners...');
    
    // 主要事件监听
    ctx.on('record/judge', async (rdoc: RecordDoc, updated: boolean, pdoc?: ProblemDoc) => {
        try {
            // 只处理AC状态且为首次更新的记录
            if (!finalConfig.enabled || !updated || !pdoc) return;
            if (rdoc.status !== STATUS.STATUS_ACCEPTED) return;

            // 检查是否为首次AC
            const isFirstAC = await scoreService.isFirstAC(rdoc.domainId, rdoc.uid, rdoc.pid);
            if (!isFirstAC) {
                console.log(`[Score System] User ${rdoc.uid} already AC problem ${rdoc.pid}, skipping`);
                return;
            }

            // 计算积分
            const score = scoreService.calculateACScore(pdoc, isFirstAC);
            if (score <= 0) return;

            // 记录积分
            await scoreService.addScoreRecord({
                uid: rdoc.uid,
                domainId: rdoc.domainId,
                pid: rdoc.pid,
                recordId: rdoc._id,
                score,
                reason: `AC题目 ${pdoc.title || rdoc.pid} 获得积分`,
                problemTitle: pdoc.title,
            });

            // 更新用户总积分
            await scoreService.updateUserScore(rdoc.domainId, rdoc.uid, score);

            console.log(`[Score System] ✅ User ${rdoc.uid} AC problem ${rdoc.pid} (${pdoc.title}), awarded ${score} points`);
        } catch (error) {
            console.error('[Score System] ❌ Error:', error);
        }
    });

    // 事件监听设置完成
    console.log('[Score System] Event listeners registered successfully!');

    // 注册路由
    ctx.Route('score_manage', '/score/manage', ScoreManageHandler);
    ctx.Route('score_ranking', '/score/ranking', ScoreRankingHandler);
    ctx.Route('user_score', '/score/me', UserScoreHandler);
    ctx.Route('score_hall', '/score/hall', ScoreHallHandler);
    
    // 抽奖系统路由
    ctx.Route('lottery_hall', '/score/lottery', LotteryHallHandler);
    ctx.Route('lottery_draw', '/score/lottery/draw', LotteryDrawHandler);
    ctx.Route('lottery_claim', '/score/lottery/claim', LotteryClaimHandler);
    ctx.Route('lottery_history', '/score/lottery/history', LotteryHistoryHandler);
    
    // 管理员路由
    ctx.Route('lottery_admin', '/score/lottery/admin', LotteryAdminHandler);

    // 注入导航栏
    ctx.injectUI('Nav', 'score_hall', {
        prefix: 'score',
        before: 'ranking', // 插入到排行榜前面
    });

    console.log('积分大厅路由已注册，可通过 /score/hall 访问');

    console.log('Score System plugin loaded successfully!');
}

// 导出配置Schema
export { Config };