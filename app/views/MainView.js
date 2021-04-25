import { html, Component, render } from '../../node_modules/htm/preact/standalone.module.js';
import { Actions } from '../components/Actions.js';

export class MainView extends Component {

  updateMinTime(event) {
    Actions.updateMinTime(event.target.value);
  }

  updateMaxTime(event) {
    Actions.updateMaxTime(event.target.value);
  }

  updateEveryoneSwaps(event) {
    Actions.updateEveryoneSwaps(event.target.checked);
  }

  updateAutomaticSwapping(event) {
    Actions.updateAutomaticSwapping(event.target.checked);
  }

  updateLoadLastSaves(event) {
    Actions.updateLoadLastSaves(event.target.checked);
  }

  updateCountdown(event) {
    Actions.updateCountdown(event.target.checked);
  }

  updateRom(event) {
    Actions.updateRom(event.target.dataset.name, event.target.checked);
  }

  launchBizhawk() {
    Actions.launchBizhawk();
  }

  forceSwap() {
    Actions.forceSwap();
  }

  runGames() {
    Actions.runGames();
  }

  changeSettingsPage(page) {
    return () => {
      Actions.changeSettingsPage(page);
    }
  }

  loginTwitch() {
    Actions.loginTwitch()
  }

  logoutTwitch() {
    Actions.logoutTwitch();
  }

  toggleEnableTwitch() {
    Actions.toggleEnableTwitch();
  }

  toggleChannelRewards() {
    Actions.toggleChannelRewards();
  }

  toggleTwitchBits() {
    Actions.toggleTwitchBits();
  }

  toggleTwitchBankEnabled() {
    Actions.toggleBankEnabled();
  }

  clearBank() {
    Actions.clearBank();
  }

  updateBitThreshold(event) {
    Actions.updateBitThreshold(event.target.value);
  }

  updateTwitchCooldown(event) {
    Actions.updateTwitchCooldown(event.target.value);
  }

  updateChannelReward = (event) => {
    const id = event.target.value;
    Actions.updateTwitchChannelRewardTrigger(this.props.twitchChannelRewards.find(item => item.id == id));
  }

  renderUsers() {
    const userItems = [];
    for(let userName in this.props.users) {
      const user = this.props.users[userName];

      if (user.bizhawkConnected) {
        userItems.push(html`
          <div class="row">
            <div class="col-3">
              <span class="badge badge-pill badge-success">Ready</span>
            </div>
            <div class="col-9">
              <span>${user.username}</span>
            </div>
          </div>
        `);
      } else {
        userItems.push(html`
          <div class="row">
            <div class="col-3">
              <span class="badge badge-pill badge-danger">Not Ready</span>
            </div>
            <div class="col-9">
              <span>${user.username}</span>
            </div>
          </div>
        `);
      }
    }

    return userItems;
  }

  renderRoms() {
    const romItems = [];
    for(let rom of this.props.roms) {
      romItems.push(html`
        <div class="form-check">
          <input data-name=${rom.name} type="checkbox" class="form-check-input" checked=${rom.selected} onChange=${this.updateRom} disabled=${!this.props.isHost}></input>
          <label class="form-check-label">${rom.name}</label>
        </div>
      `);
    }

    return romItems;
  }

  renderBizhawkConnectionStatus() {
    if (this.props.bizhawkConnected) {
      return html`
        <div class="alert alert-success" role="alert">
          Bizhawk Connected
        </div>
      `;
    }

    return html`
      <div class="alert alert-warning" role="alert">
        Not Connected to Bizhawk
      </div>
    `
  }

  renderTwitchSettings() {
    if(this.props.settingsPage !== 'twitch') {
      return null;
    }

    return html`
      ${
        !this.props.twitchAuthorized ?
         html`<button class="btn btn-primary mt-2 mb-2" onClick=${this.loginTwitch}>Login To Twitch</button>` :
         html`<button class="btn btn-danger mt-2 mb-2" onClick=${this.logoutTwitch}>Logout Of Twitch</button>`
       }
       <div class="form-check">
         <input type="checkbox" class="form-check-input" checked=${this.props.twitchEnabled} onChange=${this.toggleEnableTwitch} disabled=${!this.props.isHost || !this.props.twitchAuthorized}></input>
         <label class="form-check-label">Enable Twitch</label>
       </div>
       <div class="form-check">
         <input type="checkbox" class="form-check-input" checked=${this.props.twitchChannelRewardsEnabled} onChange=${this.toggleChannelRewards} disabled=${!this.props.isHost || !this.props.twitchEnabled || !this.props.twitchAuthorized}></input>
         <label class="form-check-label">Enable Channel Reward Triggering Swap</label>
       </div>
       <div class="form-row">
         <span class="spaces">Triggering Reward: </span>
         <select disabled=${!this.props.isHost || !this.props.twitchEnabled || !this.props.twitchAuthorized} onChange=${this.updateChannelReward}>
          ${
            this.props.twitchChannelRewards.map((reward) => {
              if(reward.id == this.props.twitchChannelRewardTrigger.id) {
                return html`
                  <option value=${reward.id} selected>${reward.title}</option>
                `;
              }

              return html`
                <option value=${reward.id}>${reward.title}</option>
              `;
            })
          }
         </select>
       </div>
       <div class="form-check">
         <input type="checkbox" class="form-check-input" checked=${this.props.twitchBitsEnabled } onChange=${this.toggleTwitchBits} disabled=${!this.props.isHost || !this.props.twitchEnabled || !this.props.twitchAuthorized}></input>
         <label class="form-check-label">Enable Bit Donation Triggering Swap</label>
       </div>
       <div class="form-row">
         <span class="spaces">Donation Threshold: </span>
         <input type="number" class="form-control col-4" value=${this.props.twitchBitsThreshold} onChange=${this.updateBitThreshold} disabled=${!this.props.isHost || !this.props.twitchEnabled || !this.props.twitchAuthorized}></input><span> (bits)</span>
       </div>
       <div class="form-row">
         <span class="spaces">Cooldown: </span>
         <input type="number" class="form-control col-4" value=${this.props.twitchCooldown} onChange=${this.updateTwitchCooldown} disabled=${!this.props.isHost}></input><span> (s)</span>
       </div>
       <div class="form-check">
         <input type="checkbox" class="form-check-input" checked=${this.props.twitchBankEnabled} onChange=${this.toggleTwitchBankEnabled} disabled=${!this.props.isHost || !this.props.twitchEnabled || !this.props.twitchAuthorized}></input>
         <label class="form-check-label">Bank Swaps During Cooldown</label>
       </div>
       <div class="form-check">
         <label class="form-check-label">Current Bank: ${this.props.twitchBankCount}</label>
         <a href="#" class="ml-1" onClick=${this.clearBank}>Clear Bank</a>
       </div>
    `;
  }

