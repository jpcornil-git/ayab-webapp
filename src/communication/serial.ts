/**
 * Hardware Communication Layer
 * Handles WebSerial communication with the knitting machine.
 * Provides raw data access. Protocol logic is handled by API6 class.
 */

import { EventEmitter } from '../utils/EventEmitter.js';
import { Communication } from '../shared/communication.types..js';

export class SerialCommunication extends EventEmitter implements Communication {
    private port: SerialPort | null = null;
    private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
    private disconnectPromise: Promise<void> | null = null;

    constructor(port: SerialPort) {
        super();
        this.port = port;
    }

    async connect(): Promise<void> {
        try {
            if (!this.port) throw new Error('No port selected');

            await this.port.open({ baudRate: 115200, dataBits: 8, stopBits: 1, parity: 'none' });

            if (this.port.readable && this.port.writable) {
                this.reader = this.port.readable.getReader();
                this.writer = this.port.writable.getWriter();
                this.startReading();
                this.emit('connected');
            }
        } catch (error) {
            console.error('Failed to connect to serial port:', (error as any).message || error);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        if (this.disconnectPromise) {
            return this.disconnectPromise;
        }

        this.disconnectPromise = this.closeResources();

        try {
            await this.disconnectPromise;
        } finally {
            this.disconnectPromise = null;
        }
    }

    private async closeResources(): Promise<void> {
        const reader = this.reader;
        const writer = this.writer;
        const port = this.port;

        // Prevent the read loop to run while cleaning up.
        this.reader = null;
        this.writer = null;
        this.port = null;

        try {
            if (reader) {
                await reader.cancel();
                reader.releaseLock();
            }

            if (writer) {
                await writer.close();
                writer.releaseLock();
            }

            if (port) {
                await port.close();
            }
        } catch (error) {
            console.error(
                'Error during serial port disconnect:',
                (error as any).message || error
            );
            throw error;
        } finally {
            this.emit('disconnected');
        }
    }

    async write(data: Uint8Array): Promise<number> {
        if (!this.writer) throw new Error('No writer available - not connected');
        try {
            await this.writer.write(data);
            return data.length;
        } catch (error) {
            console.error('Failed to write data to serial port:', (error as any).message || error);
            throw error;
        }
    }

    // Start reading raw serial bytes
    private async startReading(): Promise<void> {
        if (!this.reader) return;

        try {
            // Continuously read from the serial port until it's closed
            while (this.reader) {
                const { value, done } = await this.reader.read();
                if (done) break;
                if (value) this.emit('data', value);
            }
        } catch (error) {
            console.error('Error while reading from serial port:', (error as any).message || error);
            try {
                await this.disconnect();
            } catch (disconnectError) {
                console.error('Failed to disconnect after read error:', disconnectError);
            }
        }
    }

    get isOpen(): boolean {
        return this.port !== null && !!this.port.readable;
    }
}