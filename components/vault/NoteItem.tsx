import { useTheme } from '@/contexts/ThemeContext';
import type { Note } from '@/services/api';
import { useFavoritesStore } from '@/stores/favorites';
import { Ionicons } from '@expo/vector-icons';
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

interface NoteItemProps {
    note: Note;
    onPress: () => void;
    onEdit: () => void;
    onClone: () => void;
    onDelete: () => void;
    onFavoriteToggle?: () => void;
    // Selection Props
    selectionMode?: boolean;
    isSelected?: boolean;
    onSelect?: () => void;
    onLongPress?: () => void;
}

export function NoteItem({
    note,
    onPress,
    onEdit,
    onClone,
    onDelete,
    onFavoriteToggle,
    selectionMode = false,
    isSelected = false,
    onSelect,
    onLongPress
}: NoteItemProps) {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const isFavorited = useFavoritesStore((state) => state.favoriteNoteIds.has(note.id));
    const toggleNoteFavorite = useFavoritesStore((state) => state.toggleNoteFavorite);
    const [showMenu, setShowMenu] = React.useState(false);
    const [menuPosition, setMenuPosition] = React.useState({ top: 0, right: 0 });
    const menuButtonRef = React.useRef<View>(null);


    const handleFavorite = () => {
        toggleNoteFavorite(note.id);
        setShowMenu(false);
        onFavoriteToggle?.();
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

    const handlePress = () => {
        if (selectionMode) {
            onSelect?.();
        } else {
            onPress();
        }
    };

    return (
        <>
            <TouchableOpacity
                style={[styles.container, { backgroundColor: theme.colors.surface }]}
                onPress={handlePress}
                onLongPress={onLongPress}
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

                <View style={[styles.iconContainer, { backgroundColor: theme.colors.accent + '15' }]}>
                    <Ionicons name="document-text-outline" size={20} color={theme.colors.accent} />
                    {isFavorited && (
                        <View style={[styles.favoriteBadge, { borderColor: theme.colors.surface }]}>
                            <Ionicons name="star" size={10} color="#fff" />
                        </View>
                    )}
                </View>

                <View style={styles.content}>
                    <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
                        {note.title}
                    </Text>
                </View>

                {!selectionMode && (
                    <View style={styles.actions}>
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
                            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); onEdit(); }}>
                                <Ionicons name="create-outline" size={18} color={theme.colors.text} />
                                <Text style={[styles.menuText, { color: theme.colors.text }]}>{t('common.edit')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); onClone(); }}>
                                <Ionicons name="duplicate-outline" size={18} color={theme.colors.text} />
                                <Text style={[styles.menuText, { color: theme.colors.text }]}>{t('common.clone')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.menuItem, styles.deleteItem]} onPress={() => { setShowMenu(false); onDelete(); }}>
                                <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                                <Text style={[styles.menuText, { color: theme.colors.error }]}>{t('common.delete')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </>
    );
}

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
        fontWeight: '600',
        marginBottom: 2,
    },
    secondaryText: {
        fontSize: 13,
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
        width: 180,
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
        fontWeight: '500',
    },
});
