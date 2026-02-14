/**
 * API Service with automatic token refresh and error handling
 */

import { API_BASE_URL } from '@/config';

interface ApiOptions extends RequestInit {
    requiresAuth?: boolean;
    requiresMasterPassword?: boolean;
}

interface ApiError {
    success: false;
    error: string;
    code: string;
}

interface ApiSuccess<T> {
    success: true;
    data: T;
    message?: string;
}

type ApiResponse<T> = ApiSuccess<T> | ApiError;

class ApiService {
    private accessToken: string | null = null;
    private masterPassword: string | null = null;

    setAccessToken(token: string | null) {
        this.accessToken = token;
    }

    setMasterPassword(password: string | null) {
        this.masterPassword = password;
    }

    async request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
        const { requiresAuth = true, requiresMasterPassword = false, ...fetchOptions } = options;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(fetchOptions.headers as Record<string, string>),
        };

        if (requiresAuth && this.accessToken) {
            headers['Authorization'] = `Bearer ${this.accessToken}`;
        }

        if (requiresMasterPassword && this.masterPassword) {
            headers['X-Master-Password'] = this.masterPassword;
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...fetchOptions,
            headers,
        });

        // Handle 401 - try to refresh token
        if (response.status === 401 && requiresAuth) {
            let errorData: any = {};
            try {
                errorData = await response.json();
            } catch (e) {
                // response might be empty or text
            }

            // Only attempt refresh if strict code match or strict 401 behavior required
            // We specifically look for "INVALID_TOKEN" or generic 401s if no code provided
            const isInvalidToken = errorData.code === 'INVALID_TOKEN' || response.status === 401;

            if (isInvalidToken) {
                const newToken = await this.attemptTokenRefresh();

                if (newToken) {
                    // Retry the original request with new token
                    this.setAccessToken(newToken); // Update internal state potentially
                    headers['Authorization'] = `Bearer ${newToken}`;
                    const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
                        ...fetchOptions,
                        headers,
                    });

                    if (!retryResponse.ok) {
                        const retryData = await retryResponse.json();
                        // If retry fails with same error, then we really logout
                        if (retryResponse.status === 401) {
                            await this.handleRefreshFailure();
                            throw new ApiRequestError('Session expired', 'SESSION_EXPIRED');
                        }
                        throw new ApiRequestError(retryData.error || 'Request failed', retryData.code);
                    }

                    return retryResponse.json().then(d => d.data || d);
                } else {
                    // Refresh failed - logout user silently (app will redirect)
                    await this.handleRefreshFailure();
                    // We throw a specific error that UI can ignore or show as "Logged out"
                    throw new ApiRequestError('Session expired. Please log in again.', 'SESSION_EXPIRED');
                }
            } else {
                throw new ApiRequestError(errorData.error || 'Authentication failed', errorData.code);
            }
        }

        const data: ApiResponse<T> = await response.json();

        if (!response.ok) {
            throw new ApiRequestError((data as ApiError).error || 'Request failed', (data as ApiError).code);
        }

        if ('data' in data) {
            return data.data;
        }

        return data as unknown as T;
    }

    private refreshPromise: Promise<string | null> | null = null;

    private async attemptTokenRefresh(): Promise<string | null> {
        if (this.refreshPromise) {
            return this.refreshPromise;
        }

        this.refreshPromise = (async () => {
            const refreshFn = (globalThis as any).__cosmicRefreshTokens;
            const setRefreshing = (globalThis as any).__cosmicSetRefreshing;

            if (!refreshFn) return null;

            try {
                setRefreshing?.(true);
                const token = await refreshFn();
                return token;
            } catch {
                return null;
            } finally {
                setRefreshing?.(false);
                this.refreshPromise = null;
            }
        })();

        return this.refreshPromise;
    }

    private async handleRefreshFailure(): Promise<void> {
        const logout = (globalThis as any).__cosmicLogout;
        if (logout) {
            console.log('Refresh failed, logging out...');
            await logout();
        }
    }

    // Secrets API
    async getSecrets() {
        return this.request<Secret[]>('/api/v1/secrets', {
            requiresMasterPassword: true,
        });
    }

    async getSecret(id: string) {
        return this.request<Secret>(`/api/v1/secrets/${id}`, {
            requiresMasterPassword: true,
        });
    }

    async createSecret(secret: CreateSecretRequest) {
        return this.request<Secret>('/api/v1/secrets', {
            method: 'POST',
            body: JSON.stringify(secret),
            requiresMasterPassword: true,
        });
    }

    async updateSecret(id: string, secret: CreateSecretRequest) {
        return this.request<Secret>(`/api/v1/secrets/${id}`, {
            method: 'PUT',
            body: JSON.stringify(secret),
            requiresMasterPassword: true,
        });
    }

    async deleteSecret(id: string) {
        return this.request<void>(`/api/v1/secrets/${id}`, {
            method: 'DELETE',
            requiresMasterPassword: true,
        });
    }

    async favoriteSecret(id: string) {
        return this.request<void>(`/api/v1/secrets/${id}/favorite`, {
            method: 'PUT',
            requiresMasterPassword: true,
        });
    }

    async unfavoriteSecret(id: string) {
        return this.request<void>(`/api/v1/secrets/${id}/unfavorite`, {
            method: 'PUT',
            requiresMasterPassword: true,
        });
    }

    // Notes API
    async getNotes() {
        return this.request<Note[]>('/api/v1/notes', {
            requiresMasterPassword: true,
        });
    }

    async getNote(id: string) {
        return this.request<Note>(`/api/v1/notes/${id}`, {
            requiresMasterPassword: true,
        });
    }

    async createNote(note: CreateNoteRequest) {
        return this.request<Note>('/api/v1/notes', {
            method: 'POST',
            body: JSON.stringify(note),
            requiresMasterPassword: true,
        });
    }

    async updateNote(id: string, note: CreateNoteRequest) {
        return this.request<Note>(`/api/v1/notes/${id}`, {
            method: 'PUT',
            body: JSON.stringify(note),
            requiresMasterPassword: true,
        });
    }

    async deleteNote(id: string) {
        return this.request<void>(`/api/v1/notes/${id}`, {
            method: 'DELETE',
            requiresMasterPassword: true,
        });
    }

    async favoriteNote(id: string) {
        return this.request<void>(`/api/v1/notes/${id}/favorite`, {
            method: 'PUT',
            requiresMasterPassword: true,
        });
    }

    async unfavoriteNote(id: string) {
        return this.request<void>(`/api/v1/notes/${id}/unfavorite`, {
            method: 'PUT',
            requiresMasterPassword: true,
        });
    }

    // Bulk Operations
    async bulkCreate(data: { items: Array<{ item_type: 'secret' | 'note', data: any }> }) {
        return this.request<void>('/api/v1/items/bulk-create', {
            method: 'POST',
            body: JSON.stringify(data),
            requiresMasterPassword: true,
        });
    }

    async bulkDelete(items: Array<{ id: string; item_type: 'secret' | 'note' }>) {
        return this.request<void>('/api/v1/items/bulk-delete', {
            method: 'DELETE',
            body: JSON.stringify({ items }),
            requiresMasterPassword: true,
        });
    }

    async bulkFavorite(items: Array<{ id: string; item_type: 'secret' | 'note' }>) {
        return this.request<void>('/api/v1/items/bulk-favorite', {
            method: 'PUT',
            body: JSON.stringify({ items }),
            requiresMasterPassword: true,
        });
    }

    async bulkUnfavorite(items: Array<{ id: string; item_type: 'secret' | 'note' }>) {
        return this.request<void>('/api/v1/items/bulk-unfavorite', {
            method: 'PUT',
            body: JSON.stringify({ items }),
            requiresMasterPassword: true,
        });
    }

    // Account Management
    async changeEmailRequest(newEmail: string, refreshToken: string) {
        return this.request<void>('/api/v1/account/change-email-request', {
            method: 'POST',
            body: JSON.stringify({ new_email: newEmail, refresh_token: refreshToken }),
            requiresAuth: true,
            requiresMasterPassword: true,
        });
    }

    async changeEmailConfirm(otp: string, refreshToken: string) {
        return this.request<void>('/api/v1/account/change-email', {
            method: 'PUT',
            body: JSON.stringify({ otp, refresh_token: refreshToken }),
            requiresAuth: true,
            requiresMasterPassword: true,
        });
    }

    async deleteAccountRequest(refreshToken: string) {
        return this.request<void>('/api/v1/account/delete-request', {
            method: 'POST',
            body: JSON.stringify({ refresh_token: refreshToken }),
            requiresAuth: true,
            requiresMasterPassword: true,
        });
    }

    async deleteAccountConfirm(otp: string, refreshToken: string) {
        return this.request<void>('/api/v1/account', {
            method: 'DELETE',
            body: JSON.stringify({ otp, refresh_token: refreshToken }),
            requiresAuth: true,
            requiresMasterPassword: true,
        });
    }
}

export const api = new ApiService();

// Custom Error class
export class ApiRequestError extends Error {
    code: string;

    constructor(message: string, code: string) {
        super(message);
        this.code = code;
        this.name = 'ApiRequestError';
    }
}

// Types
export interface Secret {
    id: string;
    title: string;
    username?: string;
    email?: string;
    password?: string;
    url?: string;
    telephone_number?: string;
    created_at: string;
    updated_at: string;
    is_favorite?: boolean;
}

export interface CreateSecretRequest {
    title: string;
    username?: string;
    email?: string;
    password?: string;
    url?: string;
    telephone_number?: string;
}

export interface Note {
    id: string;
    title: string;
    content?: string;
    created_at: string;
    updated_at: string;
    is_favorite?: boolean;
}

export interface CreateNoteRequest {
    title: string;
    content?: string;
}
