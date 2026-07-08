require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const path = require('path');

module.exports = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'tangkou-ar-secret',
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'tangkou2024',
  BASE_URL: process.env.BASE_URL || 'http://localhost:3000',

  // Paths
  ROOT_DIR: path.join(__dirname, '..'),
  DATA_DIR: path.join(__dirname, '..', 'data'),
  DB_PATH: path.join(__dirname, '..', 'data', 'database.sqlite'),
  UPLOADS_DIR: path.join(__dirname, '..', 'data', 'uploads'),
  PUBLIC_DIR: path.join(__dirname, '..', 'public'),
  ADMIN_DIR: path.join(__dirname, '..', 'admin'),

  // Upload limits
  MAX_FILE_SIZE: 200 * 1024 * 1024, // 200MB
};
