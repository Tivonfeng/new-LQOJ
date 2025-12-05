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
