import mongoose from 'mongoose'
import {
  describe,
  expect,
  test,
  beforeEach,
  beforeAll,
  afterAll,
} from '@jest/globals'
import {
  createPost,
  listAllPosts,
  listPostsByAuthor,
  listPostsByTag,
  getPostById,
  updatePost,
  deletePost,
} from '../services/posts.js'
import { Post } from '../db/models/post.js'

const samplePosts = [
  { title: 'Learning Redux', author: 'Daniel Bugl', tags: ['redux'] },
  { title: 'Learn React Hooks', author: 'Daniel Bugl', tags: ['react'] },
  {
    title: 'Full-Stack React Projects',
    author: 'Daniel Bugl',
    tags: ['react', 'nodejs'],
  },
  { title: 'Guide to TypeScript' },
]

beforeAll(async () => {
  // connect to your test database
  await mongoose.connect('mongodb://127.0.0.1:27017/testdb', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
})

afterAll(async () => {
  // clean up and close connection
  await mongoose.connection.dropDatabase()
  await mongoose.connection.close()
})

let createdSamplePosts = []
beforeEach(async () => {
  await Post.deleteMany({})
  createdSamplePosts = []
  for (const post of samplePosts) {
    const createdPost = new Post(post)
    createdSamplePosts.push(await createdPost.save())
  }
})

describe('deleting posts', () => {
  test('should remove the post from the database', async () => {
    const result = await deletePost(createdSamplePosts[0]._id)
    expect(result.deletedCount).toEqual(1)
    const deletedPost = await Post.findById(createdSamplePosts[0]._id)
    expect(deletedPost).toEqual(null)
  })
  test('should fail if the id does not exist', async () => {
    const result = await deletePost('000000000000000000000000')
    expect(result.deletedCount).toEqual(0)
  })
})

describe('updating posts', () => {
  test('should update the specified property', async () => {
    await updatePost(createdSamplePosts[0]._id, {
      author: 'Test Author',
    })
    const updatedPost = await Post.findById(createdSamplePosts[0]._id)
    expect(updatedPost.author).toEqual('Test Author')
  })
  test('should not update other properties', async () => {
    await updatePost(createdSamplePosts[0]._id, {
      author: 'Test Author',
    })
    const updatedPost = await Post.findById(createdSamplePosts[0]._id)
    expect(updatedPost.title).toEqual('Learning Redux')
  })
  test('should update the updatedAt timestamp', async () => {
    await updatePost(createdSamplePosts[0]._id, {
      author: 'Test Author',
    })
    const updatedPost = await Post.findById(createdSamplePosts[0]._id)
    expect(updatedPost.updatedAt.getTime()).toBeGreaterThan(
      createdSamplePosts[0].updatedAt.getTime(),
    )
  })
  test('should fail if the id does not exist', async () => {
    const post = await getPostById('000000000000000000000000', {
      author: 'Test Author',
    })
    expect(post).toEqual(null)
  })
})

describe('getting a post', () => {
  test('should return the full post', async () => {
    const post = await getPostById(createdSamplePosts[0]._id)
    expect(post.toObject()).toEqual(createdSamplePosts[0].toObject())
  })
  test('should fail if the id does not exist', async () => {
    const post = await getPostById('000000000000000000000000')
    expect(post).toEqual(null)
  })
})

describe('listing posts', () => {
  test('should return all posts', async () => {
    const posts = await listAllPosts()
    expect(posts.length).toEqual(createdSamplePosts.length)
  })
  test('should return posts sorted by creation date descending by default', async () => {
    const posts = await listAllPosts()
    const createdAtTimestamps = posts.map((p) => p.createdAt.getTime())
    const sorted = [...createdAtTimestamps].sort((a, b) => b - a)
    expect(createdAtTimestamps).toEqual(sorted)
  })
  test('should be able to filter posts by tag', async () => {
    const posts = await listPostsByTag('nodejs')
    expect(posts.length).toBe(1)
  })
  test('should take into account provided sorting options', async () => {
    const posts = await listAllPosts({
      sortBy: 'createdAt',
      sortOrder: 'ascending',
    })
    const createdAtTimestamps = posts.map((p) => p.createdAt.getTime())
    const sorted = [...createdAtTimestamps].sort((a, b) => a - b)
    expect(createdAtTimestamps).toEqual(sorted)
  })
  test('should be able to filter posts by author', async () => {
    const posts = await listPostsByAuthor('Daniel Bugl')
    expect(posts.length).toBe(3)
    posts.forEach((p) => {
      expect(p.author).toBe('Daniel Bugl')
    })
  })
})

describe('creating posts', () => {
  test('with all parameters should succeed', async () => {
    const post = {
      title: 'Hello Mongoose!',
      author: 'Mei Han Wong',
      contents: 'This post is stored in a MongoDB database using Mongoose.',
      tags: ['mongoose', 'mongodb'],
    }
    const createdPost = await createPost(post)
    expect(createdPost._id).toBeInstanceOf(mongoose.Types.ObjectId)
    const foundPost = await Post.findById(createdPost._id)
    expect(foundPost).toEqual(expect.objectContaining(post))
    expect(foundPost.createdAt).toBeInstanceOf(Date)
    expect(foundPost.updatedAt).toBeInstanceOf(Date)
  })

  test('without title should fail', async () => {
    const post = {
      author: 'Mei Han Wong',
      contents: 'Post with no title',
      tags: ['empty'],
    }
    await expect(createPost(post)).rejects.toThrow(
      mongoose.Error.ValidationError,
    )
  })

  test('with minimal parameters should succeed', async () => {
    const post = { title: 'Only a title' }
    const createdPost = await createPost(post)
    expect(createdPost._id).toBeInstanceOf(mongoose.Types.ObjectId)
  })
})
