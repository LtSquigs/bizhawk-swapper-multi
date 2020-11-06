import { State } from './State.js';
import { Settings } from './Settings.js';
import { BizhawkApi } from './BizhawkApi.js';
import { WebsocketClient } from './WebsocketClient.js';
import { CoordinationServer } from './CoordinationServer.js'

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

function areSame(a, b) {
  let same = true;

  a.forEach((item, idx) => {
    if(item !== b[idx]) {
      same = false;
    }
  });

  return same;
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
    const oldMap = {...Runner.playersToGames};
    let newPlayers = shuffleArray(Object.keys(oldMap));

    // If not set to swap everyone, then here we cut down  to a smaller subset
    const shuffleEveryone = State.getState("everyoneSwaps");
    if (!shuffleEveryone) {
      const maxLength = newPlayers.length;
      const randLength = randomNumber(2, newPlayers.length + 1);

      newPlayers = newPlayers.slice(0, randLength);
    }

    const oldPlayers = Object.keys(oldMap).filter((item) => newPlayers.indexOf(item) !== -1);

    while(oldPlayers.length > 1 && areSame(oldPlayers, newPlayers)) {
      newPlayers = shuffleArray(newPlayers);
    }

    const newMap = {};

    newPlayers.forEach((player, idx) => {
      newMap[player] = oldMap[oldPlayers[idx]];
    });

    if (oldPlayers.length > 1) {
      Runner.updatePlayerGames(newMap, oldMap, false);
    }

    Runner.registerNextShuffle();
  }

  static updatePlayerGames(newMap, oldMap, initial) {
    if (initial) {
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

        const loadPromises = Object.keys(newMap).map((player) => {
          const game = newMap[player];
          return CoordinationServer.loadRom(player, game, gamesToSaves[game]);
        });
      });
    }

    Runner.playersToGames = {...Runner.playersToGames, ...newMap};
  }
}

window.Runner = Runner;
