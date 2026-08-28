/**
 * Simple Event Emitter utility
 */

type EventCallback = (...args: any[]) => void;

export class EventEmitter {
    private listeners: Map<string, EventCallback[]> = new Map();

    on(event: string, callback: EventCallback): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push(callback);
    }

    off(event: string, callback: EventCallback): void {
        if (!this.listeners.has(event)) return;
        const callbacks = this.listeners.get(event)!;
        const index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
    }

    emit(event: string, ...args: any[]): void {
        if (!this.listeners.has(event)) return;
        // Create a new map to avoid mutation while iterating, e.g. once listener
        new Map(this.listeners).get(event)!.forEach(callback => callback(...args));
    }

    once(event: string, callback: EventCallback): void {
        const wrapper = (...args: any[]) => {
            callback(...args);
            this.off(event, wrapper);
        };
        this.on(event, wrapper);
    }
}
