import { Modal } from '@/components/ui/Modal';
import { useTheme } from '@/contexts/ThemeContext';
import { api } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    type NativeSyntheticEvent,
    type TextInputSelectionChangeEventData,
} from 'react-native';

import Markdown from 'react-native-markdown-display';

export default function NoteEditorPage() {
    const { id: initialId } = useLocalSearchParams<{ id: string }>();
    const [noteId, setNoteId] = useState<string | undefined>(initialId);
    const isEditing = !!noteId;
    const { theme } = useTheme();
    const { t } = useTranslation();
    const router = useRouter();
    const queryClient = useQueryClient();

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showSavingIndicator, setShowSavingIndicator] = useState(false);

    // Track if we've created the note already
    const [isCreated, setIsCreated] = useState(!!initialId);
    const isCreatingRef = useRef(false);

    // Cursor position tracking via ref (uncontrolled)
    const selectionRef = useRef({ start: 0, end: 0 });
    const inputRef = useRef<TextInput>(null);

    // Error Modal State
    const [errorModalVisible, setErrorModalVisible] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [errorTitle, setErrorTitle] = useState('');

    const [lastSavedContent, setLastSavedContent] = useState('');
    const [lastSavedTitle, setLastSavedTitle] = useState('');

    // Search & Replace State
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [replaceQuery, setReplaceQuery] = useState('');
    const [searchMatchCount, setSearchMatchCount] = useState(0);
    const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

    useEffect(() => {
        if (initialId) {
            loadNote();
        }
    }, [initialId]);

    // Debounced auto-create for new notes (when title is entered)
    useEffect(() => {
        if (isCreated || isCreatingRef.current || !title.trim() || isLoading) return;

        const timer = setTimeout(async () => {
            if (isCreatingRef.current) return;
            isCreatingRef.current = true;

            try {
                setIsSaving(true);
                setShowSavingIndicator(true);
                const newNote = await api.createNote({ title, content });
                setNoteId(newNote.id);
                setIsCreated(true);
                setLastSavedTitle(title);
                setLastSavedContent(content);
                console.log('[Editor] Auto-create note success, invalidating notes...');
                await queryClient.invalidateQueries({ queryKey: ['notes'] });
                await queryClient.refetchQueries({ queryKey: ['notes'] }); // Also force refetch for background updates
                console.log('[Editor] Notes invalidated');
            } catch (error: any) {
                console.error('Auto-create failed:', error);
            } finally {
                setIsSaving(false);
                isCreatingRef.current = false;
                setTimeout(() => setShowSavingIndicator(false), 500);
            }
        }, 1500); // 1.5s debounce for create

        return () => clearTimeout(timer);
    }, [title, isCreated, isLoading]);

    // Debounced auto-save for existing notes
    useEffect(() => {
        if (!isCreated || !noteId || !title.trim() || isLoading || isSaving) return;

        // Skip if nothing has changed
        if (content === lastSavedContent && title === lastSavedTitle) return;

        const timer = setTimeout(async () => {
            try {
                setIsSaving(true);
                setShowSavingIndicator(true);
                await api.updateNote(noteId, { title, content });
                setLastSavedContent(content);
                setLastSavedTitle(title);
                console.log('[Editor] Auto-save note success, invalidating notes...');
                await queryClient.invalidateQueries({ queryKey: ['note', noteId] });
                await queryClient.invalidateQueries({ queryKey: ['notes'] });
                console.log('[Editor] Notes invalidated');
            } catch (error: any) {
                console.error('Auto-save failed:', error);
            } finally {
                setIsSaving(false);
                setTimeout(() => setShowSavingIndicator(false), 500);
            }
        }, 2000); // 2s debounce for save

        return () => clearTimeout(timer);
    }, [content, title, lastSavedContent, lastSavedTitle, isCreated, noteId]);

    const loadNote = async () => {
        try {
            setIsLoading(true);
            const data = await api.getNote(initialId!);
            setTitle(data.title);
            setContent(data.content || '');
            setLastSavedContent(data.content || '');
            setLastSavedTitle(data.title);
        } catch (error) {
            showError(t('errors.error'), t('errors.noteNotFound'));
            router.back();
        } finally {
            setIsLoading(false);
        }
    };

    const showError = (title: string, message: string) => {
        setErrorTitle(title);
        setErrorMessage(message);
        setErrorModalVisible(true);
    };

    const handleSave = async (silent = false) => {
        if (!title.trim()) {
            if (!silent) showError(t('errors.validationError'), t('vault.titleRequired'));
            return;
        }

        try {
            setIsSaving(true);
            setShowSavingIndicator(true);
            if (isCreated && noteId) {
                await api.updateNote(noteId, { title, content });
                setLastSavedContent(content);
                setLastSavedTitle(title);
            } else if (!isCreated) {
                const newNote = await api.createNote({ title, content });
                setNoteId(newNote.id);
                setIsCreated(true);
                setLastSavedTitle(title);
                setLastSavedContent(content);
            }

            console.log('[Editor] Manual save note success, invalidating notes...');
            await queryClient.invalidateQueries({ queryKey: ['notes'] });
            if (noteId) {
                await queryClient.invalidateQueries({ queryKey: ['note', noteId] });
            }
            console.log('[Editor] Notes invalidated, navigating back');

            if (!silent) router.back();
        } catch (error: any) {
            if (!silent) showError(t('errors.error'), error.message || t('errors.default'));
        } finally {
            setIsSaving(false);
            setTimeout(() => setShowSavingIndicator(false), 500);
        }
    };

    const handleSelectionChange = (event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
        const newSelection = event.nativeEvent.selection;
        selectionRef.current = newSelection;
        // Verify if we need to update state (e.g. for search navigation)
        // setSelection(newSelection); // Causing re-renders?
    };

    const insertMarkdown = (syntax: string) => {
        setContent(prev => prev + syntax);
    };

    // Search Logic
    const handleFindNext = () => {
        if (!searchQuery) return;
        const index = content.indexOf(searchQuery, selectionRef.current.end); // Search after cursor
        if (index !== -1) {
            // Found next
            const newSelection = { start: index, end: index + searchQuery.length };
            selectionRef.current = newSelection;
            // Use setNativeProps to set selection without causing re-render issues
            inputRef.current?.setNativeProps({ selection: newSelection });
            inputRef.current?.focus();
        } else {
            // Wrap around
            const wrapIndex = content.indexOf(searchQuery, 0);
            if (wrapIndex !== -1) {
                const newSelection = { start: wrapIndex, end: wrapIndex + searchQuery.length };
                selectionRef.current = newSelection;
                inputRef.current?.setNativeProps({ selection: newSelection });
                inputRef.current?.focus();
            }
        }
    };

    const handleReplace = () => {
        if (!searchQuery) return;
        // Check if current selection matches search query (to valid replacement)
        const currentSelText = content.substring(selectionRef.current.start, selectionRef.current.end);
        if (currentSelText === searchQuery) {
            const before = content.substring(0, selectionRef.current.start);
            const after = content.substring(selectionRef.current.end);
            const newContent = before + replaceQuery + after;
            setContent(newContent);
            // Move cursor after replacement
            const newCursorPos = selectionRef.current.start + replaceQuery.length;
            selectionRef.current = { start: newCursorPos, end: newCursorPos };
            // Use setTimeout to allow content to update before setting cursor
            setTimeout(() => {
                inputRef.current?.setNativeProps({ selection: { start: newCursorPos, end: newCursorPos } });
                inputRef.current?.focus();
            }, 50);
        } else {
            handleFindNext(); // Move to next to be ready
        }
    };

    const handleReplaceAll = () => {
        if (!searchQuery) return;
        const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedQuery, 'g');
        const newContent = content.replace(regex, replaceQuery);
        setContent(newContent);
    };


    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: theme.colors.bg, justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={theme.colors.accent} />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: theme.colors.bg }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <View style={{ flex: 1, paddingHorizontal: 12 }}>
                    <Text style={[styles.headerTitle, { color: theme.colors.text }]} numberOfLines={1}>
                        {title || (isEditing ? t('vault.editNote') : t('vault.newNote'))}
                    </Text>
                </View>

                {/* Header Actions */}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity onPress={() => setShowSearch(!showSearch)}>
                        <Ionicons name={showSearch ? "close-circle" : "search"} size={24} color={showSearch ? theme.colors.accent : theme.colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleSave(false)} disabled={isSaving}>
                        <Text style={[styles.saveButton, { color: theme.colors.accent }]}>{t('common.save')}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Search Bar */}
            {showSearch && (
                <View style={[styles.searchToolbar, { backgroundColor: theme.colors.surfaceElevated }]}>
                    <View style={styles.searchRow}>
                        <TextInput
                            style={[styles.searchInput, { color: theme.colors.text, backgroundColor: theme.colors.bg }]}
                            placeholder={t('vault.findPlaceholder')}
                            placeholderTextColor={theme.colors.textMuted}
                            value={searchQuery}
                            onChangeText={(text) => {
                                setSearchQuery(text);
                                // Reset cursor position when search changes
                                selectionRef.current = { start: 0, end: 0 };
                            }}
                        />
                        <TouchableOpacity onPress={handleFindNext} style={styles.searchBtn}>
                            <Ionicons name="arrow-down-outline" size={20} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.searchRow}>
                        <TextInput
                            style={[styles.searchInput, { color: theme.colors.text, backgroundColor: theme.colors.bg }]}
                            placeholder={t('vault.replacePlaceholder')}
                            placeholderTextColor={theme.colors.textMuted}
                            value={replaceQuery}
                            onChangeText={setReplaceQuery}
                        />
                        <TouchableOpacity onPress={handleReplace} style={styles.searchBtn}>
                            <Ionicons name="swap-horizontal-outline" size={20} color={theme.colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleReplaceAll} style={styles.searchBtn}>
                            <Ionicons name="documents-outline" size={20} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Mode Switch */}
            <View style={styles.modeSwitch}>
                <TouchableOpacity
                    style={[
                        styles.modeButton,
                        !isPreviewMode && { backgroundColor: theme.colors.surface, borderColor: theme.colors.accent },
                    ]}
                    onPress={() => setIsPreviewMode(false)}
                >
                    <Text
                        style={[
                            styles.modeText,
                            { color: !isPreviewMode ? theme.colors.accent : theme.colors.textMuted },
                        ]}
                    >
                        {t('vault.editor')}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.modeButton,
                        isPreviewMode && { backgroundColor: theme.colors.surface, borderColor: theme.colors.accent },
                    ]}
                    onPress={() => setIsPreviewMode(true)}
                >
                    <Text
                        style={[
                            styles.modeText,
                            { color: isPreviewMode ? theme.colors.accent : theme.colors.textMuted },
                        ]}
                    >
                        {t('vault.preview')}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Content Area */}
            <ScrollView
                style={styles.scrollContent}
                contentContainerStyle={{ flexGrow: 1, paddingBottom: !isPreviewMode ? 80 : 20 }}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.content}>
                    <TextInput
                        style={[styles.titleInput, { color: theme.colors.text, borderBottomColor: theme.colors.border }]}
                        placeholder={t('vault.noteTitlePlaceholder')}
                        placeholderTextColor={theme.colors.textMuted}
                        value={title}
                        onChangeText={setTitle}
                    />

                    {isPreviewMode ? (
                        <View style={styles.previewContainer}>
                            <Markdown
                                style={{
                                    body: { color: theme.colors.text, fontFamily: 'Comfortaa_400Regular' },
                                    heading1: { color: theme.colors.accent, fontFamily: 'Comfortaa_700Bold' },
                                    heading2: { color: theme.colors.accent, fontFamily: 'Comfortaa_700Bold' },
                                    code_inline: { backgroundColor: theme.colors.surface, color: theme.colors.text },
                                    code_block: { backgroundColor: theme.colors.surface, color: theme.colors.text },
                                    fence: { backgroundColor: theme.colors.surface, color: theme.colors.text, padding: 12, borderRadius: 8 },
                                    blockquote: {
                                        backgroundColor: theme.colors.surface,
                                        borderLeftColor: theme.colors.accent,
                                        borderLeftWidth: 4,
                                        paddingHorizontal: 10,
                                        paddingVertical: 5,
                                        color: theme.colors.textMuted,
                                    },
                                }}
                            >
                                {content || t('vault.noContent')}
                            </Markdown>
                        </View>
                    ) : (
                        <TextInput
                            ref={inputRef}
                            style={[
                                styles.editorInput,
                                {
                                    color: theme.colors.text,
                                    backgroundColor: theme.colors.surface + '40',
                                },
                            ]}
                            placeholder={t('vault.noteContentPlaceholder')}
                            placeholderTextColor={theme.colors.textMuted}
                            value={content}
                            onChangeText={setContent}
                            multiline
                            textAlignVertical="top"
                            scrollEnabled={true}
                            onSelectionChange={handleSelectionChange}
                        />
                    )}

                </View>
            </ScrollView>

            {/* Toolbar - Fixed at Bottom */}
            {!isPreviewMode && (
                <View style={[styles.toolbar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 16, alignItems: 'center', paddingHorizontal: 8 }}
                        keyboardShouldPersistTaps="always"
                    >
                        <Pressable onPressIn={() => insertMarkdown(t('markdown.headingPlaceholder'))}>
                            <Text style={{ color: theme.colors.text, fontWeight: 'bold', fontSize: 18 }}>H1</Text>
                        </Pressable>
                        <Pressable onPressIn={() => insertMarkdown(t('markdown.boldPlaceholder'))} style={styles.textIconParams}>
                            <Text style={{ color: theme.colors.text, fontWeight: '900', fontSize: 18, fontFamily: 'serif' }}>B</Text>
                        </Pressable>
                        <Pressable onPressIn={() => insertMarkdown(t('markdown.italicPlaceholder'))} style={styles.textIconParams}>
                            <Text style={{ color: theme.colors.text, fontStyle: 'italic', fontWeight: 'bold', fontSize: 18, fontFamily: 'serif' }}>I</Text>
                        </Pressable>
                        <Pressable onPressIn={() => insertMarkdown(t('markdown.listPlaceholder'))}>
                            <Ionicons name="list" size={24} color={theme.colors.text} />
                        </Pressable>
                        <Pressable onPressIn={() => insertMarkdown(t('markdown.quotePlaceholder'))}>
                            <Ionicons name="chatbox-ellipses-outline" size={24} color={theme.colors.text} />
                        </Pressable>
                        <Pressable onPressIn={() => insertMarkdown(t('markdown.codePlaceholder'))}>
                            <Ionicons name="code-slash" size={24} color={theme.colors.text} />
                        </Pressable>
                        <Pressable onPressIn={() => insertMarkdown(t('markdown.linkPlaceholder'))}>
                            <Ionicons name="link" size={24} color={theme.colors.text} />
                        </Pressable>
                    </ScrollView>
                </View>
            )}


            <Modal
                visible={errorModalVisible}
                onClose={() => setErrorModalVisible(false)}
                title={errorTitle}
                message={errorMessage}
                confirmText={t('common.done')}
                onConfirm={() => setErrorModalVisible(false)}
                variant="danger"
            />

            {/* Auto-save Indicator - Bottom Right */}
            {showSavingIndicator && (
                <View style={styles.savingIndicator}>
                    <ActivityIndicator size="small" color={theme.colors.accent} />
                    <Text style={[styles.savingText, { color: theme.colors.accent }]}>
                        {t('common.saving')}
                    </Text>
                </View>
            )}
        </KeyboardAvoidingView>
    );
}



