import { ActiveNeedles, KnittingConfig, MachineState } from '../shared/states.types.js';
import { KnittingMachine } from '../components/KnittingMachine.js';
import { PatternContainer } from '../components/PatternContainer.js';
import { PatternTool } from '../components/PatternTools.js';
import { UIPatternVisualizer } from './UIPatternVisualizer.js';
import { MachineWidthMap } from '../shared/machine.types.js';
import { Dialog } from '../utils/Dialog.js';

export class UIPattern {
    private _machine: KnittingMachine;
    private _pattern: PatternContainer;
    private _middleMouseDown: boolean;

    private _canvas: HTMLCanvasElement;
    private _fileInput: HTMLInputElement;
    private _canvasInfo: HTMLElement;
    private _zoomInfo: HTMLElement;
    private _btnBrowse: HTMLButtonElement;
    private _btnClear: HTMLButtonElement;
    private _btnFit: HTMLButtonElement;
    private _btnPatternInvert: HTMLButtonElement;
    private _btnPatternStretch: HTMLButtonElement;
    private _btnPatternRepeat: HTMLButtonElement;
    private _btnPatternReflect: HTMLButtonElement;
    private _btnPatternFlip: HTMLButtonElement;
    private _btnPatternRotate: HTMLButtonElement;

    private _visualizer: UIPatternVisualizer;

    private _nColors: number = 2;

    constructor(machine: KnittingMachine, pattern : PatternContainer) {
        this._machine = machine;
        this._pattern = pattern;
        this._middleMouseDown = false;

        this._canvas = this.getElement('pattern-canvas') as HTMLCanvasElement;
        // Image file management elements
        this._fileInput = this.getElement('pattern-file') as HTMLInputElement;
        this._btnBrowse = this.getElement('btn-browse') as HTMLButtonElement;
        this._btnClear = this.getElement('btn-clear-pattern') as HTMLButtonElement;
        // Zoom management
        this._zoomInfo = this.getElement('zoom-info');
        this._btnFit = this.getElement('btn-fit-canvas') as HTMLButtonElement;
        // Pattern processing
        this._btnPatternInvert = this.getElement('btn-pattern-invert') as HTMLButtonElement;
        this._btnPatternStretch = this.getElement('btn-pattern-stretch') as HTMLButtonElement;
        this._btnPatternRepeat = this.getElement('btn-pattern-repeat') as HTMLButtonElement;
        this._btnPatternReflect = this.getElement('btn-pattern-reflect') as HTMLButtonElement;
        this._btnPatternFlip = this.getElement('btn-pattern-flip') as HTMLButtonElement;
        this._btnPatternRotate = this.getElement('btn-pattern-rotate') as HTMLButtonElement;

        // Info elements
        this._canvasInfo = this.getElement('canvas-info');
        // Pattern drawing
        this._visualizer = new UIPatternVisualizer(this._canvas, this._pattern);

        this._machine.on('knittingConfigChanged', this.knittingConfigChanged.bind(this));
        
        this.clear();
        this.setupEventListeners();

        // Start the animation loop for continuous canvas updates
        const animate = () => {
            this.redraw();
            requestAnimationFrame(animate);
        };
        animate();
    }

    private getElement(id: string): HTMLElement {
        const element = document.getElementById(id);
        if (!element) {
            throw new Error(`Element with id "${id}" not found`);
        }
        return element;
    }

    private clear(): void {
        this._pattern.clear();
        this._fileInput.value = '';
        this.drawEmptyState();
        this._zoomInfo.textContent = '';
        this._canvasInfo.textContent = 'No pattern loaded';
    }

    private updateZoomInfo(): void {
        this._zoomInfo.textContent = this._visualizer.getPatternInfo();
    }

