// convex/messages.ts
import { query, mutation } from "./_generated/server"
import { v } from "convex/values"

export const listByThread = query({
  args: { threadId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_thread_and_time", (q) => q.eq("threadId", args.threadId))
      .order("asc")
      .collect()
  },
})

// Public mutation to update message content and status
export const updateMessage = mutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
    status: v.union(v.literal("streaming"), v.literal("complete"), v.literal("error")),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      content: args.content,
      status: args.status,
      metadata: args.metadata,
    })
    
    // Update thread's lastMessageAt if completing
    if (args.status === 'complete') {
      const message = await ctx.db.get(args.messageId)
      if (message) {
        const thread = await ctx.db
          .query("threads")
          .filter(q => q.eq(q.field("_id"), message.threadId))
          .first()
        
        if (thread) {
          await ctx.db.patch(thread._id, {
            lastMessageAt: Date.now(),
          })
        }
      }
    }
  },
})

// FIXED: Keep the original message and just update content - no ID changes
export const modifyMessageAndPrepareRegeneration = mutation({
  args: {
    messageId: v.id("messages"),
    newContent: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the message to be modified
    const message = await ctx.db.get(args.messageId)
    if (!message) {
      throw new Error("Message not found")
    }
    
    // Update the message content in place - this preserves the original ID
    await ctx.db.patch(args.messageId, {
      content: args.newContent.trim(),
      status: 'complete',
      metadata: { 
        ...message.metadata,
        modified: true, 
        modifiedAt: Date.now() 
      },
    })
    
    // Get all messages in the thread after the update
    const allMessages = await ctx.db
      .query("messages")
      .withIndex("by_thread_and_time", (q) => q.eq("threadId", message.threadId))
      .order("asc")
      .collect()
    
    // Find the index of the modified message
    const modifiedMessageIndex = allMessages.findIndex(m => m._id === args.messageId)
    if (modifiedMessageIndex === -1) {
      throw new Error("Message not found in thread")
    }
    
    // Delete all subsequent messages (assistant responses after this message)
    const messagesToDelete = allMessages.slice(modifiedMessageIndex + 1)
    for (const msg of messagesToDelete) {
      await ctx.db.delete(msg._id)
    }
    
    // Get the updated message from the database
    const updatedMessage = await ctx.db.get(args.messageId)
    if (!updatedMessage) {
      throw new Error("Failed to retrieve updated message")
    }
    
    // Return the original message ID as string for regeneration, but keep the data consistent
    return {
      modifiedMessage: {
        _id: args.messageId, // Keep as original ID type
        _idString: args.messageId.toString(), // Provide string version for regeneration
        content: updatedMessage.content,
        role: updatedMessage.role,
        threadId: updatedMessage.threadId,
      },
      deletedCount: messagesToDelete.length,
    }
  },
})

// UPDATED: PUBLIC mutation - creates placeholder message and returns ID with metadata support
export const createPlaceholder = mutation({
  args: {
    threadId: v.string(),
    content: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    createdAt: v.number(),
    userId: v.string(),
    status: v.optional(v.union(v.literal("streaming"), v.literal("complete"))),
    model: v.optional(v.string()),
    metadata: v.optional(v.any()), // ADDED: Support for metadata
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("messages", {
      threadId: args.threadId,
      content: args.content,
      role: args.role,
      createdAt: args.createdAt,
      userId: args.userId,
      status: args.status || 'complete',
      model: args.model,
      metadata: args.metadata, // ADDED: Include metadata in database
    })
    return id
  },
})

// Delete messages from a specific message onwards (for regeneration and edit)
export const deleteMessagesFromPoint = mutation({
  args: {
    threadId: v.string(),
    fromMessageId: v.id("messages"),
    includeFromMessage: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Get the target message to find its creation time
    const fromMessage = await ctx.db.get(args.fromMessageId)
    if (!fromMessage || fromMessage.threadId !== args.threadId) {
      throw new Error("Message not found or doesn't belong to thread")
    }
    
    // Get all messages in the thread from this point onwards
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread_and_time", (q) => q.eq("threadId", args.threadId))
      .order("asc")
      .collect()
    
    // Find messages to delete (from the target message onwards)
    const startIndex = messages.findIndex(m => m._id === args.fromMessageId)
    if (startIndex === -1) return
    
    const messagesToDelete = messages.slice(
      args.includeFromMessage ? startIndex : startIndex + 1
    )
    
    // Delete all messages from that point
    for (const message of messagesToDelete) {
      await ctx.db.delete(message._id)
    }
    
    return messagesToDelete.length
  },
})