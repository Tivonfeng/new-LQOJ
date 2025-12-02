export interface RandomNumberConfig {
    min: number;
    max: number;
    count: number;
    allowDuplicate: boolean;
}

export interface ToolsRecord {
    _id?: any;
    domainId: string;
    uid: number;
    toolType: 'random_number' | 'random_name' | 'group' | 'timer';
    config: any;
    result: any;
    createdAt: Date;
}

export interface ToolsConfig {
    enabled: boolean;
    requireTeacherRole: boolean;
    allowedRoles: string[];
}