    public updateControls(isRunning: boolean): void {
        this._btnBrowse.disabled = isRunning;
        this._btnClear.disabled = isRunning;
        this._btnFit.disabled = !this._pattern.isLoaded;
        this._btnPatternInvert.disabled = !this._pattern.isLoaded;
        this._btnPatternStretch.disabled = !this._pattern.isLoaded;
        this._btnPatternRepeat.disabled = !this._pattern.isLoaded;
        this._btnPatternReflect.disabled = !this._pattern.isLoaded;
        this._btnPatternFlip.disabled = !this._pattern.isLoaded;
        this._btnPatternRotate.disabled = !this._pattern.isLoaded;
    }

    private knittingConfigChanged (config: KnittingConfig): void {
            const needleCount = MachineWidthMap[config.machine] ?? 200;
            this._visualizer.setNumberOfNeedles(needleCount);

            const startNeedle = this._machine.getNeedlePosition(config.startNeedle, config.startNeedleSide);
            const stopNeedle = this._machine.getNeedlePosition(config.stopNeedle, config.stopNeedleSide);
            this._visualizer.setStartStopNeedle(startNeedle, stopNeedle);

            this._visualizer.setPatternOffset(this._machine.getPatternOffset(this._pattern));
            
            this._nColors = config.numColors;
            if (this._pattern.isLoaded && (this._nColors !== this._pattern.nColors)) {
                this._pattern.quantizeImage(this._nColors, 10);
            }
            this._pattern.isMirrored = config.knitSideImage;
            this.redraw();
    }

