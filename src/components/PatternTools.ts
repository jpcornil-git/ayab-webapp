import type { RgbImage } from './PatternContainer.js';

type ImageGetter = () => RgbImage | null;
type ImageReplacer = (width: number, height: number, data: ImageDataArray) => void;

/**
 * Applies transformations to a PatternContainer's raw image data.
 */
export class PatternTool {
    private readonly getImage: ImageGetter;
    private readonly replaceImage: ImageReplacer;

    constructor(getImage: ImageGetter, replaceImage: ImageReplacer) {
        this.getImage = getImage;
        this.replaceImage = replaceImage;
    }

    /** Copies a pixel from the source image to the target image.
     * @param source The source image data.
     * @param sourceWidth The width of the source image.
     * @param sourceX The x-coordinate of the source pixel.
     * @param sourceY The y-coordinate of the source pixel.
     * @param target The target image data.
     * @param targetWidth The width of the target image.
     * @param targetX The x-coordinate of the target pixel.
     * @param targetY The y-coordinate of the target pixel.
     */
    private copyPixel(source: ImageDataArray, sourceWidth: number, sourceX: number, sourceY: number,
      target: ImageDataArray, targetWidth: number, targetX: number, targetY: number): void {
        const sourceIndex = (sourceY * sourceWidth + sourceX) * 4;
        const targetIndex = (targetY * targetWidth + targetX) * 4;
        target[targetIndex] = source[sourceIndex];
        target[targetIndex + 1] = source[sourceIndex + 1];
        target[targetIndex + 2] = source[sourceIndex + 2];
        target[targetIndex + 3] = source[sourceIndex + 3];
    }

    /**
     * Inverts the colors of the pattern image.
     */
    public invert(): void {
        const image = this.getImage();
        if (!image) return;

        const data = new Uint8ClampedArray(image.data);
        for (let i = 0; i < data.length; i += 4) {
            data[i] = 255 - data[i];
            data[i + 1] = 255 - data[i + 1];
            data[i + 2] = 255 - data[i + 2];
        }
        this.replaceImage(image.width, image.height, data);
    }

    /**
     * Stretches the pattern image by the given horizontal and vertical scale factors.
     * @param horizontalScale The factor by which to stretch the image horizontally.
     * @param verticalScale The factor by which to stretch the image vertically.
     */
    public stretch(horizontalScale: number, verticalScale: number): void {
        const image = this.getImage();
        if (!image) return;
        if (!Number.isFinite(horizontalScale) || !Number.isFinite(verticalScale) ||
            horizontalScale <= 0 || verticalScale <= 0) {
            throw new Error('PatternTool: Stretch factors must be positive numbers.');
        }

        const width = Math.max(1, Math.round(image.width * horizontalScale));
        const height = Math.max(1, Math.round(image.height * verticalScale));
        const data = new Uint8ClampedArray(width * height * 4);
        for (let y = 0; y < height; y++) {
            const sourceY = Math.min(image.height - 1, Math.floor(y / verticalScale));
            for (let x = 0; x < width; x++) {
                const sourceX = Math.min(image.width - 1, Math.floor(x / horizontalScale));
                this.copyPixel(image.data, image.width, sourceX, sourceY, data, width, x, y);
            }
        }
        this.replaceImage(width, height, data);
    }

    /**
     * Repeats the pattern image a specified number of times horizontally and vertically.
     * @param horizontalCount The number of horizontal repeats.
     * @param verticalCount The number of vertical repeats.
     */
    public repeat(horizontalCount: number, verticalCount: number): void {
        const image = this.getImage();
        if (!image) return;
        if (!Number.isInteger(horizontalCount) || !Number.isInteger(verticalCount) ||
            horizontalCount < 1 || verticalCount < 1) {
            throw new Error('PatternTool: Repeat counts must be positive integers.');
        }

        const width = image.width * horizontalCount;
        const height = image.height * verticalCount;
        const data = new Uint8ClampedArray(width * height * 4);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                this.copyPixel(image.data, image.width, x % image.width, y % image.height, data, width, x, y);
            }
        }
        this.replaceImage(width, height, data);
    }

    /**
     * Reflect the pattern image across the specified edge.
     * @param edge The edge to reflect across: 'left', 'right', 'top', or 'bottom'.
     */
    public reflect(edge: 'left' | 'right' | 'top' | 'bottom'): void {
        const image = this.getImage();
        if (!image) return;
        if (edge !== 'left' && edge !== 'right' && edge !== 'top' && edge !== 'bottom') {
            throw new Error('PatternTool: Reflection edge must be left, right, top, or bottom.');
        }

        const width = edge === 'left' || edge === 'right' ? image.width * 2 : image.width;
        const height = edge === 'top' || edge === 'bottom' ? image.height * 2 : image.height;
        const data = new Uint8ClampedArray(width * height * 4);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const sourceX = edge === 'left'
                    ? (x < image.width ? image.width - x - 1 : x - image.width)
                    : edge === 'right'
                        ? (x < image.width ? x : width - x - 1)
                        : x;
                const sourceY = edge === 'top'
                    ? (y < image.height ? image.height - y - 1 : y - image.height)
                    : edge === 'bottom'
                        ? (y < image.height ? y : height - y - 1)
                        : y;
                this.copyPixel(image.data, image.width, sourceX, sourceY, data, width, x, y);
            }
        }
        this.replaceImage(width, height, data);
    }

    /**
     * Flips the pattern image in the specified direction.
     * @param direction The direction to flip: 'horizontal' or 'vertical'.
     */
    public flip(direction: 'horizontal' | 'vertical'): void {
        const image = this.getImage();
        if (!image) return;
        if (direction !== 'horizontal' && direction !== 'vertical') {
            throw new Error('PatternTool: Flip direction must be horizontal or vertical.');
        }

        const data = new Uint8ClampedArray(image.data.length);
        for (let y = 0; y < image.height; y++) {
            for (let x = 0; x < image.width; x++) {
                const sourceX = direction === 'horizontal' ? image.width - x - 1 : x;
                const sourceY = direction === 'vertical' ? image.height - y - 1 : y;
                this.copyPixel(image.data, image.width, sourceX, sourceY, data, image.width, x, y);
            }
        }
        this.replaceImage(image.width, image.height, data);
    }

    /**
     * Rotates the pattern image by 90 degrees in the specified direction.
     * @param direction The direction to rotate: 'left' or 'right'.
     */
    public rotate(direction: 'left' | 'right'): void {
        const image = this.getImage();
        if (!image) return;
        if (direction !== 'left' && direction !== 'right') {
            throw new Error('PatternTool: Rotation direction must be left or right.');
        }

        const width = image.height;
        const height = image.width;
        const data = new Uint8ClampedArray(width * height * 4);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const sourceX = direction === 'right' ? y : image.width - y - 1;
                const sourceY = direction === 'right' ? image.height - x - 1 : x;
                this.copyPixel(image.data, image.width, sourceX, sourceY, data, width, x, y);
            }
        }
        this.replaceImage(width, height, data);
    }
}
