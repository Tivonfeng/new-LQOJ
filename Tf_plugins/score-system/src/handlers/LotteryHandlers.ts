import {
    Handler,
    ObjectId,
    PERM,
} from 'hydrooj';
import {
    DailyGameLimitService,
    LOTTERY_TYPES,
    LotteryService,
    PRIZE_RARITY,
    ScoreService } from '../services';
import { DEFAULT_CONFIG } from './config';

/**
 * 抽奖大厅处理器
 * 路由: /score/lottery
 * 功能: 抽奖系统主界面，展示用户统计、奖品预览、抽奖机器
 */
export class LotteryHallHandler extends Handler {
    async get() {
        const uid = this.user?._id;

        if (!uid) {
            this.response.redirect = this.url('user_login');
            return;
        }

        // 获取用户积分
        const scoreService = new ScoreService(DEFAULT_CONFIG, this.ctx);
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

        // 检查每日游戏次数限制
        const dailyLimitService = new DailyGameLimitService(this.ctx);
        const lotteryLimit = await dailyLimitService.checkCanPlay(this.domain._id, uid, 'lottery');

        // 获取所有可用奖品用于展示(全域统一)
        const allPrizes = await lotteryService.getAllPrizes(true);

        // 按稀有度分组奖品，每组最多显示6个
        const prizesByRarity = {
            common: allPrizes.filter((p) => p.rarity === 'common').slice(0, 6),
            rare: allPrizes.filter((p) => p.rarity === 'rare').slice(0, 6),
            epic: allPrizes.filter((p) => p.rarity === 'epic').slice(0, 6),
            legendary: allPrizes.filter((p) => p.rarity === 'legendary').slice(0, 6),
        };

        // 格式化抽奖记录时间
        const formattedRecords = recentRecords.map((record) => ({
            ...record,
            drawTime: record.drawTime.toLocaleString('zh-CN', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            }),
        }));

        this.response.template = 'lottery_hall.html';
        this.response.body = {
            currentCoins,
            userStats: userStats || {
                totalDraws: 0,
                totalWins: 0,
                currentStreak: 0,
                rarityStats: { common: 0, rare: 0, epic: 0, legendary: 0 },
            },
            recentRecords: formattedRecords,
            prizesByRarity,
            lotteryTypes: LOTTERY_TYPES,
            rarityInfo: PRIZE_RARITY,
            dailyLimit: lotteryLimit,
        };
    }
}

/**
 * 抽奖执行处理器
 * 路由: /score/lottery/draw
 * 功能: 执行抽奖操作，返回抽奖结果
 */
export class LotteryDrawHandler extends Handler {
    async prepare() {
        if (!this.user._id) throw new Error('未登录');
    }

    async post() {
        const { lotteryType } = this.request.body;

        if (!lotteryType || lotteryType !== 'basic') {
            this.response.body = { success: false, message: '无效的抽奖类型' };
            return;
        }

        // 检查每日游戏次数限制
        const dailyLimitService = new DailyGameLimitService(this.ctx);
        const limitCheck = await dailyLimitService.checkCanPlay(this.domain._id, this.user._id, 'lottery');

        if (!limitCheck.canPlay) {
            this.response.body = {
                success: false,
                message: `今日抽奖次数已用完，请明天再来！(${limitCheck.totalPlays}/${limitCheck.maxPlays})`,
            };
            return;
        }

        const scoreService = new ScoreService(DEFAULT_CONFIG, this.ctx);
        const lotteryService = new LotteryService(this.ctx, scoreService);

        const result = await lotteryService.drawLottery(
            this.domain._id,
            this.user._id,
            lotteryType as 'basic',
        );

        // 如果抽奖成功，记录游戏次数
        if (result.success) {
            await dailyLimitService.recordPlay(this.domain._id, this.user._id, 'lottery');
        }

        this.response.body = result;
    }
}

/**
 * 奖品领取处理器
 * 路由: /score/lottery/claim
 * 功能: 领取抽奖获得的奖品
 */
export class LotteryClaimHandler extends Handler {
    async prepare() {
        if (!this.user._id) throw new Error('未登录');
    }

    async post() {
        const { recordId } = this.request.body;

        if (!recordId) {
            this.response.body = { success: false, message: '记录ID不能为空' };
            return;
        }

        const scoreService = new ScoreService(DEFAULT_CONFIG, this.ctx);
        const lotteryService = new LotteryService(this.ctx, scoreService);

        const result = await lotteryService.claimPrize(
            this.domain._id,
            this.user._id,
            recordId,
        );

        this.response.body = result;
    }
}

