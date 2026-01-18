import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { getDomainColor } from '@/constants/themes';
import { useTheme } from '@/contexts/ThemeContext';
import { api, Note, Secret } from '@/services/api';
import { useFavoritesStore } from '@/stores/favorites';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Markdown from 'react-native-markdown-display';

export default function VaultDetailPage() {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const router = useRouter();
    const { id, type } = useLocalSearchParams<{ id: string; type: 'secret' | 'note' }>();

    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const { isSecretFavorited, isNoteFavorited, toggleSecretFavorite, toggleNoteFavorite } =
        useFavoritesStore();

    // Combined query to fetch either secret or note
    const { data: item, isLoading, error } = useQuery({
        queryKey: type === 'secret' ? ['secret', id] : ['note', id],
        queryFn: () => {
            if (!id) return null;
            return type === 'secret' ? api.getSecret(id) : api.getNote(id);
        },
        enabled: !!id,
    });

    const isFavorited =
        type === 'secret' ? isSecretFavorited(id || '') : isNoteFavorited(id || '');

    const handleDelete = async () => {
        if (!id) return;
        try {
            if (type === 'secret') {
                await api.deleteSecret(id);
            } else {
                await api.deleteNote(id);
            }
            router.back();
        } catch (error) {
            console.error('Delete failed:', error);
        }
    };

    const handleToggleFavorite = () => {
        if (!id) return;
        if (type === 'secret') {
            toggleSecretFavorite(id);
        } else {
            toggleNoteFavorite(id);
        }
    };

    const copyToClipboard = async (text: string) => {
        await Clipboard.setStringAsync(text);
    };

    const renderSecretDetail = (secret: Secret) => {
        const domainColor = getDomainColor(secret.url);

        return (
            <>
                {/* Header with color */}
                <View style={[styles.colorHeader, { backgroundColor: domainColor + '20' }]}>
                    <View style={[styles.colorDot, { backgroundColor: domainColor }]} />
                    <Text style={[styles.title, { color: theme.colors.text }]}>{secret.title}</Text>
                    {isFavorited && (
                        <Ionicons name="star" size={20} color={theme.colors.warning} />
                    )}
                </View>

                {/* Fields */}
                <View style={styles.fields}>
                    {secret.url && (
                        <DetailRow
                            label={t('vault.url')}
                            value={secret.url}
                            icon="globe-outline"
                            onCopy={() => copyToClipboard(secret.url!)}
                            theme={theme}
                        />
                    )}
                    {secret.email && (
                        <DetailRow
                            label={t('auth.email')}
                            value={secret.email}
                            icon="mail-outline"
                            onCopy={() => copyToClipboard(secret.email!)}
                            theme={theme}
                        />
                    )}
                    {secret.username && (
                        <DetailRow
                            label={t('vault.username')}
                            value={secret.username}
                            icon="person-outline"
                            onCopy={() => copyToClipboard(secret.username!)}
                            theme={theme}
                        />
                    )}
                    {secret.password && (
                        <DetailRow
                            label={t('vault.password')}
                            value={showPassword ? secret.password : '••••••••••••'}
                            icon="lock-closed-outline"
                            onCopy={() => copyToClipboard(secret.password!)}
                            onToggleVisibility={() => setShowPassword(!showPassword)}
                            showToggle
                            isHidden={!showPassword}
                            theme={theme}
                        />
                    )}
                    {secret.telephone_number && (
                        <DetailRow
                            label={t('vault.phone')}
                            value={secret.telephone_number}
                            icon="call-outline"
                            onCopy={() => copyToClipboard(secret.telephone_number!)}
                            theme={theme}
                        />
                    )}
                </View>
            </>
        );
    };


    // ... (inside component)

    const renderNoteDetail = (note: Note) => (
        <>
            <View style={styles.noteHeader}>
                <Ionicons name="document-text" size={32} color={theme.colors.accent} />
                <Text style={[styles.title, { color: theme.colors.text }]}>{note.title}</Text>
                {isFavorited && (
                    <Text style={[styles.favoriteLabel, { color: theme.colors.warning }]}>
                        ⭐ {t('common.favorited')}
                    </Text>
                )}
            </View>

            {note.content && (
                <View style={[styles.contentBox, { backgroundColor: theme.colors.surface }]}>
                    <Markdown
                        style={{
                            body: { color: theme.colors.text, fontFamily: 'Comfortaa_400Regular' },
                            heading1: { color: theme.colors.accent, fontFamily: 'Comfortaa_700Bold' },
                            heading2: { color: theme.colors.accent, fontFamily: 'Comfortaa_700Bold' },
                            code_inline: { backgroundColor: theme.colors.surfaceElevated, color: theme.colors.text },
                            code_block: { backgroundColor: theme.colors.surfaceElevated, color: theme.colors.text },
                        }}
                    >
                        {note.content}
                    </Markdown>
                </View>
            )}

            <View style={{ marginTop: 20 }}>
                <Button
                    title={t('common.edit')}
                    onPress={() => router.push(`/(main)/vault/editor?id=${note.id}`)}
                    variant="primary"
                    icon={<Ionicons name="create-outline" size={18} color="#fff" />}
                />
            </View>
        </>
    );

    if (isLoading) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.bg }]}>
                <Text style={{ color: theme.colors.textMuted }}>{t('common.loading')}</Text>
            </View>
        );
    }

    if (!item) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.bg }]}>
                <Text style={{ color: theme.colors.textMuted }}>{t('vault.itemNotFound')}</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                    {type === 'secret' ? t('vault.secret') : t('vault.note')}
                </Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {type === 'secret'
                    ? renderSecretDetail(item as Secret)
                    : renderNoteDetail(item as Note)}

                {/* Timestamps */}
                <View style={styles.timestamps}>
                    <Text style={[styles.timestamp, { color: theme.colors.textMuted }]}>
                        {t('common.created')} {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                    <Text style={[styles.timestamp, { color: theme.colors.textMuted }]}>
                        {t('common.updated')} {new Date(item.updated_at).toLocaleDateString()}
                    </Text>
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                    <Button
                        title={isFavorited ? t('common.unfavorite') : t('common.favorite')}
                        onPress={handleToggleFavorite}
                        variant="outline"
                        icon={<Ionicons name={isFavorited ? 'star' : 'star-outline'} size={18} color={theme.colors.accent} />}
                    />
                    <Button
                        title={t('common.delete')}
                        onPress={() => setDeleteModalVisible(true)}
                        variant="danger"
                        icon={<Ionicons name="trash-outline" size={18} color="#fff" />}
                    />
                </View>
            </ScrollView>

            <Modal
                visible={deleteModalVisible}
                onClose={() => setDeleteModalVisible(false)}
                title={t('vault.deleteItem')}
                message={t('vault.deleteConfirm')}
                confirmText={t('common.delete')}
                onConfirm={handleDelete}
                variant="danger"
            />
        </View>
    );
}

