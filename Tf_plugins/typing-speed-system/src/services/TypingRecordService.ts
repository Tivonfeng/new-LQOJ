/* eslint-disable no-await-in-loop */
import {
    Context,
    ObjectId,
} from 'hydrooj';

// 打字记录接口
export interface TypingRecord {
    _id?: any;
    uid: number;
    domainId: string;
    wpm: number;
    createdAt: Date;
    recordedBy: number;
    note?: string;
}

/**
 * 打字记录管理服务
 * 负责：记录的增删查、批量导入
 */
export class TypingRecordService {
    private ctx: Context;

    constructor(ctx: Context) {
        this.ctx = ctx;
    }

    /**
     * 添加打字记录
     * @returns 返回插入的记录ID
     */
    async addRecord(uid: number, domainId: string, wpm: number, recordedBy: number, note?: string): Promise<any> {
        // 验证WPM范围
        if (wpm < 0 || wpm > 300) {
            throw new Error('WPM must be between 0 and 300');
        }

        const result = await this.ctx.db.collection('typing.records' as any).insertOne({
            uid,
            domainId,
            wpm,
            createdAt: new Date(),
            recordedBy,
            note: note || '',
        });
        return result.insertedId;
    }

    /**
     * 获取用户打字记录
     */
    async getUserRecords(uid: number, limit: number = 20): Promise<TypingRecord[]> {
        return await this.ctx.db.collection('typing.records' as any)
            .find({ uid })
            .sort({ createdAt: -1 })
            .limit(limit)
            .toArray();
    }

    /**
     * 获取最近的打字记录（全局）
     */
    async getRecentRecords(limit: number = 20): Promise<TypingRecord[]> {
        return await this.ctx.db.collection('typing.records' as any)
            .find({})
            .sort({ createdAt: -1 })
            .limit(limit)
            .toArray();
    }

    /**
     * 获取分页记录
     */
    async getRecordsWithPagination(page: number, limit: number): Promise<{
        records: TypingRecord[];
        total: number;
        totalPages: number;
    }> {
        const skip = (page - 1) * limit;

        const records = await this.ctx.db.collection('typing.records' as any)
            .find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        const total = await this.ctx.db.collection('typing.records' as any)
            .countDocuments();

        const totalPages = Math.ceil(total / limit);

        return { records, total, totalPages };
    }

