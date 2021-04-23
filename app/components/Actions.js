import { State } from './State.js';
import { Settings } from './Settings.js';
import { BizhawkApi } from './BizhawkApi.js';
import { WebsocketClient } from './WebsocketClient.js';
import { CoordinationServer } from './CoordinationServer.js'
import { Runner } from './Runner.js';

export class Actions {
  static setUsername(username) {
    Settings.setSetting("username", username);
    State.setState("username", username);
  }

  static setServerAddress(address) {
    Settings.setSetting("serverAddress", address);
    State.setState("serverAddress", address)
  }

  static startServer() {
    CoordinationServer.startServer(() => {
      State.setState("isHost", true);
      State.setState("serverRunning", true);
      BizhawkApi.start();
    }, () => {
      State.setState("isHost", false);
      State.setState("serverRunning", false);
      BizhawkApi.stop();
    }, (error) => {
      State.setState("isHost", false);
      State.setState("serverRunning", false);
      State.setState("hostClientError", error);
      BizhawkApi.stop();
    })
  }

  static connectToHost() {
    const address = State.getState("serverAddress");
    State.setState("clientIsConnecting", true);
    WebsocketClient.connect(address,
    () => {
      State.setState("clientIsConnecting", false);
      State.setState("clientConnected", true);
      BizhawkApi.start();
    }, () => {
      State.setState("clientIsConnecting", false);
      State.setState("clientConnected", false);
      BizhawkApi.stop();
    }, (error) => {
      State.setState("clientIsConnecting", false);
      State.setState("clientConnected", false);
      State.setState("hostClientError", error);
      BizhawkApi.stop();
    });
  }

  static updateIsRunning(running) {
    State.setState("isRunning", running);
  }

  static updateRom(name, selected) {
    let roms = State.getState("roms");

    roms = roms.map((romInfo) => {
      if (romInfo.name == name) {
        romInfo.selected = selected;
      }

      return romInfo;
    });

    if (State.getState("isRunning")) {
      if (selected == true) {
        Runner.reviveGame(name);
      } else {
        Runner.killGame(name);
      }
    }

    State.setState("roms", roms);
  }

  static setBizhawkPath(filePath) {
    const { error } = BizhawkApi.isValidDirectory(filePath);

    if (error) {
      State.setState("bizhawkDirError", error);
      return;
    }

    Settings.setSetting("bizhawkDir", filePath);
    State.setState("bizhawkDir", filePath);
  }

  static updateMinTime(time) {
    // If the minimum is small enough then also need to update the
    // timeouts
    if (time < (State.getState("bizhawkTimeout") * (State.getState("bizhawkMaxRetries") + 1))) {
      State.setState("bizhawkMaxRetries", 2);
    } else {
      State.setState("bizhawkMaxRetries", 0);
    }

    State.setState("minSwapTime", time);
    Settings.setSetting("minTime", time);
  }

  static updateMaxTime(time) {
    State.setState("maxSwapTime", time);
    Settings.setSetting("maxTime", time);
  }

  static updateEveryoneSwaps(swaps) {
    State.setState("everyoneSwaps", swaps);
    Settings.setSetting("everyoneSwaps", swaps);
  }

  static updateAutomaticSwapping(swaps) {
    State.setState("automaticSwapping", swaps);
    Settings.setSetting("automaticSwapping", swaps);

    if(swaps == false) {
      Runner.clearTimeout()
    } else {
      Runner.registerNextShuffle();
    }
  }

  static forceSwap() {
    Runner.shufflePlayers();
  }

  static updateLoadLastSaves(loadSaves) {
    State.setState("loadLastKnownSaves", loadSaves);
    Settings.setSetting("loadLastKnownSaves", loadSaves);
  }

  static updateCountdown(countdown) {
    State.setState("enableCountdown", countdown);
    Settings.setSetting("countdown", countdown);
  }

  static swapPlayers() {
    if (State.getState('isSwapping')) {
      return;
    }

    Runner.shufflePlayers();
  }

  static launchBizhawk() {
    BizhawkApi.open();
  }

  static runGames() {
    Runner.run();
  }
}
