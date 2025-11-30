import { ObjectId } from 'mongodb';
import { Context } from 'hydrooj';
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
                domainId: data.domainId,
            });

            if (userWorksCount >= 50) {
                throw new Error('Maximum works limit reached (50)');
            }

            // 创建新作品
            const result = await collection.insertOne({
                uid: data.uid,
                domainId: data.domainId,
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
    async getUserWorks(uid: number, domainId: string, limit: number = 50): Promise<TurtleWork[]> {
        return await this.ctx.db.collection('turtle.works' as any)
            .find({ uid, domainId })
            .sort({ updatedAt: -1 })
            .limit(limit)
            .toArray();
    }

    /**
     * 获取公开作品列表(带分页)
     */
    async getPublicWorks(domainId: string, page: number = 1, limit: number = 20): Promise<{
        works: TurtleWork[];
        total: number;
        totalPages: number;
    }> {
        const skip = (page - 1) * limit;
        const collection = this.ctx.db.collection('turtle.works' as any);

        const works = await collection
            .find({ domainId, isPublic: true })
            .sort({ isFeatured: -1, likes: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        const total = await collection.countDocuments({ domainId, isPublic: true });

        return {
            works,
            total,
            totalPages: Math.ceil(total / limit),
        };
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
     * 点赞作品
     */
    async likeWork(workId: string): Promise<void> {
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
    async getAllWorks(domainId: string, page: number = 1, limit: number = 50): Promise<{
        works: TurtleWork[];
        total: number;
        totalPages: number;
    }> {
        const skip = (page - 1) * limit;
        const collection = this.ctx.db.collection('turtle.works' as any);

        const works = await collection
            .find({ domainId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        const total = await collection.countDocuments({ domainId });

        return {
            works,
            total,
            totalPages: Math.ceil(total / limit),
        };
    }
}
