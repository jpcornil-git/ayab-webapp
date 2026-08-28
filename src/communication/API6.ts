/**
 * AYAB API6 Protocol Implementation
 */

import { EventEmitter } from '../utils/EventEmitter.js';
import { slipEncode, extractSlipFrames } from './slip.js';
import { Communication } from '../shared/communication.types..js';

// Token values copied from Python im msg: Uint8Array | null; token: Token; arg1: number }plementation
export enum Token {
    reqStart = 0x01,
    cnfStart = 0xC1,
    reqInfo = 0x03,
    cnfInfo = 0xC3,
    reqInit = 0x05,
    cnfInit = 0xC5,
    reqLine = 0x82,
    cnfLine = 0x42,
    indState = 0x84,
    debug = 0x9F,
    unknown = 0xfe,
    none = 0xff,
}

export interface ParsedFrame {
    msg: Uint8Array | null;
    token: Token;
    arg1: number;
}

/**
 * Concatenate two Uint8Arrays
 * @param {Uint8Array} a - The first Uint8Array
 * @param {Uint8Array} b - The second Uint8Array
 * @returns {Uint8Array} - A new Uint8Array containing the concatenated data    
 */
function concatUint8Arrays(a: Uint8Array, b: Uint8Array): Uint8Array {
    const newBuffer = new Uint8Array(a.length + b.length);
    newBuffer.set(a);
    newBuffer.set(b, a.length);
    return newBuffer;
}

/**
 * Computes the CRC for a given Uint8Array
 * @param {Uint8Array} data - The data for which to compute CRC
 * @returns {number} The computed CRC value
 */
function compute_crc(data: Uint8Array): number {
    // CRC algorithm matches the Python add_crc (Maxim/Dallas)
    let crc : number = 0;
    for (let i = 0; i < data.length; i++) {
        let n = data[i];
        for (let j = 0; j < 8; j++) {
            const f = (crc ^ n) & 1;
            crc >>= 1;
            if (f) crc ^= 0x8c;
            n >>= 1;
        }
    }
    return crc & 0xff;
}

export class API6 extends EventEmitter {
    private comm: Communication;
    private receiveBuffer: Uint8Array = new Uint8Array(0);

    constructor(comm: Communication) {
        super();
        this.comm = comm;
        
        // Listen to raw data from communication layer
        this.comm.on('data', (data: Uint8Array) => this.handleData(data));
    }

    // Extract SLIP frames and emit 'frame' events
    private handleData(data: Uint8Array) {
        // Append to internal buffer
        this.receiveBuffer = concatUint8Arrays(this.receiveBuffer, data);
        // Extract and decode SLIP frames
        const { frames, remainingBuffer } = extractSlipFrames(this.receiveBuffer);
        this.receiveBuffer = remainingBuffer;
        // FIXME: CRC should be checked for Rx (ayabAsync OK but not ayab firmware)
        frames.forEach(frame => this.emit('frame', frame));
    }

    // High-level API6 write: SLIP-encode before sending
    async api_write(msg: Uint8Array, addCRC: boolean = true): Promise<number> {
        //console.log('Tx message:', msg);
        let encoded: Uint8Array;
        if (addCRC) {
            const crc = compute_crc(msg);
            const msgWithCrc = new Uint8Array([...msg, crc]);
            encoded = slipEncode(msgWithCrc);
        } else {
            encoded = slipEncode(msg);
        }

        return this.comm.write(encoded);
    }

    // Parse an API6 message similar to Python parse_API6
    api_parse_message(msg: Uint8Array | null): ParsedFrame {
        if (msg === null || msg.length === 0) throw new Error('Empty message cannot be parsed');
        const first = msg[0];
        for (const t of Object.values(Token)) {
            if (typeof t === 'number' && first === t) {
                // arg1 roughly matches Python behavior (msg[1]) or 0
                const arg1 = msg.length > 1 ? msg[1] : 0;
                return { msg, token: t as Token, arg1 };
            }
        }
        return { msg, token: Token.unknown, arg1: 0 };
    }

    // API6 helper methods
    async api_req_info(): Promise<void> {
        const msg = new Uint8Array([Token.reqInfo]);
        await this.api_write(msg, false);
    }

    async api_req_start(start_needle: number, stop_needle: number, continuous_reporting: boolean, hardware_beep: boolean): Promise<void> {
        const data: number[] = [];
        data.push(Token.reqStart as unknown as number);
        data.push(start_needle & 0xff);
        data.push(stop_needle & 0xff);
        const flags = (continuous_reporting ? 1 : 0) + (hardware_beep ? 2 : 0);
        data.push(flags & 0xff);
        const msg = new Uint8Array(data);
        await this.api_write(msg);
    }

    async api_req_init(machineValue: number): Promise<void> {
        const data: number[] = [];
        data.push(Token.reqInit as unknown as number);
        data.push(machineValue & 0xff);
        const msg = new Uint8Array(data);
        await this.api_write(msg);
    }

    async api_cnf_line(line_number: number, color: number, last_line: boolean, line_pattern: Uint8Array): Promise<void> {
        const data: number[] = [];
        data.push(Token.cnfLine as unknown as number);
        data.push(line_number & 0xff);
        data.push(color & 0xff);
        const flags = last_line ? 1 : 0;
        data.push(flags & 0xff);
        const msg = new Uint8Array([...data, ...line_pattern]);
        await this.api_write(msg);
    }

}