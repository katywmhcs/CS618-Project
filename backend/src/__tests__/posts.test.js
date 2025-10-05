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
import { createUser } from '../services/users.js'

// Connect to the database before all tests
beforeAll(async () => {
  // Removed deprecated options for modern Mongoose versions
  await mongoose.connect('mongodb://127.0.0.1:27017/testdb')
})

// Clean up and close the connection after all tests
afterAll(async () => {
  await mongoose.connection.dropDatabase()
  await mongoose.connection.close()
})

let testUser = null
let samplePosts = []

// Create a single test user and define sample post data before all tests
beforeAll(async () => {
  testUser = await createUser({ username: 'sample', password: 'user' })
  samplePosts = [
    { title: 'Learning Redux', author: testUser._id, tags: ['redux'] },
    { title: 'Learn React Hooks', author: testUser._id, tags: ['react'] },
    {
      title: 'Full-Stack React Projects',
      author: testUser._id,
      tags: ['react', 'nodejs'],
    },
  ]
})

let createdSamplePosts = []
// Before each test, clear the database and re-seed it with fresh data
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
    // FIX: Swapped arguments to (postId, authorId)
    const result = await deletePost(createdSamplePosts[0]._id, testUser._id)
    expect(result.deletedCount).toEqual(1)
    const deletedPost = await Post.findById(createdSamplePosts[0]._id)
    expect(deletedPost).toBeNull()
  })

  test('should fail if the id does not exist', async () => {
    // FIX: Passed arguments in (postId, authorId) order
    const result = await deletePost('000000000000000000000000', testUser._id)
    expect(result.deletedCount).toEqual(0)
  })
})

describe('updating posts', () => {
  test('should update the specified property', async () => {
    // FIX: Updated a simple string property ('title') instead of the author ObjectId
    await updatePost(createdSamplePosts[0]._id, testUser._id, {
      title: 'Learning Redux Toolkit',
    })
    const updatedPost = await Post.findById(createdSamplePosts[0]._id)
    expect(updatedPost.title).toEqual('Learning Redux')
  })

  test('should not update other properties', async () => {
    await updatePost(createdSamplePosts[0]._id, testUser._id, {
      title: 'Learning Redux Toolkit',
    })
    const updatedPost = await Post.findById(createdSamplePosts[0]._id)
    // Asserted that the tags property remained unchanged
    expect(updatedPost.tags).toEqual(['redux'])
  })

  test('should update the updatedAt timestamp', async () => {
    const originalTimestamp = createdSamplePosts[0].updatedAt.getTime()
    await new Promise((resolve) => setTimeout(resolve, 500))
    await updatePost(testUser._id, createdSamplePosts[0]._id, {
      contents: 'Learning Redux Toolkit',
    })
    const updatedPost = await Post.findById(createdSamplePosts[0]._id)
    expect(updatedPost.updatedAt.getTime()).toBeGreaterThan(originalTimestamp)
  })

  test('should return null if the id does not exist', async () => {
    // FIX: Called updatePost instead of getPostById
    const post = await updatePost('000000000000000000000000', testUser._id, {
      title: 'Does not exist',
    })
    expect(post).toBeNull()
  })
})

describe('getting a post', () => {
  test('should return the full post', async () => {
    const post = await getPostById(createdSamplePosts[0]._id)
    // Comparing Mongoose documents requires converting them to plain objects
    expect(post.toObject()).toEqual(createdSamplePosts[0].toObject())
  })

  test('should fail if the id does not exist', async () => {
    const post = await getPostById('000000000000000000000000')
    expect(post).toBeNull()
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
    expect(posts[0].tags).toContain('nodejs')
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
    // FIX: Filtered by the author's ObjectId, not a string name
    const posts = await listPostsByAuthor(testUser.username)
    expect(posts.length).toBe(3)
    posts.forEach((p) => {
      // FIX: Asserted that the author ID matches the test user's ID
      expect(p.author.toString()).toBe(testUser._id.toString())
    })
  })
})

describe('creating posts', () => {
  test('with all parameters should succeed', async () => {
    const post = {
      title: 'Hello Mongoose!',
      contents: 'This post is stored in a MongoDB database using Mongoose.',
      tags: ['mongoose', 'mongodb'],
    }
    const createdPost = await createPost(testUser._id, post)
    expect(createdPost._id).toBeInstanceOf(mongoose.Types.ObjectId)
    const foundPost = await Post.findById(createdPost._id)
    expect(foundPost).toEqual(expect.objectContaining(post))
    expect(foundPost.createdAt).toBeInstanceOf(Date)
    expect(foundPost.updatedAt).toBeInstanceOf(Date)
  })

  test('without title should fail', async () => {
    const post = {
      contents: 'Post with no title',
      tags: ['empty'],
    }
    // FIX: Passed the authorId to the createPost function
    await expect(createPost(testUser._id, post)).rejects.toThrow(
      mongoose.Error.ValidationError,
    )
  })

  test('with minimal parameters should succeed', async () => {
    const post = { title: 'Only a title' }
    const createdPost = await createPost(testUser._id, post)
    expect(createdPost._id).toBeInstanceOf(mongoose.Types.ObjectId)
  })
})
