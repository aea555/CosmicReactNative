import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

// Auth states
export type AuthState = 'NOT_AUTHENTICATED' | 'AUTHENTICATED' | 'WAITING_FOR_VERIFICATION';

interface Tokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

interface AuthContextType {
    authState: AuthState;
    isLoading: boolean;
    masterPassword: string | null;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    verifyEmail: (token: string) => Promise<void>;
    setMasterPassword: (password: string) => void;
    clearMasterPassword: () => void;
    getAccessToken: () => string | null;
    isRefreshing: boolean;
    setIsRefreshing: (value: boolean) => void;
    refreshTokens: () => Promise<boolean>;
}



const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACCESS_TOKEN_KEY = 'cosmic_access_token';
const REFRESH_TOKEN_KEY = 'cosmic_refresh_token';

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [authState, setAuthState] = useState<AuthState>('NOT_AUTHENTICATED');
    const [isLoading, setIsLoading] = useState(true);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [refreshToken, setRefreshToken] = useState<string | null>(null);
    const [masterPassword, setMasterPasswordState] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const { t } = useTranslation();

    // Error message mapping
    const getErrorMessage = (code: string | undefined, fallback: string): string => {
        const messages: Record<string, string> = {
            'INVALID_CREDENTIALS': t('errors.invalidCredentials'),
            'INVALID_TOKEN': t('errors.sessionExpired'),
            'MASTER_PASSWORD_REQUIRED': t('errors.masterPasswordRequired'),
            'EMAIL_NOT_VERIFIED': t('errors.emailNotVerified'),
            'RATE_LIMITED': t('errors.rateLimited'),
            'USER_EXISTS': t('errors.userExists'),
            'SECRET_NOT_FOUND': t('errors.secretNotFound'),
            'NOTE_NOT_FOUND': t('errors.noteNotFound'),
            'VALIDATION_ERROR': t('errors.validationError'),
            'INTERNAL_ERROR': t('errors.internalError'),
            'INVALID_VERIFICATION_TOKEN': t('errors.invalidVerificationToken'),
            'TOKEN_REUSED': t('errors.tokenReused'),
            'TOKEN_EXPIRED': t('errors.tokenExpired'),
        };

        return messages[code || ''] || fallback || t('errors.default');
    };

    // Load tokens on mount
    useEffect(() => {
        async function loadTokens() {
            try {
                const storedAccessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
                const storedRefreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

                if (storedAccessToken && storedRefreshToken) {
                    setAccessToken(storedAccessToken);
                    setRefreshToken(storedRefreshToken);
                    setAuthState('AUTHENTICATED');
                }
            } catch (error) {
                console.error('Failed to load tokens:', error);
            } finally {
                setIsLoading(false);
            }
        }

        loadTokens();
    }, []);

    const saveTokens = async (tokens: Tokens) => {
        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken);
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
        setAccessToken(tokens.accessToken);
        setRefreshToken(tokens.refreshToken);
    };

    const clearTokens = async () => {
        await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
        setAccessToken(null);
        setRefreshToken(null);
        setMasterPasswordState(null);
    };

    const login = async (email: string, password: string) => {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(getErrorMessage(data.code, data.error));
        }

        await saveTokens({
            accessToken: data.data.access_token,
            refreshToken: data.data.refresh_token,
            expiresIn: data.data.expires_in,
        });

        // Store master password in memory for vault operations
        setMasterPasswordState(password);
        setAuthState('AUTHENTICATED');
    };

    const register = async (email: string, password: string) => {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(getErrorMessage(data.code, data.error));
        }

        setAuthState('WAITING_FOR_VERIFICATION');
    };

    const verifyEmail = async (token: string) => {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/verify-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(getErrorMessage(data.code, data.error));
        }

        // Success - user should now login
    };

    const logout = async () => {
        try {
            if (refreshToken) {
                await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh_token: refreshToken }),
                });
            }
        } catch (error) {
            console.error('Logout API error:', error);
        } finally {
            await clearTokens();
            setAuthState('NOT_AUTHENTICATED');
            router.replace('/(auth)/landing');
        }
    };

    const refreshTokens = useCallback(async (): Promise<boolean> => {
        // Guard: no token or empty token
        if (!refreshToken || refreshToken.trim() === '') {
            console.warn('refreshTokens: No valid refresh token available');
            return false;
        }

        const delays = [1000, 2000, 5000];

        for (let attempt = 0; attempt < delays.length + 1; attempt++) {
            try {
                const requestUrl = `${API_BASE_URL}/api/v1/auth/refresh`;
                const requestBody = { refresh_token: refreshToken };

                console.log('=== Token Refresh Request ===');
                console.log('URL:', requestUrl);
                console.log('Body:', JSON.stringify(requestBody, null, 2));

                const response = await fetch(requestUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody),
                });

                const responseText = await response.text();

                console.log('=== Token Refresh Response ===');
                console.log('Status:', response.status, response.statusText);
                console.log('Body:', responseText);

                // Try to parse as JSON
                let data;
                try {
                    data = JSON.parse(responseText);
                } catch (parseError) {
                    console.error('Failed to parse response as JSON:', parseError);
                    throw new Error(`Non-JSON response: ${responseText.substring(0, 200)}`);
                }

                if (response.ok && data.success) {
                    await saveTokens({
                        accessToken: data.data.access_token,
                        refreshToken: data.data.refresh_token,
                        expiresIn: data.data.expires_in,
                    });
                    console.log('Token refresh successful');
                    return true;
                }

                // Non-retriable errors - don't attempt again
                const nonRetriableErrors = [
                    'TOKEN_REUSED',
                    'TOKEN_EXPIRED',
                    'INVALID_TOKEN',
                    'VALIDATION_ERROR',
                    'INVALID_REQUEST_BODY',
                ];

                if (nonRetriableErrors.includes(data.code)) {
                    console.warn(`Token refresh failed with non-retriable error: ${data.code} - ${data.error}`);
                    return false;
                }

                // For other errors, continue to retry
                console.warn(`Token refresh attempt ${attempt + 1} failed: ${data.code} - ${data.error}`);
            } catch (error) {
                console.error(`Refresh attempt ${attempt + 1} failed with exception:`, error);
            }

            // Wait before next attempt (except on last attempt)
            if (attempt < delays.length) {
                await new Promise(resolve => setTimeout(resolve, delays[attempt]));
            }
        }

        console.warn('Token refresh exhausted all retries');
        return false;
    }, [refreshToken]);


    // Expose refresh function for API service
    useEffect(() => {
        (globalThis as any).__cosmicRefreshTokens = refreshTokens;
        (globalThis as any).__cosmicSetRefreshing = setIsRefreshing;
        (globalThis as any).__cosmicLogout = logout;

        return () => {
            delete (globalThis as any).__cosmicRefreshTokens;
            delete (globalThis as any).__cosmicSetRefreshing;
            delete (globalThis as any).__cosmicLogout;
        };
    }, [refreshTokens]);

    const setMasterPassword = (password: string) => {
        setMasterPasswordState(password);
    };

    const clearMasterPassword = () => {
        setMasterPasswordState(null);
    };

    const getAccessToken = () => accessToken;

    return (
        <AuthContext.Provider
            value={{
                authState,
                isLoading,
                masterPassword,
                login,
                register,
                logout,
                verifyEmail,
                setMasterPassword,
                clearMasterPassword,
                getAccessToken,
                isRefreshing,
                setIsRefreshing,
                refreshTokens,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export { API_BASE_URL };
