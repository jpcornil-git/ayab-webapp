/**
 * Hardware Communication Layer
 * Handles WebSocket communication with the knitting machine.
 * Provides raw data access. Protocol logic is handled by API6 class.
 */

import { EventEmitter } from '../utils/EventEmitter.js';
import { Communication } from '../shared/communication.types..js';

export class WebSocketCommunication extends EventEmitter implements Communication {
    private ws: WebSocket | null = null;
    private uri: string;

    constructor(uri: string) {
        super();
        this.uri = uri;
        console.log('WebSocketCommunication initialized with URI:', uri);
    }

    public get isOpen(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }

    public connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                if (!this.uri) throw new Error('No URI specified');

                this.ws = new WebSocket(this.uri);
                this.ws.binaryType = 'arraybuffer';

                this.ws.onopen = () => {
                    this.emit('connected');
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    const data = new Uint8Array(event.data);
                    this.emit('data', data);
                };

                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    reject(error);
                };

                this.ws.onclose = () => {
                    this.ws = null;
                    this.emit('disconnected');
                };
            } catch (error) {
                console.error('Failed to connect to WebSocket:', (error as any).message || error);
                reject(error);
            }
        });
    }

    public disconnect(): Promise<void> {
        return new Promise((resolve) => {
            if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
                // Already closed, resolve immediately.
                return resolve();
            }

            // Rsolve this promise when the WebSocket is fully closed
            this.ws.addEventListener('close', () => resolve(), { once: true });

            // Initiate the close unless it is already closing
            if (this.ws.readyState !== WebSocket.CLOSING) {
                this.ws.close();
            }
        });
    }

    public async write(data: Uint8Array<ArrayBuffer>): Promise<number> {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) throw new Error('WebSocket not connected');
        try {
            this.ws.send(data);
            return data.length;
        } catch (error) {
            console.error('Failed to send data over WebSocket:', (error as any).message || error);
            throw error;
        }
    }
}
