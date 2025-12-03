import { Handler } from 'hydrooj';
import { ToolsService } from '../services/ToolsService';
import { RandomNumberConfig } from '../types';

export class ClassroomToolsHandler extends Handler {
    /**
     * GET请求 - 显示工具页面
     */
    async get() {
        const uid = this.user?._id;

        const classroomToolsData = {
            isLoggedIn: !!uid,
        };

        this.response.template = 'classroom_tools.html';
        this.response.body = {
            ...classroomToolsData,
            classroomToolsDataJSON: JSON.stringify(classroomToolsData),
        };
    }

    /**
     * POST请求 - 处理工具使用
     */
    async post() {
        const { action } = this.request.body;

        try {
            switch (action) {
                case 'random_number':
                    await this.handleRandomNumber();
                    break;
                default:
                    this.response.body = {
                        success: false,
                        message: 'Unknown action',
                    };
            }
        } catch (error) {
            this.response.body = {
                success: false,
                message: error.message,
            };
        }
    }

    /**
     * 处理随机数字生成
     */
    async handleRandomNumber() {
        const { min, max, count, allowDuplicate } = this.request.body;
        const toolsService = new ToolsService(this.ctx);

        // 参数验证
        const config: RandomNumberConfig = {
            min: Number.parseInt(min, 10) || 1,
            max: Number.parseInt(max, 10) || 100,
            count: Number.parseInt(count, 10) || 1,
            allowDuplicate: allowDuplicate === 'true' || allowDuplicate === true,
        };

        // 生成随机数
        const numbers = toolsService.generateRandomNumbers(config);

        this.response.body = {
            success: true,
            data: {
                numbers,
                config,
            },
        };
    }
}
