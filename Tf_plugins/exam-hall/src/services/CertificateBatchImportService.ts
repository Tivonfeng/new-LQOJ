import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import * as xlsx from 'xlsx';
import { Context } from 'hydrooj';
import CertificateService from './CertificateService';

export interface CertificateRecord {
    uid: number;
    certificateName: string;
    certifyingBody: string;
    category: string;
    level?: string;
    score?: number;
    issueDate: string;
    expiryDate?: string;
    notes?: string;
}

export interface ImportResult {
    success: number;
    failed: number;
    errors: Array<{
        row: number;
        reason: string;
    }>;
    total: number;
}

/**
 * 证书批量导入服务
 */
export class CertificateBatchImportService {
    private ctx: Context;
    private certService: CertificateService;

    constructor(ctx: Context) {
        this.ctx = ctx;
        this.certService = new CertificateService(ctx);
    }

    /**
     * 从CSV文件导入证书
     */
    async importFromCSV(filePath: string): Promise<ImportResult> {
        const result: ImportResult = {
            success: 0,
            failed: 0,
            errors: [],
            total: 0,
        };

        try {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const records = parse(fileContent, {
                columns: true,
                skip_empty_lines: true,
                trim: true,
            }) as Record<string, any>[];

            result.total = records.length;

            const collection = this.ctx.db.collection('exam.certificates' as any);

            for (let i = 0; i < records.length; i++) {
                try {
                    const row = i + 2; // 第一行是表头
                    const record = records[i];

                    // 验证必填字段
                    const validation = this.validateRecord(record);
                    if (!validation.valid) {
                        result.failed++;
                        result.errors.push({
                            row,
                            reason: validation.error || '数据验证失败',
                        });
                        continue;
                    }

                    // 检查是否已存在相同证书（防止重复导入）
                    const existing = await collection.findOne({
                        domainId: this.ctx.domain!._id,
                        uid: Number.parseInt(record.uid),
                        certificateName: record.certificateName,
                        category: record.category,
                        issueDate: new Date(record.issueDate),
                    });

                    if (existing) {
                        result.failed++;
                        result.errors.push({
                            row,
                            reason: '该证书已存在（相同用户、名称、分类、颁发日期），跳过导入',
                        });
                        continue;
                    }

                    // 创建证书
                    await this.certService.createCertificate(
                        Number.parseInt(record.uid),
                        {
                            certificateName: record.certificateName,
                            certifyingBody: record.certifyingBody,
                            category: record.category,
                            level: record.level,
                            score: record.score ? Number.parseInt(record.score) : undefined,
                            issueDate: new Date(record.issueDate),
                            expiryDate: record.expiryDate ? new Date(record.expiryDate) : undefined,
                            notes: record.notes,
                        },
                    );

                    result.success++;
                } catch (err: any) {
                    result.failed++;
                    result.errors.push({
                        row: i + 2,
                        reason: err.message,
                    });
                }
            }
        } catch (err: any) {
            throw new Error(`导入CSV文件失败: ${(err as any).message}`);
        }

        return result;
    }

    /**
     * 从Excel文件导入证书
     */
    async importFromExcel(filePath: string, sheetName?: string): Promise<ImportResult> {
        const result: ImportResult = {
            success: 0,
            failed: 0,
            errors: [],
            total: 0,
        };

        try {
            const workbook = xlsx.readFile(filePath);

            // 获取工作表
            const sheet = sheetName
                ? workbook.Sheets[sheetName]
                : workbook.Sheets[workbook.SheetNames[0]];

            if (!sheet) {
                throw new Error('工作表不存在');
            }

            // 转换为JSON
            const records = xlsx.utils.sheet_to_json(sheet) as Record<string, any>[];

            result.total = records.length;

            const collection = this.ctx.db.collection('exam.certificates' as any);

            for (let i = 0; i < records.length; i++) {
                try {
                    const row = i + 2; // 第一行是表头
                    const record = records[i];

                    // 验证必填字段
                    const validation = this.validateRecord(record);
                    if (!validation.valid) {
                        result.failed++;
                        result.errors.push({
                            row,
                            reason: validation.error || '数据验证失败',
                        });
                        continue;
                    }

                    // 检查是否已存在相同证书（防止重复导入）
                    const existing = await collection.findOne({
                        domainId: this.ctx.domain!._id,
                        uid: Number.parseInt(record.uid),
                        certificateName: record.certificateName,
                        category: record.category,
                        issueDate: new Date(record.issueDate),
                    });

                    if (existing) {
                        result.failed++;
                        result.errors.push({
                            row,
                            reason: '该证书已存在（相同用户、名称、分类、颁发日期），跳过导入',
                        });
                        continue;
                    }

                    // 创建证书
                    await this.certService.createCertificate(
                        Number.parseInt(record.uid),
                        {
                            certificateName: record.certificateName,
                            certifyingBody: record.certifyingBody,
                            category: record.category,
                            level: record.level,
                            score: record.score ? Number.parseInt(record.score) : undefined,
                            issueDate: new Date(record.issueDate),
                            expiryDate: record.expiryDate ? new Date(record.expiryDate) : undefined,
                            notes: record.notes,
                        },
                    );

                    result.success++;
                } catch (err: any) {
                    result.failed++;
                    result.errors.push({
                        row: i + 2,
                        reason: err.message,
                    });
                }
            }
        } catch (err: any) {
            throw new Error(`导入Excel文件失败: ${(err as any).message}`);
        }

        return result;
    }

