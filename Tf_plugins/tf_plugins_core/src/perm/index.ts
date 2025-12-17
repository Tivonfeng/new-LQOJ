export * from './score';

// 预留：将来可以在这里聚合 analytics / ai 等其他权限模块
export function registerTfPerms() {
    // 目前只注册积分相关权限
    // 将来可在这里按需调用 registerXxxPerms()
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { registerScorePerms } = require('./score') as typeof import('./score');
    registerScorePerms();
}