    /**
     * 从CSV数据批量导入记录
     * CSV格式: username,wpm,note
     */
    async importRecordsFromCSV(csvData: string, recordedBy: number, domainId: string): Promise<{
        success: number;
        failed: number;
        errors: string[];
    }> {
        const lines = csvData.trim().split('\n');
        const result = {
            success: 0,
            failed: 0,
            errors: [] as string[],
        };

        console.log(`[TypingRecordService] Importing CSV with ${lines.length} lines`);
        console.log(`[TypingRecordService] First line: ${lines[0]}`);

        // 检查是否为空
        if (lines.length < 1) {
            result.errors.push('CSV数据为空');
            return result;
        }

        // 智能检测是否有标题行
        const firstLine = lines[0].trim().toLowerCase();
        const hasHeader = firstLine.includes('username') && (firstLine.includes('wpm') || firstLine.includes('speed'));
        const startLine = hasHeader ? 1 : 0;

        console.log(`[TypingRecordService] Header detected: ${hasHeader}, starting from line ${startLine + 1}`);

        if (hasHeader && lines.length < 2) {
            result.errors.push('CSV文件只有标题行，没有数据');
            return result;
        }

        // 处理数据行
        for (let i = startLine; i < lines.length; i++) {
            const line = lines[i].trim();
            console.log(`[TypingRecordService] Processing line ${i + 1}: "${line}"`);

            if (!line) {
                console.log(`[TypingRecordService] Line ${i + 1}: Empty line, skipping`);
                continue;
            }

            const parts = line.split(',');
            console.log(`[TypingRecordService] Line ${i + 1}: Split into ${parts.length} parts:`, parts);

            if (parts.length < 2) {
                result.failed++;
                result.errors.push(`第${i + 1}行: 格式无效，至少需要用户名和WPM`);
                continue;
            }

            const username = parts[0].trim();
            const wpmStr = parts[1].trim();
            const wpm = Number.parseInt(wpmStr);
            const note = parts[2]?.trim() || '';

            console.log(`[TypingRecordService] Line ${i + 1}: username="${username}", wpm="${wpmStr}" (parsed: ${wpm}), note="${note}"`);

            // 验证WPM
            if (Number.isNaN(wpm) || wpm < 0 || wpm > 300) {
                result.failed++;
                result.errors.push(`第${i + 1}行: WPM无效 (${wpmStr})，用户 ${username}`);
                console.log(`[TypingRecordService] Line ${i + 1}: Invalid WPM`);
                continue;
            }

            try {
                // 查找用户
                const UserModel = global.Hydro.model.user;
                const user = await UserModel.getByUname(domainId, username);

                if (!user) {
                    result.failed++;
                    result.errors.push(`第${i + 1}行: 用户 ${username} 不存在`);
                    console.log(`[TypingRecordService] Line ${i + 1}: User not found: ${username}`);
                    continue;
                }

                console.log(`[TypingRecordService] Line ${i + 1}: Found user ${username} (uid: ${user._id})`);

                // 添加记录
                await this.addRecord(user._id, domainId, wpm, recordedBy, note);
                result.success++;
                console.log(`[TypingRecordService] Line ${i + 1}: Record added successfully`);
            } catch (error) {
                result.failed++;
                result.errors.push(`第${i + 1}行: ${error.message}`);
                console.error(`[TypingRecordService] Line ${i + 1}: Error:`, error);
            }
        }

        console.log(`[TypingRecordService] Import complete: ${result.success} success, ${result.failed} failed`);
        return result;
    }

    /**
     * 删除记录
     */
    async deleteRecord(recordId: any): Promise<void> {
        // 确保 recordId 是正确的格式
        if (!recordId) {
            throw new Error('记录ID不能为空');
        }

        let queryId = recordId;

        // 如果是字符串，尝试转换为ObjectId
        if (typeof recordId === 'string') {
            if (ObjectId.isValid(recordId)) {
                queryId = new ObjectId(recordId);
            } else {
                throw new Error('Invalid record ID format');
            }
        }

        const result = await this.ctx.db.collection('typing.records' as any).deleteOne({ _id: queryId });
        if (result.deletedCount === 0) {
            throw new Error('Record not found');
        }
    }

    /**
     * 根据记录ID获取记录
     */
    async getRecordById(recordId: any): Promise<TypingRecord | null> {
        if (!recordId) {
            return null;
        }

        let queryId = recordId;

        // 如果是字符串，尝试转换为ObjectId
        if (typeof recordId === 'string') {
            if (ObjectId.isValid(recordId)) {
                queryId = new ObjectId(recordId);
            } else {
                return null;
            }
        }

        return await this.ctx.db.collection('typing.records' as any).findOne({ _id: queryId });
    }

    /**
     * 获取用户最新的记录
     */
    async getLatestRecord(uid: number): Promise<TypingRecord | null> {
        return await this.ctx.db.collection('typing.records' as any)
            .findOne({ uid }, { sort: { createdAt: -1 } });
    }

    /**
     * 获取所有记录（用于批量操作）
     */
    async getAllRecords(): Promise<TypingRecord[]> {
        return await this.ctx.db.collection('typing.records' as any)
            .find({})
            .toArray();
    }

    /**
     * 清空所有记录
     */
    async clearAllRecords(): Promise<void> {
        await this.ctx.db.collection('typing.records' as any).deleteMany({});
    }

    /**
     * 格式化记录日期
     */
    formatRecords(records: TypingRecord[]): Array<Omit<TypingRecord, 'createdAt'> & { createdAt: string }> {
        return records.map((record) => ({
            ...record,
            createdAt: record.createdAt.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            }),
        }));
    }
}
