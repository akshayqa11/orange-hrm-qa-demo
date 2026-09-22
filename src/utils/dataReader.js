const fs = require('fs');
const path = require('path');

function readData(fileName) {
  const filePath = path.resolve(process.cwd(), 'data', fileName);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

module.exports = { readData };
