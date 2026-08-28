import { ActiveNeedles, MachineState, MachineStatus, colorToString } from '../shared/states.types.js';
import { KnittingConfig } from '../shared/states.types.js';
import { KnittingMachine } from '../components/KnittingMachine.js';
import { MachineWidthMap, BedMode } from '../shared/machine.types.js';

export class UIMachine {
    private machine: KnittingMachine;
    private connectionStatus: HTMLElement;
    private machineStateDisplay: HTMLElement;
    private progressDisplay: HTMLElement;

    // Knitting config controls
    private machineSelect: HTMLSelectElement;
    private softwareAudioCheckbox: HTMLInputElement;
    private hardwareBeepCheckbox: HTMLInputElement;
    private continuousReportingCheckbox: HTMLInputElement;
    private languageSelect: HTMLSelectElement;
    private modeSelect: HTMLSelectElement;
    private colorCountInput: HTMLInputElement;
    private startRowInput: HTMLInputElement;
    private infiniteRepeat: HTMLInputElement;
    private startNeedleInput: HTMLInputElement;
    private startNeedleSide: HTMLSelectElement;
    private stopNeedleInput: HTMLInputElement;
    private stopNeedleSide: HTMLSelectElement;
    private alignmentSelect: HTMLSelectElement;
    private knitSideCheckbox: HTMLInputElement;
    private knitSidePreview: HTMLElement;

    // Save button
    private btnSaveSettings: HTMLButtonElement;

    constructor(machine: KnittingMachine) {
        this.machine = machine;

        // Initialize machine status elements
        this.connectionStatus = this.getElement('connection-status');
        this.machineStateDisplay = this.getElement('machine-state');
        this.progressDisplay = this.getElement('machine-progress');

        // Initialize controls elements
        this.machineSelect = this.getElement('machine-select') as HTMLSelectElement;
        this.languageSelect = this.getElement('language-select') as HTMLSelectElement;
        this.softwareAudioCheckbox = this.getElement('software-audio') as HTMLInputElement;
        this.hardwareBeepCheckbox = this.getElement('hardware-beep') as HTMLInputElement;
        this.continuousReportingCheckbox = this.getElement('continuous-reporting') as HTMLInputElement;
        this.modeSelect = this.getElement('mode-select') as HTMLSelectElement;
        this.colorCountInput = this.getElement('color-count') as HTMLInputElement;
        this.startRowInput = this.getElement('start-row') as HTMLInputElement;
        this.infiniteRepeat = this.getElement('infinite-repeat') as HTMLInputElement;
        this.startNeedleInput = this.getElement('start-needle') as HTMLInputElement;
        this.startNeedleSide = this.getElement('start-needle-side') as HTMLSelectElement;
        this.stopNeedleInput = this.getElement('stop-needle') as HTMLInputElement;
        this.stopNeedleSide = this.getElement('stop-needle-side') as HTMLSelectElement;
        this.alignmentSelect = this.getElement('alignment') as HTMLSelectElement;
        this.knitSideCheckbox = this.getElement('knit-side-image') as HTMLInputElement;
        this.knitSidePreview = this.getElement('knit-side-preview');
        this.btnSaveSettings = this.getElement('btn-save-settings') as HTMLButtonElement;

        for (const needleInput of [this.startNeedleInput, this.stopNeedleInput]) {
            needleInput.min = String(1);
            needleInput.max = String(Math.floor(MachineWidthMap[this.machineSelect.value]/2));
        }
        this.setupEventListeners();
        this.loadSettings();
    }

    private getElement(id: string): HTMLElement {
        const element = document.getElementById(id);
        if (!element) {
            throw new Error(`Element with id "${id}" not found`);
        }
        return element;
    }
    
    private setupEventListeners(): void {
        const configControls = [
            this.softwareAudioCheckbox,
            this.hardwareBeepCheckbox,
            this.continuousReportingCheckbox,
            this.modeSelect,
            this.colorCountInput,
            this.startRowInput,
            this.infiniteRepeat,
            this.startNeedleSide,
            this.stopNeedleSide,
            this.alignmentSelect,
        ];

        // Default behavior upon control changes
        configControls.forEach((control) => {
            for( const eventType of ['input', 'change']) {
                control.addEventListener(eventType, (e) => {this.syncKnittingConfig();});
            }
        });

        // Update machine bed constraints when machine type changes
        this.machineSelect.addEventListener('change', () => {
            const halfBedSize = Math.floor(MachineWidthMap[this.machineSelect.value]/2);
            for (const needle of [this.startNeedleInput, this.stopNeedleInput]) {
                needle.max = String(halfBedSize);
                if (!needle.checkValidity()) {
                    needle.value = String(halfBedSize);
                } 
            }
            this.syncKnittingConfig();
        });

        for( const needleInput of [this.startNeedleInput, this. stopNeedleInput]) {
            for( const eventType of ['input', 'change']) {
                needleInput.addEventListener(eventType, () => {
                    const value = parseInt(needleInput.value);
                    const halfBedSize = Math.floor(MachineWidthMap[this.machineSelect.value]/2);
                    if ((value >= 1) && (value <= halfBedSize)) {   
                        needleInput.setCustomValidity('');
                        this.syncKnittingConfig();
                    } else {
                        needleInput.setCustomValidity(`Value should be between 1 and ${halfBedSize}`);
                    }
                    needleInput.reportValidity();
                });
            };
        };

        // Knit-side image preview
        this.knitSideCheckbox.addEventListener('change', () => {
            if (this.knitSideCheckbox.checked) {
                this.knitSidePreview.classList.add('mirrored');
            } else {
                this.knitSidePreview.classList.remove('mirrored');
            }
            this.syncKnittingConfig();
        });

        // Save settings button
        this.btnSaveSettings.addEventListener('click', () => this.saveSettings());
    }

