import { BedMode } from '../shared/machine.types.js';

export type rowInfo  = [color: number, row: number, isBlank: boolean, passesPerRow: number];

const odd = (value: number): boolean => value % 2 !== 0;
const even = (value: number): boolean => value % 2 === 0;

/**
 * Class implementing behavior of various bed/ribber configurations
 */
export class BedModeMachine {
    private _numColors: number;
    private _mode : BedMode;

    constructor(numColors: number, mode: BedMode) {
        this._numColors = numColors;
        this._mode = mode;
    }

    // singlebed, 2 colors
    private _singlebed(lineNumber: number): rowInfo {
        // 0 1 2 3 4 5 6 7 8 9 .. (lineNumber)
        // 0 1 2 3 4 5 6 7 8 9 .. (rowNumber)
        // A A A A A A A A A A .. (color)
        // F F F F F F F F F F .. (isBlank)

        const passesPerRow = 1;
        const rowNumber = lineNumber;
        const color = 0;
        const isBlank = false;

        return [color, rowNumber, isBlank, passesPerRow];
    }

    // doublebed, 2 colors
    private _classicRibber2col(lineNumber: number): rowInfo {
        // 0 1 2 3 4 5 6 7 8 9 .. (lineNumber)
        // 0 0 1 1 2 2 3 3 4 4 .. (rowNumber)
        // | |  X  | |  X  | |
        // A B B A A B B A A B .. (color)
        // F F F F F F F F F F .. (isBlank)

        const passesPerRow = 2;
        const index = lineNumber % 4;

        const rowNumber = Math.floor(lineNumber / 2);
        const color = [0, 1, 1, 0][index];
        const isBlank = false;

        return [color, rowNumber, isBlank, passesPerRow];
    }

    // doublebed, multicolor
    private _classicRibberMulticol(lineNumber: number): rowInfo {
        // 0 1 2 3 4 5 6 7 8 9 .. (lineNumber)
        // 0 . 0 . 0 . 1 . 1 . .. (rowNumber)
        // A . B . C . A . B . .. (color)
        // F T F T F T F T F T .. (isBlank) 

        const passesPerRow = 2 * this._numColors;
        const activeLineNumber = Math.floor(lineNumber / 2);
        const index = activeLineNumber % this._numColors;

        const rowNumber = Math.floor(activeLineNumber / this._numColors);
        const color = index;
        const isBlank = odd(lineNumber);

        return [color, rowNumber, isBlank, passesPerRow];
    }

    // Ribber, Middle-Colors-Twice
    private _middleColorstwiceRibber(lineNumber: number): rowInfo {
        // 0123 4567 8911 1111 1111 2222 .. (lineNumber)
        //             01 2345 6789 0123
        // 0000 1111 2222 3333 4444 5555 .. (rowNumber)
        // A.CB B.CA A.CB B.CA A.CB B.CA .. (color)
        // FTFF FTFF FTFF FTFF FTFF FTTF .. (isBlank) 

        const passesPerRow = (this._numColors - 1) * 2;                
        const index = lineNumber % passesPerRow;

        const rowNumber = Math.floor(lineNumber / passesPerRow);
        let color: number;
        let isBlank: boolean = false;
        switch (index) {
            case 0: // First rows
                color = even(rowNumber) ? 0 : 1;
                break;
            case passesPerRow - 1: // Last rows
                color = even(rowNumber) ? 1 : 0;
                break;
            default: // Middle rows
                color = 1 + Math.floor((index+1)/2);
                isBlank = odd(lineNumber);
        }

        return [color, rowNumber, isBlank, passesPerRow];
    }

    // doublebed, multicolor <3 of pluto
    // rotates middle colors
    private _heartOfPlutoRibber(lineNumber: number): rowInfo {
        // 0123 4567 8911 1111 1111 2222 .. (lineNumber)
        //             01 2345 6789 0123
        // 0.00 1.11 2.22 3.33 4.44 5.55 .. (rowNumber)
        // CB.A AC.B BA.C CB.A AC.B BA.C .. (color)
        // FFTF FFTF FFTF FFTF FFTF FFTF .. (isBlank)

        const passesPerRow = (this._numColors - 1) * 2;
        const index = lineNumber % passesPerRow;

        const rowNumber = Math.floor(lineNumber / passesPerRow);
        const color = this._numColors - 1 - Math.floor((lineNumber + 1) / 2) % this._numColors;
        let isBlank: boolean = false;
        if (index !== 0 && index !== passesPerRow - 1) {
            isBlank = even(lineNumber);
        }

        return [color, rowNumber, isBlank, passesPerRow];
    }

    // Ribber, Circular
    private  _circularRibber(lineNumber: number): rowInfo {
        // 0123 4567 8911 .. (lineNumber)
        //             01
        // 0.0. 1.1. 2.2. .. (rowNumber)
        // A B  A B  A B  .. (color)
        const passesPerRow = this._numColors * 2;
        const index = lineNumber % passesPerRow;

        const rowNumber = Math.floor(lineNumber / passesPerRow);
        const color = Math.floor(index/2);
        const isBlank = odd(lineNumber);

        // halve lineNumber because every second line is BLANK    

        return [color, rowNumber, isBlank, passesPerRow];        
    }

    public getRowInfo(lineNumber: number): rowInfo {
        switch (this._mode) {
            case BedMode.SINGLEBED:
                return this._singlebed(lineNumber);
            case BedMode.CLASSIC_RIBBER:
                return this._numColors > 2
                    ? this._classicRibberMulticol(lineNumber)
                    : this._classicRibber2col(lineNumber);
            case BedMode.MIDDLECOLORSTWICE_RIBBER:
                return this._middleColorstwiceRibber(lineNumber);
            case BedMode.HEARTOFPLUTO_RIBBER:
                return this._heartOfPlutoRibber(lineNumber);
            case BedMode.CIRCULAR_RIBBER:
                return this._circularRibber(lineNumber);
            default:
                throw new Error(`Unknown ribber mode: ${this._mode}`);
        }
    }
}