import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { NoteItem } from '@/components/vault/NoteItem';
import { SecretItem } from '@/components/vault/SecretItem';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { api, Note, Secret } from '@/services/api';
import { useFavoritesStore } from '@/stores/favorites';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
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
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
    const [showCreateMenu, setShowCreateMenu] = useState(false);

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

    // React Query - Secrets
    const {
        data: secrets = [],
        isLoading: secretsLoading,
        refetch: refetchSecrets,
    } = useQuery({
        queryKey: ['secrets'],
        queryFn: () => api.getSecrets(),
    });

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
                />
            );
        },
        [router, cloneSecretMutation, cloneNoteMutation]
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
            {searchQuery.trim() !== '' && (
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

            {/* Delete Modal */}
            <Modal
                visible={deleteModalVisible}
                onClose={() => setDeleteModalVisible(false)}
                title={t('vault.deleteItem')}
                message={t('vault.deleteConfirm')}
                confirmText={t('common.delete')}
                onConfirm={handleDelete}
                variant="danger"
            />

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
        gap: 10,
    },
    createMenuText: {
        fontSize: 14,
        fontFamily: 'Comfortaa_500Medium',
    },
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 16,
        gap: 10,
    },
    filterLabel: {
        fontSize: 13,
        fontFamily: 'Comfortaa_500Medium',
        marginRight: 4,
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        gap: 6,
    },
    filterButtonText: {
        fontSize: 13,
        fontFamily: 'Comfortaa_500Medium',
    },
    list: {
        paddingHorizontal: 20,
        paddingBottom: 120,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
        gap: 12,
    },
    emptyText: {
        fontSize: 15,
        fontFamily: 'Comfortaa_500Medium',
    },
    formScroll: {
        maxHeight: 350,
        marginBottom: 16,
    },
    searchIndicator: {
        paddingHorizontal: 20,
        paddingVertical: 8,
    },
    searchIndicatorText: {
        fontSize: 13,
        fontFamily: 'Comfortaa_500Medium',
        fontStyle: 'italic',
    },
});