  renderMainSettings() {
    if(this.props.settingsPage !== 'main') {
      return null;
    }

    return  html`
      <div class="form-group">
        <label>Minimum Swap Time</label>
        <div class="form-row">
          <input type="number" class="form-control col-4" value=${this.props.minSwapTime} onChange=${this.updateMinTime} disabled=${!this.props.isHost}></input><span> (s)</span>
        </div>
      </div>
      <div class="form-group">
        <label>Maximum Swap Time</label>
        <div class="form-row">
          <input type="number" class="form-control col-4"  value=${this.props.maxSwapTime} onChange=${this.updateMaxTime} disabled=${!this.props.isHost}></input><span> (s)</span>
        </div>
      </div>
      <div class="form-check">
        <input type="checkbox" class="form-check-input" checked=${this.props.loadLastKnownSaves} onChange=${this.updateLoadLastSaves} disabled=${!this.props.isHost}></input>
        <label class="form-check-label">Resume From Last Save</label>
      </div>
      <div class="form-check">
        <input type="checkbox" class="form-check-input" checked=${this.props.enableCountdown} onChange=${this.updateCountdown} disabled=${!this.props.isHost}></input>
        <label class="form-check-label">Enable Countdown</label>
      </div>
      <div class="form-check">
        <input type="checkbox" class="form-check-input" checked=${this.props.everyoneSwaps} onChange=${this.updateEveryoneSwaps} disabled=${!this.props.isHost}></input>
        <label class="form-check-label">Everyone Swaps Together</label>
      </div>
      <div class="form-check">
        <input type="checkbox" class="form-check-input" checked=${this.props.automaticSwapping} onChange=${this.updateAutomaticSwapping} disabled=${!this.props.isHost}></input>
        <label class="form-check-label">Automatic Swapping</label>
      </div>
    `
  }

  render() {
    const cantRunGames = !this.props.bizhawkConnected ||
                        //  (Object.keys(this.props.users).length !== this.props.roms.filter(rom => rom.selected).length) ||
                          (Object.values(this.props.users).filter(user => user.bizhawkConnected).length !== Object.keys(this.props.users).length);
    return html`
      <div class="container main-view">
        <div class="row pt-3">
          <div class="col-6">
            <h3><span>Settings </span>
              ${
                this.props.twitchEnabled && !this.props.twitchAuthorized ?
                html`<small><small><span class="badge badge-warning">Twitch not authorized</span></small></small>` :
                null
              }
            </h3>
            <ul class="nav">
              <li class="nav-item">
                <a class=${"nav-link " + (this.props.settingsPage == 'main' ? 'disabled' : '')} href="#" onClick=${this.changeSettingsPage('main')}>Main</a>
              </li>
              <li class="nav-item">
                <a class=${"nav-link " + (this.props.settingsPage == 'twitch' ? 'disabled' : '')} href="#" onClick=${this.changeSettingsPage('twitch')}>Twitch</a>
              </li>
            </ul>
            ${ this.renderMainSettings() }
            ${ this.renderTwitchSettings() }
          </div>
          <div class="col-6">
            <div>
              <h3>User List</h3>
              <div class="user-list">
                ${ this.renderUsers() }
              </div>
            </div>
            <div>
              <h3>Rom List</h3>
              <div class="rom-list">
                ${ this.renderRoms() }
              </div>
            </div>
          </div>
        </div>
        <div class="row">
          <div class="bizhawk-controls">
          ${this.renderBizhawkConnectionStatus() }
          <div>
            <button class="btn btn-primary mr-2" onClick=${this.launchBizhawk}>Launch Bizhawk</button>
            <button class="btn btn-primary ml-2" disabled=${cantRunGames} onClick=${this.runGames}>Run Games</button>
            <button class="btn btn-primary ml-4" disabled=${!this.props.isRunning} onClick=${this.forceSwap}>Force Swap</button>
          </div>
          </div>
        </div>
      </div>
    `;
  }
}
