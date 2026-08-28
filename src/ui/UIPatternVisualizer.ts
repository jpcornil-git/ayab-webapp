/**
 * Pattern Visualizer - Renders pattern data to canvas
 */

import { PatternContainer } from '../components/PatternContainer.js';
import { ActiveNeedles, MachineState, MachineStatus } from '../shared/states.types.js';

export class UIPatternVisualizer {
    private _canvas: HTMLCanvasElement;
    private _pattern: PatternContainer;
    private _ctx: CanvasRenderingContext2D;
    private _pixelSize: number = 2;
    private _startNeedle: number | null = null;
    private _stopNeedle: number | null = null;
    private _numberOfNeedles: number | null = null;
    private _scrollOffsetX: number = 0;
    private _scrollOffsetY: number = 0;
    private _patternOffset: number = 0;

    constructor(canvas: HTMLCanvasElement, pattern: PatternContainer) {
        this._canvas = canvas;
        this._pattern = pattern;
        this._ctx = canvas.getContext('2d')!;
        if (!this._ctx) {
            throw new Error('Cannot get canvas context');
        }
    }

    /**
     * Get pattern info string
     */
    getPatternInfo(): string {
        if (!this._pattern) {
            return 'No pattern loaded';
        }
        return `${this._pattern.width}×${this._pattern.height}px | Zoom: ${this._pixelSize}x`;
    }
        
    /**
     * Set the number of needles (width) of the knitting machine
     */
    setNumberOfNeedles(needles: number): void {
        this._numberOfNeedles = needles;
    }

    /**
     * Set the start and stop needles for the pattern
     */
    setStartStopNeedle(start: number | null, stop: number | null): void {
        this._startNeedle = start;
        this._stopNeedle = stop;
    }

    /**
     * Set pattern offset from the first/left needle (in needle unit)
     */
    setPatternOffset(offset: number) {
        this._patternOffset = offset;
    }

    /**
     * Set scroll offset (in pixel unit)
     */
    setScrollOffset(x: number, y: number): void {
        this._scrollOffsetX = Math.round(Math.max(0, Math.min((this._patternOffset + this._pattern.width)  * this._pixelSize, x)));
        this._scrollOffsetY = Math.round(Math.max(0, Math.min(this._pattern.height * this._pixelSize, y)));
    }

    /**
     * Get scroll offset
     */
    getScrollOffset(): { offsetX: number; offsetY: number } {
        return { offsetX: this._scrollOffsetX, offsetY: this._scrollOffsetY };
    }

    /**
     * Get maximum horizontal scroll offset
     */
    getMaxScrollX(): number {
        if (!this._numberOfNeedles) return 0;
        return Math.max(0, this._numberOfNeedles * this._pixelSize - this._canvas.width);
    }

    /**
     * Get maximum vertical scroll offset
     */
    getMaxScrollY(): number {
        if (!this._pattern) return 0;
        return Math.max(0, this._pattern.height * this._pixelSize + this.getNeedleBedHeight() - this._canvas.height);
    }

    /**
     * Get fixed height of the needle bed area
     */
    private getNeedleBedHeight(): number {
        return Math.max(8, Math.round(this._canvas.height / 20));
    }

    /**
     * Auto-zoom to fit pattern in canvas
     */
    autoZoom(): void {
        this._scrollOffsetX = 0;
        this._scrollOffsetY = 0;

        if (!this._pattern) {
            this._pixelSize = 2;
            return;
        }

        // Calculate pixel size to fit pattern in the available canvas area below the needle bed
        const effectiveWidth = this._numberOfNeedles || this._pattern.width;
        const maxPixelWidth = this._canvas.width / effectiveWidth;
        const availableHeight = Math.max(1, this._canvas.height - this.getNeedleBedHeight());
        const maxPixelHeight = availableHeight / this._pattern.height;
        this._pixelSize = Math.max(1, Math.floor(Math.min(maxPixelWidth, maxPixelHeight)));
    }

    /**
     * Zoom in
     */
    zoomIn(center?:{x:number, y:number}): void {
        if(!center) {
            center = {x:this._canvas.width/2, y:this._canvas.height/2};
        }

        const newPixelSize = Math.min(20, this._pixelSize + 1);

        // Compute new offset to keep zoom center at the same position
        const newX = (this._scrollOffsetX + center.x) * newPixelSize / this._pixelSize - center.x;
        const newY = (this._scrollOffsetY + center.y) * newPixelSize / this._pixelSize - center.y;
        this._pixelSize = newPixelSize;
        this.setScrollOffset(newX, newY);
    }

