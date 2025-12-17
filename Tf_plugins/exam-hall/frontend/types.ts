/**
 * 赛考大厅 TypeScript 类型定义
 *
 * 文件说明：
 * - 统一管理所有前端数据接口定义
 * - 确保组件之间的数据格式一致性
 * - 提高代码可维护性和类型安全性
 *
 * 使用方式：
 * import { ExamHallData, DomainStats } from './types';
 */

// ============================================================================
// 🎯 主数据接口
// ============================================================================

/**
 * 赛考大厅完整数据模型
 * 包含展示赛考大厅所需的所有数据
 */
export interface ExamHallData {
  /** 用户是否已登录 */
  isLoggedIn: boolean;
  /** 当前用户是否拥有管理权限 */
  canManage: boolean;
  /** 证书管理页面 URL（如果用户有管理权限） */
  managementUrl?: string;
  /** 最近一个季度的竞赛证书 */
  recentCompetitions?: Array<{
    _id?: string;
    uid: number;
    username?: string;
    certificateName: string;
    certifyingBody: string;
    category: string;
    level?: string;
    issueDate: string | Date;
    certificateImageUrl?: string;
    competitionName?: string;
  }>;
  /** 最近一个季度的考级证书 */
  recentCertifications?: Array<{
    _id?: string;
    uid: number;
    username?: string;
    certificateName: string;
    certifyingBody: string;
    category: string;
    level?: string;
    issueDate: string | Date;
    certificateImageUrl?: string;
    certificationSeries?: string;
  }>;
  /** 最近证书记录（按创建时间排序） */
  recentRecords?: Array<{
    _id?: string;
    uid: number;
    username?: string;
    certificateName: string;
    certifyingBody: string;
    category: string;
    level?: string;
    issueDate: string | Date;
    certificateImageUrl?: string;
    examType?: 'competition' | 'certification';
    competitionName?: string;
    certificationSeries?: string;
    createdAt?: string;
    createdAtFormatted?: string;
  }>;
  /** 赛考指数排行榜 */
  leaderboard?: Array<{
    uid: number;
    username?: string;
    totalWeight: number;
    totalCertificates: number;
    competitionWeight: number;
    certificationWeight: number;
  }>;
  /** 用户信息映射（用于最近记录显示） */
  udocs?: Record<string, {
    uname?: string;
    displayName?: string;
    avatarUrl?: string;
    bio?: string;
  }>;
}

// ============================================================================
// 🎯 预设管理接口
// ============================================================================

/**
 * 赛项接口
 * 表示赛考下的单个赛项
 */
export interface ExamEvent {
  /** 赛项名称 */
  name: string;
  /** 赛项描述（可选） */
  description?: string;
}

/**
 * 级别类型
 */
export type Level = 'city' | 'province' | 'national' | 'international';

/**
 * 证书预设接口
 * 用于管理比赛/考级的预设配置
 */
export interface CertificatePreset {
  /** 预设ID */
  _id?: string;
  /** 预设类型：竞赛(competition) 或 考级(certification) */
  type: 'competition' | 'certification';
  /** 预设名称（比赛/考级名称） */
  name: string;
  /** 认证机构 */
  certifyingBody: string;
  /** 级别：市级(city)、省级(province)、国级(national)、国际级(international) */
  level: Level;
  /** 描述 */
  description?: string;
  /** 赛项列表 */
  events?: ExamEvent[];
  /** 是否启用 */
  enabled: boolean;
  /** 创建时间 */
  createdAt?: string | Date;
  /** 更新时间 */
  updatedAt?: string | Date;
}

// ============================================================================
// 🎯 证书管理页面数据接口
// ============================================================================

/**
 * 证书信息接口
 * 表示单个证书的完整信息
 */
export interface CertificateInfo {
  /** 证书 ID（可选，新建时为空） */
  _id?: string;
  /** 用户 ID */
  uid: number;
  /** 用户名 */
  username?: string;
  /** 证书名称 */
  certificateName: string;
  /** 颁发机构 */
  certifyingBody: string;
  /** 证书所属预设 ID（可选） */
  presetId?: string;
  /** 证书分类 */
  category: string;
  /** 证书等级（可选） */
  level?: string;
  /** 证书分数（可选） */
  score?: number;
  /** 赛考类型 */
  examType?: 'competition' | 'certification';
  /** 竞赛名称（仅竞赛类型） */
  competitionName?: string;
  /** 考级系列（仅考级类型） */
  certificationSeries?: string;
  /** 权重值（已弃用，使用 calculatedWeight） */
  weight?: number;
  /** 计算得出的权重值 */
  calculatedWeight?: number;
  /** 权重计算详情 */
  weightBreakdown?: {
    baseWeight: number;
    levelFactor: number;
    awardFactor: number;
    typeFactor: number;
    calculation: string;
  };
  /** 颁发日期 */
  issueDate: string | Date;
  /** 过期日期（可选） */
  expiryDate?: string | Date;
  /** 证书图片 URL（可选） */
  certificateImageUrl?: string;
  /** 证书图片 key（七牛云存储 key，可选） */
  certificateImageKey?: string;
  /** 备注（可选） */
  notes?: string;
  /** 证书状态（active, expired, revoked 等） */
  status?: string;
  /** 证书记录时间（可选） */
  recordedAt?: string | Date;
  /** 证书创建时间（可选） */
  createdAt?: string | Date;
}

/**
 * 证书管理页面数据模型
 */
export interface CertificateManagementData {
  /** 所有证书列表 */
  certificates: CertificateInfo[];
  /** 证书总数 */
  totalCertificates: number;
  /** 证书分类统计 */
  categoryStats: Record<string, number>;
  /** 当前用户是否有管理权限 */
  canManage: boolean;
}

// ============================================================================
// 🔄 API 响应接口
// ============================================================================

/**
 * 通用 API 成功响应
 */
export interface ApiSuccessResponse<T = any> {
  /** 操作是否成功 */
  success: true;
  /** 返回的数据 */
  data?: T;
  /** 成功消息 */
  message?: string;
}

/**
 * 通用 API 错误响应
 */
export interface ApiErrorResponse {
  /** 操作是否成功 */
  success: false;
  /** 错误消息 */
  error: string;
}

/**
 * 通用 API 响应类型
 */
export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================================================
// ⚙️ 应用状态接口
// ============================================================================

/**
 * 应用状态管理接口
 * 用于组件间状态管理
 */
export interface AppState {
  /** 是否正在加载 */
  isLoading: boolean;
  /** 是否有错误 */
  hasError: boolean;
  /** 错误消息（如果有） */
  errorMessage?: string;
}

// ============================================================================
// 🎯 组件属性接口
// ============================================================================

/**
 * 统计卡片组件属性
 */
export interface StatCardProps {
  /** 卡片标题 */
  title: string;
  /** 卡片数值 */
  value: string | number;
  /** 副标题（可选） */
  subtitle?: string;
  /** 卡片图标（可选） */
  icon?: string;
}

// 注：所有类型/接口都通过 export interface 或 export type 在定义处导出
