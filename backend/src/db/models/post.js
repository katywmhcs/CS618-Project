import mongoose, { Schema } from 'mongoose'

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'title is required'],
      trim: true,
    },
    author: { type: Schema.Types.ObjectId, ref: 'user', required: true },
    contents: String,
    tags: [String],
  },
  { timestamps: true },
)

export const Post = mongoose.model('Post', postSchema, 'posts')
