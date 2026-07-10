/**
 * Perceptual hashing (Tier 2) — native side. The pure math lives in `hashCore`
 * (RN-free, unit-testable); this module's only job is to obtain pixels on-device
 * via expo-image-manipulator + expo-file-system and feed them to that math.
 */
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import UPNG from 'upng-js';
import {
    DHASH_HEIGHT,
    DHASH_WIDTH,
    dHashFromGray,
    grayscaleFromRGBA,
    sharpnessFromGray,
} from './hashCore';
import type { Hash } from './types';

// Re-export the pure helpers so existing importers have a single entry point.
export { DHASH_HEIGHT, DHASH_WIDTH, dHashFromGray, grayscaleFromRGBA, hammingDistance, sharpnessFromGray } from './hashCore';

/**
 * Downscales the image at `uri` to a tiny PNG, decodes it in pure JS, and
 * returns its perceptual hash + sharpness. `uri` must be a file-system readable
 * URI (on iOS resolve the asset's `localUri` first — `ph://` will not work).
 */
export async function computePerceptualHash(uri: string): Promise<{ dhash: Hash; sharpness: number }> {
    const context = ImageManipulator.manipulate(uri).resize({ width: DHASH_WIDTH, height: DHASH_HEIGHT });
    const rendered = await context.renderAsync();
    const result = await rendered.saveAsync({ format: SaveFormat.PNG });

    try {
        const bytes = new File(result.uri).bytesSync();
        // Pass the Uint8Array directly (offset-safe); UPNG copies it internally.
        const decoded = UPNG.decode(bytes);
        const rgba = new Uint8Array(UPNG.toRGBA8(decoded)[0]);
        const gray = grayscaleFromRGBA(rgba, decoded.width, decoded.height);
        return {
            dhash: dHashFromGray(gray, decoded.width, decoded.height),
            sharpness: sharpnessFromGray(gray, decoded.width, decoded.height),
        };
    } finally {
        // The manipulator writes a temp file we no longer need.
        try {
            new File(result.uri).delete();
        } catch {
            // best-effort cleanup; the OS cache will reclaim it otherwise
        }
    }
}
