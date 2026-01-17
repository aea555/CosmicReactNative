import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api-cosmic.clbio.org';

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
        if (!refreshToken) return false;

        const delays = [1000, 2000, 5000];

        for (let attempt = 0; attempt < delays.length + 1; attempt++) {
            try {
                const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh_token: refreshToken }),
                });

                const data = await response.json();

                if (response.ok) {
                    await saveTokens({
                        accessToken: data.data.access_token,
                        refreshToken: data.data.refresh_token,
                        expiresIn: data.data.expires_in,
                    });
                    return true;
                }

                // If token is expired or invalid, don't retry
                if (data.code === 'TOKEN_REUSED' || data.code === 'TOKEN_EXPIRED') {
                    return false;
                }
            } catch (error) {
                console.error(`Refresh attempt ${attempt + 1} failed:`, error);
            }

            // Wait before next attempt (except on last attempt)
            if (attempt < delays.length) {
                await new Promise(resolve => setTimeout(resolve, delays[attempt]));
            }
        }

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

// Error message mapping
function getErrorMessage(code: string | undefined, fallback: string): string {
    const messages: Record<string, string> = {
        'INVALID_CREDENTIALS': 'Invalid email or password',
        'INVALID_TOKEN': 'Session expired. Please log in again',
        'MASTER_PASSWORD_REQUIRED': 'Master password is required',
        'EMAIL_NOT_VERIFIED': 'Please verify your email first',
        'RATE_LIMITED': 'Too many attempts. Please wait a moment',
        'USER_EXISTS': 'An account with this email already exists',
        'SECRET_NOT_FOUND': 'Item not found',
        'NOTE_NOT_FOUND': 'Note not found',
        'VALIDATION_ERROR': 'Please check your input and try again',
        'INTERNAL_ERROR': 'Something went wrong. Please try again later',
        'INVALID_VERIFICATION_TOKEN': 'Verification link is invalid or expired',
        'TOKEN_REUSED': 'Security alert: Please log in again',
        'TOKEN_EXPIRED': 'Session expired. Please log in again',
    };

    return messages[code || ''] || fallback || 'Something went wrong. Please try again.';
}

export { API_BASE_URL };
