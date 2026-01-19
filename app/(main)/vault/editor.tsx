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
    const { id } = useLocalSearchParams<{ id: string }>();
    const isEditing = !!id;
    const { theme } = useTheme();
    const { t } = useTranslation();
    const router = useRouter();
    const queryClient = useQueryClient();

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Cursor position tracking via ref (uncontrolled)
    const selectionRef = useRef({ start: 0, end: 0 });
    const inputRef = useRef<TextInput>(null);

    // Error Modal State
    const [errorModalVisible, setErrorModalVisible] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [errorTitle, setErrorTitle] = useState('');

    useEffect(() => {
        if (isEditing) {
            loadNote();
        }
    }, [id]);

    const loadNote = async () => {
        try {
            setIsLoading(true);
            const data = await api.getNote(id);
            setTitle(data.title);
            setContent(data.content || '');
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

    const handleSave = async () => {
        if (!title.trim()) {
            showError(t('errors.validationError'), t('vault.titleRequired'));
            return;
        }

        try {
            setIsSaving(true);
            if (isEditing) {
                await api.updateNote(id, { title, content });
                queryClient.invalidateQueries({ queryKey: ['note', id] });
            } else {
                await api.createNote({ title, content });
            }
            queryClient.invalidateQueries({ queryKey: ['notes'] });
            router.back();
        } catch (error: any) {
            showError(t('errors.error'), error.message || t('errors.default'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleSelectionChange = (event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
        // Store selection for toolbar use - this runs on every cursor move
        // For performance, we only store in ref, no state updates
        selectionRef.current = event.nativeEvent.selection;
    };

    const insertMarkdown = (syntax: string) => {
        // Append at end for simplicity and performance
        setContent(prev => prev + syntax);
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
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                    {isEditing ? t('vault.editNote') : t('vault.newNote')}
                </Text>
                <TouchableOpacity onPress={handleSave} disabled={isSaving}>
                    {isSaving ? (
                        <ActivityIndicator color={theme.colors.accent} />
                    ) : (
                        <Text style={[styles.saveButton, { color: theme.colors.accent }]}>{t('common.save')}</Text>
                    )}
                </TouchableOpacity>
            </View>

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
    }
});

