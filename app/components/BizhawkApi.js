import { State } from './State.js';

let fs = require('fs');
let path = require('path');
let ws = require('ws');
let exec = require('child_process').execFile;
const { resolve } = require('path');
const { readdir } = require('fs').promises;

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function* getFiles(dir) {
  const dirents = await readdir(dir, { withFileTypes: true });
  for (const dirent of dirents) {
    const res = resolve(dir, dirent.name);
    if (dirent.isDirectory()) {
      yield* getFiles(res);
    } else {
      yield res;
    }
  }
}

export class BizhawkApi {

  static websocket = null;

  static websocketInterval = null;

  static responseFunctions = {};

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
  }

  static connect() {
    const bizHawkClient = new ws('ws://localhost:64646');

    bizHawkClient.on('open', () => {
      BizhawkApi.websocket = bizHawkClient;
      if (BizhawkApi.websocketInterval) {
        clearInterval(BizhawkApi.websocketInterval)
      }

      BizhawkApi.websocket.on("message", (message) => {
        message = JSON.parse(message);
        const id = message.id;

        if (BizhawkApi.responseFunctions[id]) {
          BizhawkApi.responseFunctions[id](message);

          delete BizhawkApi.responseFunctions[id];
        }
      });

      State.setState("bizhawkConnected", true);
    });

    bizHawkClient.on('close', () => {
      State.setState("bizhawkConnected", false);

      BizhawkApi.websocketInterval = setInterval( () => {
        BizhawkApi.connect();
      }, 5000)
    });

    bizHawkClient.on('error', () => {
    });
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
      return { valid: false, error: `Can't find Directory ${directory}.` };
    }

    const emuHawkPath = path.join(directory, "EmuHawk.exe");

    if(!fs.existsSync(emuHawkPath)) {
      return { valid: false, error: `Directory ${directory} does not contain EmuHawk.exe.\nIs this a BizHawk directory?`};
    }

    return { valid: true, error: null };
  }

  static open() {
    const bizhawkDir = State.getState("bizhawkDir");
    const serverDLL = fs.readFileSync('BizHawkWebsocketServer.dll');

    if(!fs.existsSync(path.join(bizhawkDir, "ExternalTools"))) {
      fs.mkdirSync(path.join(bizhawkDir, "ExternalTools"));
    }

    fs.writeFileSync(path.join(bizhawkDir, "ExternalTools", "BizHawkWebsocketServer.dll"), serverDLL);

    exec("EmuHawk.exe", ['--open-ext-tool-dll=BizHawkWebsocketServer'], {
      cwd: bizhawkDir
    }, (err) => { console.log(err) });
  }

  static loadRom(rom) {
    return new Promise((resolve, reject) => {
      if(!BizhawkApi.websocket) {
        return resolve();
      }

      const id = uuidv4();

      BizhawkApi.responseFunctions[id] = () => {
        resolve();
      }

      BizhawkApi.websocket.send(JSON.stringify({
        message_type: "METHOD",
        id: id,
        function: "EmuClientApi.OpenRom",
        arguments: [path.resolve(path.join('SwapRoms', rom))]
      }));
    });
  }

  static saveState() {
    return new Promise((resolve, reject) => {
      if(!BizhawkApi.websocket) {
        return resolve({});
      }

      const id = uuidv4();

      BizhawkApi.responseFunctions[id] = async (response) => {
        let saveFile = null;
        // search for state based off name in here
        for await (const f of getFiles(State.getState("bizhawkDir"))) {
          if (f.indexOf(`${id}.State`) !== -1) {
            saveFile = f;
            break;
          }
        }

        if (!saveFile) {
          resolve({});
          return;
        }

        const data = fs.readFileSync(saveFile);
        const resolvedBizhawk = path.resolve(State.getState("bizhawkDir"));

        // delete the save as it has no use now
        fs.unlinkSync(saveFile);

        resolve({
          fileName: path.basename(saveFile),
          path: saveFile.replace(path.basename(saveFile), '').replace(resolvedBizhawk, ''),
          data: data
        });
      }

      BizhawkApi.websocket.send(JSON.stringify({
        message_type: "METHOD",
        id: id,
        function: "EmuClientApi.SaveState",
        arguments: [`${id}`]
      }));
    });
  }

  static loadState(saveInfo) {
    return new Promise((resolve, reject) => {
      if(!BizhawkApi.websocket) {
        return resolve({});
      }
      const savePath = path.join(State.getState("bizhawkDir"), saveInfo.path, saveInfo.fileName);

      fs.writeFileSync(savePath, saveInfo.data);

      const id = uuidv4();

      BizhawkApi.responseFunctions[id] = async (response) => {
        // delete the save as it is no longer used
        fs.unlinkSync(savePath)
        resolve();
      }

      BizhawkApi.websocket.send(JSON.stringify({
        message_type: "METHOD",
        id: id,
        function: "EmuClientApi.LoadState",
        arguments: [`${saveInfo.fileName.replace('.State', '')}`]
      }));
    });
  }
}

window.Api = BizhawkApi;
