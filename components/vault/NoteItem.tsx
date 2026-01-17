import { useTheme } from '@/contexts/ThemeContext';
import type { Note } from '@/services/api';
import { useFavoritesStore } from '@/stores/favorites';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
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
}

export function NoteItem({ note, onPress, onEdit, onClone, onDelete, onFavoriteToggle }: NoteItemProps) {
    const { theme } = useTheme();
    const { isNoteFavorited, toggleNoteFavorite } = useFavoritesStore();
    const [showMenu, setShowMenu] = React.useState(false);
    const [menuPosition, setMenuPosition] = React.useState({ top: 0, right: 0 });
    const menuButtonRef = React.useRef<View>(null);

    const isFavorited = isNoteFavorited(note.id);

    const handleFavorite = () => {
        toggleNoteFavorite(note.id);
        setShowMenu(false);
        onFavoriteToggle?.();
    };

    const handleShowMenu = () => {
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
                onPress={onPress}
                activeOpacity={0.7}
            >
                <View style={[styles.iconContainer, { backgroundColor: theme.colors.surfaceElevated }]}>
                    <Ionicons name="document-text-outline" size={20} color={theme.colors.accent} />
                </View>

                <View style={styles.content}>
                    <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
                        {note.title || 'Untitled Note'}
                    </Text>
                    {isFavorited && (
                        <Text style={[styles.favoriteLabel, { color: theme.colors.warning }]}>
                            ⭐ Favorited
                        </Text>
                    )}
                </View>

                <View ref={menuButtonRef} collapsable={false}>
                    <TouchableOpacity
                        style={styles.menuButton}
                        onPress={handleShowMenu}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="ellipsis-vertical" size={18} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>

            {/* Dropdown Menu Modal */}
            <Modal
                visible={showMenu}
                transparent
                animationType="fade"
                onRequestClose={() => setShowMenu(false)}
            >
                <TouchableWithoutFeedback onPress={() => setShowMenu(false)}>
                    <View style={styles.modalOverlay}>
                        <View
                            style={[
                                styles.menu,
                                {
                                    backgroundColor: theme.colors.surfaceElevated,
                                    top: menuPosition.top,
                                    right: menuPosition.right,
                                },
                            ]}
                        >
                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => { onEdit(); setShowMenu(false); }}
                            >
                                <Ionicons name="pencil-outline" size={16} color={theme.colors.text} />
                                <Text style={[styles.menuText, { color: theme.colors.text }]}>Edit</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => { onClone(); setShowMenu(false); }}
                            >
                                <Ionicons name="copy-outline" size={16} color={theme.colors.text} />
                                <Text style={[styles.menuText, { color: theme.colors.text }]}>Clone</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={handleFavorite}
                            >
                                <Ionicons
                                    name={isFavorited ? 'star' : 'star-outline'}
                                    size={16}
                                    color={isFavorited ? theme.colors.warning : theme.colors.text}
                                />
                                <Text style={[styles.menuText, { color: theme.colors.text }]}>
                                    {isFavorited ? 'Unfavorite' : 'Favorite'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => { onDelete(); setShowMenu(false); }}
                            >
                                <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
                                <Text style={[styles.menuText, { color: theme.colors.error }]}>Delete</Text>
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
        padding: 16,
        borderRadius: 14,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    content: {
        flex: 1,
        marginRight: 12,
    },
    title: {
        fontSize: 15,
        fontFamily: 'Comfortaa_500Medium',
        marginBottom: 2,
    },
    favoriteLabel: {
        fontSize: 12,
        fontFamily: 'Comfortaa_400Regular',
        marginTop: 2,
    },
    menuButton: {
        padding: 6,
    },
    modalOverlay: {
        flex: 1,
    },
    menu: {
        position: 'absolute',
        borderRadius: 12,
        padding: 8,
        minWidth: 150,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 10,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        gap: 10,
    },
    menuText: {
        fontSize: 14,
        fontFamily: 'Comfortaa_500Medium',
    },
});
