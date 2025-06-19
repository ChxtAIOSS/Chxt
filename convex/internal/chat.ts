import { internalMutation } from "../_generated/server"
import { v } from "convex/values"

export const appendChunk = internalMutation({
  args: {
    messageId: v.id("messages"),
    chunk: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId)
    
    if (!message || message.status !== 'streaming') return
    
    await ctx.db.patch(args.messageId, {
      content: message.content + args.chunk,
    })
  },
})

export const finishMessage = internalMutation({
  args: {
    messageId: v.id("messages"),
    finalContent: v.string(),
    tokens: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId)
    
    if (!message) return
    
    await ctx.db.patch(args.messageId, {
      content: args.finalContent,
      status: 'complete',
      metadata: { tokens: args.tokens },
    })
    
    // Update thread's lastMessageAt
    const thread = await ctx.db
      .query("threads")
      .filter(q => q.eq(q.field("_id"), message.threadId))
      .first()
    
    if (thread) {
      await ctx.db.patch(thread._id, {
        lastMessageAt: Date.now(),
      })
    }
  },
})

export const updateThreadTitle = internalMutation({
  args: {
    threadId: v.id("threads"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId)
    
    if (thread && thread.title === 'New Chat') {
      await ctx.db.patch(args.threadId, { title: args.title })
    }
  },
})