    /**
     * 根据文件类型自动选择导入方法
     */
    async importFromFile(filePath: string, sheetName?: string): Promise<ImportResult> {
        const ext = path.extname(filePath).toLowerCase();

        if (ext === '.csv') {
            return this.importFromCSV(filePath);
        } else if (['.xlsx', '.xls'].includes(ext)) {
            return this.importFromExcel(filePath, sheetName);
        } else {
            throw new Error('不支持的文件格式，仅支持 CSV 和 Excel 文件');
        }
    }

    /**
     * 验证证书记录
     */
    private validateRecord(record: Record<string, any>): {
        valid: boolean;
        error?: string;
    } {
        // 检查必填字段
        if (!record.uid || Number.isNaN(Number.parseInt(record.uid))) {
            return { valid: false, error: '缺少有效的 uid 字段' };
        }

        if (!record.certificateName) {
            return { valid: false, error: '缺少 certificateName 字段' };
        }

        if (!record.certifyingBody) {
            return { valid: false, error: '缺少 certifyingBody 字段' };
        }

        if (!record.category) {
            return { valid: false, error: '缺少 category 字段' };
        }

        if (!record.issueDate) {
            return { valid: false, error: '缺少 issueDate 字段' };
        }

        // 验证日期格式和范围
        const issueDateObj = new Date(record.issueDate);
        if (Number.isNaN(issueDateObj.getTime())) {
            return { valid: false, error: '无效的 issueDate 格式，应为 YYYY-MM-DD' };
        }

        const now = new Date();

        // 验证 issueDate 不能是未来日期
        if (issueDateObj > now) {
            return { valid: false, error: '颁发日期（issueDate）不能是未来日期' };
        }

        // 验证 issueDate 在合理范围内（不早于50年前）
        const fiftyYearsAgo = new Date(now.getFullYear() - 50, now.getMonth(), now.getDate());
        if (issueDateObj < fiftyYearsAgo) {
            return { valid: false, error: '颁发日期（issueDate）超出合理范围，应在50年内' };
        }

        // 验证 expiryDate
        if (record.expiryDate) {
            const expiryDateObj = new Date(record.expiryDate);
            if (Number.isNaN(expiryDateObj.getTime())) {
                return { valid: false, error: '无效的有效期截止日期（expiryDate）格式，应为 YYYY-MM-DD' };
            }

            // expiryDate 必须严格晚于 issueDate
            if (expiryDateObj <= issueDateObj) {
                return { valid: false, error: '有效期截止日期（expiryDate）必须晚于颁发日期（issueDate）' };
            }

            // expiryDate 不能超过100年
            const hundredYearsLater = new Date(now.getFullYear() + 100, now.getMonth());
            if (expiryDateObj > hundredYearsLater) {
                return { valid: false, error: '有效期截止日期（expiryDate）超出合理范围' };
            }
        }

        // 验证score
        if (record.score && Number.isNaN(Number.parseInt(record.score))) {
            return { valid: false, error: '无效的 score 格式，应为整数' };
        }

        return { valid: true };
    }

    /**
     * 获取导入模板
     */
    static getCSVTemplate(): string {
        return `uid,certificateName,certifyingBody,category,level,score,issueDate,expiryDate,notes
1001,Python编程证书,中国计算机学会,编程,初级,80,2023-01-15,2024-01-15,通过认证
1002,英语等级证书,教育部考试中心,语言,6级,500,2023-06-01,,通过全国英语六级考试`;
    }

    /**
     * 创建示例Excel文件
     */
    static createExcelTemplate(filePath: string): void {
        const data = [
            [
                'uid',
                'certificateName',
                'certifyingBody',
                'category',
                'level',
                'score',
                'issueDate',
                'expiryDate',
                'notes',
            ],
            [
                1001,
                'Python编程证书',
                '中国计算机学会',
                '编程',
                '初级',
                80,
                '2023-01-15',
                '2024-01-15',
                '通过认证',
            ],
            [
                1002,
                '英语等级证书',
                '教育部考试中心',
                '语言',
                '6级',
                500,
                '2023-06-01',
                '',
                '通过全国英语六级考试',
            ],
        ];

        const ws = xlsx.utils.aoa_to_sheet(data);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, '证书数据');
        xlsx.writeFile(wb, filePath);
    }
}

export default CertificateBatchImportService;
