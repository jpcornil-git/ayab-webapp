/**
 * State Machine Types and Enums
 */

export enum HardwareType {
    KH910 = 'KH910',
    KH930 = 'KH930',
    KH270 = 'KH270',
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

export enum BedMode {
    SINGLEBED = 0,
    CLASSIC_RIBBER = 1,
    MIDDLECOLORSTWICE_RIBBER = 2,
    HEARTOFPLUTO_RIBBER = 3,
    CIRCULAR_RIBBER = 4,
}