const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 60,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Comfortaa_700Bold',
        flex: 1,
    },
    saveButton: {
        fontSize: 16,
        fontFamily: 'Comfortaa_700Bold',
    },
    modeSwitch: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
        gap: 12,
    },
    modeButton: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    modeText: {
        fontFamily: 'Comfortaa_700Bold',
        fontSize: 14,
    },
    scrollContent: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
    },
    titleInput: {
        fontSize: 20,
        fontFamily: 'Comfortaa_700Bold',
        paddingVertical: 12,
        borderBottomWidth: 1,
        marginBottom: 10,
    },
    editorInput: {
        flex: 1,
        fontSize: 16,
        fontFamily: 'Comfortaa_400Regular',
        padding: 16,
        borderRadius: 12,
        minHeight: 300,
    },
    previewContainer: {
        flex: 1,
        marginBottom: 20,
    },
    toolbar: {
        flexDirection: 'row',
        padding: 12,
        paddingBottom: 30, // Safe area padding
        borderTopWidth: 1,
        alignItems: 'center',
    },
    textIconParams: {
        width: 30,
        alignItems: 'center',
    },
    // Search Toolbar
    searchToolbar: {
        padding: 12,
        gap: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    searchInput: {
        flex: 1,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        fontSize: 14,
    },
    searchBtn: {
        padding: 8,
    },
    // Auto-save Indicator
    savingIndicator: {
        position: 'absolute',
        bottom: 100,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    savingText: {
        fontSize: 12,
        fontFamily: 'Comfortaa_500Medium',
    },
});

