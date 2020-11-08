import { State } from './State.js';
import { Settings } from './Settings.js';
import { BizhawkApi } from './BizhawkApi.js';
import { WebsocketClient } from './WebsocketClient.js';
import { CoordinationServer } from './CoordinationServer.js'

const path = require('path');

function shuffleArray(a) {
  a = a.slice();

  var j, x, i;
  for (i = a.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      x = a[i];
      a[i] = a[j];
      a[j] = x;
  }

  return a;
}

function randomNumber(min, max) {
    return Math.random() * (max - min) + min;
}

function areAllDifferent(a, b) {
  let different = true;

  a.forEach((item, idx) => {
    if(item === b[idx]) {
      different = false;
    }
  });

  return different;
}

export class Runner {
  static playersToGames = {
  }

  static currentTimer = null;

  static run() {
     const games = State.getState("roms");
     const players = State.getState("users");
     const shuffledGames = shuffleArray(games.filter(game => game.selected).map(game => game.name));

     Object.keys(players).forEach((key, index) => {
       Runner.playersToGames[key] = shuffledGames[index];
     });

     if(Runner.currentTimer) {
       clearTimeout(Runner.currentTimer);
     }

     Runner.updatePlayerGames(Runner.playersToGames, {}, true);

     Runner.registerNextShuffle();
  }

  static registerNextShuffle() {
    const minTime = State.getState("minSwapTime") * 1000;
    const maxTime = State.getState("maxSwapTime") * 1000;

    let randTime = 0;
    if (maxTime > minTime) randTime = randomNumber(minTime, maxTime + 1);
    if (maxTime <= minTime) randTime = randomNumber(maxTime, minTime + 1);

    Runner.currentTimer = setTimeout(Runner.shufflePlayers, randTime)
  }

  static shufflePlayers() {
    const originalMap = {...Runner.playersToGames};
    let newPlayers = shuffleArray(Object.keys(originalMap));

    // If not set to swap everyone, then here we cut down  to a smaller subset
    const shuffleEveryone = State.getState("everyoneSwaps");
    if (!shuffleEveryone) {
      const maxLength = newPlayers.length;
      const randLength = randomNumber(2, newPlayers.length + 1);

      newPlayers = newPlayers.slice(0, randLength);
    }

    const oldPlayers = Object.keys(originalMap).filter((item) => newPlayers.indexOf(item) !== -1);

    while(oldPlayers.length > 1 && !areAllDifferent(oldPlayers, newPlayers)) {
      newPlayers = shuffleArray(newPlayers);
    }

    const newMap = {};
    const oldMap = {};

    newPlayers.forEach((player, idx) => {
      newMap[player] = originalMap[oldPlayers[idx]];
      oldMap[player] = originalMap[player];
    });

    if (oldPlayers.length > 1) {
      Runner.updatePlayerGames(newMap, oldMap, false);
    }

    Runner.registerNextShuffle();
  }

  static updatePlayerGames(newMap, oldMap, initial) {
    if (initial) {
      let gamesToSaves = {};

      if (State.getState("loadLastKnownSaves")) {
        gamesToSaves = Runner.loadLastSaves();
      }

      const loadPromises = Object.keys(newMap).map((player) => {
        const game = newMap[player];
        return CoordinationServer.loadRom(player, game);
      });
    } else {
      const savePromises = Object.keys(oldMap).map((player) => {
        return CoordinationServer.saveState(player);
      });

      Promise.all(savePromises).then((results) => {
        const gamesToSaves = {};

        results.forEach((result) => {
          gamesToSaves[oldMap[result.player]] = result;
        });

        Runner.saveStates(results, oldMap);

        const loadPromises = Object.keys(newMap).map((player) => {
          const game = newMap[player];
          return CoordinationServer.loadRom(player, game, gamesToSaves[game]);
        });
      });
    }

    Runner.playersToGames = {...Runner.playersToGames, ...newMap};
  }

  static loadLastSaves() {
    const saveDir = 'Saves';
    const saves = Files.readdirSync(saveDir);
    const gamesToSaves = {};

    saves.forEach((save) => {
      if(save.endsWith('.save')) {
        gamesToSaves[save.replace('.save', '')] = Files.readFileSync(path.join(saveDir, save))
      }
    })
  }

  static saveStates(saves, oldMap) {
    const saveDir = 'Saves';

    saves.forEach((result) => {
      const game = oldMap[result.player];
      const saveFile = path.join(saveDir, game + '.save');

      Files.writeFileSync(saveFile);
    });
  }
}

window.Runner = Runner;
