import { HardwareType } from './machine.types';

export const colorToString = (color: number) : String => String.fromCharCode(65+color)

export enum MachineState {
    IDLE = 'IDLE',
    RUNNING = 'RUNNING',
}

export interface ActiveNeedles {
    row: number;
    color: number;
    data: Uint8Array;
    numberOfRow: number;
}

export interface MachineStatus {
    connected: boolean;
    state: MachineState;
    type: string | null;
    errorMessage?: string; // FIXME: Remove ?
}

export interface KnittingConfig {
    // INFO: update UIMachine.getKnittingConfig().cfg upon renaming
    machine: string;
    mode: number;
    numColors: number;
    startRow: number;
    infiniteRepeat: boolean;
    startNeedle: number;
    startNeedleSide: string;
    stopNeedle: number;
    stopNeedleSide: string;
    alignment: string;
    knitSideImage: boolean;
    softwareAudio: boolean;
    hardwareBeep: boolean;
    continuousReporting: boolean;
}