import mongoose from 'mongoose'

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'title is required'],
      trim: true,
    },
    author: String,
    contents: String,
    tags: [String],
  },
  { timestamps: true },
)

export const Post = mongoose.model('Post', postSchema, 'posts')
