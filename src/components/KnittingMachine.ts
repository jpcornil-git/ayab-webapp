/**
 * State Machine for AYAB Knitting Machine
 */

import { MachineTypeMap, MachineWidthMap, BedMode } from '../shared/machine.types.js';
import { KnittingConfig, MachineState, MachineStatus, colorToString } from '../shared/states.types.js';
import { Communication } from '../shared/communication.types..js';
import { API6, Token, ParsedFrame } from '../communication/API6.js';
import { EventEmitter } from '../utils/EventEmitter.js';
import { AudioPlayer } from '../utils/AudioPlayer.js';
import { PatternContainer, OrderModeBy } from './PatternContainer.js';
import { BedModeMachine } from './BedModeMachine.js';
import { RollingCounter } from '../utils/RollingCounter.js';

/**
 * Define a dedicated exception when user cancels knitting
 */
export class KnitCancelledError extends Error {
    constructor() {
        super('Knitting cancelled by user');
        this.name = 'KnitCancelledError';
    }
}

/**
 * Calculates the mathematical modulo, safely handling negative numbers.
 * @param {number} n - The dividend.
 * @param {number} m - The divisor (modulus).
 * @return {number} The wrapped positive remainder in the range [0, m - 1].
 */
const mod = (n:number, m:number) : number => ((n % m) + m) % m;

/**
 * Converts a bit array into a string
 * @param bytes Uint8Array storing 8-bits/byte
 * @param zero  Symbol for 0 (default '.')
 * @param one   Symbol for 1 (default 'v')
 * @returns     Formatted string 
 */
function packedBitArrayToString(bytes: Uint8Array, {zero = '.', one = 'v'}:{zero?:String, one?:String}) {
        return Array.from(bytes, byte => 
            [0,1,2,3,4,5,6,7]
            .map(bit => (byte & (1 << bit)) ? one : zero)
            .join('')
        ).join('');
    }

export class KnittingMachine extends EventEmitter {
    private api: API6 | null = null;
    private communication: Communication | null = null;
    private knittingConfig: KnittingConfig | null = null;
    private state: MachineState = MachineState.IDLE;
    private parsedFrames: ParsedFrame[] = [];
    private cancelRequested = false;

    constructor() {
        super();
        this.reset();
    }

    /**
     * Reset machine to initial state
     */
    private reset(): void {
        this.api = null;
        this.communication = null;
        this.knittingConfig = null;
        this.parsedFrames = [];
        this.setState(MachineState.IDLE);
        this.emit("progressChanged", null);
    }

    /**
     * Update internal state and notify listeners
     */
    private setState(newState: MachineState): void {
        this.state = newState;
        this.emit('statusChanged');
    }

    /**
     * Get current machine status
     */
    getStatus(): MachineStatus {
        return {
            connected: this.communication?.isOpen ?? false,
            state: this.state,
            type: this.knittingConfig?.machine ?? null,
        };
    }

    /**
     * Update the current knitting configuration from the UI.
     */
    setKnittingConfig(config: KnittingConfig): void {
        this.knittingConfig = config;
        this.emit('knittingConfigChanged', config);
    }

    /**
     * Helper to compute absolute needle position
     */
    public getNeedlePosition(needle:number, side:string) : number| null {
        if (!this.knittingConfig) return null;
        const needleCount = MachineWidthMap[this.knittingConfig.machine];
        if (side === 'right') {
            return Math.floor(needleCount/2) + needle - 1;
        } else {
            return Math.floor(needleCount/2) - needle;
        }
    }

    /**
     * Helper to compute pattern offset
     */
    public getPatternOffset(pattern: PatternContainer): number {
        if (!pattern.isLoaded || !this.knittingConfig) return 0;

        const startNeedle = this.getNeedlePosition(
                        this.knittingConfig?.startNeedle,
                        this.knittingConfig?.startNeedleSide)!;
        const stopNeedle = this.getNeedlePosition(
                        this.knittingConfig?.stopNeedle,
                        this.knittingConfig?.stopNeedleSide)!;

        let offset = startNeedle;
        switch(this.knittingConfig.alignment) {
            case "right":
                offset = stopNeedle - pattern.width + 1;
                break;
            case "center":
                offset = Math.floor((stopNeedle + startNeedle - pattern.width)/2) + 1;
                break;
        }
        return offset;
    }

    /**
     * Check knitting configuration
     */
    public checKnittingConfig(): boolean {
        if (!this.knittingConfig) return false;
        const config = this.knittingConfig;

        if (
            !Number.isInteger(config.numColors) ||
            !Number.isInteger(config.startRow) ||
            !Number.isInteger(config.startNeedle) ||
            !Number.isInteger(config.stopNeedle)
        ) {
            alert('ERROR: Numeric configuration values must be integers.');
            return false;
        }

        if (config.numColors < 1 || config.startRow < 0) {
            alert('ERROR: Numeric configuration values are out of range.');
            return false;
        }

        const startNeedle = this.getNeedlePosition(
            config.startNeedle,
            config.startNeedleSide);
         const stopNeedle = this.getNeedlePosition(
            config.stopNeedle,
            config?.stopNeedleSide);

        if (startNeedle! >= stopNeedle!) {
            alert("ERROR: Start needle higher than stop needle !");
            return false;
        }

        if(config.numColors >= 3 &&
            (config.mode == BedMode.SINGLEBED || config.mode == BedMode.CIRCULAR_RIBBER)) {
            alert(`ERROR: ${BedMode[config.mode]} knitting supports only 2 colors.`);
            return false;
        }

        return true;
    }

