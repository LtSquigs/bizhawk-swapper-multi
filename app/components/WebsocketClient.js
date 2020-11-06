import { State } from './State.js';
import { Settings } from './Settings.js';
import { BizhawkApi } from './BizhawkApi.js';

const ws = require('ws');

export class WebsocketClient {
  static client = null;
  static dataMessage = null;
  static dataCallback = null;

  static updateUser() {
    if (!WebsocketClient.client) {
      return;
    }

    WebsocketClient.client.send(JSON.stringify({
      type: "update_user",
      username: State.getState("username"),
      bizhawkConnected: State.getState("bizhawkConnected")
    }));
  }

  static connect(host, onopen, onclose, onerror) {
    host = 'ws://' + host + ':45454';

    try {
      WebsocketClient.client = new ws(host);
    } catch (e) {
      return onerror(e.message);
    }

    WebsocketClient.client.on('open', () => {
      onopen();

      WebsocketClient.updateUser();

      State.onUpdate((newState, oldState) => {
        if(oldState.bizhawkConnected != newState.bizhawkConnected) {
          WebsocketClient.updateUser();
        }
      });
    });

    WebsocketClient.client.on('message', (message) => {
      if(typeof message === 'object') {
        WebsocketClient.dataMessage = message;

        if (WebsocketClient.dataCallback) {
          WebsocketClient.dataCallback();
          WebsocketClient.dataCallback = null;
        }
      } else {
        message = JSON.parse(message);

        let romName = null;

        switch(message.type) {
          case "update_users":
            State.setState("users", {...message.users});
            break;
          case "load_rom":
            romName = message.name;
            BizhawkApi.loadRom(romName).then(() => {
              WebsocketClient.client.send(JSON.stringify({
                type: "rom_loaded"
              }));
            });
            break;
          case "load_rom_with_save":
            romName = message.name;

            const loadAll = () => {
              BizhawkApi.loadRom(romName).then(() => {
                  const saveInfo = {
                    fileName: message.fileName,
                    path: message.path,
                    data: WebsocketClient.dataMessage
                  }

                  WebsocketClient.dataMessage = null;

                  BizhawkApi.loadState(saveInfo).then(() => {
                    WebsocketClient.client.send(JSON.stringify({
                      type: "rom_loaded"
                    }));
                  });
              });
            }

            if (WebsocketClient.dataMessage) {
              loadAll();
            } else {
              WebsocketClient.dataCallback = loadAll;
            }

            break;
          case "save_state":
            BizhawkApi.saveState().then(savedState => {
              WebsocketClient.client.send(JSON.stringify({
                type: "state_saved",
                path: savedState.path,
                fileName: savedState.fileName
              }));
              WebsocketClient.client.send(savedState.data);
            });

        }
      }
    });

    WebsocketClient.client.on('close', () => {
      WebsocketClient.client = null;
      onclose()
    });

    WebsocketClient.client.on('error', () => {
      WebsocketClient.client = null;
      onerror("Error trying to connect to websocket server.");
    });
  }
}
