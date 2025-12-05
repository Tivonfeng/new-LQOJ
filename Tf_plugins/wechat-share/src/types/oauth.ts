export interface OAuthCallbackParams {
    state: string;
    code: string;
}

export interface OAuthTokenData {
    redirect?: string;
    [key: string]: any;
}
