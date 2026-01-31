import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getUserSettings = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    return await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();
  },
});

export const updateUserSettings = mutation({
  args: {
    customPrompt: v.optional(v.string()),
    defaultProvider: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();

    const now = Date.now();

    if (existing) {
      // Update existing settings
      await ctx.db.patch(existing._id, {
        customPrompt: args.customPrompt,
        defaultProvider: args.defaultProvider,
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Create new settings
      return await ctx.db.insert("userSettings", {
        userId: identity.subject,
        customPrompt: args.customPrompt,
        defaultProvider: args.defaultProvider,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

export const getCustomPrompt = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();

    return settings?.customPrompt ?? null;
  },
});
