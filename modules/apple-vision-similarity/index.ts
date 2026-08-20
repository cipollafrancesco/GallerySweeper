import { requireOptionalNativeModule } from 'expo-modules-core';

export interface AppleVisionSimilarityModule {
    /**
     * Runs Apple Vision's `VNGenerateImageFeaturePrintRequest` on the image at the
     * given file URI and returns the feature-print vector as a plain number array.
     * Comparison (cosine / L2) is performed in JS.
     */
    featurePrint(uri: string): Promise<number[]>;

    /**
     * Sums the real on-disk byte size (PHAssetResource.fileSize) of the given assets,
     * identified by their expo-media-library id (== PHAsset localIdentifier on iOS).
     * The only reliable source of a photo's true size on iOS — expo-file-system cannot
     * read files inside the Photos library.
     */
    getAssetsSize(ids: string[]): Promise<number>;
}

/**
 * Resolves to `null` on Android and in Expo Go (where the native module is not
 * linked), so callers can feature-detect without try/catch.
 */
export default requireOptionalNativeModule<AppleVisionSimilarityModule>('AppleVisionSimilarity');
