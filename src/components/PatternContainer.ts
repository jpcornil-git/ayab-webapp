import { ActiveNeedles } from "../shared/states.types.js";
import { EventEmitter } from "../utils/EventEmitter.js";
import { MemoData } from "./MemoData.js";
import { PatternTool } from "./PatternTools.js";

export type RgbImage = {
    width: number;
    height: number;
    data: ImageDataArray;
};
/**
* @property FREQUENCY : From highest to lowest frequency
* @property INTENSITY : From darkest to brightest 
**/
export enum OrderModeBy {
    FREQUENCY = 0,
    INTENSITY = 1,
}

export class PatternContainer extends EventEmitter {
    
    private _rgbImage!: RgbImage | null;
    private _indexedData!: Uint8Array | null;
    private _rgbPalette!: Array<[number, number, number]> | null;
    private _activeNeedles!: ActiveNeedles | null;
    private _patternTool: PatternTool;
    private _memoData: number [] | null = null;

    private _isLoaded: boolean = false;
    private _isMirrored: boolean = false;

    constructor() {
        super();
        this._patternTool = new PatternTool(
            () => this._rgbImage,
            this.replaceImageData.bind(this)
        );
        this.clear();
    }   

    /**
    * Calculates the squared Euclidean distance between two RGB colors.
    * @param c1 First color as [R, G, B]
    * @param c2 Second color as [R, G, B]
    * @returns The squared distance between the two colors.
    */
    private colorDistanceSquared(c1: [number, number, number], c2: [number, number, number]): number {
        const dr = c1[0] - c2[0];
        const dg = c1[1] - c2[1];
        const db = c1[2] - c2[2];
        return dr * dr + dg * dg + db * db;
    }
        
    get isLoaded(): boolean {
        return this._isLoaded;
    }

    get width(): number {
        return this._rgbImage?.width ?? 0;
    }

    get height(): number {
        return this._rgbImage?.height ?? 0;
    }
    
    get nColors(): number {
        return this._rgbPalette ? this._rgbPalette.length : 0;
    }

    get tool(): PatternTool {
        return this._patternTool;
    }

    get activeNeedles() : ActiveNeedles | null{
        return this._activeNeedles;
    }

    set activeNeedles(value: ActiveNeedles) {
        this._activeNeedles = value;
    }
    
    set isMirrored(value: boolean) {
        this._isMirrored = value;
    }

    /**
     * Resets the PatternContainer to its initial state, clearing all data and settings.
     */
    public clear() {
        this._isLoaded = false;
        this._isMirrored = false;
        this._rgbImage = null;
        this._indexedData = null;
        this._rgbPalette = null;
        this._activeNeedles = null;
        this.emit('patternChanged', null);
    }

    private replaceImageData(width: number, height: number, data: ImageDataArray): void {
        const nColors = this._rgbPalette?.length ?? 2;
        this._rgbImage = { width, height, data };
        this.quantizeImage(nColors);
    }

    /**
     * Gets the color index at a specific coordinate.
     * @param x horizontal coordinate
     * @param y vertical coordinate
     * @returns The color index or null if out of bounds.
     */
    public getColorIndex(x: number, y: number): number | null {
        if (this._isMirrored) x = this.width - 1 -x;
        if (this._indexedData && x >= 0 && x < this.width && y >= 0 && y < this.height) {
            return this._indexedData[y * this.width + x];
        }
        return null;
    }

    /**
     * Gets the RGB color at a specific coordinate.
     * @param x horizontal coordinate
     * @param y vertical coordinate
     * @returns The RGB color or null if out of bounds.
     */
    public getColorRGB(x: number, y: number): [number, number, number] | null {
        const colorIndex = this.getColorIndex(x, y);
        if (colorIndex !== null && this._rgbPalette) {
            return this._rgbPalette[colorIndex];
        }
        return null;
    }

    /**
     * Gets the memo data associated with a row of the pattern.
     * @returns The memo data as a number or null if not set.
     */
    public memoData(y: number): number | null {
        if (this._memoData && y >= 0 && y < this._memoData.length) {
            return this._memoData[y];
        }
        return null;
    }

