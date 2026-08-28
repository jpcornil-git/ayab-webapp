/**
 * Common interface for communication layers (Serial, WebSocket).
 */

import { EventEmitter } from '../utils/EventEmitter.js';

export interface Communication extends EventEmitter {
    readonly isOpen: boolean;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    write(data: Uint8Array): Promise<number>;
}