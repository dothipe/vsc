import fs from 'fs';
import path from 'path';

console.log('__dirname:', import.meta.dirname);
console.log('cwd:', process.cwd());
console.log('Absolute path of package.json:', path.resolve('package.json'));
console.log('Does absolute path exist?:', fs.existsSync(path.resolve('package.json')));
