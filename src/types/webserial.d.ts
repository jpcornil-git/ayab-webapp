/**
 * WebSerial and WebSocket API type definitions
 */

declare global {
    interface Navigator {
        serial: {
            requestPort(options?: any): Promise<SerialPort>;
            getPorts(): Promise<SerialPort[]>;
            onconnect: ((event: Event) => void) | null;
            ondisconnect: ((event: Event) => void) | null;
        };
    }

    interface SerialPort {
        open(options: SerialOptions): Promise<void>;
        close(): Promise<void>;
        getInfo(): SerialPortInfo;
        readable: ReadableStream<Uint8Array> | null;
        writable: WritableStream<Uint8Array> | null;
        forget(): Promise<void>;
    }

    interface SerialOptions {
        baudRate: number;
        dataBits?: number;
        stopBits?: number;
        parity?: 'none' | 'even' | 'odd';
        flowControl?: 'none' | 'hardware';
        bufferSize?: number;
    }

    interface SerialPortInfo {
        usbProductId?: number;
        usbVendorId?: number;
    }
}

export {};
