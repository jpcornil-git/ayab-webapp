/**
 * Converts wrapped counter sequence into a contiguous absolute counter.
 */
export class RollingCounter {
    private readonly cycleSize: number;
    private readonly halfCycle: number;

    private wrapCount!: number;
    private lastValue!: number | null;

    /**
     * @param cycleSize - The modulus boundary where the counter wraps (default: 256 for 8-bit counters).
     */
    constructor(cycleSize: number = 256) {
        if (cycleSize <= 0) {
            throw new Error("cycleSize must be a positive number.");
        }

        this.cycleSize = cycleSize;
        this.halfCycle = cycleSize / 2;
        this.reset();
    }

    /**
     * Gets the current unwrapped absolute value
     */
    get currentValue() : number | null {
        if (this.lastValue === null) {
            return null;
        }
        return this.wrapCount * this.cycleSize + this.lastValue;
    }

    /**
     * Resets internal tracking state back to uninitialized.
     */
    public reset(): void {
        this.wrapCount = 0;
        this.lastValue = null;
    }

    /**
     * Processes a rolling value (0 to cycleSize - 1) and returns 
     * the absolute sequence index.
     * 
     * @param rawValue - The current bounded value.
     * @returns The continuous unwrapped value.
     */
    public unroll(rawValue: number): number {
        if (this.lastValue !== null) {
            const delta = rawValue - this.lastValue;

            // Detect wrap-around based on delta threshold
            if (delta < -this.halfCycle) {
                this.wrapCount++;
            } else if (delta > this.halfCycle) {
                this.wrapCount--;
            }
        }

        this.lastValue = rawValue;
        return this.currentValue!;
    }
}