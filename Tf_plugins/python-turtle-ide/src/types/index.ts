import { ObjectId } from 'mongodb';

/**
 * Turtle 作品数据类型
 */
export interface TurtleWork {
    _id?: ObjectId;
    uid: number;              // 用户 ID
    domainId: string;         // 域 ID
    title: string;            // 作品标题
    description?: string;     // 作品描述
    code: string;             // Python 代码
    imageUrl?: string;        // 作品截图(Base64 或 URL)
    tags?: string[];          // 标签(如: "入门", "几何", "艺术")
    isPublic: boolean;        // 是否公开
    isFeatured: boolean;      // 是否推荐
    likes: number;            // 点赞数
    views: number;            // 浏览次数
    createdAt: Date;          // 创建时间
    updatedAt: Date;          // 更新时间
}

/**
 * Turtle 示例代码数据类型
 */
export interface TurtleExample {
    _id?: ObjectId;
    name: string;             // 示例名称(英文)
    nameZh: string;           // 中文名称
    category: string;         // 分类(basic/advanced/art)
    code: string;             // 示例代码
    description: string;      // 描述
    difficulty: 1 | 2 | 3;    // 难度等级
    order: number;            // 排序
}

/**
 * 保存作品的参数类型
 */
export interface SaveWorkParams {
    workId?: string;
    uid: number;
    domainId: string;
    title: string;
    code: string;
    description?: string;
    isPublic: boolean;
    imageUrl?: string;
}
