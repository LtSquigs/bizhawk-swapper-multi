import { Actions } from './Actions.js';

const { ipcRenderer } = require('electron');
const { StaticAuthProvider } = require('twitch-auth');
const { ApiClient } = require('twitch');
const { PubSubClient } = require('twitch-pubsub-client');

ipcRenderer.on('twitch-login', (event, url) => {
  if(Twitch.loginWindow) {
    Twitch.loginWindow.close();
  }

  if(url) {
    const loginUrl = new URL(url);
    const params = new URLSearchParams(loginUrl.hash.slice(1))

    Actions.updateTwitchToken(params.get("access_token"));
  }
})

export class Twitch {
  static twitchLoginUrl = 'https://id.twitch.tv/oauth2/authorize';
  static redirectUrl = 'http://localhost/bizhawk-multi-swapper';
  static clientId = 'm3nwsc4ujbfwv3dedd90o6zwhw3y05';
  static scopes = ['channel:read:redemptions', 'bits:read'];
  static loginWindow = null;
  static accessToken = null;
  static client = null;
  static pubSub = null;
  static isRunning = false;
  static channelListener = null;
  static bitListener = null;
  static userId = null;
  static channelReward = null;
  static bitThreshold = 1000;

  static validateToken(token) {
    return new Promise((resolve, reject) => {
      if(!token) {
        return resolve({validated: false});
      }

      fetch('https://id.twitch.tv/oauth2/validate', {
        headers: {
          'Authorization': 'OAuth ' + token
        }
      }).then(response => {
        if (response.status === 200) {
          return response.json().then(json => {
            resolve({ validated: true, json: json});
          })
        }

        resolve({ validated: false });
      }).catch(err => {
        resolve({ validated: false });
      })
    })
  }

  static setChannelReward(reward) {
    Twitch.channelReward = reward;
  }

  static setBitThreshold(threshold) {
    Twitch.bitThreshold = threshold;
  }

  static setAccessToken(token) {
    return new Promise((resolve, reject) => {
      Twitch.accessToken = token;

      if (!token) {
        Twitch.client = null;
        Twitch.removeChannelListener();
        // Deregister any listeners
        Twitch.pubSub = null;
        return resolve();
      }

      const authProvider = new StaticAuthProvider(Twitch.clientId, Twitch.accessToken, Twitch.scopes);
      Twitch.client = new ApiClient({ authProvider });
      Twitch.pubSub = new PubSubClient();
      Twitch.pubSub.registerUserListener(Twitch.client).then((userId) => {
        Twitch.userId = userId;
        resolve();
      }).catch(() => {
        // If it doesnt work just ignore it
        resolve();
      });
    });
  }

  static getChannelRewards() {
    return new Promise((resolve, reject) => {
      if(!Twitch.client) {
        return resolve([]);
      }

      Twitch.client.helix.channelPoints.getCustomRewards(Twitch.userId).then(res => {
        resolve(res.map(reward => { return { title: reward.title, id: reward.id }; }));
      }).catch((err) => {
        resolve([])
      })
    });
  }

  static start(pointsEnabled, bitsEnabled) {
    if (!Twitch.accessToken) {
      return;
    }

    Twitch.isRunning = true;

    if (pointsEnabled) {
      Twitch.registerChannelListener();
    }

    if (bitsEnabled) {
      Twitch.registerBitListener();
    }
  }

  static stop() {
    Twitch.isRunning = false;

    Twitch.removeChannelListener();
    Twitch.removeBitListener();
  }

  static onRedemption(redemption) {
    if((redemption.rewardId || redemption.rewardId === 0) &&
      redemption.rewardId == Twitch.channelReward.id) {
      Actions.twitchSwap();
    }
  }

  static onBits(bits) {
    if(bits.bits && bits.bits >= Twitch.bitThreshold) {
      Actions.twitchSwap();
    }
  }

  static registerChannelListener() {
    if(!Twitch.isRunning || Twitch.channelListener) {
      return;
    }

    Twitch.pubSub.onRedemption(Twitch.userId, Twitch.onRedemption).then((listener) => {
      Twitch.channelListener = listener;
    })
  }

  static registerBitListener() {
    if(!Twitch.isRunning || Twitch.bitListener) {
      return;
    }

    Twitch.pubSub.onBits(Twitch.userId, Twitch.onBits).then((listener) => {
      Twitch.bitListener = listener;
    })
  }

  static removeChannelListener() {
    if (Twitch.channelListener) {
      Twitch.channelListener.remove();
      Twitch.channelListener = null;
    }
  }

  static removeBitListener() {
    if (Twitch.bitListener) {
      Twitch.bitListener.remove();
      Twitch.bitListener = null;
    }
  }

  static loginTwitch() {
    const args = new URLSearchParams();

    args.set('force_verify', 'true');
    args.set('response_type', 'token');
    args.set('client_id', Twitch.clientId);
    args.set('redirect_uri', Twitch.redirectUrl);
    args.set('scope', Twitch.scopes.join(' '));

    Twitch.loginWindow = window.open(Twitch.twitchLoginUrl + '?' + args.toString(), 'twitch_login', 'width=500,height=500');
  }
}

window.Twitch = Twitch;
