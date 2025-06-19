// convex/schema.ts
import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  threads: defineTable({
    // User-generated ID for optimistic updates
    userId: v.string(),
    title: v.string(),
    model: v.optional(v.string()),
    lastMessageAt: v.number(),
    createdAt: v.number(),
    isDeleted: v.optional(v.number()), // 0 or 1 for soft delete
    
    // Branch/fork fields
    parentThreadId: v.optional(v.id("threads")), // Reference to parent thread if this is a branch
    forkSourceMessageId: v.optional(v.id("messages")), // The message where the fork occurred
    forkDepth: v.optional(v.number()), // How deep in the fork tree this thread is
    forkCount: v.optional(v.number()), // Number of forks from this thread
  })
    .index("by_user", ["userId"])
    .index("by_user_and_time", ["userId", "lastMessageAt"])
    .index("by_user_and_deleted", ["userId", "isDeleted"])
    .index("by_parent_thread", ["parentThreadId"]), // New index for finding branches
  
  messages: defineTable({
    // User-generated ID
    userId: v.string(),
    threadId: v.string(),
    content: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    model: v.optional(v.string()),
    createdAt: v.number(),
    // For streaming updates
    status: v.optional(v.union(v.literal("streaming"), v.literal("complete"), v.literal("error"))),
    metadata: v.optional(v.any()),
  })
    .index("by_thread", ["threadId"])
    .index("by_thread_and_time", ["threadId", "createdAt"])
    .index("by_user_and_thread", ["userId", "threadId"]),
  
  userConfig: defineTable({
    userId: v.string(),
    hasMigrated: v.optional(v.boolean()),
    preferences: v.optional(v.any()),
    
    // Subscription fields
    subscriptionTier: v.optional(v.union(
      v.literal("free"),
      v.literal("pro"),
      v.literal("enterprise")
    )),
    subscriptionStatus: v.optional(v.union(
      v.literal("active"),
      v.literal("canceled"),
      v.literal("past_due"),
      v.literal("trialing")
    )),
    subscriptionStartDate: v.optional(v.number()),
    subscriptionEndDate: v.optional(v.number()),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    
    // Usage tracking
    monthlyTokensUsed: v.optional(v.number()),
    monthlyTokenLimit: v.optional(v.number()),
    lastUsageReset: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_stripe_customer", ["stripeCustomerId"]),
  
  // For signed-out users
  sessions: defineTable({
    sessionId: v.string(),
    createdAt: v.number(),
    lastActiveAt: v.number(),
  })
    .index("by_session", ["sessionId"]),
  
  // Platform API keys (encrypted)
  platformApiKeys: defineTable({
    provider: v.string(),
    encryptedKey: v.string(),
    iv: v.string(),
    isActive: v.boolean(),
    lastRotated: v.number(),
    environment: v.union(v.literal("production"), v.literal("development")),
  })
    .index("by_provider", ["provider", "environment"]),
})