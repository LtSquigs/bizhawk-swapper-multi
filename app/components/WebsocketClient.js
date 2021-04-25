import { State } from './State.js';
import { Settings } from './Settings.js';
import { BizhawkApi } from './BizhawkApi.js';

const ws = require('ws');

export class WebsocketClient {
  static client = null;
  static dataMessage = null;
  static dataCallback = null;

  // Keeps track of the status of rom loading, so we know wether or not its
  // safe to actually save state and transfer it in case of hangups between
  // load and state load
  static loadingRom = false;

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
          case "start_countdown":
            BizhawkApi.startCountdown();
            break;
          case "load_rom":
            WebsocketClient.loadingRom = true;
            romName = message.name;
            BizhawkApi.loadRom(romName).then((game_loaded) => {
              WebsocketClient.loadingRom = false;
              WebsocketClient.client.send(JSON.stringify({
                type: "rom_loaded",
                game_loaded: game_loaded
              }));
            });
            break;
          case "load_rom_with_save":
            WebsocketClient.loadingRom = true;
            romName = message.name;

            const loadAll = () => {
              BizhawkApi.loadRom(romName).then((game_loaded) => {
                  const saveInfo = {
                    data: WebsocketClient.dataMessage
                  }

                  WebsocketClient.dataMessage = null;

                  if(game_loaded == romName) {
                    BizhawkApi.loadState(saveInfo).then((game_restored) => {
                      WebsocketClient.loadingRom = false;
                      WebsocketClient.client.send(JSON.stringify({
                        type: "rom_loaded",
                        game_loaded: game_restored
                      }));
                    });
                  } else {
                    WebsocketClient.loadingRom = false;
                    WebsocketClient.client.send(JSON.stringify({
                      type: "rom_loaded",
                      game_loaded: game_loaded
                    }));
                  }
              });
            }

            if (WebsocketClient.dataMessage) {
              loadAll();
            } else {
              WebsocketClient.dataCallback = loadAll;
            }

            break;
          case "save_state":
            // We're still in a "loading" state, so we shouldnt trust a save
            // state, instead just send back blank
            if(WebsocketClient.loadingRom) {
              return WebsocketClient.client.send(JSON.stringify({
                type: "state_saved",
                saved_game: null,
                md5: null
              }));
            }

            BizhawkApi.saveState().then(savedState => {
              WebsocketClient.client.send(JSON.stringify({
                type: "state_saved",
                saved_game: savedState.game,
                md5: savedState.md5
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
