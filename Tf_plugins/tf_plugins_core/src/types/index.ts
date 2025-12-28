// Types and module augmentation for tf_plugins_core
import { ScoreCoreService } from '../services/ScoreCoreService';

declare module 'hydrooj' {
    interface Context {
        // Optional provider - prefer using ctx.inject rather than direct property access
        scoreCore?: ScoreCoreService;
    }

    interface EventMap {
        'typing/bonus-awarded': (data: { uid: number, domainId: string, bonus: number, reason: string, recordId?: any }) => void;
        'turtle/work-coined': (data: { fromUid: number, toUid: number, domainId: string, workId: string, workTitle: string, amount: number }) => void;
        'certificate/created': (data: { uid: number, domainId: string, certificateId: any, weight: number, certificateName: string }) => void;
    }
}

export {};
