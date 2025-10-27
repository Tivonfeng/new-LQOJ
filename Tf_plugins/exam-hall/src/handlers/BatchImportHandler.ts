import * as fs from 'fs';
import * as path from 'path';
import * as formidable from 'formidable';
import { Handler, PRIV } from 'hydrooj';
import CertificateBatchImportService from '../services/CertificateBatchImportService';

/**
 * 批量导入处理器
 */
export class BatchImportHandler extends Handler {
    /**
     * GET /exam/admin/batch-import
     * 获取批量导入页面信息和模板
     */
    async get() {
        if (this.user.role !== 'admin' && !(this.user.perm & BigInt(PRIV.PRIV_EDIT_SYSTEM))) {
            this.response.status = 403;
            this.response.body = { success: false, error: '无权限访问批量导入' };
            return;
        }

        const action = this.request.query?.action as string;

        if (action === 'template-csv') {
            // 返回CSV模板
            this.response.type = 'text/csv;charset=utf-8';
            this.response.body = CertificateBatchImportService.getCSVTemplate();
            return;
        }

        if (action === 'template-excel') {
            // 生成并下载Excel模板
            const tempPath = `/tmp/certificate_template_${Date.now()}.xlsx`;
            try {
                CertificateBatchImportService.createExcelTemplate(tempPath);
                const data = fs.readFileSync(tempPath);
                this.response.type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                this.response.body = data;
            } finally {
                if (fs.existsSync(tempPath)) {
                    fs.unlinkSync(tempPath);
                }
            }
            return;
        }

        // 返回导入页面信息
        this.response.type = 'application/json';
        this.response.body = {
            message: '请使用 POST 方法上传文件进行批量导入',
            upload_endpoint: '/exam/admin/batch-import',
            supported_formats: ['csv', 'xlsx', 'xls'],
            template_endpoints: {
                csv: '/exam/admin/batch-import?action=template-csv',
                excel: '/exam/admin/batch-import?action=template-excel',
            },
            csv_format: 'uid,certificateName,certifyingBody,category,level,score,issueDate,expiryDate,notes',
            notes: 'issueDate 和 expiryDate 格式为 YYYY-MM-DD',
        };
    }

    /**
     * POST /exam/admin/batch-import
     * 上传文件进行批量导入
     */
    async post() {
        if (this.user.role !== 'admin' && !(this.user.perm & BigInt(PRIV.PRIV_EDIT_SYSTEM))) {
            this.response.status = 403;
            this.response.body = { success: false, error: '无权限执行批量导入' };
            return;
        }

        const form = formidable({
            maxFileSize: 50 * 1024 * 1024, // 50MB for batch import
            uploadDir: '/tmp/exam-batch-import',
            keepExtensions: true,
        });

        // 确保临时目录存在
        if (!fs.existsSync('/tmp/exam-batch-import')) {
            fs.mkdirSync('/tmp/exam-batch-import', { recursive: true });
        }

        const result = await new Promise<any>((resolve) => {
            form.parse(this.request as any, async (err, fields, files) => {
                try {
                    if (err) {
                        // 表单解析失败
                        resolve({
                            success: false,
                            error: `表单解析失败: ${err.message}`,
                        });
                        return;
                    }

                    // 获取上传的文件
                    const uploadedFile = (files.file as any) || (files.import_file as any);
                    if (!uploadedFile) {
                        resolve({
                            success: false,
                            error: '未找到上传的文件',
                        });
                        return;
                    }

                    const filePath = uploadedFile[0]?.filepath || uploadedFile[0]?.path;
                    if (!filePath) {
                        resolve({
                            success: false,
                            error: '文件路径无效',
                        });
                        return;
                    }

                    const fileExt = path.extname(filePath).toLowerCase();

                    // 验证文件格式
                    const allowedExts = ['.csv', '.xlsx', '.xls'];
                    if (!allowedExts.includes(fileExt)) {
                        resolve({
                            success: false,
                            error: `不支持的文件格式: ${fileExt}，仅支持 CSV, XLSX, XLS`,
                        });
                        return;
                    }

                    try {
                        // 执行批量导入
                        const importService = new CertificateBatchImportService(this.ctx);
                        const sheetName = (fields.sheet_name as string) || undefined;

                        const importResult = await importService.importFromFile(filePath, sheetName);

                        // 保存导入历史记录
                        const historyCollection = this.ctx.db.collection('exam.import_history');
                        await historyCollection.insertOne({
                            domainId: this.ctx.domain!._id,
                            importedBy: this.user._id,
                            status: importResult.failed === 0 ? 'success' : 'partial',
                            successCount: importResult.success,
                            failedCount: importResult.failed,
                            totalCount: importResult.total,
                            errors: importResult.errors.slice(0, 100), // 只保留前100条错误
                            createdAt: new Date(),
                        });

                        // 批量导入完成
                        resolve({
                            success: importResult.failed === 0,
                            importResult,
                            message: `导入完成: 成功 ${importResult.success} 条, 失败 ${importResult.failed} 条`,
                        });
                    } catch (error: any) {
                        // 批量导入失败
                        resolve({
                            success: false,
                            error: `导入失败: ${error.message}`,
                        });
                    } finally {
                        // 异步清理临时文件，失败不阻塞响应
                        if (fs.existsSync(filePath)) {
                            fs.promises.unlink(filePath).catch((err) => {
                                console.warn(
                                    `[ExamHall] 批量导入临时文件清理失败: ${filePath}, 错误: ${err.message}`,
                                );
                            });
                        }
                    }
                } catch (error: any) {
                    // 批量导入异常
                    resolve({
                        success: false,
                        error: `导入异常: ${error.message}`,
                    });
                }
            });
        });

        this.response.type = 'application/json';
        this.response.body = result;
    }
}

/**
 * 导入历史处理器
 */
export class ImportHistoryHandler extends Handler {
    /**
     * GET /exam/admin/import-history
     * 获取导入历史记录
     */
    async get() {
        if (this.user.role !== 'admin' && !(this.user.perm & BigInt(PRIV.PRIV_EDIT_SYSTEM))) {
            this.response.status = 403;
            this.response.body = { success: false, error: '无权限查看导入历史' };
            return;
        }

        const skip = (this.request.query?.skip as string) || '0';
        const limit = (this.request.query?.limit as string) || '20';

        try {
            const collection = this.ctx.db.collection('exam.import_history');

            const history = await collection
                .find({})
                .sort({ createdAt: -1 })
                .skip(Number.parseInt(skip as string))
                .limit(Number.parseInt(limit as string))
                .toArray();

            const total = await collection.countDocuments({});

            this.response.type = 'application/json';
            this.response.body = {
                success: true,
                history,
                total,
                skip: Number.parseInt(skip as string),
                limit: Number.parseInt(limit as string),
            };
        } catch (error: any) {
            // 获取导入历史异常
            this.response.type = 'application/json';
            this.response.status = 500;
            this.response.body = {
                success: false,
                error: error.message,
            };
        }
    }
}
