import { State } from './State.js';
import { Files } from './Files.js';

let path = require('path');
let exec = require('child_process').execFile;
const net = require('net');

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

  static socket = null;

  static websocketInterval = null;

  static responseFunctions = {};

  static start() {
    BizhawkApi.updateRomList();

    BizhawkApi.connect();
  }

  static stop() {
    if (BizhawkApi.server) {
      BizhawkApi.server.close();
      BizhawkApi.server = null;
    }
  }

  static connect() {
    BizhawkApi.server = net.createServer((socket) => {
      BizhawkApi.socket = socket;
      // 'connection' listener.
      State.setState("bizhawkConnected", true);

      BizhawkApi.socket.on('data', (data) => {
        const parts = data.toString().split(';');
        const id = parts[0];

        if(BizhawkApi.responseFunctions[id]) {
          BizhawkApi.responseFunctions[id](parts[1]);
        }
      });

      BizhawkApi.socket.on('end', () => {
        State.setState("bizhawkConnected", false);
        BizhawkApi.socket = null;
      });

      BizhawkApi.socket.on('error', () => {
        State.setState("bizhawkConnected", false);
        BizhawkApi.socket = null;
      })

      BizhawkApi.socket.pipe(BizhawkApi.socket);
    });

    BizhawkApi.server.on('error', (err) => {
      BizhawkApi.socket = null;
      BizhawkApi.server = null;
    });

    BizhawkApi.server.listen(64646, () => {
      BizhawkApi.socket = null;
      BizhawkApi.server = null;
    });
  }

  static send(id, messageType, argument) {
    if(!BizhawkApi.socket) {
      return;
    }

    let messageStr = "";

    if(argument) {
      messageStr = `${id};${messageType};${argument};\r\n`;
    } else {
      messageStr = `${id};${messageType};0;\r\n`
    }

    BizhawkApi.socket.write(messageStr);
  }

  static updateRomList() {
    if (!Files.existsSync("SwapRoms")) {
      State.setState("roms", []);
      return;
    }

    const files = Files.readdirSync("SwapRoms");

    State.setState("roms", files.map(file => { return { name: file, selected: false }}));
  }

  static isValidDirectory(directory) {
    if(!Files.existsSync(directory)) {
      return { valid: false, error: `Can't find Directory ${directory}.` };
    }

    const emuHawkPath = path.join(directory, "EmuHawk.exe");

    if(!Files.existsSync(emuHawkPath)) {
      return { valid: false, error: `Directory ${directory} does not contain EmuHawk.exe.\nIs this a BizHawk directory?`};
    }

    return { valid: true, error: null };
  }

  static open() {
    const bizhawkDir = State.getState("bizhawkDir");
    const serverLua = Files.readFileSync('server.lua', true);

    Files.writeFileSync(path.join(bizhawkDir, "server.lua"), serverLua);

    exec("EmuHawk.exe", ['--lua=server.lua', '--socket_ip=127.0.0.1', '--socket_port=64646'], {
      cwd: Files.resolve(bizhawkDir)
    }, () => { });
  }

  static loadRom(rom) {
    return new Promise((resolve, reject) => {
      if(!BizhawkApi.socket) {
        return resolve();
      }

      const id = uuidv4();

      BizhawkApi.responseFunctions[id] = () => {
        resolve();
      }

      BizhawkApi.send(id, "open_rom", Files.resolve(path.join('SwapRoms', rom)));
    });
  }

  static saveState() {
    return new Promise((resolve, reject) => {
      if(!BizhawkApi.socket) {
        return resolve({});
      }

      const id = uuidv4();
      const saveDir = Files.resolve('Saves');
      const saveFile = path.join(saveDir, id);

      if (!Files.existsSync(saveDir)) {
        Files.mkdirSync(saveDir);
      }

      BizhawkApi.responseFunctions[id] = async (response) => {
        const data = Files.readFileSync(saveFile);

        // delete the save as it has no use now
        Files.unlinkSync(saveFile);

        resolve({
          data: data
        });
      }

      BizhawkApi.send(id, "save_state", `${saveFile}`);
    });
  }

  static loadState(saveInfo) {
    return new Promise((resolve, reject) => {
      if(!BizhawkApi.socket) {
        return resolve({});
      }

      const id = uuidv4();
      const saveDir = Files.resolve('Saves');
      const saveFile = path.join(saveDir, id);

      if (!Files.existsSync(saveDir)) {
        Files.mkdirSync(saveDir);
      }

      Files.writeFileSync(saveFile, saveInfo.data);

      BizhawkApi.responseFunctions[id] = async (response) => {
        Files.unlinkSync(saveFile)
        resolve();
      }


      BizhawkApi.send(id, "load_state", `${saveFile}`);
    });
  }
}

window.Api = BizhawkApi;
