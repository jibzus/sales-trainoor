import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createTranscription = mutation({
  args: {
    audioFileId: v.optional(v.id("audiofiles")),
    transcriptionText: v.string(),
    provider: v.string(),
    diarizationEnabled: v.boolean(),
    status: v.string(),
    fileName: v.optional(v.string()),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    return await ctx.db.insert("transcriptions", {
      userId: identity.subject,
      audioFileId: args.audioFileId,
      transcriptionText: args.transcriptionText,
      provider: args.provider,
      diarizationEnabled: args.diarizationEnabled,
      status: args.status,
      fileName: args.fileName,
      language: args.language,
      createdAt: Date.now(),
    });
  },
});

export const updateTranscriptionResult = mutation({
  args: {
    id: v.id("transcriptions"),
    transcriptionText: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const transcription = await ctx.db.get(args.id);
    if (!transcription || transcription.userId !== identity.subject) {
      throw new Error("Transcription not found or unauthorized");
    }

    await ctx.db.patch(args.id, {
      transcriptionText: args.transcriptionText,
      status: args.status,
    });
  },
});

export const listUserTranscriptions = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    return await ctx.db
      .query("transcriptions")
      .withIndex("by_user_created", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();
  },
});

export const getTranscriptionById = query({
  args: { id: v.id("transcriptions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const transcription = await ctx.db.get(args.id);
    if (!transcription || transcription.userId !== identity.subject) {
      return null;
    }

    return transcription;
  },
});

export const searchTranscriptions = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    if (!args.query.trim()) {
      return await ctx.db
        .query("transcriptions")
        .withIndex("by_user_created", (q) => q.eq("userId", identity.subject))
        .order("desc")
        .collect();
    }

    return await ctx.db
      .query("transcriptions")
      .withSearchIndex("search_text", (q) =>
        q.search("transcriptionText", args.query).eq("userId", identity.subject)
      )
      .collect();
  },
});

export const deleteTranscription = mutation({
  args: { id: v.id("transcriptions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const transcription = await ctx.db.get(args.id);
    if (!transcription || transcription.userId !== identity.subject) {
      throw new Error("Transcription not found or unauthorized");
    }

    // Delete associated tags
    const tags = await ctx.db
      .query("transcriptionTags")
      .withIndex("by_transcription", (q) => q.eq("transcriptionId", args.id))
      .collect();

    for (const tag of tags) {
      await ctx.db.delete(tag._id);
    }

    await ctx.db.delete(args.id);
  },
});

export const getTranscriptionsByIds = query({
  args: { ids: v.array(v.id("transcriptions")) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const results = await Promise.all(
      args.ids.map(async (id) => {
        const transcription = await ctx.db.get(id);
        if (transcription && transcription.userId === identity.subject) {
          return transcription;
        }
        return null;
      })
    );

    return results.filter(Boolean);
  },
});
