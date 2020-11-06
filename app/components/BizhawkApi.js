import { State } from './State.js';

let fs = require('fs');
let path = require('path');
let ws = require('ws');

export class BizhawkApi {

  static websocket = null;

  static websocketInterval = null;

  static start() {
    BizhawkApi.updateRomList();

    BizhawkApi.websocketInterval = setInterval( () => {
      BizhawkApi.connect();
    }, 5000)

    BizhawkApi.connect();
  }

  static stop() {
    if (BizhawkApi.websocketInterval) {
      clearInterval(BizhawkApi.websocketInterval);
    }

    if(BizhawkApi.websocket) {
      BizhawkApi.websocket.close();
    }
    // Disconnect websocket if open
  }

  static connect() {
    const bizHawkClient = new ws('ws://localhost:64646');

    bizHawkClient.on('open', () => {
      BizhawkApi.websocket = bizHawkClient;
      if (BizhawkApi.websocketInterval) {
        clearInterval(BizhawkApi.websocketInterval)
      }

      State.setState("bizhawkConnected", true);
    })

    bizHawkClient.on('close', () => {
      State.setState("bizhawkConnected", false);
    });

    bizHawkClient.on('error', () => {
    })
  }

  static updateRomList() {
    if (!fs.existsSync("SwapRoms")) {
      State.setState("roms", []);
      return;
    }

    const files = fs.readdirSync("SwapRoms");

    State.setState("roms", files.map(file => { return { name: file, selected: false }}));
  }

  static isValidDirectory(directory) {
    if(!fs.existsSync(directory)) {
      return { valid: false, error: `Can't find Directory ${filePath}.` };
    }

    const emuHawkPath = path.join(directory, "EmuHawk.exe");

    if(!fs.existsSync(emuHawkPath)) {
      return { valid: false, error: `Directory ${filePath} does not contain EmuHawk.exe.\nIs this a BizHawk directory?`};
    }

    return { valid: true, error: null };
  }

  static open() {
    console.log('Launching Bizhawk');
    // Copy over DLL File into special tools directory
    // run EmuHawk.exe in server
  }

  static loadRom(rom) {
    console.log(`Loading Rom ${rom}`)
    // Send signal to Bizhawk to loadRom
  }

  static saveState() {
    console.log(`Save State`);
    // Send signal to Bizhawk to save state
    // Should return the state file name, path, and data
    return {
      fileName: "settings.json",
      path: "some/path",
      data: fs.readFileSync("settings.json")
    }
  }

  static loadState(saveInfo) {
    console.log(`Loading State`, saveInfo)
    // should return nothng
  }
}
