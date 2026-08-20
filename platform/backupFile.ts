/**
 * Native touchpoints for backup export/import: writing the backup to a temp file
 * and opening the iOS share sheet (`expo-sharing`), and picking a backup file back
 * in (`expo-document-picker`). Thin wrapper in the `platform/` style — guards on
 * platform/availability and swallows errors so callers get a simple boolean/null.
 */
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

/**
 * Writes `json` to a transient file and opens the system share sheet so the user
 * can save it (Files, AirDrop, …). Returns false if sharing is unavailable or
 * anything failed. The file is written to the cache dir — not the document dir
 * where the app's real persisted state lives — so it's safe for the OS to reap.
 */
export async function shareBackup(json: string, filename: string): Promise<boolean> {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return false;
    try {
        if (!(await Sharing.isAvailableAsync())) return false;
        const file = new File(Paths.cache, filename);
        if (file.exists) file.delete();
        file.create();
        file.write(json);
        await Sharing.shareAsync(file.uri, {
            UTI: 'public.json',
            mimeType: 'application/json',
            dialogTitle: 'Save GallerySweeper backup',
        });
        return true;
    } catch (e) {
        console.warn('Failed to share backup', e);
        return false;
    }
}

/**
 * Opens the system document picker and returns the picked file's text, or null
 * if the user cancelled or the read failed. Uses a permissive any-type filter —
 * a strict `application/json` can grey out valid `.json` files whose OS-reported
 * UTI differs — so the caller must validate the contents afterwards.
 */
export async function pickBackupText(): Promise<string | null> {
    try {
        const res = await DocumentPicker.getDocumentAsync({
            type: '*/*',
            copyToCacheDirectory: true,
            multiple: false,
        });
        if (res.canceled || !res.assets || res.assets.length === 0) return null;
        return await new File(res.assets[0].uri).text();
    } catch (e) {
        console.warn('Failed to pick backup file', e);
        return null;
    }
}
