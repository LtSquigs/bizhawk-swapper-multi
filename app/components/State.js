import { Settings } from './Settings.js';

export class State {
  static state = {};

  static stateUpdateHandlers = [];

  static initialize() {
    State.state = {
      hostClientError: null,
      clientConnected: false,
      clientIsConnecting: false,
      bizhawkConnected: false,
      bizhawkDir: null,
      bizhawkDirError: null,
      bizhawkTimeout: 3 * 1000,
      bizhawkMaxRetries: 2,
      everyoneSwaps: true,
      enableCountdown: true,
      loadLastKnownSaves: true,
      isHost: false,
      isRunning: false,
      isSwapping: false,
      serverAddress: '',
      serverRunning: false,
      username: "",
      users: {},
      minSwapTime: 0,
      maxSwapTime: 0,
      roms: [],
      automaticSwapping: true,
    }

    Settings.initialize();

    State.state.bizhawkDir = Settings.getSetting("bizhawkDir");
    State.state.username = Settings.getSetting("username");
    State.state.serverAddress = Settings.getSetting("serverAddress");
    State.state.everyoneSwaps = Settings.getSetting("everyoneSwaps");
    State.state.enableCountdown = Settings.getSetting("countdown");
    State.state.minSwapTime = Settings.getSetting("minTime");
    State.state.maxSwapTime = Settings.getSetting("maxTime");
    State.state.loadLastKnownSaves = Settings.getSetting("loadLastKnownSaves");
    State.state.automaticSwapping = Settings.getSetting("automaticSwapping");

    return State.state;
  }

  static getState(name) {
    return State.state[name];
  }

  static setState(name, value) {
    const oldState = { ...State.state };
    State.state[name] = value;

    State.stateUpdateHandlers.forEach(func => {
      func(State.state, oldState);
    });
  }

  static onUpdate(func) {
    State.stateUpdateHandlers.push(func);
  }
}

window.State = State;
