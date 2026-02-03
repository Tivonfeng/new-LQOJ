/**
 * 红包模块类型定义
 */

// 红包类型
export const RedEnvelopeType = {
    RANDOM: 'random' as const, // 随机分配
    AVERAGE: 'average' as const, // 平均分配
} as const;

export type RedEnvelopeType = typeof RedEnvelopeType[keyof typeof RedEnvelopeType];

// 红包状态
export const RedEnvelopeStatus = {
    ACTIVE: 'active' as const, // 进行中
    COMPLETED: 'completed' as const, // 已领完
    EXPIRED: 'expired' as const, // 已过期
} as const;

export type RedEnvelopeStatus = typeof RedEnvelopeStatus[keyof typeof RedEnvelopeStatus];

// 红包记录类型
export const RedEnvelopeCategory = {
    RED_ENVELOPE_SEND: '发红包' as const,
    RED_ENVELOPE_CLAIM: '抢红包' as const,
    RED_ENVELOPE_REFUND: '红包退款' as const,
} as const;

export type RedEnvelopeCategory = typeof RedEnvelopeCategory[keyof typeof RedEnvelopeCategory];

// 红包基本信息
export interface RedEnvelope {
    _id?: any;
    envelopeId: string; // 红包ID
    senderUid: number; // 发送者ID
    senderName: string; // 发送者名称
    senderDisplayName?: string; // 发送者显示名称
    totalAmount: number; // 总金额（积分）
    totalCount: number; // 红包总数
    remainingAmount: number; // 剩余金额
    remainingCount: number; // 剩余数量
    message: string; // 祝福语
    type: RedEnvelopeType; // 红包类型
    domainId: string; // 域ID
    createdAt: Date; // 创建时间
    expiredAt: Date; // 过期时间
    status: RedEnvelopeStatus; // 状态
}

// 红包领取记录
export interface RedEnvelopeClaim {
    _id?: any;
    envelopeId: string; // 关联红包ID
    claimerUid: number; // 领取者ID
    claimerName: string; // 领取者名称
    claimerDisplayName?: string; // 领取者显示名称
    amount: number; // 领取金额
    createdAt: Date; // 领取时间
    domainId: string; // 域ID
}

// 创建红包请求参数
export interface CreateRedEnvelopeParams {
    totalAmount: number; // 总金额
    totalCount: number; // 红包数量
    message: string; // 祝福语
    type: RedEnvelopeType; // 红包类型
    expireHours?: number; // 过期时间（小时），默认24小时
}

// 创建红包结果
export interface CreateRedEnvelopeResult {
    success: boolean;
    envelopeId?: string;
    error?: string;
}

// 领取红包结果
export interface ClaimRedEnvelopeResult {
    success: boolean;
    amount?: number;
    error?: string;
    envelopeStatus?: RedEnvelopeStatus;
}

// 红包详情（API返回）
export interface RedEnvelopeDetail extends Omit<RedEnvelope, 'createdAt' | 'expiredAt'> {
    createdAt: string;
    expiredAt: string;
    claims: Array<{
        claimerUid: number;
        claimerName: string;
        claimerDisplayName?: string;
        amount: number;
        createdAt: string;
    }>;
    isExpired: boolean;
    canClaim: boolean;
    userHasClaimed: boolean;
    userClaimAmount?: number;
}

// 红包简要信息（WebSocket推送用）
export interface RedEnvelopeBrief {
    envelopeId: string;
    senderName: string;
    senderDisplayName?: string;
    message: string;
    remainingCount: number;
    totalAmount: number;
}

// 红包统计信息
export interface RedEnvelopeStats {
    totalSent: number; // 发送总数
    totalAmount: number; // 发送总金额
    totalClaims: number; // 领取总次数
    totalClaimed: number; // 领取总金额
}
