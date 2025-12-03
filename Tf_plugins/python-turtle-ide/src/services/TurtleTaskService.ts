import { Context, ObjectId } from 'hydrooj';
import type {
    SaveTaskParams,
    TurtleTask,
    TurtleTaskProgress,
    TurtleTaskStatus,
    UpdateTaskProgressParams,
} from '../types';

const STATUS_PRIORITY: Record<TurtleTaskStatus, number> = {
    not_started: 0,
    in_progress: 1,
    completed: 2,
};

export class TurtleTaskService {
    private ctx: Context;

    constructor(ctx: Context) {
        this.ctx = ctx;
    }

    private tasksCollection() {
        return this.ctx.db.collection('turtle.tasks' as any);
    }

    private progressCollection() {
        return this.ctx.db.collection('turtle.task_progress' as any);
    }

    async getPublicTasks(): Promise<TurtleTask[]> {
        return await this.tasksCollection()
            .find({ isPublished: true })
            .sort({ order: 1, createdAt: -1 })
            .toArray();
    }

    async listAllTasks(): Promise<TurtleTask[]> {
        return await this.tasksCollection()
            .find({})
            .sort({ order: 1, createdAt: -1 })
            .toArray();
    }

    async getTask(taskId: string): Promise<TurtleTask | null> {
        try {
            return await this.tasksCollection().findOne({ _id: new ObjectId(taskId) });
        } catch (error) {
            return null;
        }
    }

    async saveTask(data: SaveTaskParams): Promise<string> {
        const collection = this.tasksCollection();
        const now = new Date();
        const taskPayload = {
            title: data.title,
            description: data.description,
            difficulty: data.difficulty,
            tags: data.tags || [],
            starterCode: data.starterCode || '',
            hint: data.hint || '',
            coverImage: data.coverImage || '',
            isPublished: data.isPublished,
            order: data.order ?? now.getTime(),
            updatedAt: now,
        };

        if (data.taskId) {
            const result = await collection.updateOne(
                { _id: new ObjectId(data.taskId) },
                { $set: taskPayload },
            );
            if (result.matchedCount === 0) {
                throw new Error('Task not found');
            }
            return data.taskId;
        }

        const result = await collection.insertOne({
            ...taskPayload,
            createdAt: now,
        });
        return result.insertedId.toString();
    }

    async deleteTask(taskId: string): Promise<void> {
        await this.tasksCollection().deleteOne({ _id: new ObjectId(taskId) });
        await this.progressCollection().deleteMany({ taskId: new ObjectId(taskId) });
    }

    async listUserProgress(uid: number, taskIds: ObjectId[]): Promise<TurtleTaskProgress[]> {
        if (!taskIds.length) return [];
        return await this.progressCollection()
            .find({ uid, taskId: { $in: taskIds } })
            .toArray();
    }

    async getUserProgress(uid: number, taskId: string): Promise<TurtleTaskProgress | null> {
        try {
            return await this.progressCollection().findOne({
                uid,
                taskId: new ObjectId(taskId),
            });
        } catch (error) {
            return null;
        }
    }

    async upsertProgress(params: UpdateTaskProgressParams): Promise<TurtleTaskProgress> {
        const collection = this.progressCollection();
        const now = new Date();
        const taskObjectId = new ObjectId(params.taskId);

        const existing = await collection.findOne({
            uid: params.uid,
            taskId: taskObjectId,
        });

        const nextStatus = this.pickStatus(existing?.status, params.status);

        const updateDoc: any = {
            status: nextStatus,
            updatedAt: now,
        };

        if (params.code) {
            updateDoc.lastCode = params.code;
        }

        if (params.bestWorkId) {
            updateDoc.bestWorkId = new ObjectId(params.bestWorkId);
        }

        if (nextStatus === 'completed' && !existing?.completedAt) {
            updateDoc.completedAt = now;
        }

        const result = await collection.findOneAndUpdate(
            { uid: params.uid, taskId: taskObjectId },
            { $set: updateDoc, $setOnInsert: { createdAt: now, uid: params.uid, taskId: taskObjectId } },
            { upsert: true, returnDocument: 'after' },
        );

        return result.value as TurtleTaskProgress;
    }

    private pickStatus(previous: TurtleTaskStatus | undefined, incoming: TurtleTaskStatus): TurtleTaskStatus {
        if (!previous) return incoming;
        return STATUS_PRIORITY[incoming] >= STATUS_PRIORITY[previous] ? incoming : previous;
    }
}

