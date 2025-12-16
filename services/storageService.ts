
import type { AppSettings, User } from '../types';

const SETTINGS_KEY = 'content_os_settings';
const USERS_KEY = 'content_os_users';

// --- Settings Management ---

export const getStoredSettings = (defaults: AppSettings): AppSettings => {
    try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        if (!stored) return defaults;
        
        const parsed = JSON.parse(stored);
        // Merge with defaults to ensure new fields are present if schema changes
        return {
            ...defaults,
            ...parsed,
            apiKeys: { ...defaults.apiKeys, ...parsed.apiKeys },
            plans: { ...defaults.plans, ...parsed.plans }
        };
    } catch (e) {
        console.error("Failed to load settings", e);
        return defaults;
    }
};

export const saveStoredSettings = (settings: AppSettings) => {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
        console.error("Failed to save settings", e);
    }
};

// --- User Management ---

export const getStoredUsers = (): User[] => {
    try {
        const stored = localStorage.getItem(USERS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error("Failed to load users", e);
        return [];
    }
};

export const saveStoredUsers = (users: User[]) => {
    try {
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    } catch (e) {
        console.error("Failed to save users", e);
    }
};

export const upsertUser = (user: User) => {
    const users = getStoredUsers();
    const index = users.findIndex(u => u.id === user.id);
    
    if (index >= 0) {
        // Update existing
        users[index] = { ...users[index], ...user };
    } else {
        // Insert new
        users.push(user);
    }
    saveStoredUsers(users);
    return user;
};

export const findUserByEmail = (email: string): User | undefined => {
    const users = getStoredUsers();
    return users.find(u => u.email === email);
};
