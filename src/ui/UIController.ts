/**
 * UI Controller - Manages all user interactions and UI updates
 */

import { KnittingMachine, KnitCancelledError } from '../components/KnittingMachine.js';
import { SerialCommunication } from '../communication/serial.js';
import { WebSocketCommunication } from '../communication/websocket.js';
import { MachineState, ActiveNeedles } from '../shared/states.types.js';
import { UIMachine } from './UIMachine.js';
import { UIPattern } from './UIPattern.js';
import { UIConsole } from './UIConsole.js';
import { PatternContainer } from '../components/PatternContainer.js';

export class UIController {
    // Sub-controllers
    private _uiMachine: UIMachine;
    private _uiPattern: UIPattern;
    private _uiConsole: UIConsole;

    // UI Elements
    private _navLinks: NodeListOf<HTMLElement>;
    private _tabContents: NodeListOf<HTMLElement>;
    private _interfaceSelect: HTMLSelectElement | null = null;
    private _btnKnit: HTMLButtonElement;
    private _btnCancel: HTMLButtonElement;

    // Machine instance
    private _machine: KnittingMachine;
    private _pattern: PatternContainer;
    private _lastWebsocketURI: string | null;

    constructor(machine: KnittingMachine, pattern: PatternContainer) {
        this._machine = machine;
        this._pattern = pattern;
        this._lastWebsocketURI = null;

        // Initialize sub-controllers
        this._uiConsole = new UIConsole('console-output');
        this._uiPattern = new UIPattern(this._machine, this._pattern);
        this._uiMachine = new UIMachine(this._machine);

        // Get top menu elements
        this._navLinks = document.querySelectorAll('.nav-link');
        this._navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleTabSwitch(link);
            });
        });
        this._tabContents = document.querySelectorAll('.tab-content');
        
        // Serial / WebSocket connection UI elements
        this._interfaceSelect = document.getElementById('interface-select') as HTMLSelectElement | null;
        
        // Action buttons
        this._btnKnit = this.getElement('btn-knit') as HTMLButtonElement;
        this._btnKnit.addEventListener('click', () => this.handleKnit());

        this._btnCancel = this.getElement('btn-cancel') as HTMLButtonElement;        
        this._btnCancel.addEventListener('click', () => this.handleCancel());

        // Listen to machine state changes
        this._machine.on('statusChanged', () => {
            this.updateUI();
        });
        this._machine.on('progressChanged', (activeNeedles: ActiveNeedles) => {
            this._uiMachine.updateProgress(activeNeedles);
            this._pattern.activeNeedles = activeNeedles;
        });

        // Listen to pattern changes
        this._pattern.on('patternChanged', () => {
            this._uiMachine.setDefaultStartStopNeedle(this._pattern.width);
            this._uiMachine.syncKnittingConfig();
            this.updateUI();
        });

        const btnCLearConsole = this.getElement('btn-clear-console') as HTMLButtonElement;
        btnCLearConsole.addEventListener("click", (e) => {
            this._uiConsole.clear();
        })

        this.updateUI();
    } 

    private getElement(id: string): HTMLElement {
        const element = document.getElementById(id);
        if (!element) {
            throw new Error(`Element with id "${id}" not found`);
        }
        return element;
    }

    // UI update method to reflect machine state
    private updateUI(): void {
        const machineStatus = this._machine.getStatus();
        const machineState = machineStatus.state;;

        const isRunning = machineState === MachineState.RUNNING;
        const isIdle = machineState === MachineState.IDLE;

        // Update button states
        this._btnKnit.disabled = !isIdle || !this._pattern.isLoaded;
        this._btnCancel.disabled = !isRunning;
        
        // Update machine status
        this._uiMachine.update(machineStatus);

        // Update pattern controls & redraw canvas
        this._uiPattern.updateControls(isRunning);        
        this._uiPattern.redraw();
    }   
        
    // -- Handler sections --

    // Tab switching callback
    private handleTabSwitch(link: HTMLElement): void {
        const tabName = link.getAttribute('data-tab');
        if (!tabName) return;

        // Remove active from all links and tabs
        this._navLinks.forEach(l => l.classList.remove('active'));
        this._tabContents.forEach(tab => tab.classList.remove('active'));

        // Add active to clicked link
        link.classList.add('active');

        // Show corresponding tab
        const tab = document.getElementById(`${tabName}-tab`);
        if (tab) {
            tab.classList.add('active');
        }
    }

    // Knit button callback
    private async handleKnit(): Promise<void> {
        try {
            this._uiMachine.syncKnittingConfig();
            // Check for configuration errors.
            if(! this._machine.checKnittingConfig()) {
                console.warn('Invalid configuration');
                return;
            }
            // On Start, connect based on interface selection, then start
            if (!this._interfaceSelect) {
                console.warn('No interface selection found');
                return;
            }
            const iface = this._interfaceSelect.value;
            let communication : SerialCommunication | WebSocketCommunication | null = null;
            if (iface === 'serial') {
                if (!(navigator as any).serial) {
                    console.warn('WebSerial API not available in this browser');
                    return;
                }
                // Prompt user to select a port
                let port;
                try {
                    port = await (navigator as any).serial.requestPort();
                } catch (e) {
                    console.log('Serial port selection cancelled');
                    return;
                }
                communication = new SerialCommunication(port);
            } else if (iface === 'websocket') {
                // Prompt for websocket URI
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const defaultHost = this._lastWebsocketURI || `${protocol}//${window.location.hostname}:8080`;
           
                let uri = prompt('Enter WebSocket URI:', defaultHost);
                if (!uri) {
                    console.log('WebSocket connection cancelled');
                    return;
                }
                this._lastWebsocketURI = uri;
                communication = new WebSocketCommunication(uri);
            } else {
                console.warn('[BUG] Unknown interface selected');
                return;
            }

            await this._machine.connect(communication);

            if (!this._pattern.isLoaded) {
                console.warn('[BUG] No pattern loaded');
                return;
            }
            await this._machine.start(this._pattern);
        } catch (error) {
            if (error instanceof KnitCancelledError) {
                console.info(error.message);
                return;
            }
            console.error(
                'UIController->handleKnit error:',
                error instanceof Error ? error.message : error
            );
            await this.handleCancel();
        }
    }

    // Cancel button callback
    private async handleCancel(): Promise<void> {
        try {
            await this._machine.cancel();
        } catch (error) {
            console.error('Failed to stop/disconnect:', (error as any).message || error);
        }
    } 
}
