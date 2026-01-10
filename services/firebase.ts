// FIREBASE SERVICE DINONAKTIFKAN
// Fitur ini telah digantikan oleh penyimpanan lokal (LocalStorage)
// dan fitur Backup/Restore manual via file JSON.

import { TestHistoryItem } from "../types";

export const getUserHistory = async (username: string): Promise<TestHistoryItem[]> => {
    return [];
};

export const saveHistoryToCloud = async (username: string, item: TestHistoryItem) => {
    // No-op
};

export const syncLocalHistoryToCloud = async (username: string, localHistory: TestHistoryItem[]) => {
    // No-op
};

export const isCloudEnabled = () => false;
