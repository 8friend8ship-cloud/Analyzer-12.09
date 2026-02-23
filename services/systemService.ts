
import { getRawItem, set } from './cacheService';

export interface SystemLog {
    time: string;
    user: string;
    action: string;
    status: string;
}

export interface ReportedIssue {
    id: number;
    time: string;
    user: string;
    message: string;
    status: 'Pending' | 'Resolved';
}

const LOGS_CACHE_KEY = 'system_logs';
const ISSUES_CACHE_KEY = 'reported_issues';

export const getSystemLogs = (): SystemLog[] => {
    const cached = getRawItem<SystemLog[]>(LOGS_CACHE_KEY);
    if (cached) return cached.data;
    
    const initialLogs: SystemLog[] = [
        { time: new Date().toISOString().replace('T', ' ').split('.')[0], user: 'system', action: 'System Initialized', status: 'Success' }
    ];
    set(LOGS_CACHE_KEY, initialLogs);
    return initialLogs;
};

export const addSystemLog = (log: Omit<SystemLog, 'time'>) => {
    const logs = getSystemLogs();
    const newLog = {
        ...log,
        time: new Date().toISOString().replace('T', ' ').split('.')[0]
    };
    set(LOGS_CACHE_KEY, [newLog, ...logs].slice(0, 50));
};

export const getReportedIssues = (): ReportedIssue[] => {
    const cached = getRawItem<ReportedIssue[]>(ISSUES_CACHE_KEY);
    if (cached) return cached.data;
    
    const initialIssues: ReportedIssue[] = [
        { id: 1, time: '2026-02-21 01:25:10', user: 'demo@user.com', message: '인기차트 채널 분석이 안됩니다.', status: 'Pending' }
    ];
    set(ISSUES_CACHE_KEY, initialIssues);
    return initialIssues;
};

export const reportIssue = (user: string, message: string) => {
    const issues = getReportedIssues();
    const newIssue: ReportedIssue = {
        id: issues.length > 0 ? Math.max(...issues.map(i => i.id)) + 1 : 1,
        time: new Date().toISOString().replace('T', ' ').split('.')[0],
        user,
        message,
        status: 'Pending'
    };
    set(ISSUES_CACHE_KEY, [newIssue, ...issues]);
    
    addSystemLog({
        user,
        action: 'Issue Reported',
        status: 'Success'
    });
};

export const resolveIssue = (id: number) => {
    const issues = getReportedIssues();
    const updatedIssues = issues.map(issue => 
        issue.id === id ? { ...issue, status: 'Resolved' as const } : issue
    );
    set(ISSUES_CACHE_KEY, updatedIssues);
    
    addSystemLog({
        user: 'admin',
        action: `Issue #${id} Resolved`,
        status: 'Success'
    });
};
