// convex/threads.ts
import { query, mutation } from "./_generated/server"
import { v } from "convex/values"
import { Id } from "./_generated/dataModel"

export const list = query({
  args: {
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get userId from auth or use sessionId for anonymous users
    const identity = await ctx.auth.getUserIdentity()
    const userId = identity?.subject || args.sessionId
    
    if (!userId) return []
    
    return await ctx.db
      .query("threads")
      .withIndex("by_user_and_deleted", (q) => 
        q.eq("userId", userId).eq("isDeleted", undefined)
      )
      .order("desc")
      .take(50)
  },
})

export const create = mutation({
  args: {
    userId: v.string(),
    title: v.string(),
    createdAt: v.number(),
    lastMessageAt: v.number(),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("threads", {
      userId: args.userId,
      title: args.title,
      createdAt: args.createdAt,
      lastMessageAt: args.lastMessageAt,
      model: args.model || 'claude-3.5-sonnet',
    })
  },
})

export const get = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    try {
      return await ctx.db.get(args.id as Id<"threads">)
    } catch {
      return null
    }
  },
})

export const updateTitle = mutation({
  args: {
    threadId: v.id("threads"),
    title: v.string(),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId)
    if (!thread) throw new Error("Thread not found")
    
    // Check if user owns this thread
    const identity = await ctx.auth.getUserIdentity()
    const userId = identity?.subject || args.sessionId
    
    if (thread.userId !== userId) {
      throw new Error("Unauthorized")
    }
    
    await ctx.db.patch(args.threadId, { title: args.title })
  },
})

export const deleteThread = mutation({
  args: {
    threadId: v.id("threads"),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId)
    if (!thread) throw new Error("Thread not found")
    
    // Check if user owns this thread
    const identity = await ctx.auth.getUserIdentity()
    const userId = identity?.subject || args.sessionId
    
    if (thread.userId !== userId) {
      throw new Error("Unauthorized")
    }
    
    // Soft delete by setting isDeleted timestamp
    await ctx.db.patch(args.threadId, { isDeleted: Date.now() })
    
    // Also delete all messages in the thread
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId as string))
      .collect()
    
    for (const message of messages) {
      await ctx.db.delete(message._id)
    }
  },
})

// Add this public mutation for auto-naming
export const autoUpdateTitle = mutation({
  args: {
    threadId: v.id("threads"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId)
    
    // Only update if it's still "New Chat"
    if (thread && thread.title === 'New Chat') {
      await ctx.db.patch(args.threadId, { title: args.title })
    }
  },
})

// New branch functions
export const createBranch = mutation({
  args: {
    threadId: v.id("threads"),
    messageId: v.id("messages"),
    newContent: v.string(),
    model: v.string(),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get the original thread
    const originalThread = await ctx.db.get(args.threadId)
    if (!originalThread) throw new Error("Thread not found")
    
    // Check authorization
    const identity = await ctx.auth.getUserIdentity()
    const userId = identity?.subject || args.sessionId
    
    if (originalThread.userId !== userId) {
      throw new Error("Unauthorized")
    }
    
    // Get the message we're branching from
    const branchPoint = await ctx.db.get(args.messageId)
    if (!branchPoint || branchPoint.threadId !== args.threadId) {
      throw new Error("Invalid branch point")
    }
    
    // Create a new thread for the branch
    const branchThreadId = await ctx.db.insert("threads", {
      userId: originalThread.userId,
      title: `${originalThread.title} (Branch)`,
      createdAt: Date.now(),
      lastMessageAt: Date.now(),
      model: args.model,
      parentThreadId: args.threadId,
      forkSourceMessageId: args.messageId,
      forkDepth: (originalThread.forkDepth || 0) + 1,
      forkCount: 0,
    })
    
    // Update the original thread's fork count
    await ctx.db.patch(args.threadId, {
      forkCount: (originalThread.forkCount || 0) + 1,
    })
    
    // Copy messages up to the branch point
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread_and_time", (q) => q.eq("threadId", args.threadId as string))
      .order("asc")
      .collect()
    
    for (const msg of messages) {
      if (msg.createdAt <= branchPoint.createdAt) {
        await ctx.db.insert("messages", {
          userId: msg.userId,
          threadId: branchThreadId as string,
          content: msg.content,
          role: msg.role,
          model: msg.model,
          createdAt: msg.createdAt,
          status: 'complete',
          metadata: msg.metadata,
        })
      }
    }
    
    // Add the new branch message
    await ctx.db.insert("messages", {
      userId: originalThread.userId,
      threadId: branchThreadId as string,
      content: args.newContent,
      role: 'user',
      createdAt: Date.now(),
      status: 'complete',
    })
    
    return branchThreadId
  },
})

