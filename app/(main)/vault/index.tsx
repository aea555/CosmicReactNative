import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { NoteItem } from '@/components/vault/NoteItem';
import { SecretItem } from '@/components/vault/SecretItem';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAutoProcessPendingSaves } from '@/hooks/useAutofillPendingSaves';
import { Note, Secret, api } from '@/services/api';
import { syncVaultToAutofill } from '@/services/autofillSync';
import { useFavoritesStore } from '@/stores/favorites';
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
    View,
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
        queryFn: () => api.getSecrets(),
    });

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
    const favoriteSecretIds = useFavoritesStore((state) => state.favoriteSecretIds);
    const favoriteNoteIds = useFavoritesStore((state) => state.favoriteNoteIds);


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
        queryFn: () => api.getNotes(),
    });

    const isLoading = secretsLoading || notesLoading;

    // Mutations
    const createSecretMutation = useMutation({
        mutationFn: (data: Parameters<typeof api.createSecret>[0]) => api.createSecret(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['secrets'] });
            resetForm();
            setCreateModalVisible(false);
        },
    });

    const updateSecretMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.updateSecret>[1] }) =>
            api.updateSecret(id, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['secrets'] });
            resetForm();
            setEditModalVisible(false);
            setEditTarget(null);
        },
    });

    const deleteSecretMutation = useMutation({
        mutationFn: (id: string) => api.deleteSecret(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['secrets'] });
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
        onSuccess: () => qc.invalidateQueries({ queryKey: ['secrets'] }),
    });

    const createNoteMutation = useMutation({
        mutationFn: (data: Parameters<typeof api.createNote>[0]) => api.createNote(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['notes'] });
            resetForm();
            setCreateModalVisible(false);
        },
    });

    const updateNoteMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.updateNote>[1] }) =>
            api.updateNote(id, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['notes'] });
            resetForm();
            setEditModalVisible(false);
            setEditTarget(null);
        },
    });

    const deleteNoteMutation = useMutation({
        mutationFn: (id: string) => api.deleteNote(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['notes'] });
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
        onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] }),
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
            if (secret.url?.toLowerCase().includes(query)) return true;
            if (secret.email?.toLowerCase().includes(query)) return true;
            if (secret.username?.toLowerCase().includes(query)) return true;
            if (secret.telephone_number?.toLowerCase().includes(query)) return true;
            if (secret.title?.toLowerCase().includes(query)) return true;
            return false;
        });
    }, [secrets, searchQuery]);

    const filteredNotes = useMemo(() => {
        if (!searchQuery) return notes;
        const query = searchQuery.toLowerCase();
        return notes.filter(
            (note) =>
                note.title?.toLowerCase().includes(query) || note.content?.toLowerCase().includes(query)
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
            setSelectedSecrets(new Set(visibleSecrets.filter(s => favoriteSecretIds.has(s.id)).map(s => s.id)));
            setSelectedNotes(new Set(visibleNotes.filter(n => favoriteNoteIds.has(n.id)).map(n => n.id)));
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

        const total = secretIds.length + noteIds.length;
        let successCount = 0;
        let failCount = 0;

        try {
            const secretPromises = secretIds.map(id => api.deleteSecret(id));
            const notePromises = noteIds.map(id => api.deleteNote(id));

            const results = await Promise.allSettled([...secretPromises, ...notePromises]);

            results.forEach(result => {
                if (result.status === 'fulfilled') {
                    successCount++;
                } else {
                    failCount++;
                }
            });

            // Invalidate queries ONCE
            qc.invalidateQueries({ queryKey: ['secrets'] });
            qc.invalidateQueries({ queryKey: ['notes'] });

            // Show result feedback
            if (failCount === 0) {
                setFeedbackModal({
                    visible: true,
                    title: t('common.success'),
                    message: t('vault.bulkDeleteSuccess', { count: successCount }),
                    type: 'success'
                });
            } else {
                setFeedbackModal({
                    visible: true,
                    title: t('common.warning'),
                    message: t('vault.bulkDeletePartialError', { success: successCount, fail: failCount }),
                    type: 'info'
                });
            }

        } catch (error) {
            setFeedbackModal({
                visible: true,
                title: t('common.error'),
                message: 'Unexpected error during bulk deletion.',
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
        resetForm();
        setCreateType(type);
        setCreateModalVisible(true);
        setShowCreateMenu(false);
    };

    // --- Import Logic ---

    const parseGoogleCSV = (content: string) => {
        const lines = content.split(/\r\n|\n/);
        const headers = lines[0].toLowerCase().split(',');
        const result = [];

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
                // Map common Google export headers
                if (header === 'name') entry.title = value;
                else if (header === 'url') entry.url = value;
                else if (header === 'username') entry.username = value;
                else if (header === 'password') entry.password = value;
                else if (header === 'note') entry.note = value; // Notes are not currently supported in Secret entity, maybe append to title? Or ignore.
            });

            if (entry.title && entry.password) {
                result.push(entry);
            }
        }
        return result;
    };

    const isSecretDuplicate = (newSecret: any, existingSecret: Secret) => {
        // Precise comparison of key fields
        // Note: CSV fields are strings, API fields might be null/undefined. Treat null/undefined as empty string.
        const sTitle = existingSecret.title || '';
        const sUsername = existingSecret.username || '';
        const sPassword = existingSecret.password || '';
        const sUrl = existingSecret.url || '';

        const nTitle = newSecret.title || '';
        const nUsername = newSecret.username || '';
        const nPassword = newSecret.password || '';
        const nUrl = newSecret.url || '';

        return sTitle === nTitle && sUsername === nUsername && sPassword === nPassword && sUrl === nUrl;
    };

    const processImportQueue = async (queue: any[], startIndex: number, skippedCount: number) => {
        setIsImporting(true);
        setImportProgress(prev => ({ ...prev, total: queue.length, current: startIndex, skipped: skippedCount }));

        for (let i = startIndex; i < queue.length; i++) {
            if (stopImportRequested) {
                break;
            }

            const item = queue[i];
            setImportProgress(prev => ({ ...prev, current: i + 1 }));

            try {
                await api.createSecret({
                    title: item.title,
                    username: item.username || '',
                    password: item.password,
                    url: item.url || '',
                });
                setImportProgress(prev => ({ ...prev, successCount: prev.successCount + 1 }));
            } catch (error: any) {
                setIsImporting(false);
                setImportError({
                    title: item.title,
                    error: error.message || 'Unknown error',
                });
                return; // Stop on error
            }
        }

        setIsImporting(false);
        setImportQueue([]);
        setImportError(null);
        // Only invalidate once at the end
        qc.invalidateQueries({ queryKey: ['secrets'] });

        setFeedbackModal({
            visible: true,
            title: t('vault.importSuccess'),
            message: skippedCount > 0
                ? t('vault.importSuccessWithSkipped', { count: queue.length, skipped: skippedCount })
                : t('vault.importSuccessDesc', { count: queue.length }),
            type: 'success'
        });
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
                type: ['text/csv', 'text/comma-separated-values', '*/*'],
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
            const parsedItems = parseGoogleCSV(fileContent);

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
                const isDup = secrets.some(existing => isSecretDuplicate(item, existing));
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
                const isFav = favoriteSecretIds.has(s.id);
                // If showFavoritesOnly is on, only include favorites
                if (!showFavoritesOnly || isFav) {
                    items.push({ item: s, type: 'secret', isFavorite: isFav });
                }
            });
        }
        if (showNotes) {
            filteredNotes.forEach((n) => {
                const isFav = favoriteNoteIds.has(n.id);
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

        return items;
    }, [filteredSecrets, filteredNotes, showSecrets, showNotes, showFavoritesOnly, favoriteSecretIds, favoriteNoteIds]);

    const handleEditNote = (note: Note) => {
        router.push(`/(main)/vault/editor?id=${note.id}`);
    };

    const renderItem = useCallback(
        ({ item }: { item: { item: Secret | Note; type: ItemType; isFavorite: boolean } }) => {
            const isSelected = item.type === 'secret'
                ? selectedSecrets.has(item.item.id)
                : selectedNotes.has(item.item.id);

            if (item.type === 'secret') {

                return (
                    <SecretItem
                        secret={item.item as Secret}
                        onPress={() => router.push(`/(main)/vault/${item.item.id}?type=secret`)}
                        onEdit={() => openEditModal('secret', item.item)}
                        onClone={() => cloneSecretMutation.mutate(item.item as Secret)}
                        onDelete={() => {
                            setDeleteTarget({ type: 'secret', id: item.item.id });
                            setDeleteModalVisible(true);
                        }}
                        // Selection Props
                        selectionMode={selectionMode}
                        isSelected={isSelected}
                        onSelect={() => toggleItemSelection('secret', item.item.id)}
                        onLongPress={() => !selectionMode && toggleSelectionMode({ type: 'secret', id: item.item.id })}
                    />
                );
            }
            return (
                <NoteItem
                    note={item.item as Note}
                    onPress={() => router.push(`/(main)/vault/${item.item.id}?type=note`)}
                    onEdit={() => handleEditNote(item.item as Note)}
                    onClone={() => cloneNoteMutation.mutate(item.item as Note)}
                    onDelete={() => {
                        setDeleteTarget({ type: 'note', id: item.item.id });
                        setDeleteModalVisible(true);
                    }}
                    // Selection Props
                    selectionMode={selectionMode}
                    isSelected={isSelected}
                    onSelect={() => toggleItemSelection('note', item.item.id)}
                    onLongPress={() => !selectionMode && toggleSelectionMode({ type: 'note', id: item.item.id })}
                />
            );
        },
        [router, cloneSecretMutation, cloneNoteMutation, selectionMode, selectedSecrets, selectedNotes]
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.colors.bg }]}>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{t('vault.title')}</Text>

                {/* Search & Create */}
                <View style={styles.headerActions}>
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
                                    <Ionicons name="lock-closed-outline" size={18} color={theme.colors.text} />
                                    <Text style={[styles.createMenuText, { color: theme.colors.text }]}>{t('vault.newSecret')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.createMenuItem}
                                    onPress={() => {
                                        router.push('/(main)/vault/editor');
                                        setShowCreateMenu(false);
                                    }}
                                >
                                    <Ionicons name="document-text-outline" size={18} color={theme.colors.text} />
                                    <Text style={[styles.createMenuText, { color: theme.colors.text }]}>{t('vault.newNote')}</Text>
                                </TouchableOpacity>
                                <View style={[styles.menuDivider, { backgroundColor: theme.colors.border }]} />
                                <TouchableOpacity
                                    style={styles.createMenuItem}
                                    onPress={handleImportFromGoogle}
                                >
                                    <Ionicons name="cloud-download-outline" size={18} color={theme.colors.text} />
                                    <Text style={[styles.createMenuText, { color: theme.colors.text }]}>{t('vault.importFromGoogle')}</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                    </View>
                </View>
            </View>

            {/* Filter buttons */}
            <View style={styles.filterRow}>
                {/* <Text style={[styles.filterLabel, { color: theme.colors.textMuted }]}>{t('vault.include')}</Text> */}
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

            {/* Search Results Indicator */}
            {searchQuery.trim() !== '' && !selectionMode && (
                <View style={styles.searchIndicator}>
                    <Text style={[styles.searchIndicatorText, { color: theme.colors.textMuted }]}>
                        {t('vault.searchResults', { query: searchQuery, count: combinedItems.length })}
                    </Text>
                </View>
            )}

            {/* List */}
            <FlatList
                data={combinedItems}
                keyExtractor={(item, index) => `${item.type}-${item.item.id}-${index}`}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={secretsLoading || notesLoading}
                        onRefresh={handleRefresh}
                        tintColor={theme.colors.accent}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="folder-open-outline" size={48} color={theme.colors.textMuted} />
                        <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                            {isLoading ? t('common.loading') : t('vault.noItems')}
                        </Text>
                    </View>
                }
            />

            {/* Selection Bar */}
            {selectionMode && (
                <View style={[styles.selectionBar, { backgroundColor: theme.colors.surfaceElevated, borderTopColor: theme.colors.border }]}>
                    <View style={styles.selectionLeft}>
                        <TouchableOpacity style={styles.closeSelectionButton} onPress={cancelSelection}>
                            <Ionicons name="close" size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                        <Text style={[styles.selectionCount, { color: theme.colors.text }]}>
                            {t('vault.selectedCount', { count: selectedSecrets.size + selectedNotes.size })}
                        </Text>
                    </View>

                    <View style={styles.selectionActions}>
                        <TouchableOpacity style={styles.selectionActionButton} onPress={selectAll}>
                            <Ionicons name="checkmark-done-outline" size={22} color={theme.colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.selectionActionButton, { backgroundColor: theme.colors.error + '20' }]}
                            onPress={() => {
                                if (selectedSecrets.size + selectedNotes.size > 0) {
                                    setBulkDeleteConfirmVisible(true);
                                }
                            }}
                        >
                            <Ionicons name="trash-outline" size={22} color={theme.colors.error} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Delete Modal */}
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

            {/* Bulk Delete Confirm Modal */}
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

            {/* Import Confirm Modal */}
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

                    <Text style={[styles.modalText, { color: theme.colors.textMuted, fontSize: 12, fontStyle: 'italic', marginTop: 4 }]}>
                        {t('vault.importConfirmDesc')}
                    </Text>
                </View>
            </Modal>

            {/* Import Failure Modal */}
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

            {/* Feedback Modal */}
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
            {isImporting && (
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
            )}

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
        </View>
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
        paddingBottom: 16,
    },
    headerTitle: {
        fontSize: 32,
        fontFamily: 'Comfortaa_700Bold',
        marginBottom: 16,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
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
        paddingHorizontal: 20,
        gap: 10,
        paddingBottom: 12,
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
});
