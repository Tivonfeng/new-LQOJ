export interface ClassroomRandomNumberConfig {
    min: number;
    max: number;
    count: number;
    allowDuplicate: boolean;
}

export class ClassroomToolsService {
    generateRandomNumbers(config: ClassroomRandomNumberConfig): number[] {
        const { min, max, count, allowDuplicate } = config;

        if (min > max) {
            throw new Error('最小值不能大于最大值');
        }

        const range = max - min + 1;

        if (!allowDuplicate && count > range) {
            throw new Error(`在${min}-${max}范围内不重复抽取${count}个数字是不可能的`);
        }

        if (allowDuplicate) {
            return Array.from({ length: count }, () => Math.floor(Math.random() * range) + min);
        }

        const pool = Array.from({ length: range }, (_, i) => i + min);
        const numbers: number[] = [];

        for (let i = 0; i < count; i++) {
            const randomIndex = Math.floor(Math.random() * (pool.length - i)) + i;
            [pool[i], pool[randomIndex]] = [pool[randomIndex], pool[i]];
            numbers.push(pool[i]);
        }

        return numbers;
    }
}

