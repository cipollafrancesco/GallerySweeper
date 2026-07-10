/**
 * Pure perceptual-hash math and vector comparison. Deliberately free of any
 * React Native / Expo imports so it can be unit-tested in plain Node and reused
 * by both the native hashing wrapper and the grouping layer.
 */
import type { Hash } from './types';

/** dHash grid: width is height+1 so each row yields `height` horizontal comparisons. */
export const DHASH_WIDTH = 9;
export const DHASH_HEIGHT = 8;

/** Converts an RGBA byte buffer into a grayscale (luminance) array. */
export function grayscaleFromRGBA(
    rgba: Uint8Array | Uint8ClampedArray | number[],
    width: number,
    height: number,
): Float64Array {
    const gray = new Float64Array(width * height);
    for (let i = 0; i < width * height; i++) {
        const r = rgba[i * 4];
        const g = rgba[i * 4 + 1];
        const b = rgba[i * 4 + 2];
        gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    }
    return gray;
}

/**
 * Difference hash: for each row, set a bit when a pixel is brighter than its
 * right neighbour. Packs 64 bits into two unsigned 32-bit halves.
 */
export function dHashFromGray(gray: ArrayLike<number>, width = DHASH_WIDTH, height = DHASH_HEIGHT): Hash {
    let hi = 0;
    let lo = 0;
    let bit = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width - 1; x++) {
            const brighter = gray[y * width + x] > gray[y * width + x + 1] ? 1 : 0;
            if (bit < 32) {
                hi = (hi << 1) | brighter;
            } else {
                lo = (lo << 1) | brighter;
            }
            bit++;
        }
    }
    return [hi >>> 0, lo >>> 0];
}

function popcount32(n: number): number {
    n = n - ((n >>> 1) & 0x55555555);
    n = (n & 0x33333333) + ((n >>> 2) & 0x33333333);
    n = (n + (n >>> 4)) & 0x0f0f0f0f;
    return (n * 0x01010101) >>> 24;
}

/** Hamming distance (number of differing bits) between two 64-bit hashes. */
export function hammingDistance(a: Hash, b: Hash): number {
    return popcount32((a[0] ^ b[0]) >>> 0) + popcount32((a[1] ^ b[1]) >>> 0);
}

/**
 * Cheap sharpness proxy: mean squared Laplacian response over the interior of
 * the small grayscale image. Only used as a keeper tie-breaker.
 */
export function sharpnessFromGray(gray: ArrayLike<number>, width: number, height: number): number {
    let sum = 0;
    let count = 0;
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const c = gray[y * width + x];
            const laplacian =
                4 * c -
                gray[(y - 1) * width + x] -
                gray[(y + 1) * width + x] -
                gray[y * width + x - 1] -
                gray[y * width + x + 1];
            sum += laplacian * laplacian;
            count++;
        }
    }
    return count > 0 ? sum / count : 0;
}

/** Cosine similarity between two equal-length vectors (0 when either is degenerate). */
export function cosineSimilarity(a: ArrayLike<number>, b: ArrayLike<number>): number {
    if (a.length !== b.length || a.length === 0) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
