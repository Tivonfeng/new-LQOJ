import { Context } from 'hydrooj';
import { RandomNumberConfig } from '../types';

export class ToolsService {
    private ctx: Context;

    constructor(ctx: Context) {
        this.ctx = ctx;
    }

    /**
     * 生成随机数字
     */
    generateRandomNumbers(config: RandomNumberConfig): number[] {
        const { min, max, count, allowDuplicate } = config;

        // 参数验证
        if (min > max) {
            throw new Error('最小值不能大于最大值');
        }

        const range = max - min + 1;

        if (!allowDuplicate && count > range) {
            throw new Error(`在${min}-${max}范围内不重复抽取${count}个数字是不可能的`);
        }

        const numbers: number[] = [];

        if (allowDuplicate) {
            // 允许重复：直接随机生成
            for (let i = 0; i < count; i++) {
                numbers.push(Math.floor(Math.random() * range) + min);
            }
        } else {
            // 不允许重复：使用Fisher-Yates洗牌算法
            const pool = Array.from({ length: range }, (_, i) => i + min);

            for (let i = 0; i < count; i++) {
                const randomIndex = Math.floor(Math.random() * (pool.length - i)) + i;
                [pool[i], pool[randomIndex]] = [pool[randomIndex], pool[i]];
                numbers.push(pool[i]);
            }
        }

        return numbers;
    }
}
