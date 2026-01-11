import { Context, ObjectId } from 'hydrooj';
import type { SaveWorkParams, TurtleWork } from '../types';

/**
 * Turtle 作品管理服务
 */
export class TurtleWorkService {
    private ctx: Context;

    constructor(ctx: Context) {
        this.ctx = ctx;
    }

    /**
     * 保存作品(新建或更新)
     */
    async saveWork(data: SaveWorkParams): Promise<string> {
        const collection = this.ctx.db.collection('turtle.works' as any);

        // 验证代码长度
        if (data.code.length > 10000) {
            throw new Error('Code too long (max 10000 characters)');
        }

        if (data.workId) {
            // 更新现有作品
            const result = await collection.updateOne(
                { _id: new ObjectId(data.workId), uid: data.uid },
                {
                    $set: {
                        title: data.title,
                        code: data.code,
                        description: data.description || '',
                        isPublic: data.isPublic,
                        imageUrl: data.imageUrl || '',
                        updatedAt: new Date(),
                    },
                },
            );

            if (result.matchedCount === 0) {
                throw new Error('Work not found or unauthorized');
            }

            return data.workId;
        } else {
            // 检查用户作品数量限制
            const userWorksCount = await collection.countDocuments({
                uid: data.uid,
            });

            if (userWorksCount >= 50) {
                throw new Error('Maximum works limit reached (50)');
            }

            // 创建新作品
            const result = await collection.insertOne({
                uid: data.uid,
                title: data.title,
                code: data.code,
                description: data.description || '',
                isPublic: data.isPublic,
                imageUrl: data.imageUrl || '',
                isFeatured: false,
                likes: 0,
                views: 0,
                tags: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            return result.insertedId.toString();
        }
    }

    /**
     * 获取单个作品
     */
    async getWork(workId: string): Promise<TurtleWork | null> {
        try {
            return await this.ctx.db.collection('turtle.works' as any)
                .findOne({ _id: new ObjectId(workId) });
        } catch (error) {
            return null;
        }
    }

    /**
     * 获取用户的所有作品
     */
    async getUserWorks(uid: number, limit: number = 50): Promise<TurtleWork[]> {
        return await this.ctx.db.collection('turtle.works' as any)
            .find({ uid })
            .sort({ updatedAt: -1 })
            .limit(limit)
            .toArray();
    }

    /**
     * 获取公开作品列表(带分页)
     */
    async getPublicWorks(page: number = 1, limit: number = 20): Promise<{
        works: TurtleWork[];
        total: number;
        totalPages: number;
    }> {
        const skip = (page - 1) * limit;
        const collection = this.ctx.db.collection('turtle.works' as any);

        const works = await collection
            .find({ isPublic: true })
            .sort({ isFeatured: -1, likes: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        const total = await collection.countDocuments({ isPublic: true });

        return {
            works,
            total,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * 获取热门作品排行榜（按投币数排序）
     */
    async getPopularWorks(limit: number = 20): Promise<TurtleWork[]> {
        const collection = this.ctx.db.collection('turtle.works' as any);

        const works = await collection
            .find({ isPublic: true })
            .sort({ likes: -1, createdAt: -1 }) // 按投币数降序，然后按创建时间降序
            .limit(limit)
            .toArray();

        return works;
    }

    /**
     * 删除作品
     */
    async deleteWork(workId: string, uid: number): Promise<void> {
        const result = await this.ctx.db.collection('turtle.works' as any)
            .deleteOne({ _id: new ObjectId(workId), uid });

        if (result.deletedCount === 0) {
            throw new Error('Work not found or unauthorized');
        }
    }

    /**
     * 增加浏览次数
     */
    async incrementViews(workId: string): Promise<void> {
        try {
            await this.ctx.db.collection('turtle.works' as any)
                .updateOne(
                    { _id: new ObjectId(workId) },
                    { $inc: { views: 1 } },
                );
        } catch (error) {
            // 忽略错误,不影响主流程
        }
    }

    /**
     * 投币作品：同一用户对同一作品只能投1积分
     * 投币后，扣除投币者1积分，给作品主人加1积分
     * 通过事件系统与积分系统通信
     */
    async coinWork(workId: string, uid: number, domainId: string): Promise<void> {
        const coinsColl = this.ctx.db.collection('turtle.work_likes' as any); // 复用集合，保持兼容

        // 如果已经投过币，则直接返回，避免重复计数
        const existed = await coinsColl.findOne({ workId, uid });
        if (existed) {
            throw new Error('您已经投过币了，每个作品只能投1次');
        }

        // 获取作品信息，找到作品主人
        const work = await this.getWork(workId);
        if (!work) {
            throw new Error('作品不存在');
        }

        // 不能给自己投币
        if (work.uid === uid) {
            throw new Error('不能给自己的作品投币');
        }

        // 检查投币者积分是否足够（至少1积分）
        // 优先使用 scoreService（如果已经通过 ctx.provide 暴露），否则回退到直接查询数据库
        let userScore: any = null;
        try {
            // @ts-ignore - ctx.scoreService 由 score-system 可选提供
            const scoreSvc = (this.ctx as any).scoreService;
            if (scoreSvc && typeof scoreSvc.getUserScore === 'function') {
                userScore = await scoreSvc.getUserScore(domainId, uid);
            } else {
                userScore = await this.ctx.db.collection('score.users' as any).findOne({ uid });
            }
        } catch (err) {
            // 如果获取过程中发生异常，记录并回退到直接查询数据库
            try {
                userScore = await this.ctx.db.collection('score.users' as any).findOne({ uid });
            } catch (e) {
                // 最终失败则抛错
                throw new Error('无法获取用户积分，请稍后重试');
            }
        }

        if (!userScore || (userScore.totalScore || 0) < 1) {
            throw new Error('积分不足，至少需要1积分才能投币');
        }

        // 触发投币事件，让积分系统处理积分变更
        // 使用 any 绕过类型系统的事件键检查（事件类型在外部插件中声明）
        (this.ctx as any).emit('turtle/work-coined', {
            fromUid: uid,
            toUid: work.uid,
            domainId,
            workId,
            workTitle: work.title,
            amount: 1,
        });

        // 记录投币行为
        await coinsColl.insertOne({
            workId,
            uid,
            createdAt: new Date(),
        });

        // 增加作品的投币数（使用 likes 字段保持兼容）
        await this.ctx.db.collection('turtle.works' as any)
            .updateOne(
                { _id: new ObjectId(workId) },
                { $inc: { likes: 1 } },
            );
    }

    /**
     * 设置推荐状态(管理员功能)
     */
    async setFeatured(workId: string, featured: boolean): Promise<void> {
        await this.ctx.db.collection('turtle.works' as any)
            .updateOne(
                { _id: new ObjectId(workId) },
                { $set: { isFeatured: featured } },
            );
    }

    /**
     * 管理员删除作品
     */
    async adminDeleteWork(workId: string): Promise<void> {
        const result = await this.ctx.db.collection('turtle.works' as any)
            .deleteOne({ _id: new ObjectId(workId) });

        if (result.deletedCount === 0) {
            throw new Error('Work not found');
        }
    }

    /**
     * 获取所有作品(管理员)
     */
    async getAllWorks(page: number = 1, limit: number = 50): Promise<{
        works: TurtleWork[];
        total: number;
        totalPages: number;
    }> {
        const skip = (page - 1) * limit;
        const collection = this.ctx.db.collection('turtle.works' as any);

        const works = await collection
            .find({})
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        const total = await collection.countDocuments({});

        return {
            works,
            total,
            totalPages: Math.ceil(total / limit),
        };
    }
}
