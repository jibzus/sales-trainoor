import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createFeedback = mutation({
  args: {
    transcriptionId: v.id("transcriptions"),
    feedback: v.string(),
    overallScore: v.number(),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Verify the transcription exists and belongs to the user
    const transcription = await ctx.db.get(args.transcriptionId);
    if (!transcription || transcription.userId !== identity.subject) {
      throw new Error("Transcription not found or unauthorized");
    }

    return await ctx.db.insert("callFeedback", {
      userId: identity.subject,
      transcriptionId: args.transcriptionId,
      feedback: args.feedback,
      overallScore: args.overallScore,
      model: args.model,
      createdAt: Date.now(),
    });
  },
});

export const updateFeedback = mutation({
  args: {
    id: v.id("callFeedback"),
    feedback: v.optional(v.string()),
    overallScore: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== identity.subject) {
      throw new Error("Feedback not found or unauthorized");
    }

    const updates: Partial<{ feedback: string; overallScore: number }> = {};
    if (args.feedback !== undefined) {
      updates.feedback = args.feedback;
    }
    if (args.overallScore !== undefined) {
      updates.overallScore = args.overallScore;
    }

    await ctx.db.patch(args.id, updates);
  },
});

export const getFeedbackByTranscription = query({
  args: { transcriptionId: v.id("transcriptions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const feedback = await ctx.db
      .query("callFeedback")
      .withIndex("by_transcription", (q) =>
        q.eq("transcriptionId", args.transcriptionId)
      )
      .first();

    if (!feedback || feedback.userId !== identity.subject) {
      return null;
    }

    return feedback;
  },
});

export const listUserFeedback = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    return await ctx.db
      .query("callFeedback")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();
  },
});

export const deleteFeedback = mutation({
  args: { id: v.id("callFeedback") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const feedback = await ctx.db.get(args.id);
    if (!feedback || feedback.userId !== identity.subject) {
      throw new Error("Feedback not found or unauthorized");
    }

    await ctx.db.delete(args.id);
  },
});
