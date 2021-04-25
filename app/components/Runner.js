import { State } from './State.js';
import { Settings } from './Settings.js';
import { Actions } from './Actions.js';
import { WebsocketClient } from './WebsocketClient.js';
import { CoordinationServer } from './CoordinationServer.js'

const path = require('path');
const crypto = require('crypto');

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
  static liveGames = [];
  static deadGames = [];
  static livePlayers = [];
  static deadPlayers = [];

  static playersToGames = {};
  static gamesToSaves = {};

  static currentTimer = null;

  static playersHaveNewGames(newMap, oldMap) {
    let newGames = true;

    Object.keys(newMap).forEach((player) => {
      if (newMap[player] == oldMap[player]) {
        newGames = false;
      }
    })

    return newGames;
  }

  static getNewPlayerGameMap(initial) {
    // Get the last list of live games, and live players
    //const lastPlayers = Object.keys(Runner.playersToGames);
    //const lastGames = lastPlayers.map(player => Runner.playersToGames[player]);
    const shuffleEveryone = State.getState("everyoneSwaps");

    // If the current live games < # of players, we need to dead a player
    // dead player will be the one who has a dead game, or if no one has a dead game
    // the last players in the list gets deaded until were even
    if(Runner.livePlayers.length > Runner.liveGames.length) {
      const killPlayers = [];
      Runner.livePlayers.forEach((player) => {
        const lastGame = Runner.playersToGames[player];

        if(Runner.deadGames.includes(lastGame)) {
          killPlayers.push(player);
        }
      })

      Runner.livePlayers = Runner.livePlayers.filter((player) => !killPlayers.includes(player));
      Runner.deadPlayers = Runner.deadPlayers.concat(killPlayers);


      while(Runner.livePlayers.length > Runner.liveGames.length) {
        Runner.deadPlayers.push(Runner.livePlayers.pop());
      }
    }

    // If there are more live games than there are live players,
    // and there are some dead players. Undead them.
    if(Runner.liveGames.length > Runner.livePlayers.length && Runner.deadPlayers.length > 0) {
      while(Runner.liveGames.length > Runner.livePlayers.length) {
        const undeadPlayer = Runner.deadPlayers.shift();
        Runner.livePlayers.push(undeadPlayer);
      }
    }

    if (Runner.livePlayers.length == 0 || Runner.liveGames.length == 0) {
      return {};
    }

    // Take the current live games, and shuffle then slice to player list, until
    // different than last list
    let curPlayers = Runner.livePlayers;
    let shuffleLength = curPlayers.length;

    // Deal with shuffleEveryone
    if (!shuffleEveryone) {
      shuffleLength = randomNumber(2, shuffleLength + 1);
      curPlayers = shuffleArray(curPlayers).slice(0, shuffleLength)
    }

    let curGames = shuffleArray(Runner.liveGames).slice(0, shuffleLength);

    let newMap = {};

    curPlayers.forEach((player, idx) => {
      newMap[player] = curGames[idx];
    })

    const soloBolo = Runner.liveGames.length == 1 && Runner.livePlayers.length == 1;

    if(!initial) {
      while(!Runner.playersHaveNewGames(newMap, Runner.playersToGames)
      && !soloBolo) {
        curPlayers = shuffleArray(Runner.livePlayers).slice(0, shuffleLength)
        curGames = shuffleArray(Runner.liveGames).slice(0, shuffleLength);
        newMap = {};
        curPlayers.forEach((player, idx) => {
          newMap[player] = curGames[idx];
        })
      }
    }

    return newMap;
  }

  static run() {
     const games = State.getState("roms");
     const players = State.getState("users");

     Actions.updateIsRunning(true);

     Runner.gamesToSaves = {};
     Runner.liveGames = games.filter(game => game.selected).map(game => game.name);
     Runner.deadGames = games.filter(game => !game.selected).map(game => game.name);
     Runner.livePlayers = Object.keys(players);

     Runner.clearTimeout();
     Runner.updatePlayerGames(Runner.getNewPlayerGameMap(true), {}, true);

     Runner.registerNextShuffle();
  }

  static killGame(deadGame) {
      Runner.liveGames = Runner.liveGames.filter((game) => game !== deadGame);
      Runner.deadGames.push(deadGame);
  }

  static reviveGame(liveGame) {
      Runner.deadGames = Runner.deadGames.filter((game) => game !== liveGame);
      Runner.liveGames.push(liveGame);
  }

  static clearTimeout() {
     if(Runner.currentTimer) {
       clearTimeout(Runner.currentTimer);
     }
  }

  static registerNextShuffle() {
    Runner.clearTimeout();

    if(!State.getState("automaticSwapping")) {
      return;
    }

    const minTime = State.getState("minSwapTime") * 1000;
    const maxTime = State.getState("maxSwapTime") * 1000;

    let randTime = 0;
    if (maxTime > minTime) randTime = randomNumber(minTime, maxTime + 1);
    if (maxTime <= minTime) randTime = randomNumber(maxTime, minTime + 1);

    Runner.currentTimer = setTimeout(Runner.shufflePlayers, randTime)
  }

  static shufflePlayers() {
    Runner.clearTimeout();
    State.setState('lastSwap', Date.now());
    State.setState('isSwapping', true);
    const newMap = Runner.getNewPlayerGameMap();

    if (State.getState("enableCountdown")) {
      const countdownPromises = Object.keys(newMap).map((player) => {
        return CoordinationServer.sendCountdown(player);
      });

      setTimeout(() => {
        Runner.updatePlayerGames(newMap, Runner.playersToGames);
        Runner.registerNextShuffle();
      }, 3000);
    } else {
      Runner.updatePlayerGames(newMap, Runner.playersToGames);
      Runner.registerNextShuffle();
    }
  }

  static updatePlayerGames(newMap, oldMap, initial) {
    if (initial) {
      let gamesToFirstSaves = {};

      if (State.getState("loadLastKnownSaves")) {
        gamesToFirstSaves = Runner.loadLastSaves();
      }

      Runner.gamesToSaves = gamesToFirstSaves;

      const loadPromises = Object.keys(newMap).map((player) => {
        const game = newMap[player];

        return new Promise((resolve, reject) => {
          let timeout = null;
          let loaded = false;
          if (gamesToFirstSaves[game]) {
            CoordinationServer.loadRom(player, game, gamesToFirstSaves[game]).then((result) => {
              if (timeout) clearTimeout(timeout);
              if (loaded) return;

              loaded = true;
              resolve(result);
            });
          } else {
            CoordinationServer.loadRom(player, game).then((result) => {
              if (timeout) clearTimeout(timeout);
              if (loaded) return;

              loaded = true;
              resolve(result);
            });
          }

          timeout = setTimeout(() => {
            if(loaded) return;

            loaded = true;
            resolve(null);
          }, State.getState("bizhawkTimeout") * (State.getState("bizhawkMaxRetries") + 1));
        });
      });

      Promise.all(loadPromises).then(() => {
        State.setState('isSwapping', false);
      });

    } else {
      const savePromises = Object.keys(oldMap).map((player) => {
        return new Promise((resolve, reject) => {
          let recieved = false;
          let timeout = null;
          CoordinationServer.saveState(player).then((result) => {
            if (timeout) clearTimeout(timeout);
            if (recieved) return;

            recieved = true;
            resolve(result);
          });

          timeout = setTimeout(() => {
            if(recieved) return;

            recieved = true;
            resolve({});
          }, State.getState("bizhawkTimeout") * (State.getState("bizhawkMaxRetries") + 1))
        });
        return CoordinationServer.saveState(player);
      });

      Promise.all(savePromises).then((results) => {
        Runner.saveStates(results, oldMap);
        results.forEach(result => {
          const game = oldMap[result.player];
          const hash = crypto.createHash('md5');
          hash.update(result.data || '');
          const calcMd5 = hash.digest('hex');

          // Some sanity checks before we commit this save to memory
          // 1. Do the client and server agree on what the game was
          // 2. Does the md5 match the data
          // 3. There is no data to save
          // If either are not true we do not save this in memory
          if (game !== result.saved_game || calcMd5 !== result.md5 || !result.data) {
            return;
          }

          // Update the save game map
          Runner.gamesToSaves[game] = result;
        })

        const loadPromises = Object.keys(newMap).map((player) => {
          const game = newMap[player];

          if(newMap[player] == oldMap[player]) {
            return;
          }

          return new Promise((resolve, reject) => {
            let timeout = null;
            let loaded = false;
            CoordinationServer.loadRom(player, game, Runner.gamesToSaves[game]).then((result) => {
              if (timeout) clearTimeout(timeout);
              if (loaded) return;

              loaded = true;
              resolve(result);
            });

            timeout = setTimeout(() => {
              if(loaded) return;

              loaded = true;
              resolve(null);
            }, State.getState("bizhawkTimeout") * (State.getState("bizhawkMaxRetries") + 1));
          });
        });

        Promise.all(loadPromises).then(() => {
          State.setState('isSwapping', false);
        });
      });
    }

    Runner.playersToGames = {...Runner.playersToGames, ...newMap};
    Runner.deadPlayers.forEach((player) => {
      delete Runner.playersToGames[player];
    })
  }

  static loadLastSaves() {
    const saveDir = 'Saves';
    const saves = Files.readdirSync(saveDir);
    const gamesToSaves = {};

    saves.forEach((save) => {
      if(save.endsWith('.save')) {
        gamesToSaves[save.replace('.save', '')] = { data: Files.readFileSync(path.join(saveDir, save)) }
      }
    });

    return gamesToSaves;
  }

  static saveStates(saves, oldMap) {
    const saveDir = 'Saves';

    saves.forEach((result) => {
      const game = oldMap[result.player];
      const saveFile = path.join(saveDir, game + '.save');
      const hash = crypto.createHash('md5');
      hash.update(result.data || '');
      const calcMd5 = hash.digest('hex');

      // Some sanity checks before we commit this save to the fs
      // 1. Do the client and server agree on what the game was
      // 2. Does the md5 match the data
      // 3. There is no data to save
      // If either are not true we do not save this to the fs
      if (game !== result.saved_game || calcMd5 !== result.md5 || !result.data) {
        return;
      }

      Files.writeFileSync(saveFile, result.data);
    });
  }
}

window.Runner = Runner;
