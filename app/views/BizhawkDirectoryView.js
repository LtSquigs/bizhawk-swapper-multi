import { html, Component, render } from '../../node_modules/htm/preact/standalone.module.js';
import { Actions } from '../components/Actions.js';

const {dialog} = require('electron').remote;

export class BizhawkDirectoryView extends Component {

  openSelectDialog = async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });

    const filePath = result.filePaths[0];

    Actions.setBizhawkPath(filePath);
  }

  render() {
    let errorLabel = null;

    if (this.props.errorMessage) {
      errorLabel = html`
        <div class="alert alert-danger directory-error"><small>${this.props.errorMessage}</small></div>
      `;
    }

    return html`
      <div class="container-fluid directory-modal">
        <div>
          <p class="lead">Select a directory that contains a BizHawk emulator</p>
          <p class="text-muted">In order for the tool to be able to sync up saves, it needs to know where the BizHawk Emulator is.</p>
          <p class="text-muted">Please select a directory which has EmuHawk.exe in it</p>
        </div>
        <div>
          <button type="button" class="btn btn-primary" onClick=${this.openSelectDialog}>Select Folder</button>
        </div>
        ${errorLabel}
      </div>
    `;
  }
}
