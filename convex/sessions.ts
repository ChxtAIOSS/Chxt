import { mutation } from "./_generated/server"
import { v } from "convex/values"

// Create or get session for anonymous users
export const getOrCreateSession = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("sessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first()
    
    if (existing) {
      // Update last active time
      await ctx.db.patch(existing._id, { lastActiveAt: Date.now() })
      return existing
    }
    
    // Create new session
    const sessionDoc = await ctx.db.insert("sessions", {
      sessionId: args.sessionId,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
    })
    
    return await ctx.db.get(sessionDoc)
  },
})

// Migrate session data to user when they sign up
export const migrateSessionToUser = mutation({
  args: { sessionId: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    // Update threads
    const threads = await ctx.db
      .query("threads")
      .withIndex("by_user", (q) => q.eq("userId", args.sessionId))
      .collect()
    
    for (const thread of threads) {
      await ctx.db.patch(thread._id, { userId: args.userId })
    }
    
    // Update messages
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_user_and_thread", (q) => q.eq("userId", args.sessionId))
      .collect()
    
    for (const message of messages) {
      await ctx.db.patch(message._id, { userId: args.userId })
    }
    
    // Mark user as migrated
    await ctx.db.insert("userConfig", {
      userId: args.userId,
      hasMigrated: true,
      preferences: {},
    })
  },
})