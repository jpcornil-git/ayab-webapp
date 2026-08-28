# AYAB Web Application

A web-based version of the AYAB (All Yarns Are Beautiful) knitting machine control software, running entirely in the browser.

## Features

- **No Backend Required**: Runs entirely in the browser
- **WebSerial and WebSocket Support**: Direct USB or IP communication with knitting machines
- **Real-time Status**: Live updates on machine state and progress
- **Persistent settings**: Preferences can be saved in the browser (restored when application is reloaded)
- **State Machine**: Robust finite state machine for machine control
- **Responsive UI**: Tablet-friendly interface
- ...

## Usage

Open your web browser and go to https://jpcornil-git.github.io/ayab-webapp/

### Loading and Running a Pattern

1. Select your **machine type** (`Settings` menu) 
2. Select your **connection method**; WebSerial (direct USB) or WebSocket (remote)
3. Load a **pattern** (click `browse` or drop an image in the pattern area)
4. Configure machine and knitting **Settings**
5. Click **Knit** to begin knitting
6. To stop the machine while knitting, click **Cancel** 

**Notes**:
You can zoom and pan the pattern (while knitting as well) using the mouse center wheel (click to pan, roll to zoom in/out)
- While knitting:
   - selected and completed rows are highligted in the pattern area 
   - selected needles are displayed in the needle bed area (top). You may have to zoom in when they are too small

## Future Enhancements

- [ ] Add pattern manipulation (match ayab-desktop "Image Actions") 
- [ ] Report indState data (hall sensors, carriage type/direction, ...)
- [ ] Add ayab-esp32 utilities (only when running on esp32/UnoR4)
- [ ] Support for multiple langages
- [ ] Yarn color edition ?
- [ ] Firmware updates over USB ?

## Development howto

### Building TypeScript

The application uses vanilla TypeScript without frambuild tool.

Install TypeScript:

```bash
ayab-webapp$ npm install -g typescript
```

Compile TypeScript:
```bash
ayab-webapp$ tsc
```

### Running the Application

**Simple HTTP Server** (Python):
   ```bash
   ayab-webapp$ python -m http.server 8000
   ```
   Then open `http://localhost:8000` in your browser.

**Using Node.js**:
   ```bash
   ayab-webapp$  npx serve .
   ```

## Project Structure

```
ayab-web/
├── index.html                  # Main HTML file
├── assets/                     # Application assets (styles, images, sounds)
│   └── styles.css
│   ├── images/
|   ...
├── src/
│   ├── main.ts                 # Application entry point
│   ├── communication/          # API, Serial/WebSocket communication
│   │   ├── API6.ts 
│   │   ├── serial.ts 
|   |   ...
│   ├── components/             # Main applications objets
│   │   ├── BedModeMachine.ts 
│   │   ├── KnittingMachine.ts
│   │   └── PatternContainer.ts
│   ├── shared/                # Interface definitions
│   │   └── communication.types.ts
│   │   ├── machine.types.ts 
|   |   ...
│   ├── types/                 # Type definitions
│   │   └── webserial.d.ts
│   ├── ui/                    # UI management and event handling
│   │   ├── UIConsole.ts
│   │   ├── UIController.ts 
|   |   ...
│   ├── utils/                 # Helper classes
│   |   ├── AudioPlayers.ts
│   |   ├── EventEmitter.ts
|   |   |   ...
|   ...
└── tsconfig.json              # TypeScript configuration
```

## License

See LICENSE.txt in the parent AYAB project directory.

## References

- [Web Serial API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API)
- [WebSocket API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [AYAB Project](http://manual.ayab-knitting.com)
