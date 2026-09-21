const dotenv = require('dotenv');
const path = require('path');

// Usage: ENV=staging npx playwright test
const environment = process.env.ENV || 'qa';

dotenv.config({
  path: path.resolve(process.cwd(), `.env.${environment}`)
});

module.exports = {
  environment,
  baseURL: process.env.BASE_URL,
  username: process.env.USERNAME,
  password: process.env.PASSWORD,
  storagePath: path.resolve(process.cwd(), `storage/${environment}-auth.json`)
};
