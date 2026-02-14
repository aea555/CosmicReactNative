import { getDomainColor } from '@/constants/themes';
import { useTheme } from '@/contexts/ThemeContext';
import { api, type Secret } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SecretItemProps {
    secret: Secret;
    onPress: (secret: Secret) => void;
    onEdit: (secret: Secret) => void;
    onClone: (secret: Secret) => void;
    onDelete: (secret: Secret) => void;
    onFavoriteToggle?: (secret: Secret) => void;
    // Selection Props
    selectionMode?: boolean;
    isSelected?: boolean;
    onSelect?: (id: string, type: 'secret') => void;
    onLongPress?: (id: string, type: 'secret') => void;
}

export const SecretItem = React.memo(function SecretItem({
    secret,
    onPress,
    onEdit,
    onClone,
    onDelete,
    onFavoriteToggle,
    selectionMode = false,
    isSelected = false,
    onSelect,
    onLongPress
}: SecretItemProps) {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const queryClient = useQueryClient();
    // Use server-side is_favorite property
    const isFavorited = !!secret.is_favorite;
    const [showMenu, setShowMenu] = React.useState(false);
    const [menuPosition, setMenuPosition] = React.useState({ top: 0, right: 0 });
    const menuButtonRef = React.useRef<View>(null);

    const domainColor = getDomainColor(secret.url);

    const secondaryText = secret.email || secret.username || secret.telephone_number || '';

    const handleCopyPassword = async () => {
        if (secret.password) {
            await Clipboard.setStringAsync(secret.password);
        }
    };

    const handleFavorite = async () => {
        setShowMenu(false);
        try {
            if (isFavorited) {
                await api.unfavoriteSecret(secret.id);
            } else {
                await api.favoriteSecret(secret.id);
            }
            queryClient.invalidateQueries({ queryKey: ['secrets'] });
            queryClient.invalidateQueries({ queryKey: ['secret', secret.id] });
            onFavoriteToggle?.(secret);
        } catch (error) {
            console.error('Favorite toggle failed:', error);
        }
    };

    const handleShowMenu = () => {
        if (selectionMode) return; // Disable menu in selection mode
        menuButtonRef.current?.measureInWindow((x, y, width, height) => {
            setMenuPosition({
                top: y + height + 4,
                right: SCREEN_WIDTH - x - width,
            });
            setShowMenu(true);
        });
    };

    return (
        <>
            <TouchableOpacity
                style={[styles.container, { backgroundColor: theme.colors.surface }]}
                onPress={() => selectionMode ? onSelect?.(secret.id, 'secret') : onPress(secret)}
                onLongPress={() => onLongPress?.(secret.id, 'secret')}
                delayLongPress={300}
                activeOpacity={0.7}
            >
                {/* Selection Checkbox */}
                {selectionMode && (
                    <View style={styles.selectionContainer}>
                        <Ionicons
                            name={isSelected ? "checkbox" : "square-outline"}
                            size={24}
                            color={isSelected ? theme.colors.accent : theme.colors.textMuted}
                        />
                    </View>
                )}

                <View style={[styles.iconContainer, { backgroundColor: domainColor + '15' }]}>
                    <Text style={[styles.domainInitial, { color: domainColor }]}>
                        {secret.title.charAt(0).toUpperCase()}
                    </Text>
                    {isFavorited && (
                        <View style={[styles.favoriteBadge, { borderColor: theme.colors.surface }]}>
                            <Ionicons name="star" size={10} color="#fff" />
                        </View>
                    )}
                </View>

                <View style={styles.content}>
                    <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
                        {secret.title}
                    </Text>
                    {secondaryText ? (
                        <Text style={[styles.secondaryText, { color: theme.colors.textMuted }]} numberOfLines={1}>
                            {secondaryText}
                        </Text>
                    ) : null}
                </View>

                {/* Hide actions in selection mode */}
                {!selectionMode && (
                    <View style={styles.actions}>
                        {/* Copy Password Button (if password exists) */}
                        {secret.password && (
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: theme.colors.bg }]}
                                onPress={handleCopyPassword}
                            >
                                <Ionicons name="copy-outline" size={16} color={theme.colors.textMuted} />
                            </TouchableOpacity>
                        )}

                        {/* Menu Button */}
                        <View ref={menuButtonRef} collapsable={false}>
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: theme.colors.bg }]}
                                onPress={handleShowMenu}
                            >
                                <Ionicons name="ellipsis-vertical" size={16} color={theme.colors.textMuted} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </TouchableOpacity>

            <Modal
                transparent
                visible={showMenu}
                onRequestClose={() => setShowMenu(false)}
                animationType="fade"
            >
                <TouchableWithoutFeedback onPress={() => setShowMenu(false)}>
                    <View style={styles.modalOverlay}>
                        <View
                            style={[
                                styles.menuContainer,
                                {
                                    top: menuPosition.top,
                                    right: menuPosition.right,
                                    backgroundColor: theme.colors.surface,
                                    shadowColor: "#000",
                                }
                            ]}
                        >
                            <TouchableOpacity style={styles.menuItem} onPress={handleFavorite}>
                                <Ionicons
                                    name={isFavorited ? "star" : "star-outline"}
                                    size={18}
                                    color={isFavorited ? "#fbbf24" : theme.colors.text}
                                />
                                <Text style={[styles.menuText, { color: theme.colors.text }]}>
                                    {isFavorited ? t('common.unfavorite') : t('common.favorite')}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); onEdit(secret); }}>
                                <Ionicons name="create-outline" size={18} color={theme.colors.text} />
                                <Text style={[styles.menuText, { color: theme.colors.text }]}>{t('common.edit')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); onClone(secret); }}>
                                <Ionicons name="duplicate-outline" size={18} color={theme.colors.text} />
                                <Text style={[styles.menuText, { color: theme.colors.text }]}>{t('common.clone')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.menuItem, styles.deleteItem]} onPress={() => { setShowMenu(false); onDelete(secret); }}>
                                <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                                <Text style={[styles.menuText, { color: theme.colors.error }]}>{t('common.delete')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </>
    );
});

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
    },
    selectionContainer: {
        marginRight: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    domainInitial: {
        fontSize: 18,
        fontFamily: 'Comfortaa_700Bold',
    },
    favoriteBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#fbbf24',
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
    },
    content: {
        flex: 1,
        marginRight: 8,
    },
    title: {
        fontSize: 16,
        fontFamily: 'Comfortaa_700Bold',
        marginBottom: 2,
    },
    secondaryText: {
        fontSize: 13,
        fontFamily: 'Comfortaa_500Medium',
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    menuContainer: {
        position: 'absolute',
        minWidth: 180,
        borderRadius: 12,
        padding: 8,
        elevation: 5,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        gap: 12,
        borderRadius: 8,
    },
    deleteItem: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
        marginTop: 4,
    },
    menuText: {
        fontSize: 14,
        fontFamily: 'Comfortaa_500Medium',
    }
});
