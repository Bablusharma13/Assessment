// Test configuration. Import this file FIRST in every test file, before the app,
// because src/config/env.js checks these variables as soon as it is loaded.
// Values are always overwritten so tests never use the real .env settings.

process.env.PORT = '5000';
process.env.JWT_SECRET = 'test-only-jwt-secret';
process.env.FRONTEND_URL = 'http://localhost:5173';

// A separate database that tests are allowed to wipe. Never the development database.
process.env.MONGODB_URI =
  process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/task-manager-test';
