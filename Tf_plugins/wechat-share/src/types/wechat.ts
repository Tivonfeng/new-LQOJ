export interface WechatToken {
    access_token: string;
    expires_in: number;
    expires_at: number;
}

export interface WechatTicket {
    ticket: string;
    expires_in: number;
    expires_at: number;
}

export interface JSSDKConfig {
    appId: string;
    timestamp: number;
    nonceStr: string;
    signature: string;
}

export interface WechatConfig {
    appId: string;
    appSecret: string;
    domain: string; // 主域名，用于向后兼容
    domains?: string[]; // 多个授权域名
}

export interface WechatOAuthToken {
    access_token: string;
    expires_in: number;
    refresh_token: string;
    openid: string;
    scope: string;
    unionid?: string;
}

export interface WechatUserInfo {
    openid: string;
    nickname: string;
    sex: number;
    province: string;
    city: string;
    country: string;
    headimgurl: string;
    privilege: string[];
    unionid?: string;
    email?: string; // 邮箱（可选）
}

// 微信错误码枚举
export enum WechatErrorCode {
    INVALID_ACCESS_TOKEN = 40001,
    ACCESS_TOKEN_EXPIRED = 42001,
    INVALID_CODE = 40029,
    CODE_USED = 40163,
    INVALID_REFRESH_TOKEN = 40030,
    REFRESH_TOKEN_EXPIRED = 42002,
    INVALID_TEMPLATE_ID = 40037, // 模板ID无效
    API_LIMIT_EXCEEDED = 45009,
    SYSTEM_BUSY = -1,
}

// Token 存储文档（用于数据库持久化）
export interface WechatTokenDoc {
    _id: string; // appId + '_' + type (access_token/jsapi_ticket)
    appId: string;
    type: 'access_token' | 'jsapi_ticket';
    token: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

// OAuth Token 存储文档
export interface WechatOAuthTokenDoc {
    _id: string; // openid
    openid: string;
    unionid?: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

// 接口调用统计
export interface WechatApiCallDoc {
    _id: string; // appId + '_' + date (YYYY-MM-DD)
    appId: string;
    date: string; // YYYY-MM-DD
    apiName: string;
    callCount: number;
    lastCallAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

// 模板消息相关类型
export interface TemplateMessage {
    touser: string; // 接收者 openid
    template_id: string; // 模板ID
    url?: string; // 模板跳转链接
    miniprogram?: {
        appid: string;
        pagepath: string;
    };
    data: Record<string, {
        value: string;
        color?: string;
    }>;
}

export interface TemplateMessageResponse {
    errcode: number;
    errmsg: string;
    msgid?: number; // 消息ID
}

export interface TemplateItem {
    template_id: string;
    title: string;
    primary_industry: string;
    deputy_industry: string;
    content: string;
    example: string;
}

export interface TemplateListResponse {
    errcode: number;
    errmsg: string;
    template_list: TemplateItem[];
}

export interface DeleteTemplateResponse {
    errcode: number;
    errmsg: string;
}