    /**
     * Connect to the knitting machine
     */
    async connect(communication: Communication): Promise<void> {
        if (this.state !== MachineState.IDLE) {
            throw new Error(`Cannot connect from state ${this.state}`);
        }

        try {
            this.communication = communication;

            this.communication.on('disconnected', () => {
                console.log('KnittingMachine->connect:  disconnected event');
                this.reset();
            });

            await this.communication.connect();

            this.api = new API6(this.communication);
            // Log raw decoded SLIP frames for debugging
            this.api.on('frame', (frame: Uint8Array) => {
                try {
                    const parsed = this.api!.api_parse_message(frame);
                    this.parsedFrames.push(parsed);
                    this.emit('frameReceived', parsed);
                    //console.log('Rx message:', parsed.token, parsed.arg1, frame);
                } catch (e) {
                    console.warn('Unexpected Rx Message:', frame);
                }
            })
        } catch (error) {
            console.error('KnittingMachineStateMachine->connect error:', (error as any).message || error);
            await this.disconnect(); // Ensure cleanup on failure
            throw error;
        }
    }

    /**
     * Disconnect and reset the machine
     */
    async disconnect(): Promise<void> {
        if (this.communication) {
            await this.communication.disconnect();
        }
        this.reset();
    }

    /**
     * Start knitting the loaded pattern
     */
    async start(pattern: PatternContainer): Promise<void> {
        this.cancelRequested = false;        
        if (this.state !== MachineState.IDLE) {
            throw new Error(`KnittingMachine->start: Cannot start from state ${this.state}`);
        }
        if (!this.knittingConfig) {
            throw new Error('Knitting configuration not set');
        }

        let failure: unknown;
        try {
            if (!this.communication?.isOpen) {
                throw new Error('Not connected to any device');
            }
            this.setState(MachineState.RUNNING);
            await this.sendPattern(pattern);
        } catch (error) {
            failure = error;
            console.error('KnittingMachine->start:', error instanceof Error ? error.message : error);
        } finally {
            try {
                await this.disconnect();
            } catch (disconnectError) {
                console.error('Failed to disconnect:', disconnectError);
                failure ??= disconnectError;
            }
        }

        if (failure !== undefined) {
            throw failure;
        }
    }

    public async cancel(): Promise<void> {
        this.cancelRequested = true;
        await this.disconnect();
    }

    private waitForFrame(
        predicate: (frame: ParsedFrame) => boolean,
        timeoutMs: number
    ): Promise<ParsedFrame | null> {
        return new Promise((resolve) => {
            if (!this.api || !this.communication?.isOpen) {
                return resolve(null);
            }

            let timeoutId: number;

            const frameHandler = (parsedFrame: ParsedFrame) => {
                const index = this.parsedFrames.findIndex(predicate);
                if (index !== -1) {
                    const frame = this.parsedFrames[index];
                    this.parsedFrames.splice(0, index + 1); // Remove all frames up to and including the matched one (TODO: or only that one ?)
                    cleanUp();
                    resolve(frame);
                }
            };

            const disconnectHandler = () => {
                cleanUp();
                resolve(null);
            };

            const cleanUp = () => {
                clearTimeout(timeoutId);
                this.off('frameReceived', frameHandler);
                this.communication?.off('disconnected', disconnectHandler);
            };

            timeoutId = window.setTimeout(() => {
                cleanUp();
                resolve(null); // Resolve with null on timeout
            }, timeoutMs);

            this.on('frameReceived', frameHandler);
            this.emit('frameReceived', null); // Trigger the handler in case the frame is already in the buffer
            this.communication?.on('disconnected', disconnectHandler);
        });
    }

    /**
     * Handle timeout errors while waiting for Rx frames
     * @param name Name of the message to report
     * @returns 
     */
    private frameTimeoutError(name: string): Error {
        if (this.cancelRequested) {
            return new KnitCancelledError();
        }

        return new Error(`Did not receive ${name} from device`);
    }

