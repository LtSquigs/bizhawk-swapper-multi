import { BizhawkApi } from './BizhawkApi.js';
import { Files } from './Files.js';

export class Settings {
  static settingUpdateHandlers = [];
  static settings = {
    bizhawkDir: "BizHawk",
    username: null,
    serverAddress: null,
    minTime: 60,
    maxTime: 180,
    countdown: true,
    everyoneSwaps: true,
    loadLastKnownSaves: true,
    automaticSwapping: true,
    twitchAccessToken: null,
    twitchEnabled: false,
    twitchBitsEnabled: false,
    twitchChannelRewardsEnabled: false,
    twitchBitsThreshold: 1000,
    twitchChannelRewardTrigger: {},
    twitchCooldown: 30,
    twitchBankEnabled: false,
  };

  static initialize() {
    if (Files.existsSync('settings.json')) {
      let currentSettings =  JSON.parse(Files.readFileSync('settings.json'));

      Settings.settings = {
        ...Settings.settings,
        ...currentSettings
      }
    }

    Settings.syncSettings();

    if(!Settings.settings.bizhawkDir) {
      Settings.settings.bizhawkDir = "BizHawk"
    }

    if(Settings.settings.bizhawkDir) {
      const { valid } = BizhawkApi.isValidDirectory(Settings.settings.bizhawkDir);

      if (!valid) {
        Settings.setSetting("bizhawkDir", null);
      }
    }
  }

  static syncSettings() {
    Files.writeFileSync('settings.json', JSON.stringify(Settings.settings));
  }

  static setSetting(name, value) {
    Settings.settings[name] = value;

    Settings.syncSettings();
  }

  static getSetting(name) {
    return Settings.settings[name];
  }

  static getSettings() {
    return Settings.settings;
  }
}
