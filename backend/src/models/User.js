import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [50, 'Name must be at most 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true, // creates a unique index, so the database itself blocks duplicates
      lowercase: true,
      trim: true,
    },
    // Stores the bcrypt hash, never the plain password.
    // `select: false` leaves it out of every query unless we ask for it explicitly.
    password: {
      type: String,
      required: true,
      select: false,
    },
  },
  { timestamps: true }
);

// Safety net: if a user document is ever sent in a response, the hash is removed.
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    return ret;
  },
});

export default mongoose.model('User', userSchema);