    private setControlsDisabled(disabled: boolean): void {
        this.modeSelect.disabled = disabled;
        this.colorCountInput.disabled = disabled;
        this.startRowInput.disabled = disabled;
        this.infiniteRepeat.disabled = disabled;
        this.startNeedleInput.disabled = disabled;
        this.startNeedleSide.disabled = disabled;
        this.stopNeedleInput.disabled = disabled;
        this.stopNeedleSide.disabled = disabled;
        this.alignmentSelect.disabled = disabled;
        this.knitSideCheckbox.disabled = disabled;
    }

    public syncKnittingConfig(): void {
            this.machine.setKnittingConfig(this.getKnittingConfig());
    }

    public getKnittingConfig(): KnittingConfig {
        return {
            machine: this.machineSelect.value,
            mode: BedMode[this.modeSelect.value as keyof typeof BedMode] ,
            numColors: parseInt(this.colorCountInput.value) ?? 2,
            startRow: parseInt(this.startRowInput.value) ?? 1,
            infiniteRepeat: this.infiniteRepeat.checked,
            startNeedle: parseInt(this.startNeedleInput.value) ?? 30,
            startNeedleSide: this.startNeedleSide.value ?? 'left',
            stopNeedle: parseInt(this.stopNeedleInput.value) ?? 30,
            stopNeedleSide: this.stopNeedleSide.value ?? 'right',
            alignment: this.alignmentSelect.value,
            knitSideImage: this.knitSideCheckbox.checked,
            softwareAudio: this.softwareAudioCheckbox.checked,
            hardwareBeep: this.hardwareBeepCheckbox.checked,
            continuousReporting: this.continuousReportingCheckbox.checked,             
        };
    }

    public setDefaultStartStopNeedle(patternSize: number) {
        const leftSize = Math.floor(patternSize / 2);
        const rightSize = patternSize - leftSize;
        this.startNeedleSide.value = String('left');
        this.startNeedleInput.value = String(leftSize);
        this.stopNeedleSide.value = String('right');
        this.stopNeedleInput.value = String(rightSize);
    }

    public saveSettings(): void {
        const config = this.getKnittingConfig();
        localStorage.setItem('ayab-config', JSON.stringify(config));
        console.info('Settings saved!');
    }

    private loadSettings(): void {
        try {
            const rawData = localStorage.getItem('ayab-config');
            if (rawData) {
                const cfg = JSON.parse(rawData);
                // Restore only settings that should be persistent
                if (cfg.language) this.languageSelect.value = cfg.language;
                if (cfg.machine) this.machineSelect.value = cfg.machine;
                if (cfg.mode) this.modeSelect.value = BedMode[cfg.mode];
                if (cfg.softwareAudio !== undefined) this.softwareAudioCheckbox.checked = cfg.sofwareAudio;
                if (cfg.hardwareBeep !== undefined) this.hardwareBeepCheckbox.checked = cfg.hardwareBeep;
                if (cfg.continuousReporting !== undefined) this.continuousReportingCheckbox.checked = cfg.continuousReporting;                
            }
        } catch (e) {
            console.warn('Failed to load settings', e);
        }
        this.syncKnittingConfig();
    }

    // Method to update machine connection status and progress
    public updateProgress(progress: ActiveNeedles | null): void {
        if (progress === null) {
            this.progressDisplay.textContent = 'N/A';
        } else {
            this.progressDisplay.textContent = `${colorToString(progress.color)} Row: ${Math.round(progress.row)}/${progress.numberOfRow}`;
        }
    }

    public update(machineStatus: MachineStatus): void {
        this.machineStateDisplay.textContent = machineStatus.state;

        // Disable controls if machine is not IDLE
        this.setControlsDisabled(machineStatus.state !== MachineState.IDLE);

        if (machineStatus.connected) {
            this.connectionStatus.textContent = 'Connected';
            this.connectionStatus.className = 'status-value connected';
        } else {
            this.connectionStatus.textContent = 'Disconnected';
            this.connectionStatus.className = 'status-value disconnected';
        }
    }
}
