import { PERM } from 'hydrooj';

// TF 插件层面的扩展权限位（71n+ 避免与 Hydro 内建冲突）
export const TF_PERM = {
    // 积分系统相关
    PERM_VIEW_SCORE_HALL: 1n << 71n,
    PERM_MANAGE_SCORE: 1n << 72n,
    PERM_USE_SCORE_GAMES: 1n << 73n,
    PERM_REDEEM_SCORE_PRIZES: 1n << 74n,
} as const;

export type TfPermKey = (typeof TF_PERM)[keyof typeof TF_PERM];

interface BuiltinModel {
    Permission: (family: string, key: bigint, desc: string) => any;
    PERMS: any[];
    PERMS_BY_FAMILY: Record<string, any[]>;
}

// 注册积分相关权限到 Hydro 全局权限系统（幂等）
export function registerScorePerms() {
    const { Permission, PERMS, PERMS_BY_FAMILY } = global.Hydro.model.builtin as BuiltinModel;

    // 1) 挂到 PERM 上，便于各插件直接使用 PERM.PERM_xxx
    Object.assign(PERM, TF_PERM);

    // 2) 定义一个权限分组（在 /domain/permission 中显示为一块）
    const tfScorePerms = [
        Permission('tf_perm_score', TF_PERM.PERM_VIEW_SCORE_HALL, 'View score hall'),
        Permission('tf_perm_score', TF_PERM.PERM_MANAGE_SCORE, 'Manage user scores'),
        Permission('tf_perm_score', TF_PERM.PERM_USE_SCORE_GAMES, 'Use score games'),
        Permission('tf_perm_score', TF_PERM.PERM_REDEEM_SCORE_PRIZES, 'Redeem score prizes'),
    ];

    // 3) 追加到 PERMS & PERMS_BY_FAMILY
    PERMS.push(...tfScorePerms);
    (PERMS_BY_FAMILY.tf_perm_score ||= []).push(...tfScorePerms);
}


