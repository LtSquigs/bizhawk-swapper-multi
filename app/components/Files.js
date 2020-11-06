
const { remote } = require('electron');
const cwd = process.env.PORTABLE_EXECUTABLE_DIR || remote.app.getAppPath();
const appPath = remote.app.getAppPath();

let fs = require('fs');
let path = require('path');

export class Files {
  static fixPath(pathToFix, local) {
    if (!path.isAbsolute(pathToFix)) {
      if(local) {
        pathToFix = path.join(appPath, pathToFix);
      } else {
        pathToFix = path.join(cwd, pathToFix);
      }
    }

    return pathToFix;
  }

  static existsSync(checkPath, local) {
    return fs.existsSync(Files.fixPath(checkPath, local));
  }

  static readdirSync(directory, local) {
    return fs.readdirSync(Files.fixPath(directory, local));
  }

  static readFileSync(file, local) {
    return fs.readFileSync(Files.fixPath(file, local));
  }

  static writeFileSync(file, data, local) {
    return fs.writeFileSync(Files.fixPath(file, local), data);
  }

  static mkdirSync(directory, local) {
    return fs.mkdirSync(Files.fixPath(directory, local));
  }

  static unlinkSync(file, local) {
    return fs.unlinkSync(Files.fixPath(file, local));
  }

  static resolve(file, local) {
    return path.resolve(Files.fixPath(file, local));
  }
}

window.Files = Files;
