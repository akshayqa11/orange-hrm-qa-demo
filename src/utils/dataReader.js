const fs = require('fs');
const path = require('path');

/**
 * Utility function to read and parse JSON test data files
 * from the project's data directory.
 *
 * @param {string} fileName - Name of the JSON file to read
 * @returns {object} Parsed JSON data as a JavaScript object
 */


function readData(fileName) {
  const filePath = path.resolve(process.cwd(), 'data', fileName);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

module.exports = { readData };
