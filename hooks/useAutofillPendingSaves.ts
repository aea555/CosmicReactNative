import { Secret, api } from '@/services/api';
import { getPendingSaves, removeFromPendingSaves } from '@/services/autofillSync';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

export const useAutoProcessPendingSaves = (secrets: Secret[]) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const queryClient = useQueryClient();
    const lastProcessTime = useRef<number>(0);
    const MIN_PROCESS_INTERVAL = 5000; // 5 seconds cooldown

    const processQueue = useCallback(async () => {
        // Debounce: Don't process if we just processed
        const now = Date.now();
        if (now - lastProcessTime.current < MIN_PROCESS_INTERVAL) {
            return;
        }

        if (isProcessing) return;
        setIsProcessing(true);
        lastProcessTime.current = now;

        try {
            const saves = await getPendingSaves();
            if (saves.length === 0) {
                setIsProcessing(false);
                return;
            }

            console.log(`[Autofill] Processing ${saves.length} pending saves`);
            let secretsUpdated = false;

            for (const save of saves) {
                // Heuristic Logic: Find matching secrets
                // For web forms (webDomain set): match by domain against URL
                // For native apps: match by package name against title
                const hasWebDomain = save.webDomain && save.webDomain.length > 0;

                const matches = secrets.filter(s => {
                    if (hasWebDomain) {
                        // Web form matching: check if URL contains the domain
                        const url = s.url?.toLowerCase() || '';
                        const domain = save.webDomain!.toLowerCase();
                        return url.includes(domain) || domain.includes(url.replace('https://', '').replace('http://', '').replace('www.', ''));
                    } else {
                        // Native app matching: check if title contains package name
                        const title = s.title?.toLowerCase() || '';
                        const pkg = save.packageName.toLowerCase();
                        return title.includes(`(${pkg})`) || s.url?.toLowerCase().includes(pkg);
                    }
                });

                // 1. Exact Match - Skip (already saved)
                const exactMatch = matches.find(s =>
                    s.username === save.username && s.password === save.password
                );
                if (exactMatch) {
                    console.log(`[Autofill] Exact match found, skipping: ${save.packageName}`);
                    await removeFromPendingSaves(save);
                    continue;
                }

                try {
                    // 2. Update Match - Same Username, Diff Password
                    const usernameMatch = matches.find(s => s.username === save.username);

                    if (usernameMatch) {
                        await api.updateSecret(usernameMatch.id, {
                            title: usernameMatch.title,
                            username: usernameMatch.username,
                            password: save.password,
                            url: usernameMatch.url,
                            email: usernameMatch.email,
                            telephone_number: usernameMatch.telephone_number
                        });
                        console.log(`[Autofill] Updated password for ${save.packageName}`);
                    } else {
                        // 3. New Secret
                        // If webDomain exists, it's a web form - use domain as URL
                        // Otherwise it's a native app - include package name in title
                        const hasWebDomain = save.webDomain && save.webDomain.length > 0;

                        let title: string;
                        let url: string | undefined;

                        if (hasWebDomain) {
                            // Web form: use domain as title and URL
                            title = save.webDomain!;
                            url = `https://${save.webDomain}`;
                        } else {
                            // Native app: include package name in title for matching
                            const appName = extractAppName(save.packageName);
                            title = `${appName} (${save.packageName})`;
                        }

                        await api.createSecret({
                            title,
                            username: save.username,
                            password: save.password,
                            url,
                        });
                        console.log(`[Autofill] Created new secret: ${title}${url ? ` (${url})` : ''}`);
                    }

                    await removeFromPendingSaves(save);
                    secretsUpdated = true;

                } catch (err: any) {
                    console.error(`[Autofill] Failed to save/update ${save.packageName}:`, err?.message || err);

                    // Remove from queue even on error to prevent infinite retry spam
                    // User can manually add credentials if needed
                    await removeFromPendingSaves(save);
                }
            }

            if (secretsUpdated) {
                await queryClient.invalidateQueries({ queryKey: ['secrets'] });
            }

        } catch (error) {
            console.error('[Autofill] Error processing queue', error);
        } finally {
            setIsProcessing(false);
        }
    }, [secrets, isProcessing, queryClient]);

    // Monitor AppState to trigger processing when user returns to app
    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'active') {
                processQueue();
            }
        });

        // Trigger on mount too (with a small delay to ensure secrets are loaded)
        const timer = setTimeout(() => processQueue(), 1000);

        return () => {
            subscription.remove();
            clearTimeout(timer);
        };
    }, [processQueue]);

    return { isProcessing };
};

// Helper to extract friendly app name from package name
function extractAppName(packageName: string): string {
    // "com.android.chrome" -> "Chrome"
    // "com.twitter.android" -> "Twitter"
    const parts = packageName.split('.');
    if (parts.length >= 2) {
        const lastPart = parts[parts.length - 1];
        const secondLast = parts[parts.length - 2];

        // If last part is "android", use the one before
        const name = lastPart.toLowerCase() === 'android' ? secondLast : lastPart;

        // Capitalize first letter
        return name.charAt(0).toUpperCase() + name.slice(1);
    }
    return packageName;
}
