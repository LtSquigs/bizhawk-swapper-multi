import { State } from './State.js';
import { Settings } from './Settings.js';
import { BizhawkApi } from './BizhawkApi.js';

const ws = require('ws');

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export class CoordinationServer {
  static server = null;
  static connections = {};
  static users = {};

  static addUser(username, bizhawkStatus) {
    CoordinationServer.users[username] = {
      username: username,
      bizhawkConnected: bizhawkStatus
    };

    State.setState("users", {...CoordinationServer.users});
    CoordinationServer.broadcastUsers();
  }

  static removeUser(username) {
    delete CoordinationServer.users[username];

    State.setState("users", {...CoordinationServer.users});
    CoordinationServer.broadcastUsers();
  }

  static broadcastUsers() {
    for(let id in CoordinationServer.connections) {
      const ws = CoordinationServer.connections[id].ws;
      ws.send(JSON.stringify({
        type: "update_users",
        users: CoordinationServer.users
      }))
    }
  }

  static sendCountdown(player) {
    return new Promise((resolve, reject) => {
      const myUsername = Settings.getSetting('username');

      if(player == myUsername) {
        BizhawkApi.startCountdown();
      } else {
        let connection = null;
        for(let id in CoordinationServer.connections) {
          if (CoordinationServer.connections[id].username === player) {
            connection = CoordinationServer.connections[id];
          }
        }

        const ws = connection.ws;
        
        ws.send(JSON.stringify({
          type: "start_countdown"
        }));
      }
      resolve();
    });
  }

  static loadRom(player, name, saveInfo) {
    return new Promise((resolve, reject) => {
      const myUsername = Settings.getSetting('username');

      if(player == myUsername) {
        BizhawkApi.loadRom(name).then(() => {
          if (saveInfo) {
            BizhawkApi.loadState(saveInfo).then(() => {
              resolve();
            });
          } else {
            resolve();
          }
        });
      } else {
        let connection = null;
        for(let id in CoordinationServer.connections) {
          if (CoordinationServer.connections[id].username === player) {
            connection = CoordinationServer.connections[id];
          }
        }

        const ws = connection.ws;
        connection.listeners["rom_loaded"] = () => {
          delete connection.listeners["rom_loaded"];
          resolve();
        }

        if (saveInfo) {
          ws.send(JSON.stringify({
            type: "load_rom_with_save",
            name: name
          }));

          ws.send(saveInfo.data);
        } else {
          ws.send(JSON.stringify({
            type: "load_rom",
            name: name
          }));
        }
      }
    });
  }

  static saveState(player) {
    return new Promise((resolve, reject) => {
      const myUsername = Settings.getSetting('username');

      if(player == myUsername) {
        BizhawkApi.saveState().then(result => {
          resolve({ player: player, ...result});
        });
      } else {
        let connection = null;
        for(let id in CoordinationServer.connections) {
          if (CoordinationServer.connections[id].username === player) {
            connection = CoordinationServer.connections[id];
          }
        }

        const ws = connection.ws;
        const result = {};
        let resultMessagRecieved = false;
        let dataMessageRecieved = false;

        connection.listeners["state_saved"] = (message) => {
          resultMessagRecieved = true;
          delete connection.listeners["state_saved"];

          if (resultMessagRecieved && dataMessageRecieved) {
            resolve({player: player, ...result});
          }
        }

        connection.dataListener = (message) => {
          dataMessageRecieved = true;
          connection.dataListener = null;

          result.data = message;

          if (resultMessagRecieved && dataMessageRecieved) {
            resolve({player: player, ...result});
          }
        }

        ws.send(JSON.stringify({
          type: "save_state"
        }));
      }
    });
  }

  static startServer(onListening, onClose, onError) {
    CoordinationServer.server = new ws.Server({
      port: 45454
    });

    CoordinationServer.server.on('listening', () => {
      onListening();

      const myUsername = Settings.getSetting('username');

      CoordinationServer.addUser(myUsername, false)

      State.onUpdate((newState, oldState) => {
        if(oldState.bizhawkConnected != newState.bizhawkConnected) {
          CoordinationServer.addUser(myUsername, newState.bizhawkConnected)
        }
      });
    });

    CoordinationServer.server.on('connection', (ws) => {
      const id = uuidv4();
      CoordinationServer.connections[id] = { ws: ws, username: null, listeners: {}, dataListener: null };

      ws.on('message', (message) => {
        if (typeof message == 'object') {
          let listener = CoordinationServer.connections[id].dataListener;

          if (listener) {
            listener(message);
          }

        } else {
          message = JSON.parse(message);
          switch(message.type) {
            case 'update_user':
              CoordinationServer.connections[id].username = message.username;
              CoordinationServer.addUser(message.username, message.bizhawkConnected);
              break;
            default:
              let listener = CoordinationServer.connections[id].listeners[message.type];

              if (listener) {
                listener(message);
              }

              break;
          }
        }
      })

      ws.on('close', (closed) => {
        if (CoordinationServer.connections[id].username) {
          CoordinationServer.removeUser(CoordinationServer.connections[id].username);
        }

        delete CoordinationServer.connections[id];
      })
    });

    CoordinationServer.server.on('close', () => {
      onClose();
    });

    CoordinationServer.server.on('error', (error) => {
      onError(error.message);
    });
  }
}
