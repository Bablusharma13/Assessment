import mongoose from 'mongoose';

export const TASK_STATUSES = ['Todo', 'In Progress', 'Done'];

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [100, 'Title must be at most 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description must be at most 500 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: { values: TASK_STATUSES, message: 'Status must be one of: Todo, In Progress, Done' },
      default: 'Todo',
    },
    // The project this task belongs to.
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    // The owner, stored on the task too so ownership can be checked without loading the project.
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Speeds up "all tasks of a project, newest first" and deleting a project's tasks.
taskSchema.index({ projectId: 1, createdAt: -1 });

export default mongoose.model('Task', taskSchema);
