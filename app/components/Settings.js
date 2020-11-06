import { BizhawkApi } from './BizhawkApi.js';

let fs = require('fs');

export class Settings {
  static settingUpdateHandlers = [];
  static settings = {
    bizhawkDir: "BizHawk",
    username: null,
    serverAddress: null,
    minTime: 5,
    maxTime: 30,
    countdown: true,
    everyoneSwaps: true
  };

  static initialize() {
    if (fs.existsSync('settings.json')) {
      let currentSettings =  JSON.parse(fs.readFileSync('settings.json'));

      Settings.settings = {
        ...Settings.settings,
        ...currentSettings
      }
    }

    Settings.syncSettings();

    if(Settings.settings.bizhawkDir) {
      const { valid } = BizhawkApi.isValidDirectory(Settings.settings.bizhawkDir);

      if (!valid) {
        Settings.setSetting("bizhawkDir", null);
      }
    }
  }

  static syncSettings() {
    fs.writeFileSync('settings.json', JSON.stringify(Settings.settings));
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