    /**
     */
    /**
     * Convert image to pattern data
     * @param img The image element to convert
     * @param maxWidth The maximum width of the pattern (default: 200)
     * @returns An object containing the width, height, and pixel data of the pattern
     */
    public updateImage(img: HTMLImageElement, memo: number[] | null = null, maxWidth: number = 200) {
        this.clear();

        // Create canvas to draw image and get pixel data
        const canvas = document.createElement('canvas');
        
        // Scale image to max width while maintaining aspect ratio
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Could not get canvas context');
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        this._rgbImage = { width: canvas.width, height: canvas.height, data: imageData.data };
        this._memoData = memo;
    }

    /**
     * Reorder palette
     * @param OrderMode see OrderModeBy
     */
    public orderPalette(orderMode: OrderModeBy) {
        if (!this._rgbPalette || !this._indexedData) return;

        let sortedOldIndices = Array.from(this._rgbPalette, (_, i) => i);
        switch(orderMode) {
            case OrderModeBy.FREQUENCY:
                // Build Histogram
                const histogram = new Array(this._rgbPalette.length).fill(0);
                for (let i = 0; i < this._indexedData.length; i++) {
                    histogram[this._indexedData[i]]++;
                }
                // From highest to lowest
                sortedOldIndices.sort((a, b) => histogram[b] - histogram[a]);                
                break;
            default: // OrderModeBy.INTENSITY
                const brigthness = (c: [number, number, number]) => c[0]*c[0] + c[1]*c[1]+ c[2]*c[2];
                sortedOldIndices.sort((a, b) => brigthness(this._rgbPalette![a]) - brigthness(this._rgbPalette![b]));
        }

        // Build old->new mapping table for indices
        const remap = new Uint8Array(this._rgbPalette.length);
        sortedOldIndices.forEach((oldIdx, newIdx) => {
            remap[oldIdx] = newIdx;
        });

        // Remap pixel indices and palette
        for (let i = 0; i < this._indexedData.length; i++) {
            this._indexedData[i] = remap[this._indexedData[i]];
        }
        this._rgbPalette = sortedOldIndices.map((oldIdx) => this._rgbPalette![oldIdx]);
    }

