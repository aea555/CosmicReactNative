import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { Note, Secret } from './api';

export const exportService = {
    async exportToCSV(secrets: Secret[], notes: Note[]): Promise<string> {
        const header = 'Type,Title,Username,Password,URL,Email,Phone,Content,Created,Updated\n';
        const secretRows = secrets.map(s => {
            return `Secret,"${s.title.replace(/"/g, '""')}","${(s.username || '').replace(/"/g, '""')}","${(s.password || '').replace(/"/g, '""')}","${(s.url || '').replace(/"/g, '""')}","${(s.email || '').replace(/"/g, '""')}","${(s.telephone_number || '').replace(/"/g, '""')}","",${s.created_at},${s.updated_at}`;
        }).join('\n');

        const noteRows = notes.map(n => {
            return `Note,"${n.title.replace(/"/g, '""')}","","","","","", "${(n.content || '').replace(/"/g, '""')}",${n.created_at},${n.updated_at}`;
        }).join('\n');

        const csvContent = header + secretRows + (secretRows && noteRows ? '\n' : '') + noteRows;

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const baseName = `cosmic_export_${timestamp}`;
        const fileName = `${baseName}.csv`;

        if (Platform.OS === 'android') {
            const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (permissions.granted) {
                const uri = await FileSystem.StorageAccessFramework.createFileAsync(
                    permissions.directoryUri,
                    baseName,
                    'text/csv'
                );
                await FileSystem.writeAsStringAsync(uri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
                return uri;
            } else {
                throw new Error('Permission denied or cancelled');
            }
        } else {
            const fileUri = (FileSystem.documentDirectory || '') + fileName;
            await FileSystem.writeAsStringAsync(fileUri, csvContent);

            // Open share sheet so user can choose where to save
            await Sharing.shareAsync(fileUri, {
                mimeType: 'text/csv',
                dialogTitle: 'Save Vault Export',
            });

            return fileUri;
        }
    },

    async exportToJSON(secrets: Secret[], notes: Note[]): Promise<string> {
        const payload = {
            version: '1.0',
            exported_at: new Date().toISOString(),
            secrets,
            notes,
        };
        const jsonContent = JSON.stringify(payload, null, 2);

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const baseName = `cosmic_export_${timestamp}`;
        const fileName = `${baseName}.json`;

        if (Platform.OS === 'android') {
            const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (permissions.granted) {
                const uri = await FileSystem.StorageAccessFramework.createFileAsync(
                    permissions.directoryUri,
                    baseName,
                    'application/json'
                );
                await FileSystem.writeAsStringAsync(uri, jsonContent, { encoding: FileSystem.EncodingType.UTF8 });
                return uri;
            } else {
                throw new Error('Permission denied or cancelled');
            }
        } else {
            const fileUri = (FileSystem.documentDirectory || '') + fileName;
            await FileSystem.writeAsStringAsync(fileUri, jsonContent, { encoding: FileSystem.EncodingType.UTF8 });

            await Sharing.shareAsync(fileUri, {
                mimeType: 'application/json',
                dialogTitle: 'Save Vault Export',
            });

            return fileUri;
        }
    }
};

