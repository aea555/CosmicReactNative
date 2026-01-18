import { Button } from '@/components/ui/Button';
import { useTheme } from '@/contexts/ThemeContext';
import {
    calculatePasswordStrength,
    DEFAULT_PASSPHRASE_OPTIONS,
    DEFAULT_PASSWORD_OPTIONS,
    DEFAULT_SECRET_OPTIONS,
    generatePassphrase,
    generatePassword,
    generateSecret,
    generateSSHKey
} from '@/services/crypto';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type GeneratorType = 'password' | 'passphrase' | 'secret' | 'ssh';

export default function GeneratorsPage() {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const [activeTab, setActiveTab] = useState<GeneratorType>('password');
    const [result, setResult] = useState<string | null>(null);
    const [sshResult, setSSHResult] = useState<{ publicKey: string; privateKey: string; fingerprint: string } | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [copied, setCopied] = useState(false);

    // Password options
    const [passwordLength, setPasswordLength] = useState(DEFAULT_PASSWORD_OPTIONS.length);
    const [includeLowercase, setIncludeLowercase] = useState(DEFAULT_PASSWORD_OPTIONS.includeLowercase);
    const [includeUppercase, setIncludeUppercase] = useState(DEFAULT_PASSWORD_OPTIONS.includeUppercase);
    const [includeNumbers, setIncludeNumbers] = useState(DEFAULT_PASSWORD_OPTIONS.includeNumbers);
    const [includeSymbols, setIncludeSymbols] = useState(DEFAULT_PASSWORD_OPTIONS.includeSymbols);
    const [excludeAmbiguous, setExcludeAmbiguous] = useState(DEFAULT_PASSWORD_OPTIONS.excludeAmbiguous);

    // Passphrase options
    const [wordCount, setWordCount] = useState(DEFAULT_PASSPHRASE_OPTIONS.wordCount);
    const [separator, setSeparator] = useState(DEFAULT_PASSPHRASE_OPTIONS.separator);
    const [capitalize, setCapitalize] = useState(DEFAULT_PASSPHRASE_OPTIONS.capitalize);
    const [includeNumber, setIncludeNumber] = useState(DEFAULT_PASSPHRASE_OPTIONS.includeNumber);

    // Secret options
    const [byteSize, setByteSize] = useState(DEFAULT_SECRET_OPTIONS.byteSize);
    const [encoding, setEncoding] = useState<'hex' | 'base64'>(DEFAULT_SECRET_OPTIONS.encoding);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setResult(null);
        setSSHResult(null);
        setCopied(false);

        try {
            switch (activeTab) {
                case 'password':
                    const password = await generatePassword({
                        length: passwordLength,
                        includeLowercase,
                        includeUppercase,
                        includeNumbers,
                        includeSymbols,
                        excludeAmbiguous,
                    });
                    setResult(password);
                    break;

                case 'passphrase':
                    const passphrase = await generatePassphrase({
                        wordCount,
                        separator,
                        capitalize,
                        includeNumber,
                    });
                    setResult(passphrase);
                    break;

                case 'secret':
                    const secret = await generateSecret({
                        byteSize,
                        encoding,
                    });
                    setResult(secret);
                    break;

                case 'ssh':
                    const sshKey = await generateSSHKey();
                    setSSHResult(sshKey);
                    break;
            }
        } catch (error) {
            console.error('Generation failed:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const copyToClipboard = async (text: string) => {
        await Clipboard.setStringAsync(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const tabs: Array<{ key: GeneratorType; label: string; icon: string }> = [
        { key: 'password', label: t('generators.tabs.password'), icon: 'key' },
        { key: 'passphrase', label: t('generators.tabs.passphrase'), icon: 'text' },
        { key: 'secret', label: t('generators.tabs.secret'), icon: 'shield' },
        { key: 'ssh', label: t('generators.tabs.ssh'), icon: 'terminal' },
    ];

    const strength = result && activeTab === 'password' ? calculatePasswordStrength(result) : null;

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{t('generators.title')}</Text>
            </View>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tabsContent}
                >
                    {tabs.map((tab) => (
                        <TouchableOpacity
                            key={tab.key}
                            style={[
                                styles.tab,
                                {
                                    backgroundColor: activeTab === tab.key ? theme.colors.accent : theme.colors.surface,
                                },
                            ]}
                            onPress={() => {
                                setActiveTab(tab.key);
                                setResult(null);
                                setSSHResult(null);
                            }}
                        >
                            <Ionicons
                                name={tab.icon as any}
                                size={16}
                                color={activeTab === tab.key ? '#fff' : theme.colors.textMuted}
                            />
                            <Text
                                style={[
                                    styles.tabText,
                                    { color: activeTab === tab.key ? '#fff' : theme.colors.textMuted },
                                ]}
                            >
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* Password Options */}
                {activeTab === 'password' && (
                    <View style={styles.options}>
                        <View style={styles.sliderRow}>
                            <Text style={[styles.optionLabel, { color: theme.colors.text }]}>
                                {t('generators.options.length')} {passwordLength}
                            </Text>
                            <View style={styles.lengthButtons}>
                                <TouchableOpacity
                                    style={[styles.lengthBtn, { backgroundColor: theme.colors.surface }]}
                                    onPress={() => setPasswordLength(Math.max(8, passwordLength - 1))}
                                >
                                    <Ionicons name="remove" size={18} color={theme.colors.text} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.lengthBtn, { backgroundColor: theme.colors.surface }]}
                                    onPress={() => setPasswordLength(Math.min(64, passwordLength + 1))}
                                >
                                    <Ionicons name="add" size={18} color={theme.colors.text} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <OptionSwitch
                            label={t('generators.options.lowercase')}
                            value={includeLowercase}
                            onValueChange={setIncludeLowercase}
                            theme={theme}
                        />
                        <OptionSwitch
                            label={t('generators.options.uppercase')}
                            value={includeUppercase}
                            onValueChange={setIncludeUppercase}
                            theme={theme}
                        />
                        <OptionSwitch
                            label={t('generators.options.numbers')}
                            value={includeNumbers}
                            onValueChange={setIncludeNumbers}
                            theme={theme}
                        />
                        <OptionSwitch
                            label={t('generators.options.symbols')}
                            value={includeSymbols}
                            onValueChange={setIncludeSymbols}
                            theme={theme}
                        />
                        <OptionSwitch
                            label={t('generators.options.excludeAmbiguous')}
                            value={excludeAmbiguous}
                            onValueChange={setExcludeAmbiguous}
                            theme={theme}
                        />
                    </View>
                )}

                {/* Passphrase Options */}
                {activeTab === 'passphrase' && (
                    <View style={styles.options}>
                        <View style={styles.sliderRow}>
                            <Text style={[styles.optionLabel, { color: theme.colors.text }]}>
                                {t('generators.options.wordCount')} {wordCount}
                            </Text>
                            <View style={styles.lengthButtons}>
                                <TouchableOpacity
                                    style={[styles.lengthBtn, { backgroundColor: theme.colors.surface }]}
                                    onPress={() => setWordCount(Math.max(3, wordCount - 1))}
                                >
                                    <Ionicons name="remove" size={18} color={theme.colors.text} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.lengthBtn, { backgroundColor: theme.colors.surface }]}
                                    onPress={() => setWordCount(Math.min(8, wordCount + 1))}
                                >
                                    <Ionicons name="add" size={18} color={theme.colors.text} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.separatorRow}>
                            <Text style={[styles.optionLabel, { color: theme.colors.text }]}>{t('generators.options.separator')}</Text>
                            <View style={styles.separatorOptions}>
                                {['-', '_', '.', ' '].map((sep) => (
                                    <TouchableOpacity
                                        key={sep}
                                        style={[
                                            styles.separatorBtn,
                                            {
                                                backgroundColor: separator === sep ? theme.colors.accent : theme.colors.surface,
                                            },
                                        ]}
                                        onPress={() => setSeparator(sep)}
                                    >
                                        <Text style={{ color: separator === sep ? '#fff' : theme.colors.text }}>
                                            {sep === ' ' ? '␣' : sep}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <OptionSwitch
                            label={t('generators.options.capitalize')}
                            value={capitalize}
                            onValueChange={setCapitalize}
                            theme={theme}
                        />
                        <OptionSwitch
                            label={t('generators.options.includeNumber')}
                            value={includeNumber}
                            onValueChange={setIncludeNumber}
                            theme={theme}
                        />
                    </View>
                )}

                {/* Secret Options */}
                {activeTab === 'secret' && (
                    <View style={styles.options}>
                        <View style={styles.sliderRow}>
                            <Text style={[styles.optionLabel, { color: theme.colors.text }]}>
                                {t('generators.options.bytes')} {byteSize}
                            </Text>
                            <View style={styles.lengthButtons}>
                                <TouchableOpacity
                                    style={[styles.lengthBtn, { backgroundColor: theme.colors.surface }]}
                                    onPress={() => setByteSize(Math.max(8, byteSize - 8))}
                                >
                                    <Ionicons name="remove" size={18} color={theme.colors.text} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.lengthBtn, { backgroundColor: theme.colors.surface }]}
                                    onPress={() => setByteSize(Math.min(64, byteSize + 8))}
                                >
                                    <Ionicons name="add" size={18} color={theme.colors.text} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.separatorRow}>
                            <Text style={[styles.optionLabel, { color: theme.colors.text }]}>{t('generators.options.encoding')}</Text>
                            <View style={styles.separatorOptions}>
                                {(['hex', 'base64'] as const).map((enc) => (
                                    <TouchableOpacity
                                        key={enc}
                                        style={[
                                            styles.encodingBtn,
                                            {
                                                backgroundColor: encoding === enc ? theme.colors.accent : theme.colors.surface,
                                            },
                                        ]}
                                        onPress={() => setEncoding(enc)}
                                    >
                                        <Text style={{ color: encoding === enc ? '#fff' : theme.colors.text }}>
                                            {enc}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>
                )}

                {/* SSH Options (no config needed) */}
                {activeTab === 'ssh' && (
                    <View style={[styles.infoCard, { backgroundColor: theme.colors.surface }]}>
                        <Ionicons name="information-circle-outline" size={20} color={theme.colors.accent} />
                        <Text style={[styles.infoText, { color: theme.colors.textMuted }]}>
                            {t('generators.sshInfo')}
                        </Text>
                    </View>
                )}

                {/* Generate Button */}
                <Button
                    title={isGenerating ? t('generators.generating') : t('generators.generate')}
                    onPress={handleGenerate}
                    loading={isGenerating}
                    fullWidth
                    size="lg"
                    style={{ marginTop: 20 }}
                />

                {/* Result */}
                {result && (
                    <View style={styles.resultSection}>
                        <View style={styles.resultHeader}>
                            <Text style={[styles.resultLabel, { color: theme.colors.textMuted }]}>{t('generators.result')}</Text>
                            <TouchableOpacity onPress={() => copyToClipboard(result)}>
                                <Text style={[styles.copyBtn, { color: theme.colors.accent }]}>
                                    {copied ? t('common.copied') : t('common.copy')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <View style={[styles.resultBox, { backgroundColor: theme.colors.surface }]}>
                            <Text style={[styles.resultText, { color: theme.colors.text }]} selectable>
                                {result}
                            </Text>
                        </View>

                        {strength && (
                            <View style={styles.strengthRow}>
                                <View style={styles.strengthBars}>
                                    {[0, 1, 2, 3, 4].map((i) => (
                                        <View
                                            key={i}
                                            style={[
                                                styles.strengthBar,
                                                {
                                                    backgroundColor:
                                                        i <= strength.score
                                                            ? getStrengthColor(strength.label)
                                                            : theme.colors.border,
                                                },
                                            ]}
                                        />
                                    ))}
                                </View>
                                <Text style={[styles.strengthLabel, { color: getStrengthColor(strength.label) }]}>
                                    {strength.label.replace('-', ' ')}
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {/* SSH Result */}
                {sshResult && (
                    <View style={styles.resultSection}>
                        <View style={styles.resultHeader}>
                            <Text style={[styles.resultLabel, { color: theme.colors.textMuted }]}>
                                {t('generators.publicKey')}
                            </Text>
                            <TouchableOpacity onPress={() => copyToClipboard(sshResult.publicKey)}>
                                <Text style={[styles.copyBtn, { color: theme.colors.accent }]}>{t('common.copy')}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={[styles.resultBox, { backgroundColor: theme.colors.surface }]}>
                            <Text style={[styles.resultText, { color: theme.colors.text, fontSize: 12 }]} selectable>
                                {sshResult.publicKey}
                            </Text>
                        </View>

                        <View style={[styles.resultHeader, { marginTop: 16 }]}>
                            <Text style={[styles.resultLabel, { color: theme.colors.textMuted }]}>
                                {t('generators.privateKey')}
                            </Text>
                            <TouchableOpacity onPress={() => copyToClipboard(sshResult.privateKey)}>
                                <Text style={[styles.copyBtn, { color: theme.colors.accent }]}>{t('common.copy')}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={[styles.resultBox, { backgroundColor: theme.colors.surface }]}>
                            <Text style={[styles.resultText, { color: theme.colors.text, fontSize: 10 }]} selectable>
                                {sshResult.privateKey}
                            </Text>
                        </View>

                        <Text style={[styles.fingerprint, { color: theme.colors.textMuted }]}>
                            {t('generators.fingerprint')} {sshResult.fingerprint}
                        </Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

function OptionSwitch({
    label,
    value,
    onValueChange,
    theme,
}: {
    label: string;
    value: boolean;
    onValueChange: (v: boolean) => void;
    theme: any;
}) {
    return (
        <View style={optionStyles.row}>
            <Text style={[optionStyles.label, { color: theme.colors.text }]}>{label}</Text>
            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
                thumbColor="#fff"
            />
        </View>
    );
}

function getStrengthColor(label: string): string {
    const colors: Record<string, string> = {
        weak: '#ef4444',
        fair: '#f97316',
        good: '#eab308',
        strong: '#22c55e',
        'very-strong': '#10b981',
    };
    return colors[label] || '#6b7280';
}

const optionStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    label: {
        fontSize: 14,
        fontFamily: 'Comfortaa_400Regular',
    },
});

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
    },
    tabsContainer: {
        marginBottom: 16,
    },
    tabsContent: {
        paddingHorizontal: 20,
        gap: 12,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        gap: 8,
    },
    tabText: {
        fontSize: 14,
        fontFamily: 'Comfortaa_500Medium',
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    options: {
        gap: 4,
    },
    sliderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    optionLabel: {
        fontSize: 14,
        fontFamily: 'Comfortaa_500Medium',
    },
    lengthButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    lengthBtn: {
        width: 36,
        height: 36,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    separatorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    separatorOptions: {
        flexDirection: 'row',
        gap: 8,
    },
    separatorBtn: {
        width: 36,
        height: 36,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    encodingBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 16,
        borderRadius: 12,
        gap: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Comfortaa_400Regular',
        lineHeight: 20,
    },
    resultSection: {
        marginTop: 24,
    },
    resultHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    resultLabel: {
        fontSize: 12,
        fontFamily: 'Comfortaa_500Medium',
        textTransform: 'uppercase',
    },
    copyBtn: {
        fontSize: 14,
        fontFamily: 'Comfortaa_700Bold',
    },
    resultBox: {
        padding: 16,
        borderRadius: 12,
    },
    resultText: {
        fontSize: 14,
        fontFamily: 'Comfortaa_500Medium',
        letterSpacing: 0.5,
    },
    strengthRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        gap: 12,
    },
    strengthBars: {
        flex: 1,
        flexDirection: 'row',
        gap: 4,
    },
    strengthBar: {
        flex: 1,
        height: 4,
        borderRadius: 2,
    },
    strengthLabel: {
        fontSize: 12,
        fontFamily: 'Comfortaa_500Medium',
        textTransform: 'capitalize',
    },
    fingerprint: {
        fontSize: 11,
        fontFamily: 'Comfortaa_400Regular',
        marginTop: 12,
    },
});
