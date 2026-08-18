const path = require('path');

const targetDir = path.join(__dirname, 'The montes of maria', 'De los Montes de María');
process.chdir(targetDir);
require(path.join(targetDir, 'app.js'));
