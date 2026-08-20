declare module 'upng-js' {
    export interface UPNGImage {
        width: number;
        height: number;
        depth: number;
        ctype: number;
        frames: unknown[];
        tabs: Record<string, unknown>;
        data: Uint8Array;
    }

    /** Decodes a PNG buffer into an image descriptor. */
    export function decode(buffer: ArrayBuffer | Uint8Array): UPNGImage;

    /** Converts a decoded image into an array of RGBA8 frame buffers. */
    export function toRGBA8(img: UPNGImage): ArrayBuffer[];

    const UPNG: {
        decode: typeof decode;
        toRGBA8: typeof toRGBA8;
    };
    export default UPNG;
}
