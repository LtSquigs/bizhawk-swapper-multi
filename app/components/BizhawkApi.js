import { State } from './State.js';
import { Files } from './Files.js';

let path = require('path');
let exec = require('child_process').execFile;
const spawn = require('child_process').spawn;
const net = require('net');
const crypto = require('crypto');

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

  static retriesMax = 3;

  static retryTimeout = 1000 * 3;

  static sendDelay = 300;

  static lastSend = Date.now();

  static lastMessageTime = Date.now();

  static retryAttempt = null;

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
          BizhawkApi.responseFunctions[id](path.basename(parts[2]));
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

    let lastSendDiff = Date.now() - BizhawkApi.lastSend;

    if (lastSendDiff  <= BizhawkApi.sendDelay) {
      setTimeout(() => {
        BizhawkApi.socket.write(messageStr);
        BizhawkApi.lastSend = Date.now();
      }, BizhawkApi.sendDelay - lastSendDiff)
    } else {
      BizhawkApi.socket.write(messageStr);
      BizhawkApi.lastSend = Date.now();
    }
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

    spawn("EmuHawk.exe", ['--lua=server.lua', '--socket_ip=127.0.0.1', '--socket_port=64646'], {
      cwd: Files.resolve(bizhawkDir),
      stdio: 'ignore'
    });
  }

  static sendWithRetries(id, message_type, arg) {
    let retryCount = 0;
    let responded = false;

    // We clear here to ensure we dont have weird ordering
    // If retries are happening while a new message comes in wed rather just
    // force a failure so it can recover next cycle
    if (BizhawkApi.retryAttempt) {
      clearTimeout(BizhawkApi.retryAttempt);
      BizhawkApi.retryAttempt = null;
    }

    const sendAndResolve = (resolve) => {
      let cancelled = false;

      let responseFunction = (game) => {
        responded = true;

        if (cancelled) return;

        resolve(game);
      }

      BizhawkApi.responseFunctions[id] = responseFunction;

      BizhawkApi.retryAttempt = setTimeout(() => {
        BizhawkApi.retryAttempt = null;
        if(responded) {
          cancelled = true;
          return;
        }

        retryCount++;

        if(retryCount >  State.getState("bizhawkMaxRetries")) {
          cancelled = true;
          resolve();
          return;
        }

        sendAndResolve(resolve);
      } , State.getState("bizhawkTimeout"));

      BizhawkApi.send(id, message_type, arg);
    }

    return new Promise((resolve, reject) => {
        if(!BizhawkApi.socket) {
          return resolve();
        }

        sendAndResolve(resolve);
    });
  }

  static startCountdown() {
    return new Promise((resolve, reject) => {
      if(!BizhawkApi.socket) {
        return resolve({});
      }

      const id = uuidv4();

      BizhawkApi.responseFunctions[id] = async (game) => {
        resolve(game);
      }

      BizhawkApi.send(id, "start_countdown");
    });
  }

  static loadRom(rom) {
    const id = uuidv4();
    return BizhawkApi.sendWithRetries(id, "open_rom", Files.resolve(path.join('SwapRoms', rom)));
  }

  static saveState() {
    const id = uuidv4();
    const saveDir = Files.resolve('Saves');
    const saveFile = path.join(saveDir, id);

    if (!Files.existsSync(saveDir)) {
      Files.mkdirSync(saveDir);
    }

    return new Promise((resolve, reject) => {
      BizhawkApi.sendWithRetries(id, "save_state", `${saveFile}`).then((game) => {
        let data = null;

        if (Files.existsSync(saveFile)) {
          data = Files.readFileSync(saveFile);

          // delete the save as it has no use now
          Files.unlinkSync(saveFile);
        }

        const hash = crypto.createHash('md5');
        hash.update(data || '');

        resolve({
          game: game,
          md5: hash.digest('hex'),
          data: data
        });
      });
    });
  }

  static loadState(saveInfo) {
    const id = uuidv4();
    const saveDir = Files.resolve('Saves');
    const saveFile = path.join(saveDir, id);

    if (!Files.existsSync(saveDir)) {
      Files.mkdirSync(saveDir);
    }

    Files.writeFileSync(saveFile, saveInfo.data);

    return new Promise((resolve, reject) => {
      BizhawkApi.sendWithRetries(id, "load_state", `${saveFile}`).then((game) => {
        Files.unlinkSync(saveFile)
        resolve({
          game: game
        });
      });
    });
  }
}

window.Api = BizhawkApi;
