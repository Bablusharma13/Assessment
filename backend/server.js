import app from './src/app.js';
import { connectDatabase } from './src/config/db.js';
import { env } from './src/config/env.js';

async function startServer() {
  try {
    // Connect first so the API never accepts requests without a database.
    await connectDatabase();

    app.listen(env.port, (error) => {
      if (error) {
        console.error('Failed to start server:', error.message);
        process.exit(1);
      }
      console.info(`Server running on port ${env.port}`);
    });
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
}

startServer();
