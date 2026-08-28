export class UIConsole {
    private element: HTMLElement | null;

    constructor(elementId: string) {
        this.element = document.getElementById(elementId);
        if (this.element) {
            this.setupInterception();
        }
    }

    private setupInterception(): void {
        const origLog = console.log.bind(console);
        const origWarn = console.warn.bind(console);
        const origError = console.error.bind(console);
        const origInfo = console.info.bind(console);

        console.log = (...args: any[]) => {
            origLog(...args);
            this.append('log', args);
        };
        console.warn = (...args: any[]) => {
            origWarn(...args);
            this.append('warn', args);
        };
        console.error = (...args: any[]) => {
            origError(...args);
            this.append('error', args);
        };
        console.info = (...args: any[]) => {
            origInfo(...args);
            this.append('info', args);
        };
    }

    public clear() {
        this.element?.replaceChildren();
    }

    private append(level: 'log' | 'warn' | 'error' | 'info', args: any[]): void {
        if (!this.element) return;
        try {
            const time = new Date().toLocaleTimeString();
            const text = args.map(a => {
                try {
                    if (typeof a === 'object') return JSON.stringify(a);
                    return String(a);
                } catch (e) {
                    return String(a);
                }
            }).join(' ');
            const line = document.createElement('div');
            line.className = `console-line console-${level}`;
            line.textContent = `[${time}] ${text}`;
            this.element.appendChild(line);
            this.element.scrollTop = this.element.scrollHeight;
        } catch (e) {
            // ignore
        }
    }
}