    private setupEventListeners(): void {
        // File input and buttons
        this._btnBrowse.addEventListener('click', () => this._fileInput.click());
        this._btnClear.addEventListener('click', () => this.clear());
        this._fileInput.addEventListener('change', () => this.handleFileSelect());

        // Pattern processing
        this._btnPatternInvert.addEventListener('click', () => this._pattern.tool.invert());
        this._btnPatternStretch.addEventListener('click', async () => {
            const values = await Dialog.showForm('Stretch pattern', [
                { name: 'horizontalScale', label: 'Horizontal scale', type: 'number', value: '1', min: '0.01' },
                { name: 'verticalScale', label: 'Vertical scale', type: 'number', value: '1', min: '0.01' },
            ]);
            if (values) this._pattern.tool.stretch(Number(values.horizontalScale), Number(values.verticalScale));
        });
        this._btnPatternRepeat.addEventListener('click', async () => {
            const values = await Dialog.showForm('Repeat pattern', [
                { name: 'horizontalCount', label: 'Horizontal repeats', type: 'number', value: '2', min: '1', step: '1' },
                { name: 'verticalCount', label: 'Vertical repeats', type: 'number', value: '2', min: '1', step: '1' },
            ]);
            if (values) this._pattern.tool.repeat(Number(values.horizontalCount), Number(values.verticalCount));
        });
        this._btnPatternReflect.addEventListener('click', async () => {
            const values = await Dialog.showForm('Reflect pattern', [{
                name: 'edge', label: 'Mirror edge', type: 'select', value: 'right',
                options: [
                    { value: 'left', label: 'Left' },
                    { value: 'right', label: 'Right' },
                    { value: 'top', label: 'Top' },
                    { value: 'bottom', label: 'Bottom' },
                ],
            }]);
            if (values) this._pattern.tool.reflect(values.edge as 'left' | 'right' | 'top' | 'bottom');
        });
        this._btnPatternFlip.addEventListener('click', async () => {
            const values = await Dialog.showForm('Flip pattern', [{
                name: 'direction', label: 'Direction', type: 'select', value: 'horizontal',
                options: [{ value: 'horizontal', label: 'Horizontal' }, { value: 'vertical', label: 'Vertical' }],
            }]);
            if (values) this._pattern.tool.flip(values.direction as 'horizontal' | 'vertical');
        });
        this._btnPatternRotate.addEventListener('click', async () => {
            const values = await Dialog.showForm('Rotate pattern', [{
                name: 'direction', label: 'Direction', type: 'select', value: 'right',
                options: [{ value: 'right', label: 'Right (clockwise)' }, { value: 'left', label: 'Left (counter-clockwise)' }],
            }]);
            if (values) this._pattern.tool.rotate(values.direction as 'left' | 'right');
        });

        // Drag and drop support for the canvas
        this._canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            this._canvas.classList.add('dragover');
        });
        this._canvas.addEventListener('dragleave', () => {
            this._canvas.classList.remove('dragover');
        });
        this._canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            this._canvas.classList.remove('dragover');
            if (e.dataTransfer?.files.length) {
                this._fileInput.files = e.dataTransfer.files;
                this.handleFileSelect();
            }
        });

        // Mouse/wheel handlers for the canvas
        this._canvas.addEventListener("wheel", (e)=>{
            if (this._pattern.isLoaded) {
                e.preventDefault();
                const canvasBBox = this._canvas.getBoundingClientRect();
                // Convert event position into relative pixel position 
                const clickPosition = {
                    x:(e.clientX-canvasBBox.left)*(this._canvas.width/canvasBBox.width),
                    y:(e.clientY-canvasBBox.top)*(this._canvas.height/canvasBBox.height)
                };
                if (e.deltaY > 0) {
                    this._visualizer.zoomIn(clickPosition);
                } else {
                    this._visualizer.zoomOut(clickPosition);
                }
                this.updateZoomInfo();
            }          
        });
        this._canvas.addEventListener("mousedown", (e)=>{
            e.preventDefault();
            this._middleMouseDown = (e.button == 1);
        })
        this._canvas.addEventListener("mouseup", (e)=>{
            if(e.button == 1){
                this._middleMouseDown = false;
            }
        })
        this._canvas.addEventListener("pointerleave", (e)=>{
                this._middleMouseDown = false;
        })
        this._canvas.addEventListener("mousemove", (e)=>{
            if (this._pattern.isLoaded) {            
                if(this._middleMouseDown){
                    e.preventDefault();
                    let offset = this._visualizer.getScrollOffset();
                    offset.offsetX -= e.movementX;
                    offset.offsetY -= e.movementY;
                    this._visualizer.setScrollOffset(offset.offsetX, offset.offsetY);
                }
            }
        })

        // Fit button handler
        this._btnFit.addEventListener('click', () => {
            this._visualizer.autoZoom();
            this.updateZoomInfo();
        });
    }

    private async handleFileSelect(): Promise<void> {
        if (this._fileInput.files?.length) {
            this._canvasInfo.textContent = 'Loading pattern...';
            try {
                const image = await this.loadImage(this._fileInput.files[0]);
                this._pattern.updateImage(image);
                this._pattern.quantizeImage(this._nColors, 10);
                this._visualizer.autoZoom();
                this.updateZoomInfo();

                this._canvasInfo.textContent = `Pattern loaded: ${this._fileInput.files[0].name}`;
            } catch (error) {
                console.error('Failed to load pattern:', error);
                this.clear();
                this._canvasInfo.textContent = `Failed to load pattern: ${(error as any).message || 'Unknown error'}`;                
            }
        }
    }

    private async loadImage(file: File): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    const img = new Image();
                    img.onload = () => {
                        resolve(img);
                    };
                    img.onerror = () => {
                        reject(new Error(`Error while loading image ${file.name}`));
                    };
                    img.src = e.target?.result as string;
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => {
                reject(new Error(`Failed to read file: ${file.name}`));
            };

            reader.readAsDataURL(file);
        });
    }

    private drawEmptyState(): void {
        const ctx = this._canvas.getContext('2d');
        if (!ctx) return;
        const width = this._canvas.width;
        const height = this._canvas.height;
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#757575';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Drag and drop a pattern image here', width / 2, height / 2);
    }


    public redraw(): void {
        if (!this._pattern.isLoaded) {
            this.drawEmptyState();
            return;
        }
        this._visualizer.drawCanvas(this._machine.getStatus());
        this.updateZoomInfo();
    }
}
