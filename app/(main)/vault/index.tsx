import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { NoteItem } from '@/components/vault/NoteItem';
import { SecretItem } from '@/components/vault/SecretItem';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAutoProcessPendingSaves } from '@/hooks/useAutofillPendingSaves';
import { Note, Secret, api } from '@/services/api';
import { syncVaultToAutofill } from '@/services/autofillSync';

import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';



type ItemType = 'secret' | 'note';

// Create query client

function VaultContent() {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const { getAccessToken, masterPassword } = useAuth();
    const router = useRouter();
    const qc = useQueryClient();

    const [searchQuery, setSearchQuery] = useState('');
    const [showSecrets, setShowSecrets] = useState(true);
    const [showNotes, setShowNotes] = useState(true);
    const [editNoteId, setEditNoteId] = useState<string | null>(null);

    // React Query - Secrets
    const {
        data: secrets = [],
        isLoading: secretsLoading,
        refetch: refetchSecrets,
    } = useQuery({
        queryKey: ['secrets'],
        queryFn: async () => {
            console.log('[Vault] Fetching secrets...');
            const data = await api.getSecrets();
            console.log('[Vault] Secrets fetched:', data.length);
            return data;
        },
    });

    useEffect(() => {
        console.log('[Vault] Secrets state updated:', secrets.length);
    }, [secrets]);

    // Autofill - Auto Process Pending Saves (No UI)
    useAutoProcessPendingSaves(secrets);

    // Import State
    const [showImportConfirm, setShowImportConfirm] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0, successCount: 0, skipped: 0 });
    const [importQueue, setImportQueue] = useState<any[]>([]);
    const [importError, setImportError] = useState<{ title: string; error: string } | null>(null);
    const [stopImportRequested, setStopImportRequested] = useState(false);
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
    const [showCreateMenu, setShowCreateMenu] = useState(false);
    const [feedbackModal, setFeedbackModal] = useState<{ visible: boolean; title: string; message: string; type: 'success' | 'error' | 'info' } | null>(null);

    // Get favorites store



    // Modal states
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ type: ItemType; id: string } | null>(null);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editTarget, setEditTarget] = useState<{ type: ItemType; item: Secret | Note } | null>(null);
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [createType, setCreateType] = useState<ItemType>('secret');

    // Selection State
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedSecrets, setSelectedSecrets] = useState<Set<string>>(new Set());
    const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
    const [bulkDeleteConfirmVisible, setBulkDeleteConfirmVisible] = useState(false);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);

    // Form states
    const [formData, setFormData] = useState({
        title: '',
        username: '',
        email: '',
        password: '',
        url: '',
        telephone_number: '',
        content: '',
    });


    // Set up API with tokens
    useEffect(() => {
        const token = getAccessToken();
        if (token) api.setAccessToken(token);
        if (masterPassword) api.setMasterPassword(masterPassword);
    }, [getAccessToken, masterPassword]);



    // Sync to Autofill whenever secrets update
    useEffect(() => {
        if (secrets.length > 0) {
            syncVaultToAutofill(secrets);
        }
    }, [secrets]);

    // React Query - Notes
    const {
        data: notes = [],
        isLoading: notesLoading,
        refetch: refetchNotes,
    } = useQuery({
        queryKey: ['notes'],
        queryFn: async () => {
            console.log('[Vault] Fetching notes...');
            const data = await api.getNotes();
            console.log('[Vault] Notes fetched:', data.length);
            return data;
        },
    });

    useEffect(() => {
        console.log('[Vault] Notes state updated:', notes.length);
    }, [notes]);

    const isLoading = secretsLoading || notesLoading;

    // Mutations
    const createSecretMutation = useMutation({
        mutationFn: (data: Parameters<typeof api.createSecret>[0]) => api.createSecret(data),
        onSuccess: async (newSecret) => {
            console.log('[Mutation] Create secret success, invalidating secrets...', newSecret.id);
            await qc.invalidateQueries({ queryKey: ['secrets'] });
            console.log('[Mutation] Secrets invalidated');
            resetForm();
            setCreateModalVisible(false);
        },
    });

    const updateSecretMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.updateSecret>[1] }) =>
            api.updateSecret(id, data),
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: ['secrets'] });
            resetForm();
            setEditModalVisible(false);
            setEditTarget(null);
        },
    });

    const deleteSecretMutation = useMutation({
        mutationFn: (id: string) => api.deleteSecret(id),
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: ['secrets'] });
            setDeleteModalVisible(false);
            setDeleteTarget(null);
        },
    });

    const cloneSecretMutation = useMutation({
        mutationFn: (secret: Secret) =>
            api.createSecret({
                title: `${secret.title} (copy)`,
                username: secret.username,
                email: secret.email,
                password: secret.password,
                url: secret.url,
                telephone_number: secret.telephone_number,
            }),
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: ['secrets'] });
        },
    });

    const createNoteMutation = useMutation({
        mutationFn: (data: Parameters<typeof api.createNote>[0]) => api.createNote(data),
        onSuccess: async (newNote) => {
            console.log('[Mutation] Create note success, invalidating notes...', newNote.id);
            await qc.invalidateQueries({ queryKey: ['notes'] });
            console.log('[Mutation] Notes invalidated');
            resetForm();
            setCreateModalVisible(false);
        },
    });

    const updateNoteMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.updateNote>[1] }) =>
            api.updateNote(id, data),
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: ['notes'] });
            resetForm();
            setEditModalVisible(false);
            setEditTarget(null);
        },
    });

    const deleteNoteMutation = useMutation({
        mutationFn: (id: string) => api.deleteNote(id),
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: ['notes'] });
            setDeleteModalVisible(false);
            setDeleteTarget(null);
        },
    });

    const cloneNoteMutation = useMutation({
        mutationFn: (note: Note) =>
            api.createNote({
                title: `${note.title} (copy)`,
                content: note.content,
            }),
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: ['notes'] });
        },
    });

    const handleRefresh = useCallback(() => {
        refetchSecrets();
        refetchNotes();
    }, [refetchSecrets, refetchNotes]);

    // Search filtering
    const filteredSecrets = useMemo(() => {
        if (!searchQuery) return secrets;
        const query = searchQuery.toLowerCase();
        return secrets.filter((secret) => {
            const matchTitle = secret.title?.toLowerCase()?.includes(query);
            const matchEmail = secret.email?.toLowerCase()?.includes(query);
            const matchUsername = secret.username?.toLowerCase()?.includes(query);
            const matchUrl = secret.url?.toLowerCase()?.includes(query);
            const matchPhone = secret.telephone_number?.toLowerCase()?.includes(query);

            return !!(matchTitle || matchEmail || matchUsername || matchUrl || matchPhone);
        });
    }, [secrets, searchQuery]);

    const filteredNotes = useMemo(() => {
        if (!searchQuery) return notes;
        const query = searchQuery.toLowerCase();
        return notes.filter(
            (note) => {
                const matchTitle = note.title?.toLowerCase()?.includes(query);
                const matchContent = note.content?.toLowerCase()?.includes(query);
                return !!(matchTitle || matchContent);
            }
        );
    }, [notes, searchQuery]);

    // CRUD handlers

    // --- Bulk Selection Handlers ---

    const toggleSelectionMode = (initialItem?: { type: ItemType; id: string }) => {
        setSelectionMode(true);
        if (initialItem) {
            if (initialItem.type === 'secret') {
                setSelectedSecrets(new Set([initialItem.id]));
                setSelectedNotes(new Set());
            } else {
                setSelectedNotes(new Set([initialItem.id]));
                setSelectedSecrets(new Set());
            }
        }
    };

    const toggleItemSelection = (type: ItemType, id: string) => {
        if (type === 'secret') {
            setSelectedSecrets(prev => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
            });
        } else {
            setSelectedNotes(prev => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
            });
        }
    };

    const cancelSelection = () => {
        setSelectionMode(false);
        setSelectedSecrets(new Set());
        setSelectedNotes(new Set());
    };

    const selectAll = () => {
        // Apply current filters
        const visibleSecrets = showSecrets ? filteredSecrets : [];
        const visibleNotes = showNotes ? filteredNotes : [];

        if (showFavoritesOnly) {
            setSelectedSecrets(new Set(visibleSecrets.filter(s => s.is_favorite).map(s => s.id)));
            setSelectedNotes(new Set(visibleNotes.filter(n => n.is_favorite).map(n => n.id)));
        } else {
            setSelectedSecrets(new Set(visibleSecrets.map(s => s.id)));
            setSelectedNotes(new Set(visibleNotes.map(n => n.id)));
        }
    };

    const handleBulkDelete = async () => {
        setBulkDeleteConfirmVisible(false);
        setIsBulkDeleting(true);

        const secretIds = Array.from(selectedSecrets);
        const noteIds = Array.from(selectedNotes);

        const itemsToDelete = [
            ...secretIds.map(id => ({ id, item_type: 'secret' as const })),
            ...noteIds.map(id => ({ id, item_type: 'note' as const }))
        ];

        try {
            await api.bulkDelete(itemsToDelete);

            // Invalidate queries
            qc.invalidateQueries({ queryKey: ['secrets'] });
            qc.invalidateQueries({ queryKey: ['notes'] });

            setFeedbackModal({
                visible: true,
                title: t('common.success'),
                message: t('vault.bulkDeleteSuccess', { count: itemsToDelete.length }),
                type: 'success'
            });

        } catch (error: any) {
            setFeedbackModal({
                visible: true,
                title: t('common.error'),
                message: error.message || t('errors.default'), // Improved error message
                type: 'error'
            });
        } finally {
            setIsBulkDeleting(false);
            cancelSelection();
        }
    };

    const handleBulkFavorite = async (isFavorite: boolean) => {
        setIsBulkDeleting(true); // Re-use loading state or create new one

        const secretIds = Array.from(selectedSecrets);
        const noteIds = Array.from(selectedNotes);

        const itemsToUpdate = [
            ...secretIds.map(id => ({ id, item_type: 'secret' as const })),
            ...noteIds.map(id => ({ id, item_type: 'note' as const }))
        ];

        try {
            if (isFavorite) {
                await api.bulkFavorite(itemsToUpdate);
            } else {
                await api.bulkUnfavorite(itemsToUpdate);
            }

            // Invalidate queries
            qc.invalidateQueries({ queryKey: ['secrets'] });
            qc.invalidateQueries({ queryKey: ['notes'] });

            // Allow favorite store to sync automatically via effect in layout or just invalidate
            // Actually favorite store needs manual update or re-fetch favorites if they are fetched from API
            // But here favorites are derived from secrets/notes local fav status? 
            // Wait, useFavoritesStore is client side only? 
            // IF the API handles favorites, we should refetch.
            // Assuming API updates the 'is_favorite' field on the items.

        } catch (error: any) {
            setFeedbackModal({
                visible: true,
                title: t('common.error'),
                message: error.message || t('errors.default'),
                type: 'error'
            });
        } finally {
            setIsBulkDeleting(false);
            cancelSelection();
        }
    };


    const handleDelete = () => {
        if (!deleteTarget) return;
        if (deleteTarget.type === 'secret') {
            deleteSecretMutation.mutate(deleteTarget.id);
        } else {
            deleteNoteMutation.mutate(deleteTarget.id);
        }
    };

    const handleCreate = () => {
        if (createType === 'secret') {
            createSecretMutation.mutate({
                title: formData.title,
                username: formData.username || undefined,
                email: formData.email || undefined,
                password: formData.password || undefined,
                url: formData.url || undefined,
                telephone_number: formData.telephone_number || undefined,
            });
        } else {
            createNoteMutation.mutate({
                title: formData.title,
                content: formData.content || undefined,
            });
        }
    };

    const handleUpdate = () => {
        if (!editTarget) return;
        if (editTarget.type === 'secret') {
            updateSecretMutation.mutate({
                id: editTarget.item.id,
                data: {
                    title: formData.title,
                    username: formData.username || undefined,
                    email: formData.email || undefined,
                    password: formData.password || undefined,
                    url: formData.url || undefined,
                    telephone_number: formData.telephone_number || undefined,
                },
            });
        } else {
            updateNoteMutation.mutate({
                id: editTarget.item.id,
                data: {
                    title: formData.title,
                    content: formData.content || undefined,
                },
            });
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            username: '',
            email: '',
            password: '',
            url: '',
            telephone_number: '',
            content: '',
        });
    };

    const openEditModal = (type: ItemType, item: Secret | Note) => {
        setEditTarget({ type, item });
        if (type === 'secret') {
            const secret = item as Secret;
            setFormData({
                title: secret.title || '',
                username: secret.username || '',
                email: secret.email || '',
                password: secret.password || '',
                url: secret.url || '',
                telephone_number: secret.telephone_number || '',
                content: '',
            });
        } else {
            const note = item as Note;
            setFormData({
                title: note.title || '',
                username: '',
                email: '',
                password: '',
                url: '',
                telephone_number: '',
                content: note.content || '',
            });
        }
        setEditModalVisible(true);
    };

    const openCreateModal = (type: ItemType) => {
        setShowCreateMenu(false);
        if (type === 'note') {
            // Navigate to editor for new notes
            router.push('/(main)/vault/editor');
        } else {
            // Use modal for secrets
            resetForm();
            setCreateType(type);
            setCreateModalVisible(true);
        }
    };

    // --- Import Logic ---

    const parseCSV = (content: string) => {
        // Remove BOM if present
        const cleanContent = content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content;
        const lines = cleanContent.split(/\r\n|\n|\r/); // Robust line splitting
        const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/^"|"$/g, '')); // Remove outer quotes from headers
        const result: any[] = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;

            const values: string[] = [];
            let inQuote = false;
            let currentValue = '';

            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                const nextChar = line[j + 1];

                if (char === '"') {
                    if (inQuote && nextChar === '"') {
                        currentValue += '"';
                        j++;
                    } else {
                        inQuote = !inQuote;
                    }
                } else if (char === ',' && !inQuote) {
                    values.push(currentValue);
                    currentValue = '';
                } else {
                    currentValue += char;
                }
            }
            values.push(currentValue);

            const entry: any = {};
            headers.forEach((header, index) => {
                const value = values[index]?.trim();
                if (!value) return;

                // Flexible Mapping
                if (header === 'type') {
                    entry.type = value.toLowerCase();
                }
                // Title/Name
                else if (header === 'name' || header === 'title') {
                    entry.title = value;
                }
                // URL
                else if (header === 'url' || header === 'login_uri') {
                    entry.url = value;
                }
                // Username
                else if (header === 'username' || header === 'login_username') {
                    entry.username = value;
                }
                // Password
                else if (header === 'password' || header === 'login_password') {
                    entry.password = value;
                }
                // Note / Content
                else if (header === 'note' || header === 'notes' || header === 'content') {
                    entry.content = value;
                }
                else if (header === 'email') {
                    entry.email = value;
                }
                else if (header === 'phone') {
                    entry.telephone_number = value;
                }
            });

            // Determine item type if not specified
            if (!entry.type) {
                // If has password or username/email/url -> Secret
                if (entry.password || entry.username || entry.url || entry.email) {
                    entry.type = 'secret';
                } else if (entry.content) {
                    entry.type = 'note';
                } else {
                    entry.type = 'secret'; // Default
                }
            }

            // Validation: Title is required. 
            // We allow empty password for secrets (user might want to fill later).
            if (entry.title) {
                result.push(entry);
            }
        }
        return result;
    };

    const isDuplicate = (newItem: any, existingItems: Array<Secret | Note>) => {
        // Check against relevant list based on type
        // This is a naive check. Improve as needed.
        if (newItem.type === 'note') {
            // For notes, check title and content match in existing NOTES
            return notes.some((n: Note) => n.title === newItem.title && (n.content || '') === (newItem.content || ''));
        } else {
            // For secrets
            return secrets.some((s: Secret) => {
                const sTitle = s.title || '';
                const sUsername = s.username || '';
                const sPassword = s.password || '';
                const sUrl = s.url || '';

                const nTitle = newItem.title || '';
                const nUsername = newItem.username || '';
                const nPassword = newItem.password || '';
                const nUrl = newItem.url || '';

                return sTitle === nTitle && sUsername === nUsername && sPassword === nPassword && sUrl === nUrl;
            });
        }
    };

    const processImportQueue = async (queue: any[], startIndex: number, skippedCount: number) => {
        setIsImporting(true);

        const bulkItems = queue.map(item => {
            if (item.type === 'note') {
                return {
                    item_type: 'note' as const,
                    data: {
                        title: item.title,
                        content: item.content || null
                    }
                };
            } else {
                return {
                    item_type: 'secret' as const,
                    data: {
                        title: item.title,
                        username: item.username || null,
                        password: item.password || null,
                        url: item.url || null,
                        email: item.email || null,
                        telephone_number: item.telephone_number || null,
                        is_favorite: false
                    }
                };
            }
        });

        try {
            await api.bulkCreate({ items: bulkItems });

            setIsImporting(false);
            setImportQueue([]);
            setImportError(null);
            qc.invalidateQueries({ queryKey: ['secrets'] });
            qc.invalidateQueries({ queryKey: ['notes'] });

            setFeedbackModal({
                visible: true,
                title: t('vault.importSuccess'),
                message: skippedCount > 0
                    ? t('vault.importSuccessWithSkipped', { count: bulkItems.length, skipped: skippedCount })
                    : t('vault.importSuccessDesc', { count: bulkItems.length }),
                type: 'success'
            });

        } catch (error: any) {
            setIsImporting(false);
            setFeedbackModal({
                visible: true,
                title: t('common.error'),
                message: error.message || t('errors.importFailed'),
                type: 'error'
            });
        }
    };

    const handleImportFromGoogle = () => {
        setShowCreateMenu(false);
        setShowImportConfirm(true);
    };

    const onConfirmImport = async () => {
        setShowImportConfirm(false);
        setStopImportRequested(false);

        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['text/csv', 'text/comma-separated-values', 'application/json', '*/*'],
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            const fileUri = result.assets[0].uri;
            const fileName = result.assets[0].name || '';
            const fileContent = await FileSystem.readAsStringAsync(fileUri);

            let parsedItems: any[] = [];

            // Detect file format by extension or content
            if (fileName.toLowerCase().endsWith('.json') || fileContent.trim().startsWith('{')) {
                // JSON format (exported from our app)
                try {
                    const jsonData = JSON.parse(fileContent);

                    // Handle our app's export format
                    if (jsonData.secrets && Array.isArray(jsonData.secrets)) {
                        parsedItems = jsonData.secrets.map((s: any) => ({
                            title: s.title,
                            username: s.username,
                            password: s.password,
                            url: s.url,
                            email: s.email,
                            telephone_number: s.telephone_number,
                        }));
                    }

                    // Also import notes if present (as notes, not secrets)
                    if (jsonData.notes && Array.isArray(jsonData.notes) && jsonData.notes.length > 0) {
                        // For now, we only import secrets from JSON
                        // Notes would need separate handling
                    }
                } catch (parseError) {
                    throw new Error('Invalid JSON file format');
                }
            } else {
                // CSV format
                parsedItems = parseCSV(fileContent);
            }

            if (parsedItems.length === 0) {
                setFeedbackModal({
                    visible: true,
                    title: t('common.error'),
                    message: t('vault.noItems'),
                    type: 'error'
                });
                return;
            }

            // FILTER DUPLICATES
            const filteredItems: any[] = [];
            let skipped = 0;

            parsedItems.forEach(item => {
                const isDup = isDuplicate(item, item.type === 'note' ? notes : secrets);
                if (isDup) {
                    skipped++;
                } else {
                    filteredItems.push(item);
                }
            });

            if (filteredItems.length === 0 && skipped > 0) {
                setFeedbackModal({
                    visible: true,
                    title: t('vault.importSuccess'),
                    message: t('vault.importSuccessWithSkipped', { count: 0, skipped }),
                    type: 'info'
                });
                return;
            } else if (filteredItems.length === 0) {
                setFeedbackModal({
                    visible: true,
                    title: t('common.error'),
                    message: t('vault.noItems'),
                    type: 'error'
                });
                return;
            }

            setImportQueue(filteredItems);
            setImportProgress({ current: 0, total: filteredItems.length, successCount: 0, skipped });

            // Start processing with filtered items
            processImportQueue(filteredItems, 0, skipped);

        } catch (err: any) {
            console.error('Import init error:', err);
            setFeedbackModal({
                visible: true,
                title: t('common.error'),
                message: 'Failed to read file: ' + err.message,
                type: 'error'
            });
        }
    };

    const onRetryImport = () => {
        setImportError(null);
        // Resume from current index (current - 1 because current was incremented at start of loop)
        // Actually, current is 1-based index in UI "1 of 50". So index is current - 1.
        // But if it failed at item `i`, `current` was set to `i + 1`. 
        // So we retry item `i`, which is index `current - 1`.
        processImportQueue(importQueue, importProgress.current - 1, importProgress.skipped);
    };

    const onStopImport = () => {
        setImportError(null);
        setStopImportRequested(true); // Should be redundant as we are not in loop but for safety
        setIsImporting(false);
        setImportQueue([]);
        qc.invalidateQueries({ queryKey: ['secrets'] }); // Invalidate so partial imports show up
    };

    // --- End Import Logic ---

    const combinedItems = useMemo(() => {
        let items: Array<{ item: Secret | Note; type: ItemType; isFavorite: boolean }> = [];

        if (showSecrets) {
            filteredSecrets.forEach((s) => {
                const isFav = !!s.is_favorite;
                // If showFavoritesOnly is on, only include favorites
                if (!showFavoritesOnly || isFav) {
                    items.push({ item: s, type: 'secret', isFavorite: isFav });
                }
            });
        }
        if (showNotes) {
            filteredNotes.forEach((n) => {
                const isFav = !!n.is_favorite;
                // If showFavoritesOnly is on, only include favorites
                if (!showFavoritesOnly || isFav) {
                    items.push({ item: n, type: 'note', isFavorite: isFav });
                }
            });
        }

        // Sort: favorites first (newest), then non-favorites (newest)
        items.sort((a, b) => {
            // First by favorite status
            if (a.isFavorite !== b.isFavorite) {
                return a.isFavorite ? -1 : 1;
            }
            // Then by date (newest first)
            const dateA = new Date(a.item.created_at || 0).getTime();
            const dateB = new Date(b.item.created_at || 0).getTime();
            return dateB - dateA;
        });

        console.log('[Vault] Recalculating combinedItems:', items.length);
        return items;
    }, [filteredSecrets, filteredNotes, showSecrets, showNotes, showFavoritesOnly, searchQuery]);

    // --- Stable Handlers for Item Components ---
    const handlePressSecret = useCallback((secret: Secret) => {
        router.push(`/(main)/vault/${secret.id}?type=secret`);
    }, [router]);

    const handleEditSecret = useCallback((secret: Secret) => {
        openEditModal('secret', secret);
    }, []);

    const handleCloneSecret = useCallback((secret: Secret) => {
        cloneSecretMutation.mutate(secret);
    }, [cloneSecretMutation]);

    const handleDeleteSecret = useCallback((secret: Secret) => {
        setDeleteTarget({ type: 'secret', id: secret.id });
        setDeleteModalVisible(true);
    }, []);

    const handleSelectSecret = useCallback((id: string) => {
        toggleItemSelection('secret', id);
    }, []);

    const handleLongPressSecret = useCallback((id: string) => {
        toggleSelectionMode({ type: 'secret', id });
    }, []);

    // Note Handlers
    const handlePressNote = useCallback((note: Note) => {
        router.push(`/(main)/vault/${note.id}?type=note`);
    }, [router]);

    const handleEditNote = useCallback((note: Note) => {
        router.push(`/(main)/vault/editor?id=${note.id}`);
    }, [router]);

    const handleCloneNote = useCallback((note: Note) => {
        cloneNoteMutation.mutate(note);
    }, [cloneNoteMutation]);

    const handleDeleteNote = useCallback((note: Note) => {
        setDeleteTarget({ type: 'note', id: note.id });
        setDeleteModalVisible(true);
    }, []);

    const handleSelectNote = useCallback((id: string) => {
        toggleItemSelection('note', id);
    }, []);

    const handleLongPressNote = useCallback((id: string) => {
        toggleSelectionMode({ type: 'note', id });
    }, []);


    const renderItem = useCallback(
        ({ item }: { item: { item: Secret | Note; type: ItemType; isFavorite: boolean } }) => {
            const isSelected = item.type === 'secret'
                ? selectedSecrets.has(item.item.id)
                : selectedNotes.has(item.item.id);

            if (item.type === 'secret') {
                return (
                    <SecretItem
                        secret={item.item as Secret}
                        onPress={handlePressSecret}
                        onEdit={handleEditSecret}
                        onClone={handleCloneSecret}
                        onDelete={handleDeleteSecret}
                        // Selection Props
                        selectionMode={selectionMode}
                        isSelected={isSelected}
                        onSelect={handleSelectSecret}
                        onLongPress={handleLongPressSecret}
                    />
                );
            }
            return (
                <NoteItem
                    note={item.item as Note}
                    onPress={handlePressNote}
                    onEdit={handleEditNote}
                    onClone={handleCloneNote}
                    onDelete={handleDeleteNote}
                    // Selection Props
                    selectionMode={selectionMode}
                    isSelected={isSelected}
                    onSelect={handleSelectNote}
                    onLongPress={handleLongPressNote}
                />
            );
        },
        [
            selectionMode,
            selectedSecrets,
            selectedNotes,
            handlePressSecret, handleEditSecret, handleCloneSecret, handleDeleteSecret, handleSelectSecret, handleLongPressSecret,
            handlePressNote, handleEditNote, handleCloneNote, handleDeleteNote, handleSelectNote, handleLongPressNote
        ]
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.colors.bg }]}>
                <View style={styles.headerTop}>
                    <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{t('vault.title')}</Text>

                    {/* Selection Toolbar (Header Action Replacement) */}
                    {selectionMode && (
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            {/* Logic to show Fav/Unfav based on selection state */}
                            {(() => {
                                // Calculate if all selected are fav or not
                                const selectedItems = combinedItems.filter(item =>
                                    item.type === 'secret' ? selectedSecrets.has(item.item.id) : selectedNotes.has(item.item.id)
                                );

                                if (selectedItems.length === 0) return null;

                                const allFav = selectedItems.every(i => i.isFavorite);
                                const allNonFav = selectedItems.every(i => !i.isFavorite);

                                if (allFav) {
                                    return (
                                        <TouchableOpacity onPress={() => handleBulkFavorite(false)} style={styles.headerIconButton}>
                                            <Ionicons name="star-outline" size={22} color={theme.colors.text} />
                                        </TouchableOpacity>
                                    );
                                } else if (allNonFav) {
                                    return (
                                        <TouchableOpacity onPress={() => handleBulkFavorite(true)} style={styles.headerIconButton}>
                                            <Ionicons name="star" size={22} color={theme.colors.accent} />
                                        </TouchableOpacity>
                                    );
                                }
                                return null; // Mixed state
                            })()}

                            <TouchableOpacity onPress={selectAll} style={styles.headerIconButton}>
                                <Ionicons name="checkmark-done-outline" size={22} color={theme.colors.text} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setBulkDeleteConfirmVisible(true)} style={styles.headerIconButton}>
                                <Ionicons name="trash-outline" size={22} color={theme.colors.error} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={cancelSelection} style={styles.headerIconButton}>
                                <Ionicons name="close" size={22} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Search Bar Row - Only show when not in selection mode */}
                {!selectionMode && (
                    <View style={styles.searchRow}>
                        <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface }]}>
                            <Ionicons name="search" size={18} color={theme.colors.textMuted} />
                            <TextInput
                                style={[styles.searchInput, { color: theme.colors.text }]}
                                placeholder={t('common.search')}
                                placeholderTextColor={theme.colors.textMuted}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>

                        <View>
                            <TouchableOpacity
                                style={[styles.createButton, { backgroundColor: theme.colors.accent }]}
                                onPress={() => setShowCreateMenu(!showCreateMenu)}
                            >
                                <Ionicons name="add" size={22} color="#fff" />
                            </TouchableOpacity>

                            {showCreateMenu && (
                                <View style={[styles.createMenu, { backgroundColor: theme.colors.surfaceElevated }]}>
                                    <TouchableOpacity style={styles.createMenuItem} onPress={() => openCreateModal('secret')}>
                                        <Ionicons name="key-outline" size={20} color={theme.colors.text} />
                                        <Text style={[styles.createMenuText, { color: theme.colors.text }]}>{t('vault.newSecret')}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.createMenuItem} onPress={() => openCreateModal('note')}>
                                        <Ionicons name="document-text-outline" size={20} color={theme.colors.text} />
                                        <Text style={[styles.createMenuText, { color: theme.colors.text }]}>{t('vault.newNote')}</Text>
                                    </TouchableOpacity>
                                    <View style={[styles.menuDivider, { backgroundColor: theme.colors.border }]} />
                                    <TouchableOpacity style={styles.createMenuItem} onPress={handleImportFromGoogle}>
                                        <Ionicons name="cloud-upload-outline" size={20} color={theme.colors.text} />
                                        <Text style={[styles.createMenuText, { color: theme.colors.text }]}>{t('vault.importCSV')}</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {/* Filter buttons - Always visible */}
                <View style={styles.filterRow}>
                    <TouchableOpacity
                        style={[
                            styles.filterButton,
                            {
                                backgroundColor: showSecrets ? theme.colors.accent : theme.colors.surface,
                                borderColor: showSecrets ? theme.colors.accent : theme.colors.border,
                            },
                        ]}
                        onPress={() => setShowSecrets(!showSecrets)}
                    >
                        <Ionicons name="shield-outline" size={16} color={showSecrets ? '#fff' : theme.colors.textMuted} />
                        <Text style={[styles.filterButtonText, { color: showSecrets ? '#fff' : theme.colors.textMuted }]}>
                            {t('vault.secrets')}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.filterButton,
                            {
                                backgroundColor: showNotes ? theme.colors.accent : theme.colors.surface,
                                borderColor: showNotes ? theme.colors.accent : theme.colors.border,
                            },
                        ]}
                        onPress={() => setShowNotes(!showNotes)}
                    >
                        <Ionicons name="document-text-outline" size={16} color={showNotes ? '#fff' : theme.colors.textMuted} />
                        <Text style={[styles.filterButtonText, { color: showNotes ? '#fff' : theme.colors.textMuted }]}>
                            {t('vault.notes')}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.filterButton,
                            {
                                backgroundColor: showFavoritesOnly ? theme.colors.warning : theme.colors.surface,
                                borderColor: showFavoritesOnly ? theme.colors.warning : theme.colors.border,
                            },
                        ]}
                        onPress={() => setShowFavoritesOnly(!showFavoritesOnly)}
                    >
                        <Ionicons name={showFavoritesOnly ? "star" : "star-outline"} size={16} color={showFavoritesOnly ? '#fff' : theme.colors.textMuted} />
                        <Text style={[styles.filterButtonText, { color: showFavoritesOnly ? '#fff' : theme.colors.textMuted }]}>
                            {t('vault.favorites')}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Search Results Indicator */}
            {
                searchQuery.trim() !== '' && !selectionMode && (
                    <View style={styles.searchIndicator}>
                        <Text style={[styles.searchIndicatorText, { color: theme.colors.textMuted }]}>
                            {t('vault.searchResults', { query: searchQuery, count: combinedItems.length })}
                        </Text>
                    </View>
                )
            }

            {/* Content */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.accent} />
                </View>
            ) : (
                <FlatList
                    data={combinedItems}
                    extraData={combinedItems}
                    renderItem={renderItem}
                    keyExtractor={(item) => `${item.type}-${item.item.id}`}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor={theme.colors.accent} />}
                    windowSize={10}
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    removeClippedSubviews={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="file-tray-outline" size={64} color={theme.colors.textMuted} />
                            <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>{t('vault.empty')}</Text>
                        </View>
                    }
                />
            )}

            {/* Other Modals (Delete, Bulk Delete, Import...) (Keep existing) */}
            <Modal
                title={t('vault.deleteItem')}
                visible={deleteModalVisible}
                onClose={() => setDeleteModalVisible(false)}
                message={t('vault.deleteConfirm')}
                confirmText={t('common.delete')}
                onConfirm={handleDelete}
                cancelText={t('common.cancel')}
                showCancel={true}
                variant="danger"
            />

            <Modal
                title={t('vault.bulkDeleteConfirmTitle')}
                visible={bulkDeleteConfirmVisible}
                onClose={() => setBulkDeleteConfirmVisible(false)}
                message={t('vault.bulkDeleteConfirmMessage', { count: selectedSecrets.size + selectedNotes.size })}
                confirmText={t('common.delete')}
                onConfirm={handleBulkDelete}
                cancelText={t('common.cancel')}
                showCancel={true}
                variant="danger"
                loading={isBulkDeleting}
            />

            {/* Import Modals ... */}
            <Modal
                title={t('vault.importConfirmTitle')}
                visible={showImportConfirm}
                onClose={() => setShowImportConfirm(false)}
                confirmText={t('vault.selectFile')}
                onConfirm={onConfirmImport}
                cancelText={t('common.cancel')}
            >
                <View style={{ width: '100%', gap: 12 }}>
                    <Text style={[styles.modalText, { color: theme.colors.text, marginBottom: 8 }]}>
                        {t('vault.importInfo')}
                    </Text>

                    <View style={{ backgroundColor: theme.colors.surfaceElevated, padding: 12, borderRadius: 8 }}>
                        <Text style={{ fontFamily: 'Comfortaa_700Bold', color: theme.colors.text, fontSize: 14, marginBottom: 4 }}>
                            {t('vault.howToExport')}
                        </Text>
                        <Text style={{ fontFamily: 'Comfortaa_400Regular', color: theme.colors.textMuted, fontSize: 13, lineHeight: 20 }}>
                            {t('vault.exportSteps')}
                        </Text>
                    </View>

                    <Text style={[styles.modalText, { color: theme.colors.textMuted, fontSize: 12, fontStyle: 'italic', marginTop: 12, marginBottom: 20 }]}>
                        {t('vault.importConfirmDesc')}
                    </Text>
                </View>
            </Modal>

            <Modal
                title={t('vault.importFailedTitle')}
                visible={!!importError}
                onClose={() => { }} // User must choose an option
                showCancel={false}
            >
                <View style={styles.modalContent}>
                    <Text style={[styles.modalText, { color: theme.colors.text }]}>
                        {t('vault.importFailedDesc', { title: importError?.title, error: importError?.error })}
                    </Text>
                    <View style={styles.modalButtons}>
                        <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={onStopImport}>
                            <Text style={styles.buttonText}>{t('vault.importStop')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.modalButton, { backgroundColor: theme.colors.accent }]} onPress={onRetryImport}>
                            <Text style={styles.buttonText}>{t('vault.importRetry')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={!!feedbackModal}
                title={feedbackModal?.title || ''}
                message={feedbackModal?.message || ''}
                onClose={() => setFeedbackModal(null)}
                variant={feedbackModal?.type === 'error' ? 'danger' : 'default'}
                confirmText={t('common.ok')}
                showCancel={false}
            >
                <View />
            </Modal>

            {/* Import Progress Overlay */}
            {
                isImporting && (
                    <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                        <View style={[styles.syncContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}>
                            <ActivityIndicator size="large" color={theme.colors.accent} />
                            <Text style={[styles.syncText, { color: theme.colors.text }]}>{t('vault.importing')}</Text>
                            <Text style={[styles.syncSubText, { color: theme.colors.textMuted }]}>
                                {t('vault.importProgress', { current: importProgress.current, total: importProgress.total })}
                            </Text>

                            <TouchableOpacity
                                style={{ marginTop: 15, padding: 8 }}
                                onPress={() => setStopImportRequested(true)}
                            >
                                <Text style={{ color: theme.colors.error, fontFamily: 'Comfortaa_500Medium' }}>{t('vault.importStop')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )
            }

            {/* Create Modal */}
            <Modal
                visible={createModalVisible}
                onClose={() => setCreateModalVisible(false)}
                title={createType === 'secret' ? t('vault.newSecret') : t('vault.newNote')}
                confirmText={t('common.create')}
                onConfirm={handleCreate}
            >
                <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
                    <Input
                        label={t('vault.title_field')}
                        value={formData.title}
                        onChangeText={(v) => setFormData({ ...formData, title: v })}
                        placeholder={t('vault.enterTitle')}
                    />
                    {createType === 'secret' ? (
                        <>
                            <Input
                                label={t('vault.url')}
                                value={formData.url}
                                onChangeText={(v) => setFormData({ ...formData, url: v })}
                                placeholder="https://example.com"
                                keyboardType="url"
                                autoCapitalize="none"
                            />
                            <Input
                                label={t('auth.email')}
                                value={formData.email}
                                onChangeText={(v) => setFormData({ ...formData, email: v })}
                                placeholder={t('auth.emailPlaceholder')}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                            <Input
                                label={t('vault.username')}
                                value={formData.username}
                                onChangeText={(v) => setFormData({ ...formData, username: v })}
                                placeholder={t('vault.username')}
                                autoCapitalize="none"
                            />
                            <Input
                                label={t('vault.password')}
                                value={formData.password}
                                onChangeText={(v) => setFormData({ ...formData, password: v })}
                                placeholder={t('vault.password')}
                                isPassword
                            />
                            <Input
                                label={t('vault.phone')}
                                value={formData.telephone_number}
                                onChangeText={(v) => setFormData({ ...formData, telephone_number: v })}
                                placeholder="+1234567890"
                                keyboardType="phone-pad"
                            />
                        </>
                    ) : (
                        <Input
                            label={t('vault.content')}
                            value={formData.content}
                            onChangeText={(v) => setFormData({ ...formData, content: v })}
                            placeholder={t('vault.noteContentPlaceholder')}
                            multiline
                            numberOfLines={4}
                        />
                    )}
                </ScrollView>
            </Modal>

            {/* Edit Modal */}
            <Modal
                visible={editModalVisible}
                onClose={() => setEditModalVisible(false)}
                title={t('vault.editSecret')}
                confirmText={t('common.save')}
                onConfirm={handleUpdate}
            >
                <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
                    <Input
                        label={t('vault.title_field')}
                        value={formData.title}
                        onChangeText={(v) => setFormData({ ...formData, title: v })}
                        placeholder={t('vault.enterTitle')}
                    />
                    <Input
                        label={t('vault.url')}
                        value={formData.url}
                        onChangeText={(v) => setFormData({ ...formData, url: v })}
                        placeholder="https://example.com"
                    />
                    <Input
                        label={t('auth.email')}
                        value={formData.email}
                        onChangeText={(v) => setFormData({ ...formData, email: v })}
                        placeholder={t('auth.emailPlaceholder')}
                    />
                    <Input
                        label={t('vault.username')}
                        value={formData.username}
                        onChangeText={(v) => setFormData({ ...formData, username: v })}
                        placeholder={t('vault.username')}
                    />
                    <Input
                        label={t('vault.password')}
                        value={formData.password}
                        onChangeText={(v) => setFormData({ ...formData, password: v })}
                        placeholder={t('vault.password')}
                        isPassword
                    />
                    <Input
                        label={t('vault.phone')}
                        value={formData.telephone_number}
                        onChangeText={(v) => setFormData({ ...formData, telephone_number: v })}
                        placeholder="+1234567890"
                    />
                </ScrollView>
            </Modal>
        </View >
    );
}

export default function VaultPage() {
    return <VaultContent />;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 12,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    headerTitle: {
        fontSize: 32,
        fontFamily: 'Comfortaa_700Bold',
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
        justifyContent: 'flex-end',
    },
    headerIconButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        fontFamily: 'Comfortaa_400Regular',
    },
    createButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    createMenu: {
        position: 'absolute',
        top: 52,
        right: 0,
        borderRadius: 12,
        padding: 8,
        minWidth: 150,
        maxWidth: 220,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
        zIndex: 100,
    },
    createMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        gap: 12,
    },
    createMenuText: {
        fontSize: 14,
        fontFamily: 'Comfortaa_500Medium',
        flexShrink: 1,
    },
    menuDivider: {
        height: 1,
        marginHorizontal: 8,
        marginVertical: 4,
    },
    filterRow: {
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
    },
    filterLabel: {
        fontSize: 13,
        fontFamily: 'Comfortaa_500Medium',
        marginRight: 4,
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
    },
    filterButtonText: {
        fontSize: 13,
        fontFamily: 'Comfortaa_500Medium',
    },
    list: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    searchIndicator: {
        paddingHorizontal: 20,
        marginBottom: 8,
    },
    searchIndicatorText: {
        fontSize: 13,
        fontFamily: 'Comfortaa_500Medium',
        fontStyle: 'italic',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 16,
        fontFamily: 'Comfortaa_400Regular',
    },
    modalText: {
        fontSize: 14,
        fontFamily: 'Comfortaa_400Regular',
    },
    // Selection Bar
    selectionBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 70,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderTopWidth: 1,
        elevation: 10,
        shadowRadius: 4,
        paddingBottom: 10, // Adjust for safe area if needed
        zIndex: 100,
    },
    selectionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    closeSelectionButton: {
        padding: 4,
    },
    selectionCount: {
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: 'Comfortaa_700Bold',
    },
    selectionActions: {
        flexDirection: 'row',
        gap: 16,
    },
    selectionActionButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Overlay and other misc styles
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    syncContainer: {
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
        gap: 16,
        minWidth: 200,
        maxWidth: '80%',
    },
    syncText: {
        fontSize: 16,
        fontFamily: 'Comfortaa_500Medium',
        marginTop: 8,
    },
    syncSubText: {
        fontSize: 14,
        fontFamily: 'Comfortaa_400Regular',
        textAlign: 'center',
    },
    formScroll: {
        maxHeight: 350,
        marginBottom: 16,
    },
    // Modal specific styles (some might be unused if we switch to generic Modal)
    modalContent: {
        width: '100%',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        justifyContent: 'flex-end',
    },
    modalButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        minWidth: 80,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: 'rgba(150, 150, 150, 0.1)',
    },
    buttonText: {
        color: '#fff',
        fontSize: 14,
        fontFamily: 'Comfortaa_500Medium',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
    },
});
