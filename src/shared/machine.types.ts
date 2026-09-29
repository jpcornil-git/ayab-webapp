/**
 * State Machine Types and Enums
 */

export enum MachineState {
    RESET = 'RESET',
    INIT = 'INIT',
    READY = 'READY',
    OPERATE = 'OPERATE',
}

export enum HardwareType {
    KH910 = 'KH910',
    KH930 = 'KH930',
    KH270 = 'KH270',
}

export enum CarriageType {
    K = 'Knit',
    L = 'Lace',
    G = 'Garter',
    K270 = 'Knit270',
    NONE = 'None',
}

export enum CarriageDirection {
    LEFT = 'Left',
    RIGHT = 'Right',
    UNKNOWN = 'Unknown',
}

export enum BellShift {
    UNKNOWN = 0,
    REGULAR = 1,
    SHIFTED = 2,
}

export const MachineStateMap: Record<string, number> = {
    [MachineState.RESET] : 0,
    [MachineState.INIT] : 1,
    [MachineState.READY] : 2,
    [MachineState.OPERATE] : 3,
}

export const MachineTypeMap: Record<string, number> = {
    [HardwareType.KH910]: 0,
    [HardwareType.KH930]: 1,
    [HardwareType.KH270]: 2,
};

export const MachineWidthMap: Record<string, number> = {
    [HardwareType.KH910]: 200,
    [HardwareType.KH930]: 200,
    [HardwareType.KH270]: 112,
};

export const CarriageTypeMap: Record<string, number> = {
    [CarriageType.K]: 0,
    [CarriageType.L]: 1,
    [CarriageType.G]: 2,
    [CarriageType.K270]: 3,
    [CarriageType.NONE]: 0xff,
};

export const CarriageDirectionMap: Record<string, number> = {
    [CarriageDirection.LEFT]: 0,
    [CarriageDirection.RIGHT]: 1,
    [CarriageDirection.UNKNOWN]: 0xff,
};

export const BellShiftMap: Record<string, number> = {
    [BellShift.UNKNOWN]: 0,
    [BellShift.REGULAR]: 1,
    [BellShift.SHIFTED]: 2,
};

export enum BedMode {
    SINGLEBED = 0,
    CLASSIC_RIBBER = 1,
    MIDDLECOLORSTWICE_RIBBER = 2,
    HEARTOFPLUTO_RIBBER = 3,
    CIRCULAR_RIBBER = 4,
}