    /**
     * Reduces the number of colors in an RGBA image to nColors using k-means clustering.
     * Update indexed image data and the corresponding palette.
     * @param nColors The desired number of colors in the output palette.
     * @param maxIterations Maximum number of iterations for k-means convergence (default: 10).
     * @param backgroundColor The background color to blend with (default: white).
     */
    public quantizeImage(
      nColors: number,
      maxIterations: number = 10,
      backgroundColor: [number, number, number] = [255, 255, 255]
    ) {
        const totalPixels = this.width * this.height;
        if (totalPixels === 0 || !this._rgbImage || nColors <= 0) {
            this.clear();
            throw new Error('PatternContainer: No image data to quantize or invalid parameters.');
            return ;
        }
    
        this._indexedData = new Uint8Array(totalPixels);

        // Remove A component (pre-blend pixels over background) and create a new RGB array
        const rgbData = new Uint8Array(totalPixels * 3);
        const [bgR, bgG, bgB] = backgroundColor;
        
        for (let i = 0; i < totalPixels; i++) {
            const srcIdx = i * 4;
            const dstIdx = i * 3;
        
            const r = this._rgbImage.data[srcIdx];
            const g = this._rgbImage.data[srcIdx + 1];
            const b = this._rgbImage.data[srcIdx + 2];
            const a = this._rgbImage.data[srcIdx + 3] / 255; // Normalize alpha [0, 1]
        
            // Alpha blending over background
            rgbData[dstIdx]     = Math.round(r * a + bgR * (1 - a));
            rgbData[dstIdx + 1] = Math.round(g * a + bgG * (1 - a));
            rgbData[dstIdx + 2] = Math.round(b * a + bgB * (1 - a));
        }
        
        // Initialize color palette
        this._rgbPalette = [];
        
        // Pick first color randomly
        const firstIdx = Math.floor(Math.random() * totalPixels) * 3;
        this._rgbPalette.push([rgbData[firstIdx], rgbData[firstIdx + 1], rgbData[firstIdx + 2]]);
        
        const minDistances = new Float32Array(totalPixels).fill(Infinity);
        
        // K-Means++ Initialization
        // see https://en.wikipedia.org/wiki/K-means%2B%2B#Improved_initialization_algorithm
        for (let k = 1; k < nColors; k++) {
            const prevColor = this._rgbPalette[k - 1];
            let totalDistSum = 0;
        
            for (let i = 0; i < totalPixels; i++) {
                const offset = i * 3;
                // Ignore A channel for distance calculation
                const dr = rgbData[offset] - prevColor[0];
                const dg = rgbData[offset + 1] - prevColor[1];
                const db = rgbData[offset + 2] - prevColor[2];
                const dist = this.colorDistanceSquared([rgbData[offset], rgbData[offset + 1], rgbData[offset + 2]], prevColor);
            
                if (dist < minDistances[i]) {
                    minDistances[i] = dist;
                }
                totalDistSum += minDistances[i];
            }
        
            // Probability to pick a pixel (cross a random threshold) is proportional to its distance from the nearest palette color
            let rand = Math.random() * totalDistSum;
            for (let i = 0; i < totalPixels; i++) {
                rand -= minDistances[i];
                if (rand <= 0) {
                    const offset = i * 3;
                    this._rgbPalette.push([rgbData[offset], rgbData[offset + 1], rgbData[offset + 2]]);
                    break;
                }
            }
        
            // Handles rounding errors (when rand is close to 1 and above loop doesn't trigger)
            if (this._rgbPalette.length < k + 1) {
                const idx = Math.floor(Math.random() * totalPixels) * 3;
                this._rgbPalette.push([rgbData[idx], rgbData[idx + 1], rgbData[idx + 2]]);
            }
        }
        
        // K-Means optimization loop
        const counts = new Int32Array(nColors);
        const sums = new Float64Array(nColors * 3); // For R, G, B sums
        
        for (let iter = 0; iter < maxIterations; iter++) {
            let changed = false;
            counts.fill(0);
            sums.fill(0);
        
            // Assign each pixel to the nearest centroid
            for (let i = 0; i < totalPixels; i++) {
                const pixelIndex = i * 3;
                const r = rgbData[pixelIndex];
                const g = rgbData[pixelIndex + 1];
                const b = rgbData[pixelIndex + 2];
            
                let minDist = Infinity;
                let closestIdx = 0;
        
                for (let k = 0; k < this._rgbPalette.length; k++) {
                    const c = this._rgbPalette[k];
                    // Ignore A channel for distance calculation
                    const dist = this.colorDistanceSquared([r, g, b], c);
            
                    if (dist < minDist) {
                        minDist = dist;
                        closestIdx = k;
                    }
                }
            
                if (this._indexedData[i] !== closestIdx) {
                    this._indexedData[i] = closestIdx;
                    changed = true; 
                }
            
                // Accumulate for palette color recalculation
                counts[closestIdx]++;
                const colorIndex = closestIdx * 3;
                sums[colorIndex] += r;
                sums[colorIndex + 1] += g;
                sums[colorIndex + 2] += b;
            }
        
            if (!changed) break; // Converged early
        
            // Update palette color values based on the mean of assigned pixels
            for (let k = 0; k < this._rgbPalette.length; k++) {
            if (counts[k] > 0) {
                const colorIndex = k * 3;
                this._rgbPalette[k] = [
                    Math.round(sums[colorIndex] / counts[k]),
                    Math.round(sums[colorIndex + 1] / counts[k]),
                    Math.round(sums[colorIndex + 2] / counts[k]),
                ];
            }
            }
        }
        this._isLoaded = true;
        this.emit('patternChanged', null);
    }
}