    /**
     * Zoom out
     */
    zoomOut(center?:{x:number, y:number}): void {
        if(!center) {
            center = {x:this._canvas.width/2, y:this._canvas.height/2};
        }
       
        const newPixelSize =  Math.max(1, this._pixelSize - 1);

        // Compute new offset to keep zoom center at the same position
        const newX = (this._scrollOffsetX + center.x) * newPixelSize / this._pixelSize - center.x;
        const newY = (this._scrollOffsetY + center.y) * newPixelSize / this._pixelSize - center.y;
        this._pixelSize = newPixelSize;
        this.setScrollOffset(newX, newY);
    }

    /**
     * Draw needle bed representation
     */
    private drawNeedleBed(): void {
        if (!this._pattern || !this._numberOfNeedles) return;

        const bedHeight = this.getNeedleBedHeight();
        let bedStart = -this._scrollOffsetX
        let bedEnd = bedStart + this._numberOfNeedles * this._pixelSize / 2;

        this._ctx.strokeStyle = '#666';
        this._ctx.lineWidth = 1;

        if (!(bedEnd < 0  ||
            bedStart > this._canvas.width)) {
            // Left rectangle is visible
            bedStart = Math.max(0, bedStart);
            bedEnd = Math.min(this._canvas.width, bedEnd);
            this._ctx.fillStyle = '#f39c12';
            this._ctx.fillRect(bedStart, 0, bedEnd - bedStart, bedHeight);
            this._ctx.strokeRect(bedStart + 0.5, 0.5, bedEnd - bedStart, bedHeight);
        }

        bedStart = bedEnd;
        bedEnd = bedStart + this._numberOfNeedles * this._pixelSize / 2;
        if (!(bedEnd < 0  ||
            bedStart > this._canvas.width)) {
            // Right rectangle is visible
            bedStart = Math.max(0, bedStart);
            bedEnd = Math.min(this._canvas.width, bedEnd);
            this._ctx.fillStyle = '#2ecc71';
            this._ctx.fillRect(bedStart, 0, bedEnd - bedStart, bedHeight);
            this._ctx.strokeRect(bedStart + 0.5, 0.5, bedEnd - bedStart, bedHeight);
        }
    }
    
    /**
     * Draw start and stop needles
     */
    private drawStartStopNeedleMarkers(): void {
        if (this._startNeedle && this._stopNeedle) {
            const bedHeight = this.getNeedleBedHeight();

            this._ctx.fillStyle = 'white';
            const activeNeedleStart = Math.max(0, Math.min(this._canvas.width, this._startNeedle * this._pixelSize - this._scrollOffsetX));
            const activeNeedleEnd = Math.max(0, Math.min(this._canvas.width, (this._stopNeedle+1) * this._pixelSize - this._scrollOffsetX));

            this._ctx.fillRect(activeNeedleStart, bedHeight/2, activeNeedleEnd-activeNeedleStart, bedHeight/2);
        }
    }

    /**
     * Draw grid overlay
     */
    private drawGrid(): void {
        const gridSize : [number, number, string][] = [[this._pixelSize, 0.5, '#ddd'], [this._pixelSize * 5, 1, '#aaa']];
        const bedHeight = this.getNeedleBedHeight();

        // draw single line every pixel and double line every 5 pixels
        for (const [size, width, color] of gridSize) {
            if (size <= 4) continue; // Skip small grids to avoid clutter
            // Vertical lines
            this._ctx.lineWidth = width;
            this._ctx.strokeStyle = color;
            const startX = size-(this._scrollOffsetX % size);
            for (let x = startX; x < this._canvas.width; x += size) {
                this._ctx.beginPath();
                this._ctx.moveTo(x + 0.5, 0);
                this._ctx.lineTo(x + 0.5, this._canvas.height);
                this._ctx.stroke();
            }

            // Horizontal lines
            const startY = bedHeight + size - (this._scrollOffsetY % size);
            for (let y = startY; y < this._canvas.height; y += size) {
                this._ctx.beginPath();
                this._ctx.moveTo(0, y + 0.5);
                this._ctx.lineTo(this._canvas.width, y + 0.5);
                this._ctx.stroke();
            }
        }
    }