// Detail row component
interface DetailRowProps {
    label: string;
    value: string;
    icon: string;
    onCopy: () => void;
    onToggleVisibility?: () => void;
    showToggle?: boolean;
    isHidden?: boolean;
    theme: any;
}

function DetailRow({
    label,
    value,
    icon,
    onCopy,
    onToggleVisibility,
    showToggle,
    isHidden,
    theme,
}: DetailRowProps) {
    return (
        <View style={[detailStyles.row, { backgroundColor: theme.colors.surface }]}>
            <View style={detailStyles.labelRow}>
                <Ionicons name={icon as any} size={16} color={theme.colors.textMuted} />
                <Text style={[detailStyles.label, { color: theme.colors.textMuted }]}>{label}</Text>
            </View>
            <View style={detailStyles.valueRow}>
                <Text
                    style={[detailStyles.value, { color: theme.colors.text }]}
                    numberOfLines={2}
                    selectable
                >
                    {value}
                </Text>
                <View style={detailStyles.actions}>
                    {showToggle && (
                        <TouchableOpacity onPress={onToggleVisibility} style={detailStyles.actionBtn}>
                            <Ionicons
                                name={isHidden ? 'eye-outline' : 'eye-off-outline'}
                                size={18}
                                color={theme.colors.textMuted}
                            />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={onCopy} style={detailStyles.actionBtn}>
                        <Ionicons name="copy-outline" size={18} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    backButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Comfortaa_700Bold',
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    colorHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderRadius: 16,
        marginBottom: 20,
        gap: 14,
    },
    colorDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
    },
    title: {
        flex: 1,
        fontSize: 22,
        fontFamily: 'Comfortaa_700Bold',
    },
    noteHeader: {
        alignItems: 'center',
        paddingVertical: 24,
        gap: 12,
    },
    favoriteLabel: {
        fontSize: 14,
        fontFamily: 'Comfortaa_500Medium',
    },
    contentBox: {
        padding: 20,
        borderRadius: 16,
        marginBottom: 20,
    },
    contentText: {
        fontSize: 15,
        fontFamily: 'Comfortaa_400Regular',
        lineHeight: 24,
    },
    fields: {
        gap: 12,
    },
    timestamps: {
        marginTop: 24,
        marginBottom: 32,
        gap: 6,
    },
    timestamp: {
        fontSize: 12,
        fontFamily: 'Comfortaa_400Regular',
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
});

const detailStyles = StyleSheet.create({
    row: {
        padding: 16,
        borderRadius: 14,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    label: {
        fontSize: 12,
        fontFamily: 'Comfortaa_500Medium',
        textTransform: 'uppercase',
    },
    valueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    value: {
        flex: 1,
        fontSize: 15,
        fontFamily: 'Comfortaa_500Medium',
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionBtn: {
        padding: 6,
    },
});
