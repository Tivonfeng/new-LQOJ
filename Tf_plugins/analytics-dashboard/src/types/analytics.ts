export interface AnalyticsPhase {
    _id?: any;
    phaseId: string;
    title: string;
    description?: string;
    domainId: string;
    problemIds?: number[];
    tagRules?: string[];
    targets?: {
        minSolved?: number;
        minCoverage?: number;
        deadline?: Date | string;
    };
    contestId?: number;
    createdAt?: Date;
    updatedAt?: Date;
    order?: number;
}

export interface ErrorBreakdown {
    WA?: number;
    TLE?: number;
    CE?: number;
    RE?: number;
    other?: number;
}

export interface AnalyticsPhaseProgress {
    _id?: any;
    uid: number;
    domainId: string;
    phaseId: string;
    solved: number;
    total: number;
    covered: number;
    errorBreakdown: ErrorBreakdown;
    lastSubmitAt?: Date;
    updatedAt?: Date;
    solvedPids?: number[];
}

export interface AnalyticsContestPerf {
    _id?: any;
    uid: number;
    domainId: string;
    cid: number;
    score?: number;
    rank?: number;
    tries?: Record<string, number>;
    timeUsed?: Record<string, number>;
    frozenDiff?: number;
    ratingDelta?: number;
    createdAt?: Date;
}

export interface AnalyticsDailySnapshot {
    _id?: any;
    uid: number;
    domainId: string;
    date: string; // yyyy-mm-dd
    submissions: number;
    accepted: number;
    pointsDelta?: number;
    typingSummary?: {
        avgWpm?: number;
        avgAccuracy?: number;
        sessions?: number;
    };
    createdAt?: Date;
    updatedAt?: Date;
}

export interface AnalyticsTagMastery {
    _id?: any;
    uid: number;
    domainId: string;
    tag: string;
    accepted: number;
    attempts: number;
    recentAcRate?: number;
    updatedAt?: Date;
}
