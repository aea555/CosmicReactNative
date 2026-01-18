import { useTheme } from '@/contexts/ThemeContext';
import { api } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
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
            Alert.alert(t('errors.error'), t('errors.noteNotFound'));
            router.back();
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!title.trim()) {
            Alert.alert(t('errors.validationError'), t('vault.titleRequired'));
            return;
        }

        try {
            setIsSaving(true);
            if (isEditing) {
                await api.updateNote(id, { title, content });
                // Invalidate specific note as well
                queryClient.invalidateQueries({ queryKey: ['note', id] });
            } else {
                await api.createNote({ title, content });
            }
            // Invalidate the notes list to force refresh
            queryClient.invalidateQueries({ queryKey: ['notes'] });
            router.back();
        } catch (error) {
            Alert.alert(t('errors.error'), t('errors.default'));
        } finally {
            setIsSaving(false);
        }
    };

    const insertMarkdown = (syntax: string) => {
        // Simple append for now, ideally would insert at cursor
        setContent((prev) => prev + syntax);
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: theme.colors.bg, justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={theme.colors.accent} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
            <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                    {isEditing ? t('vault.editNote') : t('vault.createNote')}
                </Text>
                <TouchableOpacity onPress={handleSave} disabled={isSaving}>
                    {isSaving ? (
                        <ActivityIndicator color={theme.colors.accent} />
                    ) : (
                        <Text style={[styles.saveButton, { color: theme.colors.accent }]}>{t('common.save')}</Text>
                    )}
                </TouchableOpacity>
            </View>

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

            <View style={styles.content}>
                <TextInput
                    style={[styles.titleInput, { color: theme.colors.text, borderBottomColor: theme.colors.border }]}
                    placeholder={t('vault.noteTitlePlaceholder')}
                    placeholderTextColor={theme.colors.textMuted}
                    value={title}
                    onChangeText={setTitle}
                />

                {isPreviewMode ? (
                    <ScrollView style={styles.previewContainer}>
                        <Markdown
                            style={{
                                body: { color: theme.colors.text, fontFamily: 'Comfortaa_400Regular' },
                                heading1: { color: theme.colors.accent, fontFamily: 'Comfortaa_700Bold' },
                                heading2: { color: theme.colors.accent, fontFamily: 'Comfortaa_700Bold' },
                                code_inline: { backgroundColor: theme.colors.surface, color: theme.colors.text },
                                code_block: { backgroundColor: theme.colors.surface, color: theme.colors.text },
                            }}
                        >
                            {content || t('vault.noContent')}
                        </Markdown>
                    </ScrollView>
                ) : (
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={{ flex: 1 }}
                    >
                        {/* Markdown Toolbar */}
                        <View style={[styles.toolbar, { backgroundColor: theme.colors.surface }]}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
                                <TouchableOpacity onPress={() => insertMarkdown(t('markdown.headingPlaceholder'))}>
                                    <Text style={{ color: theme.colors.text, fontWeight: 'bold', fontSize: 18 }}>H1</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => insertMarkdown(t('markdown.boldPlaceholder'))}>
                                    <Ionicons name="information-circle" size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => insertMarkdown(t('markdown.italicPlaceholder'))}>
                                    <Ionicons name="text" size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => insertMarkdown(t('markdown.listPlaceholder'))}>
                                    <Ionicons name="list" size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => insertMarkdown(t('markdown.quotePlaceholder'))}>
                                    <Ionicons name="chatbox-ellipses-outline" size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => insertMarkdown(t('markdown.codePlaceholder'))}>
                                    <Ionicons name="code-slash" size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => insertMarkdown(t('markdown.linkPlaceholder'))}>
                                    <Ionicons name="link" size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                                {/* <TouchableOpacity onPress={() => insertMarkdown(t('markdown.imagePlaceholder'))}>
                                    <Ionicons name="image-outline" size={24} color={theme.colors.text} />
                                </TouchableOpacity> */}
                            </ScrollView>
                        </View>

                        <TextInput
                            style={[
                                styles.editorInput,
                                {
                                    color: theme.colors.text,
                                    backgroundColor: theme.colors.surface + '40', // slightly transparent surface
                                },
                            ]}
                            placeholder={t('vault.noteContentPlaceholder')}
                            placeholderTextColor={theme.colors.textMuted}
                            value={content}
                            onChangeText={setContent}
                            multiline
                            textAlignVertical="top"
                        />
                    </KeyboardAvoidingView>
                )}
            </View>
        </View>
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
        padding: 16,
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
    content: {
        flex: 1,
        paddingHorizontal: 16,
    },
    titleInput: {
        fontSize: 20,
        fontFamily: 'Comfortaa_700Bold',
        paddingVertical: 12,
        borderBottomWidth: 1,
        marginBottom: 16,
    },
    editorInput: {
        flex: 1,
        fontSize: 16,
        fontFamily: 'Comfortaa_400Regular',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
    },
    previewContainer: {
        flex: 1,
        marginBottom: 20,
    },
    toolbar: {
        flexDirection: 'row',
        gap: 20,
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
        alignItems: 'center',
    },
});
