import { Modal } from '@/components/ui/Modal';
import { useTheme } from '@/contexts/ThemeContext';
import { api } from '@/services/api';
import { usePreferencesStore } from '@/stores/preferences';
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
    const autoSaveDebounceMs = usePreferencesStore((state) => state.autoSaveDebounceMs);
    const historyDebounceMs = usePreferencesStore((state) => state.historyDebounceMs);

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
    const [matchCase, setMatchCase] = useState(false);
    const [wholeWord, setWholeWord] = useState(false);
    const [selection, setSelection] = useState({ start: 0, end: 0 });

    // History (Undo/Redo)
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const pastRef = useRef<string[]>([]);
    const futureRef = useRef<string[]>([]);
    const isApplyingHistoryRef = useRef(false);
    const lastHistoryContentRef = useRef('');
    const historyTimeoutRef = useRef<any>(null);

    const saveToHistory = (newContent: string, instant = false) => {
        if (newContent === lastHistoryContentRef.current) return;

        const performSave = () => {
            pastRef.current = [...pastRef.current, lastHistoryContentRef.current];
            futureRef.current = [];
            lastHistoryContentRef.current = newContent;
            setCanUndo(true);
            setCanRedo(false);
        };

        if (historyTimeoutRef.current) {
            clearTimeout(historyTimeoutRef.current);
            historyTimeoutRef.current = null;
        }

        if (instant) {
            performSave();
        } else {
            historyTimeoutRef.current = setTimeout(performSave, historyDebounceMs);
        }
    };

    const handleUndo = () => {
        if (pastRef.current.length === 0) return;

        const prev = pastRef.current[pastRef.current.length - 1];
        pastRef.current = pastRef.current.slice(0, -1);
        futureRef.current = [content, ...futureRef.current];

        isApplyingHistoryRef.current = true;
        setContent(prev);
        lastHistoryContentRef.current = prev;
        setCanUndo(pastRef.current.length > 0);
        setCanRedo(true);
        setTimeout(() => (isApplyingHistoryRef.current = false), 50);
    };

    const handleRedo = () => {
        if (futureRef.current.length === 0) return;

        const next = futureRef.current[0];
        futureRef.current = futureRef.current.slice(1);
        pastRef.current = [...pastRef.current, content];

        isApplyingHistoryRef.current = true;
        setContent(next);
        lastHistoryContentRef.current = next;
        setCanUndo(true);
        setCanRedo(futureRef.current.length > 0);
        setTimeout(() => (isApplyingHistoryRef.current = false), 50);
    };

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
                await queryClient.invalidateQueries({ queryKey: ['notes'] });
                await queryClient.refetchQueries({ queryKey: ['notes'] }); // Also force refetch for background updates
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
                await queryClient.invalidateQueries({ queryKey: ['note', noteId] });
                await queryClient.invalidateQueries({ queryKey: ['notes'] });
            } catch (error: any) {
                console.error('Auto-save failed:', error);
            } finally {
                setIsSaving(false);
                setTimeout(() => setShowSavingIndicator(false), 500);
            }
        }, autoSaveDebounceMs);

        return () => clearTimeout(timer);
    }, [content, title, lastSavedContent, lastSavedTitle, isCreated, noteId, autoSaveDebounceMs]);

    const loadNote = async () => {
        try {
            setIsLoading(true);
            const data = await api.getNote(initialId!);
            setTitle(data.title);

            isApplyingHistoryRef.current = true;
            setContent(data.content || '');
            lastHistoryContentRef.current = data.content || '';
            setLastSavedContent(data.content || '');
            setLastSavedTitle(data.title);

            // Reset stacks for the loaded note
            pastRef.current = [];
            futureRef.current = [];
            setCanUndo(false);
            setCanRedo(false);

            setTimeout(() => (isApplyingHistoryRef.current = false), 100);
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

            await queryClient.invalidateQueries({ queryKey: ['notes'] });
            if (noteId) {
                await queryClient.invalidateQueries({ queryKey: ['note', noteId] });
            }

            if (!silent) router.back();
        } catch (error: any) {
            if (!silent) showError(t('errors.error'), error.message || t('errors.default'));
        } finally {
            setIsSaving(false);
            setTimeout(() => setShowSavingIndicator(false), 500);
        }
    };

    useEffect(() => {
        if (isApplyingHistoryRef.current) return;
        saveToHistory(content);
    }, [content]);

    useEffect(() => {
        return () => {
            if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);
        };
    }, []);

    const handleSelectionChange = (event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
        const newSelection = event.nativeEvent.selection;
        selectionRef.current = newSelection;
        setSelection(newSelection);
    };

    const insertMarkdown = (syntax: string) => {
        const { start, end } = selectionRef.current;
        const nextContent = `${content.slice(0, start)}${syntax}${content.slice(end)}`;
        const nextCursor = start + syntax.length;
        const nextSelection = { start: nextCursor, end: nextCursor };

        saveToHistory(content, true);
        setContent(nextContent);
        lastHistoryContentRef.current = nextContent;
        selectionRef.current = nextSelection;
        setSelection(nextSelection);
        inputRef.current?.focus();
    };

    // Search Logic helpers
    const getSearchRegex = (query: string, global = false) => {
        if (!query) return null;
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = wholeWord ? `\\b${escapedQuery}\\b` : escapedQuery;
        return new RegExp(pattern, (matchCase ? '' : 'i') + (global ? 'g' : ''));
    };

    const handleFindNext = () => {
        if (!searchQuery) return;
        const regex = getSearchRegex(searchQuery, true);
        if (!regex) return;

        const currentPos = selectionRef.current.end;
        let match;
        let foundMatch = null;

        // Reset regex to start from current position or wrap
        regex.lastIndex = currentPos;
        match = regex.exec(content);

        if (!match) {
            // Wrap around
            regex.lastIndex = 0;
            match = regex.exec(content);
        }

        if (match) {
            const newSelection = { start: match.index, end: match.index + match[0].length };
            selectionRef.current = newSelection;
            setSelection(newSelection);
            inputRef.current?.focus();
        }
    };

    const handleReplace = () => {
        if (!searchQuery) return;

        const regex = getSearchRegex(searchQuery);
        if (!regex) return;

        // Check if current selection matches
        const currentSelText = content.substring(selectionRef.current.start, selectionRef.current.end);
        const isMatch = regex.test(currentSelText);

        if (isMatch) {
            saveToHistory(content, true);
            const before = content.substring(0, selectionRef.current.start);
            const after = content.substring(selectionRef.current.end);
            const newContent = before + replaceQuery + after;
            setContent(newContent);
            lastHistoryContentRef.current = newContent;

            // Move cursor after replacement
            const newCursorPos = selectionRef.current.start + replaceQuery.length;
            const newSelection = { start: newCursorPos, end: newCursorPos };
            selectionRef.current = newSelection;
            setSelection(newSelection);

            // Look for next after a brief delay to allow state to settle
            setTimeout(handleFindNext, 50);
        } else {
            handleFindNext();
        }
    };

    const handleReplaceAll = () => {
        const regex = getSearchRegex(searchQuery, true);
        if (!regex) return;

        const newContent = content.replace(regex, replaceQuery);
        if (newContent !== content) {
            saveToHistory(content, true);
            setContent(newContent);
            lastHistoryContentRef.current = newContent;
        }
    };

    const handleSwap = () => {
        const temp = searchQuery;
        setSearchQuery(replaceQuery);
        setReplaceQuery(temp);
        setSelection({ start: 0, end: 0 });
        selectionRef.current = { start: 0, end: 0 };
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
                    <TouchableOpacity onPress={() => handleSave(false)} disabled={isSaving}>
                        <Text style={[styles.saveButton, { color: theme.colors.accent }]}>{t('common.save')}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Search Bar */}
            {showSearch && (
                <View style={[styles.searchToolbar, { backgroundColor: theme.colors.surfaceElevated }]}>
                    {/* Row 1: Find */}
                    <View style={styles.searchRow}>
                        <TextInput
                            style={[styles.searchInput, { color: theme.colors.text, backgroundColor: theme.colors.bg }]}
                            placeholder={t('vault.findPlaceholder')}
                            placeholderTextColor={theme.colors.textMuted}
                            value={searchQuery}
                            onChangeText={(text) => {
                                setSearchQuery(text);
                                selectionRef.current = { start: 0, end: 0 };
                            }}
                        />
                        <TouchableOpacity
                            onPress={handleFindNext}
                            style={[styles.searchActionBtn, { backgroundColor: theme.colors.accent }]}
                        >
                            <Ionicons name="chevron-down" size={18} color="#fff" />
                            <Text style={styles.searchActionText}>{t('vault.findNext')}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Row 2: Options & Swap */}
                    <View style={styles.searchRow}>
                        <TouchableOpacity
                            onPress={() => setMatchCase(!matchCase)}
                            style={[styles.searchOptionPill, matchCase && { backgroundColor: theme.colors.accent + '20', borderColor: theme.colors.accent }]}
                        >
                            <Ionicons name={matchCase ? "checkmark-circle" : "ellipse-outline"} size={16} color={matchCase ? theme.colors.accent : theme.colors.textMuted} />
                            <Text style={[styles.searchOptionPillText, { color: matchCase ? theme.colors.accent : theme.colors.textMuted }]}>{t('vault.matchCase')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setWholeWord(!wholeWord)}
                            style={[styles.searchOptionPill, wholeWord && { backgroundColor: theme.colors.accent + '20', borderColor: theme.colors.accent }]}
                        >
                            <Ionicons name={wholeWord ? "checkmark-circle" : "ellipse-outline"} size={16} color={wholeWord ? theme.colors.accent : theme.colors.textMuted} />
                            <Text style={[styles.searchOptionPillText, { color: wholeWord ? theme.colors.accent : theme.colors.textMuted }]}>{t('vault.wholeWord')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleSwap} style={styles.searchSwapBtn}>
                            <Ionicons name="swap-vertical" size={20} color={theme.colors.textMuted} />
                        </TouchableOpacity>
                    </View>

                    {/* Row 3: Replace */}
                    <View style={styles.searchRow}>
                        <TextInput
                            style={[styles.searchInput, { color: theme.colors.text, backgroundColor: theme.colors.bg }]}
                            placeholder={t('vault.replacePlaceholder')}
                            placeholderTextColor={theme.colors.textMuted}
                            value={replaceQuery}
                            onChangeText={setReplaceQuery}
                        />
                        <TouchableOpacity onPress={handleReplace} style={[styles.searchActionBtn, { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }]}>
                            <Text style={[styles.searchActionText, { color: theme.colors.text }]}>{t('vault.replace')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleReplaceAll} style={[styles.searchActionBtn, { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }]}>
                            <Text style={[styles.searchActionText, { color: theme.colors.text }]}>{t('vault.replaceAll')}</Text>
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
                            selection={selection}
                            onSelectionChange={handleSelectionChange}
                            multiline
                            textAlignVertical="top"
                            scrollEnabled={true}
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
                        contentContainerStyle={styles.toolbarContent}
                        keyboardShouldPersistTaps="always"
                    >
                        <TouchableOpacity
                            onPress={() => setShowSearch(!showSearch)}
                            style={[
                                styles.toolbarAction,
                                styles.searchToggleButton,
                                { backgroundColor: theme.colors.accent },
                                showSearch && { backgroundColor: theme.colors.surface, borderColor: theme.colors.accent }
                            ]}
                        >
                            <Ionicons
                                name={showSearch ? "close" : "search"}
                                size={20}
                                color={showSearch ? theme.colors.accent : "#fff"}
                            />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleUndo}
                            disabled={!canUndo}
                            style={[styles.toolbarAction, !canUndo && { opacity: 0.3 }]}
                        >
                            <Ionicons name="arrow-undo-outline" size={22} color={theme.colors.text} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleRedo}
                            disabled={!canRedo}
                            style={[styles.toolbarAction, !canRedo && { opacity: 0.3 }]}
                        >
                            <Ionicons name="arrow-redo-outline" size={22} color={theme.colors.text} />
                        </TouchableOpacity>

                        <Pressable onPress={() => insertMarkdown(t('markdown.headingPlaceholder'))} style={styles.toolbarAction}>
                            <Text style={[styles.toolbarTextIcon, { color: theme.colors.text, fontWeight: 'bold' }]}>H1</Text>
                        </Pressable>
                        <Pressable onPress={() => insertMarkdown(t('markdown.boldPlaceholder'))} style={styles.toolbarAction}>
                            <Text style={[styles.toolbarTextIcon, { color: theme.colors.text, fontWeight: '900', fontFamily: 'serif' }]}>B</Text>
                        </Pressable>
                        <Pressable onPress={() => insertMarkdown(t('markdown.italicPlaceholder'))} style={styles.toolbarAction}>
                            <Text style={[styles.toolbarTextIcon, { color: theme.colors.text, fontStyle: 'italic', fontWeight: 'bold', fontFamily: 'serif' }]}>I</Text>
                        </Pressable>
                        <Pressable onPress={() => insertMarkdown(t('markdown.listPlaceholder'))} style={styles.toolbarAction}>
                            <Ionicons name="list" size={22} color={theme.colors.text} />
                        </Pressable>
                        <Pressable onPress={() => insertMarkdown(t('markdown.quotePlaceholder'))} style={styles.toolbarAction}>
                            <Ionicons name="chatbox-ellipses-outline" size={22} color={theme.colors.text} />
                        </Pressable>
                        <Pressable onPress={() => insertMarkdown(t('markdown.codePlaceholder'))} style={styles.toolbarAction}>
                            <Ionicons name="code-slash" size={22} color={theme.colors.text} />
                        </Pressable>
                        <Pressable onPress={() => insertMarkdown(t('markdown.linkPlaceholder'))} style={styles.toolbarAction}>
                            <Ionicons name="link" size={22} color={theme.colors.text} />
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
        borderTopWidth: 1,
        paddingVertical: 12,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20, // Better safe area handling
    },
    toolbarContent: {
        flexGrow: 1,
        justifyContent: 'center', // Centers items horizontally if they don't overflow
        alignItems: 'center',
        paddingHorizontal: 16,
        gap: 16,
    },
    toolbarAction: {
        height: 40,
        minWidth: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    toolbarTextIcon: {
        fontSize: 18,
    },
    toolbarDivider: {
        width: 1,
        height: 24,
        backgroundColor: 'rgba(0,0,0,0.1)',
        marginHorizontal: 4,
    },
    searchToggleButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: '#fff',
        // Shadow for iOS
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        // Shadow for Android
        elevation: 6,
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
    searchActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 4,
    },
    searchActionText: {
        fontSize: 12,
        fontFamily: 'Comfortaa_700Bold',
        color: '#fff',
    },
    searchOptionPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        gap: 6,
        flex: 1,
    },
    searchOptionPillText: {
        fontSize: 12,
        fontFamily: 'Comfortaa_500Medium',
    },
    searchSwapBtn: {
        padding: 8,
        marginLeft: 4,
    },
    searchDivider: {
        width: 1,
        height: 20,
        backgroundColor: 'rgba(0,0,0,0.1)',
        marginHorizontal: 4,
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
