import { State } from './State.js';
import { Settings } from './Settings.js';
import { BizhawkApi } from './BizhawkApi.js';
import { WebsocketClient } from './WebsocketClient.js';
import { CoordinationServer } from './CoordinationServer.js'
import { Runner } from './Runner.js';
import { Twitch } from './Twitch.js';

export class Actions {
  static lastTwitchSwap = 0;

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

    if (running && State.getState('twitchEnabled')) {
      Actions.startTwitch();
    }
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
    if (State.getState('isSwapping')) {
      return;
    }

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

  static changeSettingsPage(page) {
    State.setState('settingsPage', page);
  }

  static loginTwitch() {
    Twitch.loginTwitch();
  }

  static logoutTwitch() {
    State.setState("twitchAuthorized", false);
    Settings.setSetting("twitchAccessToken", null);
    State.setState("twitchChannelRewards", []);

    Twitch.setAccessToken(null).then(() => {
      Twitch.stop();
    });
  }

  static toggleEnableTwitch() {
    if(State.getState('twitchEnabled')) {
      State.setState('twitchEnabled', false);
      Settings.setSetting('twitchEnabled', false);

      Twitch.stop();
    } else {
      State.setState('twitchEnabled', true);
      Settings.setSetting('twitchEnabled', true);

      if (State.getState('isRunning')) {
        Actions.startTwitch();
      }
    }
  }

  static updateTwitchToken(token, first) {
    Twitch.validateToken(token).then((results) => {
      // If the token will expire within 4 days we just invalidate it
      // so the user can re-authenticate
      // Basically... I dont want to have to write a bunch of code
      // checking to see if something is authenticated all the time, if a
      // session lasts 4 days then i dont care
      if (results.validated && results.json.expires_in > (60 * 60 * 24 * 4)) {
        Twitch.setAccessToken(token).then(() => {
          Settings.setSetting("twitchAccessToken", token);
          State.setState("twitchAuthorized", true);

          Twitch.getChannelRewards().then((rewards) => {
            State.setState("twitchChannelRewards", rewards);
          });
        });
      } else {
        Settings.setSetting("twitchAccessToken", null);
        State.setState("twitchAuthorized", false);
      }
    });
  }

  static toggleChannelRewards() {
    if(State.getState('twitchChannelRewardsEnabled')) {
      State.setState('twitchChannelRewardsEnabled', false);
      Settings.setSetting('twitchChannelRewardsEnabled', false);

      Twitch.removeChannelListener();
    } else {
      State.setState('twitchChannelRewardsEnabled', true);
      Settings.setSetting('twitchChannelRewardsEnabled', true);

      Twitch.registerChannelListener();
    }
  }

  static toggleBankEnabled() {
    if(State.getState('twitchBankEnabled')) {
      State.setState('twitchBankEnabled', false);
      Settings.setSetting('twitchBankEnabled', false);
    } else {
      State.setState('twitchBankEnabled', true);
      Settings.setSetting('twitchBankEnabled', true);
    }
  }

  static clearBank() {
    State.setState("twitchBankCount", 0)
  }

  static toggleTwitchBits() {
    if(State.getState('twitchBitsEnabled')) {
      State.setState('twitchBitsEnabled', false);
      Settings.setSetting('twitchBitsEnabled', false);

      Twitch.removeBitListener();
    } else {
      State.setState('twitchBitsEnabled', true);
      Settings.setSetting('twitchBitsEnabled', true);

      Twitch.registerBitListener();
    }
  }

  static updateTwitchChannelRewardTrigger(reward) {
    reward = reward || {};

    State.setState("twitchChannelRewardTrigger", reward);
    Settings.setSetting("twitchChannelRewardTrigger", reward);

    Twitch.setChannelReward(reward);
  }

  static updateTwitchCooldown(cooldown) {
    State.setState("twitchCooldown", cooldown);
    Settings.setSetting("twitchCooldown", cooldown);
  }

  static updateBitThreshold(threshold) {
    threshold = threshold || 1000;

    State.setState("twitchBitsThreshold", threshold);
    Settings.setSetting("twitchBitsThreshold", threshold);

    Twitch.setBitThreshold(threshold);
  }

  static startTwitch() {
    if (!State.getState("twitchChannelRewardTrigger").id &&
        State.getState("twitchChannelRewards").length > 0) {
      Actions.updateTwitchChannelRewardTrigger(State.getState("twitchChannelRewards")[0]);
    }

    Twitch.setChannelReward(State.getState("twitchChannelRewardTrigger"));
    Twitch.setBitThreshold(State.getState("twitchBitsThreshold"))

    Twitch.start(State.getState("twitchChannelRewardsEnabled"), State.getState('twitchBitsEnabled'));
  }

  static twitchSwap() {
    // If we are already in the middle of a swap, we don't want to double up
    if(State.getState("isSwapping")) {
      if(State.getState('twitchBankEnabled')) {
        State.setState("twitchBankCount", State.getState("twitchBankCount") + 1);
      }

      return;
    }

    const now = Date.now();
    const lastSwap = State.getState("lastSwap");

    // We are within the cooldown period, ignore this swap
    if ((now - lastSwap) < (State.getState("twitchCooldown") * 1000)) {
      if(State.getState('twitchBankEnabled')) {
        State.setState("twitchBankCount", State.getState("twitchBankCount") + 1);
      }

      return;
    }

    Runner.shufflePlayers();
  }
}

// Interval to clear the bank
setInterval(() => {
  // Twitch isnt enable, bank isnt on or is empty
  if(!State.getState('twitchEnabled') || !State.getState('twitchBankEnabled') || State.getState("twitchBankCount") <= 0) {
    return;
  }

  const now = Date.now();
  const lastSwap = State.getState("lastSwap");

  // We are within the cooldown period, clear the bank later
  if ((now - lastSwap) < (State.getState("twitchCooldown") * 1000)) {
    return;
  }

  // Were currently swapping, dont swap
  if (State.getState('isSwapping')) {
    return;
  }

  // If we are running, do a swap and reduce the bank by 1
  if(State.getState("isRunning")) {
    Runner.shufflePlayers();
    State.setState("twitchBankCount", State.getState("twitchBankCount") - 1);
  }
}, 500);
