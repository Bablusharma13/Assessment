// Loads variables from backend/.env into process.env (locally only; on Render
// they are set in the dashboard). Existing variables are never overwritten.
import 'dotenv/config';

const REQUIRED_VARIABLES = ['PORT', 'MONGODB_URI', 'JWT_SECRET', 'FRONTEND_URL'];

const missingVariables = REQUIRED_VARIABLES.filter((name) => !process.env[name]);

// Fail fast: it is better to crash on startup than to run with a broken config.
if (missingVariables.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVariables.join(', ')}`);
}

export const env = {
  port: Number(process.env.PORT),
  mongodbUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: '1d',
  // Browsers send the Origin without a trailing slash, so remove one if present.
  frontendUrl: process.env.FRONTEND_URL.replace(/\/+$/, ''),
};
