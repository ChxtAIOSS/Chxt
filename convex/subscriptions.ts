// convex/subscriptions.ts
import { query, mutation } from "./_generated/server"
import { v } from "convex/values"

export const getUserSubscription = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null
    
    const userConfig = await ctx.db
      .query("userConfig")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first()
    
    if (!userConfig) {
      // Return default values for new users - don't try to insert in a query
      return {
        tier: "free",
        status: "active",
        hasSubscription: false,
        tokensUsed: 0,
        tokenLimit: 100000,
      }
    }
    
    // Check if monthly usage needs reset
    const now = Date.now()
    const lastReset = userConfig.lastUsageReset || 0
    const daysSinceReset = (now - lastReset) / (1000 * 60 * 60 * 24)
    
    const needsReset = daysSinceReset >= 30
    
    return {
      tier: userConfig.subscriptionTier || "free",
      status: userConfig.subscriptionStatus || "active",
      hasSubscription: userConfig.subscriptionTier !== "free",
      tokensUsed: needsReset ? 0 : (userConfig.monthlyTokensUsed || 0),
      tokenLimit: userConfig.monthlyTokenLimit || 100000,
      subscriptionEndDate: userConfig.subscriptionEndDate,
      needsUsageReset: needsReset,
    }
  },
})

// Separate mutation to initialize user config
export const initializeUserConfig = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")
    
    const existing = await ctx.db
      .query("userConfig")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first()
    
    if (!existing) {
      await ctx.db.insert("userConfig", {
        userId: identity.subject,
        subscriptionTier: "free",
        subscriptionStatus: "active",
        monthlyTokensUsed: 0,
        monthlyTokenLimit: 100000,
        lastUsageReset: Date.now(),
        preferences: {},
      })
    }
  },
})

// Separate mutation to reset monthly usage
export const resetMonthlyUsage = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")
    
    const userConfig = await ctx.db
      .query("userConfig")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first()
    
    if (userConfig) {
      await ctx.db.patch(userConfig._id, {
        monthlyTokensUsed: 0,
        lastUsageReset: Date.now(),
      })
    }
  },
})

export const updateSubscription = mutation({
  args: {
    tier: v.union(v.literal("free"), v.literal("pro"), v.literal("enterprise")),
    status: v.union(
      v.literal("active"),
      v.literal("canceled"),
      v.literal("past_due"),
      v.literal("trialing")
    ),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    subscriptionEndDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")
    
    const userConfig = await ctx.db
      .query("userConfig")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first()
    
    const tokenLimits = {
      free: 100000,      // 100k tokens
      pro: 5000000,      // 5M tokens
      enterprise: -1,    // Unlimited
    }
    
    if (userConfig) {
      await ctx.db.patch(userConfig._id, {
        subscriptionTier: args.tier,
        subscriptionStatus: args.status,
        stripeCustomerId: args.stripeCustomerId,
        stripeSubscriptionId: args.stripeSubscriptionId,
        subscriptionStartDate: Date.now(),
        subscriptionEndDate: args.subscriptionEndDate,
        monthlyTokenLimit: tokenLimits[args.tier],
      })
    } else {
      await ctx.db.insert("userConfig", {
        userId: identity.subject,
        subscriptionTier: args.tier,
        subscriptionStatus: args.status,
        stripeCustomerId: args.stripeCustomerId,
        stripeSubscriptionId: args.stripeSubscriptionId,
        subscriptionStartDate: Date.now(),
        subscriptionEndDate: args.subscriptionEndDate,
        monthlyTokensUsed: 0,
        monthlyTokenLimit: tokenLimits[args.tier],
        lastUsageReset: Date.now(),
        preferences: {},
      })
    }
  },
})

export const trackUsage = mutation({
  args: {
    tokensUsed: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return
    
    const userConfig = await ctx.db
      .query("userConfig")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first()
    
    if (userConfig) {
      await ctx.db.patch(userConfig._id, {
        monthlyTokensUsed: (userConfig.monthlyTokensUsed || 0) + args.tokensUsed,
      })
    }
  },
})