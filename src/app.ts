/**
 * AYAB Web Application - Main Entry Point
 */

import { KnittingMachine } from './components/KnittingMachine.js';
import { PatternContainer } from './components/PatternContainer.js';
import { UIConsole } from './ui/UIConsole.js';
import { UIController } from './ui/UIController.js';

// Initialize the application
export function initializeApp(): void {
    // Initialize console output
    new UIConsole('console-output');
    console.log('Initializing AYAB Web Application...');

    // Main state machine
    const machine = new KnittingMachine();

    // Container for the pattern
    const pattern = new PatternContainer();

    // UI main controller
    const ui = new UIController(machine, pattern);

    console.log('AYAB Web Application initialized');
}
