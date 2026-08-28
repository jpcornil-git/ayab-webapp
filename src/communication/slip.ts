/**
 * SLIP (Serial Line Internet Protocol) Framing
 *
 * This module provides functions for encoding and decoding data packets
 * using SLIP, as required by the AYAB API6 protocol.
 */

// SLIP special bytes
export const SLIP_END = 0xC0;
export const SLIP_ESC = 0xDB;
export const SLIP_ESC_END = 0xDC;
export const SLIP_ESC_ESC = 0xDD;

/**
 * Encodes a payload into a SLIP frame.
 * @param payload The raw data to encode.
 * @returns A new Uint8Array containing the SLIP-encoded frame, including the trailing END byte.
 */
export function slipEncode(payload: Uint8Array): Uint8Array {
    const out: number[] = [];
    out.push(SLIP_END);
    for (let i = 0; i < payload.length; i++) {
        const b = payload[i];
        if (b === SLIP_END) {
            out.push(SLIP_ESC, SLIP_ESC_END);
        } else if (b === SLIP_ESC) {
            out.push(SLIP_ESC, SLIP_ESC_ESC);
        } else {
            out.push(b);
        }
    }
    out.push(SLIP_END);
    return new Uint8Array(out);
}

/**
 * Decodes a SLIP frame (without the END byte).
 * @param frame The raw SLIP frame data, excluding the END byte.
 * @returns A new Uint8Array with the decoded payload.
 */
export function slipDecode(frame: Uint8Array): Uint8Array {
    const out: number[] = [];
    for (let i = 0; i < frame.length; i++) {
        const b = frame[i];
        if (b === SLIP_ESC) {
            const next = frame[i + 1];
            if (next === SLIP_ESC_END) {
                out.push(SLIP_END);
                i++;
            } else if (next === SLIP_ESC_ESC) {
                out.push(SLIP_ESC);
                i++;
            } else {
                // malformed escape - push as-is
                out.push(b);
            }
        } else {
            out.push(b);
        }
    }
    return new Uint8Array(out);
}

/**
 * Extracts and decodes all complete SLIP frames from a buffer.
 * @param buffer The raw incoming data buffer.
 * @returns An object containing an array of decoded frames and the remaining (incomplete) buffer data.
 */
export function extractSlipFrames(buffer: Uint8Array): { frames: Uint8Array[], remainingBuffer: Uint8Array } {
    const frames: Uint8Array[] = [];
    let remainingBuffer = buffer;
    let idx = remainingBuffer.indexOf(SLIP_END);
    while (idx >= 0) {
        const frameRaw = remainingBuffer.slice(0, idx);
        remainingBuffer = remainingBuffer.slice(idx + 1);
        if (frameRaw.length > 0) {
            frames.push(slipDecode(frameRaw));
        }
        idx = remainingBuffer.indexOf(SLIP_END);
    }
    return { frames, remainingBuffer };
}