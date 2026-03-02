
export const getSystemLogs = () => {
    return [
        { id: 1, timestamp: new Date().toISOString(), level: 'INFO', message: 'System initialized successfully.' },
        { id: 2, timestamp: new Date().toISOString(), level: 'INFO', message: 'Cache layer connected.' },
        { id: 3, timestamp: new Date().toISOString(), level: 'WARNING', message: 'High latency detected in YouTube API.' },
    ];
};

export const getReportedIssues = () => {
    return [
        { id: 1, user: 'test@user.com', message: 'Search results are slow.', status: 'Open' },
        { id: 2, user: 'admin@corp.com', message: 'UI glitch on mobile view.', status: 'Resolved' },
    ];
};

export const resolveIssue = (id: number) => {
    console.log(`Issue ${id} resolved.`);
};

export const reportIssue = (email: string, message: string) => {
    console.log(`Issue reported by ${email}: ${message}`);
};
