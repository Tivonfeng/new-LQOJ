/**
 * 课堂工具 TypeScript 类型定义
 */

/**
 * 随机数生成配置
 */
export interface RandomNumberConfig {
  /** 最小值 */
  min: number;
  /** 最大值 */
  max: number;
  /** 生成数量 */
  count: number;
  /** 是否允许重复 */
  allowDuplicate: boolean;
}

/**
 * 课堂工具页面数据模型
 */
export interface ClassroomToolsData {
  /** 用户是否已登录 */
  isLoggedIn: boolean;
}

/**
 * API 成功响应
 */
export interface ApiSuccessResponse<T = any> {
  success: true;
  data?: T;
  message?: string;
}

/**
 * API 错误响应
 */
export interface ApiErrorResponse {
  success: false;
  message: string;
}

/**
 * API 响应类型
 */
export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * 随机数生成结果
 */
export interface RandomNumberResult {
  numbers: number[];
  config: RandomNumberConfig;
}