/**
 * 抽奖历史处理器
 * 路由: /score/lottery/history
 * 功能: 展示用户的抽奖历史记录，支持分页
 */
export class LotteryHistoryHandler extends Handler {
    async prepare() {
        if (!this.user._id) throw new Error('未登录');
    }

    async get() {
        const page = Math.max(1, Number.parseInt(this.request.query.page as string) || 1);
        const limit = 20;
        const skip = (page - 1) * limit;

        const records = await this.ctx.db.collection('lottery.records' as any)
            .find({ domainId: this.domain._id, uid: this.user._id })
            .sort({ drawTime: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        const total = await this.ctx.db.collection('lottery.records' as any)
            .countDocuments({ domainId: this.domain._id, uid: this.user._id });

        // 格式化时间
        const formattedRecords = records.map((record) => ({
            ...record,
            drawTime: record.drawTime.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            }),
        }));

        this.response.template = 'lottery_history.html';
        this.response.body = {
            records: formattedRecords,
            page,
            total,
            totalPages: Math.ceil(total / limit),
        };
    }
}

/**
 * 管理员奖品管理处理器
 * 路由: /score/lottery/admin
 * 功能: 管理员管理奖品，查看抽奖统计，添加/编辑/删除奖品
 */
export class LotteryAdminHandler extends Handler {
    async get() {
        this.checkPerm(PERM.PERM_EDIT_DOMAIN);

        const lotteryService = new LotteryService(this.ctx, new ScoreService(DEFAULT_CONFIG, this.ctx));

        // 获取所有奖品(全域统一)
        const prizes = await lotteryService.getAllPrizes();

        // 获取抽奖统计(全域统一)
        const lotteryStats = await lotteryService.getLotteryStats();

        // 获取权重分布信息
        const weightDistribution = await lotteryService.getWeightDistribution();

        // 验证权重系统
        const weightValidation = await lotteryService.validateWeightSystem();

        // 按稀有度分组奖品
        const prizesByRarity = {
            common: prizes.filter((p) => p.rarity === 'common'),
            rare: prizes.filter((p) => p.rarity === 'rare'),
            epic: prizes.filter((p) => p.rarity === 'epic'),
            legendary: prizes.filter((p) => p.rarity === 'legendary'),
        };

        this.response.template = 'lottery_admin.html';
        this.response.body = {
            prizes,
            prizesByRarity,
            lotteryStats,
            weightDistribution,
            weightValidation,
            rarityInfo: PRIZE_RARITY,
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
                case 'recalculateWeights':
                    await this.handleRecalculateWeights();
                    break;
                case 'validateWeights':
                    await this.handleValidateWeights();
                    break;
                default:
                    console.log('[Lottery Admin] 未知操作:', action);
                    this.response.body = { success: false, message: `未知操作: ${action}` };
            }
        } catch (error) {
            console.error('[Lottery Admin] 处理请求失败:', error);
            this.response.body = { success: false, message: `服务器内部错误: ${error.message}` };
        }
    }

    async handleAddPrize() {
        const { name, icon, description, type, value, rarity, stock } = this.request.body;

        // 验证输入（移除了weight验证）
        if (!name || !icon || !type || !rarity) {
            this.response.body = { success: false, message: '请填写完整信息' };
            return;
        }

        const prize = {
            name: name.trim(),
            icon: icon.trim(),
            description: description?.trim() || '',
            type,
            value: type === 'coin' ? Number.parseInt(value) || 0 : value || '',
            rarity,
            weight: 1, // 临时权重，将由WeightCalculationService自动计算
            probability: 0, // 将在后台计算
            enabled: true,
            totalStock: Number.parseInt(stock) || -1,
            currentStock: Number.parseInt(stock) || -1,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await this.ctx.db.collection('lottery.prizes' as any).insertOne(prize);

        // 触发该稀有度的权重重新计算
        const scoreService = new ScoreService(DEFAULT_CONFIG, this.ctx);
        const lotteryService = new LotteryService(this.ctx, scoreService);
        await lotteryService.onPrizeAdded(rarity);

        this.response.body = { success: true, message: '奖品添加成功，权重已自动计算' };
    }

    async handleUpdatePrize() {
        const { prizeId, enabled, stock } = this.request.body; // 移除了weight参数
        console.log('[Lottery Admin] 更新奖品:', { prizeId, enabled, stock });

        if (!ObjectId.isValid(prizeId)) {
            console.log('[Lottery Admin] 无效的奖品ID:', prizeId);
            this.response.body = { success: false, message: '无效的奖品ID' };
            return;
        }

        // 先获取奖品信息以便后续触发权重计算
        const existingPrize = await this.ctx.db.collection('lottery.prizes' as any).findOne({
            _id: ObjectId.createFromHexString(prizeId),
        });

        if (!existingPrize) {
            this.response.body = { success: false, message: '奖品不存在' };
            return;
        }

        const updateData: any = { updatedAt: new Date() };
        let needsWeightRecalculation = false;

        if (enabled !== undefined) {
            updateData.enabled = enabled === 'true' || enabled === true;
            needsWeightRecalculation = true; // 启用状态变更需要重算权重
        }
        if (stock !== undefined) {
            const newStock = Number.parseInt(stock);
            updateData.totalStock = newStock;
            updateData.currentStock = newStock;
        }

        console.log('[Lottery Admin] 更新数据:', updateData);

        const result = await this.ctx.db.collection('lottery.prizes' as any).updateOne(
            { _id: ObjectId.createFromHexString(prizeId) },
            { $set: updateData },
        );

        console.log('[Lottery Admin] 数据库更新结果:', result);

        if (result.matchedCount === 0) {
            console.log('[Lottery Admin] 奖品不存在');
            this.response.body = { success: false, message: '奖品不存在' };
            return;
        }

        // 如果状态发生变更，触发权重重新计算
        if (needsWeightRecalculation && result.modifiedCount > 0) {
            const scoreService = new ScoreService(DEFAULT_CONFIG, this.ctx);
            const lotteryService = new LotteryService(this.ctx, scoreService);
            await lotteryService.onPrizeStatusChanged(existingPrize.rarity);
        }

        this.response.body = {
            success: true,
            message: needsWeightRecalculation ? '奖品更新成功，权重已自动重新计算' : '奖品更新成功',
        };
    }

    async handleDeletePrize() {
        const { prizeId } = this.request.body;
        console.log('[Lottery Admin] 删除奖品:', prizeId);

        if (!ObjectId.isValid(prizeId)) {
            console.log('[Lottery Admin] 无效的奖品ID:', prizeId);
            this.response.body = { success: false, message: '无效的奖品ID' };
            return;
        }

        // 先获取奖品信息以便后续触发权重计算
        const existingPrize = await this.ctx.db.collection('lottery.prizes' as any).findOne({
            _id: ObjectId.createFromHexString(prizeId),
        });

        if (!existingPrize) {
            this.response.body = { success: false, message: '奖品不存在或已被删除' };
            return;
        }

        const result = await this.ctx.db.collection('lottery.prizes' as any).deleteOne({
            _id: ObjectId.createFromHexString(prizeId),
        });

        console.log('[Lottery Admin] 删除结果:', result);

        if (result.deletedCount === 0) {
            console.log('[Lottery Admin] 奖品不存在或已被删除');
            this.response.body = { success: false, message: '奖品不存在或已被删除' };
            return;
        }

        // 删除成功后触发权重重新计算
        const scoreService = new ScoreService(DEFAULT_CONFIG, this.ctx);
        const lotteryService = new LotteryService(this.ctx, scoreService);
        await lotteryService.onPrizeDeleted(existingPrize.rarity);

        this.response.body = { success: true, message: '奖品删除成功，权重已自动重新计算' };
    }

    /**
     * 手动重新计算所有权重
     */
    async handleRecalculateWeights() {
        console.log('[Lottery Admin] 手动触发权重重新计算');

        const scoreService = new ScoreService(DEFAULT_CONFIG, this.ctx);
        const lotteryService = new LotteryService(this.ctx, scoreService);

        await lotteryService.recalculateAllWeights();

        this.response.body = { success: true, message: '所有奖品权重已重新计算完成' };
    }

    /**
     * 验证权重系统完整性
     */
    async handleValidateWeights() {
        console.log('[Lottery Admin] 验证权重系统完整性');

        const scoreService = new ScoreService(DEFAULT_CONFIG, this.ctx);
        const lotteryService = new LotteryService(this.ctx, scoreService);

        const validation = await lotteryService.validateWeightSystem();

        this.response.body = {
            success: true,
            data: validation,
            message: validation.isValid ? '权重系统验证通过' : `权重系统存在问题: ${validation.issues.join(', ')}`,
        };
    }
}
