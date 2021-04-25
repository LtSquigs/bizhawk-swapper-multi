import { html, Component, render } from '../../node_modules/htm/preact/standalone.module.js';
import { BizhawkDirectoryView } from './BizhawkDirectoryView.js';
import { HostClientSelectionView } from './HostClientSelectionView.js';
import { MainView } from './MainView.js';
import { State } from '../components/State.js';

class App extends Component {
  constructor() {
    super();

    this.state = State.initialize();

    State.onUpdate((newState) => {
      this.setState(newState)
    });
  }

  render() {
    if (!this.state.bizhawkDir) {
      return html`
        <${BizhawkDirectoryView} errorMessage=${this.state.bizhawkDirError}/>
      `;
    }

    if (!this.state.serverRunning && !this.state.clientConnected) {
      return html`
        <${HostClientSelectionView}
          isConnecting=${this.state.clientIsConnecting}
          username=${this.state.username}
          serverAddress=${this.state.serverAddress}
          hostClientError=${this.state.hostClientError}
      />
      `
    }


    return html`<${MainView}
      bizhawkConnected=${this.state.bizhawkConnected}
      isHost=${this.state.isHost}
      isRunning=${this.state.isRunning}
      automaticSwapping=${this.state.automaticSwapping}
      enableCountdown=${this.state.enableCountdown}
      everyoneSwaps=${this.state.everyoneSwaps}
      loadLastKnownSaves=${this.state.loadLastKnownSaves}
      minSwapTime=${this.state.minSwapTime}
      maxSwapTime=${this.state.maxSwapTime}
      users=${this.state.users}
      roms=${this.state.roms}
      settingsPage=${this.state.settingsPage}
      twitchAuthorized=${this.state.twitchAuthorized}
      twitchEnabled=${this.state.twitchEnabled}
      twitchChannelRewardsEnabled=${this.state.twitchChannelRewardsEnabled}
      twitchChannelRewards=${this.state.twitchChannelRewards}
      twitchChannelRewardTrigger=${this.state.twitchChannelRewardTrigger}
      twitchBitsEnabled=${this.state.twitchBitsEnabled}
      twitchBitsThreshold=${this.state.twitchBitsThreshold}
      twitchCooldown=${this.state.twitchCooldown}
      twitchBankEnabled=${this.state.twitchBankEnabled}
      twitchBankCount=${this.state.twitchBankCount}
    />`;
  }
}

render(html`<${App} />`, document.body);
