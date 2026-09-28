import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { createToken } from '../utils/token.js';

// How much work bcrypt does per hash. 10 is the common default: secure and fast enough.
const SALT_ROUNDS = 10;

// The only user fields ever sent to the client. The password hash is never included.
function buildAuthResponse(user) {
  return {
    token: createToken(user._id.toString()),
    user: { id: user._id, name: user.name, email: user.email },
  };
}

// POST /api/auth/register
export async function register(req, res) {
  const { name, email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('This email is already registered', 400);
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ name, email, password: hashedPassword });

  res.status(201).json({ success: true, data: buildAuthResponse(user) });
}

// POST /api/auth/login
export async function login(req, res) {
  const { email, password } = req.body;

  // The password field is hidden by default, so we request it explicitly here.
  const user = await User.findOne({ email }).select('+password');
  const isPasswordCorrect = user ? await bcrypt.compare(password, user.password) : false;

  // Same message for "no such email" and "wrong password",
  // so the response does not reveal which of the two was wrong.
  if (!isPasswordCorrect) {
    throw new AppError('Invalid email or password', 401);
  }

  res.status(200).json({ success: true, data: buildAuthResponse(user) });
}
