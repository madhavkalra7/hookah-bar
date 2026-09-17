const fs = require('fs');
const path = require('path');

function copyFolderSync(from, to) {
  if (!fs.existsSync(to)) fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from).forEach(element => {
    const fromPath = path.join(from, element);
    const toPath = path.join(to, element);
    if (fs.lstatSync(fromPath).isDirectory()) {
      if (element !== 'node_modules' && element !== '.git' && element !== 'public') {
        copyFolderSync(fromPath, toPath);
      }
    } else {
      fs.copyFileSync(fromPath, toPath);
    }
  });
}

const publicDir = path.join(__dirname, 'public');
copyFolderSync(__dirname, publicDir);
console.log('Build completed: all static files successfully synchronized to public/ directory');
