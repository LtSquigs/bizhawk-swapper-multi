import { Settings } from './Settings.js';
import { Actions } from './Actions.js';

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
      lastSwap: 0,
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
      settingsPage: 'main',
      twitchAuthorized: false,
      twitchEnabled: false,
      twitchBitsEnabled: false,
      twitchChannelRewardsEnabled: false,
      twitchBitsThreshold: 1000,
      twitchChannelRewardTrigger: {},
      twitchCooldown: 30,
      twitchChannelRewards: [],
      twitchBankEnabled: false,
      twitchBankCount: 0
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
    State.state.twitchEnabled = Settings.getSetting("twitchEnabled");
    State.state.twitchBitsEnabled = Settings.getSetting("twitchBitsEnabled");
    State.state.twitchChannelRewardsEnabled = Settings.getSetting("twitchChannelRewardsEnabled");
    State.state.twitchBitsThreshold = Settings.getSetting("twitchBitsThreshold");
    State.state.twitchChannelRewardTrigger = Settings.getSetting("twitchChannelRewardTrigger");
    State.state.twitchCooldown = Settings.getSetting("twitchCooldown");
    State.state.twitchBankEnabled = Settings.getSetting("twitchBankEnabled");

    // Change flag of twitchAuthorized based off settings
    Actions.updateTwitchToken(Settings.getSetting("twitchAccessToken"), true);

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
