import { html, Component, render } from '../../node_modules/htm/preact/standalone.module.js';
import { Actions } from '../components/Actions.js';

export class HostClientSelectionView extends Component {


  changeUsername(event) {
    Actions.setUsername(event.target.value);
  }

  changeServerAddress(event) {
    Actions.setServerAddress(event.target.value);
  }

  startHost() {
    Actions.startServer();
  }

  connectToHost() {
    Actions.connectToHost();
  }

  renderButton(text, disabled, onClick) {
  }

  render() {
    let errorLabel = null;
    let connectingLabel = null;

    if (this.props.hostClientError) {
      errorLabel = html`
        <div class="alert alert-danger directory-error"><small>${this.props.hostClientError}</small></div>
      `;
    }

    if (this.props.isConnecting) {
      connectingLabel = html`
        <div class="spinner-border" role="status">
          <span class="sr-only">Connecting...</span>
        </div>
      `;
    }

    return html`
      <div class="container-fluid host-client-modal">
        <div>
          <p class="lead">Please enter a display name and select if you want to host or connect to a host.</p>
        </div>
        <div class="form-group">
          <div class="form-group">
            <label>Display Name</label>
            <input type="text" class="form-control" value=${this.props.username} onKeyUp=${this.changeUsername}></input>
            <label>Server Address</label>
            <input type="text" class="form-control" value=${this.props.serverAddress} onKeyUp=${this.changeServerAddress}></input>
          </div>

          <button class="btn btn-primary mr-3 ml-3" onClick=${this.startHost} disabled=${!this.props.username}>Host</button>
          <button class="btn btn-primary mr-3 ml-3" onClick=${this.connectToHost} disabled=${!this.props.username || !this.props.serverAddress}>Connect</button>
        </div>
        <div>
          ${errorLabel}
          ${connectingLabel}
        </div>
      </div>
    `;
  }
}