    /**
     * Stream the pattern to the connected device in operational mode using API6 (SLIP framed tokens).
     * Sends req_start then cnf_line for each row.
     */
    private async sendPattern(pattern: PatternContainer): Promise<void> {
        if (!this.communication || !this.api) throw new Error('Not connected');
        if (!this.knittingConfig) throw new Error('Knitting configuration not set');
        const config = this.knittingConfig;

        // Request info and wait for confirmation (retry ?)
        await this.api.api_req_info();
        const cnfInfoFrame = await this.waitForFrame(
            p => p.token === Token.cnfInfo,
            1000
        );
        
        if (!cnfInfoFrame) {
            throw this.frameTimeoutError('cnfInfo');
        }
        console.log('Received cnfInfo, device version:', cnfInfoFrame.arg1);

        // Send init and wait for confirmation
        const machineId = MachineTypeMap[config.machine];
        if (machineId === undefined) {
            throw new Error(`Unknown machine type: ${config.machine}`);
        }

        await this.api.api_req_init(machineId);
        const cnfInitFrame = await this.waitForFrame(
            p => p.token === Token.cnfInit,
            1000
        );
        if (!cnfInitFrame) {
            throw this.frameTimeoutError('cnfInit');
        }

        console.info(
            "Please start machine. (Set the carriage to mode KC-I" +
            "or KC-II and move the carriage over the left turn mark)."
        );
        // Wait for indState (device ready) before sending req_start
        let indStateFrame : ParsedFrame | null = null;
        while (this.state === MachineState.RUNNING && !indStateFrame) {
            indStateFrame = await this.waitForFrame(
                p => p.token === Token.indState && p.arg1 === 0,
                1000
            );
        }
        if (!indStateFrame) {
            throw this.frameTimeoutError('indState');
        }

        let audioPlayer = new AudioPlayer('assets/sounds/', !config.softwareAudio);        
        await audioPlayer.queueAudio('start.wav', 0.8);

        // Send req_start for confirmation
        const startNeedle = this.getNeedlePosition(config.startNeedle, config.startNeedleSide)!;
        const stopNeedle = this.getNeedlePosition(config.stopNeedle, config.stopNeedleSide)!;        
        await this.api.api_req_start(startNeedle, stopNeedle, config.continuousReporting, config.hardwareBeep);
        const cnfStartFrame = await this.waitForFrame(
            p => p.token === Token.cnfStart,
            1000
        );
        if (!cnfStartFrame) {
            throw new Error('Did not receive cnfStart from device');
        }

        // Now service reqLine requests until pattern complete or state changed
        const patternOffset = this.getPatternOffset(pattern);        
        if (config.mode == BedMode.SINGLEBED) {
            pattern.orderPalette(OrderModeBy.INTENSITY)
        } else {
            pattern.orderPalette(OrderModeBy.FREQUENCY)
        }

        let machineWidth = MachineWidthMap[config.machine];
        let lineData = new Uint8Array(Math.ceil(machineWidth/8));
        let bedMachine = new BedModeMachine(config.numColors, config.mode);
        const rowCounter = new RollingCounter(256);
        while (true) {
            const reqLineFrame = await this.waitForFrame(
                p => p.token === Token.reqLine,
                1000
            );
            if (!reqLineFrame) {
                if (this.cancelRequested) {
                    throw new KnitCancelledError();
                }
                continue;
            }

            const requestedRow = reqLineFrame.arg1;
            const currentRow = rowCounter.unroll(requestedRow);
            const [color, rowNumber, isBlank, passesPerRow] = bedMachine.getRowInfo(currentRow);
                
            // Note: Last row is sent first, so we need to invert the row number to match the pattern data
            let currentRowNumber = pattern.height - (config.startRow + rowNumber) ;

            if (currentRowNumber < 0) {
                if (config.infiniteRepeat) {
                    // wrap negative numbers into the pattern height
                    currentRowNumber = mod(currentRowNumber, pattern.height);
                } else {                        
                    // Send a dummy line to synchronize last row completion with finish sound
                    lineData.fill(0);
                    await this.api.api_cnf_line(requestedRow, 0, true, lineData);
                    break;
                }
            }

            // Compute row buffer
            for (let column = 0; column < machineWidth; column++) {
                let needle = false;
                if (column >= startNeedle && column <= stopNeedle) {
                    // Process working needles
                    if (!isBlank) {
                        const colorIndex = pattern.getColorIndex(column - patternOffset, currentRowNumber);
                        needle = colorIndex !== null && colorIndex == color;                            
                    }
                } else {
                    // Process flanking needles (TODO: Why is this required ?)
                    if ((config.mode != BedMode.SINGLEBED) && (color == 0)) { 
                        needle = true;
                    }
                }
                // Update bitarray
                if (needle) {
                    lineData[column >> 3] |= (1 << (column % 8));
                } else {
                    lineData[column >> 3] &= ~(1 << (column % 8));
                }
            }

            // Send line data to hardware
            await this.api.api_cnf_line(requestedRow, color, false, lineData);              
            this.emit("progressChanged", {
                row: pattern.height - currentRowNumber,
                color:color, data:lineData,
                numberOfRow:passesPerRow*(pattern.height-config.startRow+1)
            });

            await audioPlayer.queueAudio('nextline.wav', 0.8);
            const colorName = colorToString(color);
            console.log(`Row ${pattern.height - currentRowNumber}, color = ${colorName}, pattern=${packedBitArrayToString(lineData, {one:colorName})}`);                
        }
        // Done
        await audioPlayer.queueAudio('finish.wav', 0.8);
        console.log(`Pattern transfer completed (${rowCounter.currentValue} rows sent)`);
    }
}