    /**
     * Draw pattern image
     */
    private drawPattern() {
        const bedHeight = this.getNeedleBedHeight();
        for (let y = 0; y < this._pattern.height; y++) {
            for (let x = 0; x < this._pattern.width; x++) {
                const color = this._pattern.getColorRGB(x, y);
                if (color) {
                    this._ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
                } else {
                    this._ctx.fillStyle = '#000';
                }

                const px = (x+this._patternOffset) * this._pixelSize - this._scrollOffsetX;
                const py = y * this._pixelSize - this._scrollOffsetY + bedHeight;
                if (px + this._pixelSize > 0 && px < this._canvas.width && py + this._pixelSize > bedHeight && py < this._canvas.height) {
                    const bedOverlap = Math.min(py-bedHeight, 0);
                    this._ctx.fillRect(px, py-bedOverlap, this._pixelSize, this._pixelSize-bedOverlap);
                }
            }
        }

        // Draw border
        this._ctx.strokeStyle = '#444';
        this._ctx.lineWidth = 1;
        const width = this._pattern!.width * this._pixelSize;
        const height = this._pattern!.height * this._pixelSize;
        const bedOverlap = Math.min(-this._scrollOffsetY, 0);
        this._ctx.strokeRect(this._patternOffset * this._pixelSize - this._scrollOffsetX, bedHeight - this._scrollOffsetY - bedOverlap, width, height+bedOverlap);
    }
    
    /**
     * Draw pattern with progress overlay
     */
    drawCanvas(machineStatus: MachineStatus): void {
        // Clear canvas
        this._ctx.fillStyle = '#f0f0f0';
        this._ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);

        if (!this._pattern.isLoaded) {
            // Draw "no pattern" message
            this._ctx.fillStyle = '#999';
            this._ctx.font = 'bold 14px Arial';
            this._ctx.textAlign = 'center';
            this._ctx.fillText('No pattern loaded', this._canvas.width / 2, this._canvas.height / 2);
            return;
        }

        // Draw needle bed
        this.drawNeedleBed();
        // Draw start/stop needle markers
        this.drawStartStopNeedleMarkers();
        // Draw pattern
        this.drawPattern();
        // Draw grid background
        this.drawGrid();

        if (machineStatus.state != MachineState.RUNNING || !this._numberOfNeedles) {
            return;
        }

        const activeNeedles = this._pattern.activeNeedles;
        if (activeNeedles) {
            const bedHeight = this.getNeedleBedHeight();
            if (this._pixelSize > 2) {
                // Draw active needles
                this._ctx.fillStyle = 'black'
                for (let needle= 0; needle < this._numberOfNeedles; needle++) {
                    const isSelected = (activeNeedles.data[needle >> 3] & (1 << (needle % 8))) != 0;
                    if (isSelected) {
                        this._ctx.fillRect(needle*this._pixelSize + 1 - this._scrollOffsetX, bedHeight / 2 + 1, this._pixelSize - 2, bedHeight/2 - 2);
                    }
                }
            }

            // Draw completed area with semi-transparent overlay
            this._ctx.fillStyle = 'rgba(76, 175, 80, 0.2)';
            const topLeftCorner = {
                x: this._startNeedle! * this._pixelSize - this._scrollOffsetX,
                y: bedHeight + (this._pattern.height-activeNeedles.row) * this._pixelSize - this._scrollOffsetY
            };
            const bottomRightCorner = {
                x: (this._stopNeedle! +1)* this._pixelSize - this._scrollOffsetX,
                y: bedHeight + this._pattern.height * this._pixelSize - this._scrollOffsetY
            }
            this._ctx.fillRect(topLeftCorner.x, topLeftCorner.y, bottomRightCorner.x - topLeftCorner.x, bottomRightCorner.y-topLeftCorner.y);

            // Draw rectangle for the active row
            this._ctx.strokeStyle = '#4CAF50';
            this._ctx.lineWidth = 2;
            this._ctx.beginPath();
            this._ctx.moveTo(topLeftCorner.x, topLeftCorner.y);
            this._ctx.lineTo(bottomRightCorner.x, topLeftCorner.y);
            this._ctx.stroke();
            this._ctx.strokeRect(topLeftCorner.x, topLeftCorner.y, bottomRightCorner.x - topLeftCorner.x, this._pixelSize);
        }
    }
}
