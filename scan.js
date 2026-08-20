import fs from 'fs';
import path from 'path';

function scan(dir, depth = 0) {
  if (depth > 5) return;
  try {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const full = path.join(dir, f);
      let isDir = false;
      try {
        isDir = fs.statSync(full).isDirectory();
      } catch (e) {}
      if (isDir) {
        if (f !== 'node_modules' && f !== '.git' && f !== 'npm-cache' && f !== '_cacache' && f !== '.next' && f !== 'dist') {
          console.log(' '.repeat(depth * 2) + '[D] ' + full);
          scan(full, depth + 1);
        }
      } else {
        console.log(' '.repeat(depth * 2) + '[F] ' + full);
      }
    }
  } catch (e) {
    console.log(' '.repeat(depth * 2) + 'Error ' + dir + ': ' + e.message);
  }
}

console.log('Scanning current directory...');
scan('.');