// NEW: Clone to branch function
export const cloneToBranch = mutation({
  args: {
    threadId: v.id("threads"),
    messageId: v.id("messages"),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get the original thread
    const originalThread = await ctx.db.get(args.threadId)
    if (!originalThread) throw new Error("Thread not found")
    
    // Check authorization
    const identity = await ctx.auth.getUserIdentity()
    const userId = identity?.subject || args.sessionId
    
    if (originalThread.userId !== userId) {
      throw new Error("Unauthorized")
    }
    
    // Get the message we're branching from
    const branchPoint = await ctx.db.get(args.messageId)
    if (!branchPoint || branchPoint.threadId !== args.threadId) {
      throw new Error("Invalid branch point")
    }
    
    // Get all existing branches to determine the next branch number
    const existingBranches = await ctx.db
      .query("threads")
      .withIndex("by_parent_thread", (q) => q.eq("parentThreadId", args.threadId))
      .collect()
    
    const branchNumber = existingBranches.length + 1
    
    // Create a new thread for the branch
    const branchThreadId = await ctx.db.insert("threads", {
      userId: originalThread.userId,
      title: `🌿 ${originalThread.title} (${branchNumber})`,
      createdAt: Date.now(),
      lastMessageAt: Date.now(),
      model: originalThread.model,
      parentThreadId: args.threadId,
      forkSourceMessageId: args.messageId,
      forkDepth: (originalThread.forkDepth || 0) + 1,
      forkCount: 0,
    })
    
    // Update the original thread's fork count
    await ctx.db.patch(args.threadId, {
      forkCount: (originalThread.forkCount || 0) + 1,
    })
    
    // Get messages up to and including the branch point
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread_and_time", (q) => q.eq("threadId", args.threadId as string))
      .order("asc")
      .collect()
    
    // Copy messages up to and including the branch point
    for (const msg of messages) {
      if (msg.createdAt <= branchPoint.createdAt) {
        await ctx.db.insert("messages", {
          userId: msg.userId,
          threadId: branchThreadId as string,
          content: msg.content,
          role: msg.role,
          model: msg.model,
          createdAt: msg.createdAt,
          status: 'complete',
          metadata: { ...msg.metadata, clonedFrom: msg._id },
        })
      }
    }
    
    return {
      branchThreadId: branchThreadId as string,
      branchTitle: `🌿 ${originalThread.title} (${branchNumber})`,
      messageCount: messages.filter(m => m.createdAt <= branchPoint.createdAt).length
    }
  },
})

export const getBranches = query({
  args: {
    threadId: v.id("threads"),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId)
    if (!thread) return []
    
    // Check authorization
    const identity = await ctx.auth.getUserIdentity()
    const userId = identity?.subject || args.sessionId
    
    if (thread.userId !== userId) {
      return []
    }
    
    // Get threads that are branches of this one
    const branches = await ctx.db
      .query("threads")
      .withIndex("by_parent_thread", (q) => q.eq("parentThreadId", args.threadId))
      .collect()
    
    return branches
  },
})

export const getThreadWithBranchInfo = query({
  args: {
    threadId: v.id("threads"),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId)
    if (!thread) return null
    
    // Check authorization
    const identity = await ctx.auth.getUserIdentity()
    const userId = identity?.subject || args.sessionId
    
    if (thread.userId !== userId) {
      return null
    }
    
    // Get branches of this thread
    const branches = await ctx.db
      .query("threads")
      .withIndex("by_parent_thread", (q) => q.eq("parentThreadId", args.threadId))
      .collect()
    
    // Get parent thread if this is a branch
    const parentThread = thread.parentThreadId 
      ? await ctx.db.get(thread.parentThreadId)
      : null
    
    return {
      ...thread,
      branches,
      parentThread,
    }
  },
})