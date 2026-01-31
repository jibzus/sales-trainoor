import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createTag = mutation({
  args: {
    name: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    return await ctx.db.insert("tags", {
      name: args.name,
      color: args.color,
      userId: identity.subject,
    });
  },
});

export const listUserTags = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    return await ctx.db
      .query("tags")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});

export const addTagToTranscription = mutation({
  args: {
    transcriptionId: v.id("transcriptions"),
    tagId: v.id("tags"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Verify ownership of both transcription and tag
    const transcription = await ctx.db.get(args.transcriptionId);
    const tag = await ctx.db.get(args.tagId);

    if (!transcription || transcription.userId !== identity.subject) {
      throw new Error("Transcription not found or unauthorized");
    }
    if (!tag || tag.userId !== identity.subject) {
      throw new Error("Tag not found or unauthorized");
    }

    // Check if already tagged
    const existing = await ctx.db
      .query("transcriptionTags")
      .withIndex("by_transcription", (q) =>
        q.eq("transcriptionId", args.transcriptionId)
      )
      .filter((q) => q.eq(q.field("tagId"), args.tagId))
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("transcriptionTags", {
      transcriptionId: args.transcriptionId,
      tagId: args.tagId,
      userId: identity.subject,
    });
  },
});

export const removeTagFromTranscription = mutation({
  args: {
    transcriptionId: v.id("transcriptions"),
    tagId: v.id("tags"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const link = await ctx.db
      .query("transcriptionTags")
      .withIndex("by_transcription", (q) =>
        q.eq("transcriptionId", args.transcriptionId)
      )
      .filter((q) => q.eq(q.field("tagId"), args.tagId))
      .first();

    if (link && link.userId === identity.subject) {
      await ctx.db.delete(link._id);
    }
  },
});

export const deleteTag = mutation({
  args: { id: v.id("tags") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const tag = await ctx.db.get(args.id);
    if (!tag || tag.userId !== identity.subject) {
      throw new Error("Tag not found or unauthorized");
    }

    // Delete all transcription-tag links
    const links = await ctx.db
      .query("transcriptionTags")
      .withIndex("by_tag", (q) => q.eq("tagId", args.id))
      .collect();

    for (const link of links) {
      await ctx.db.delete(link._id);
    }

    await ctx.db.delete(args.id);
  },
});

export const getTagsForTranscription = query({
  args: { transcriptionId: v.id("transcriptions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const links = await ctx.db
      .query("transcriptionTags")
      .withIndex("by_transcription", (q) =>
        q.eq("transcriptionId", args.transcriptionId)
      )
      .collect();

    const tags = await Promise.all(
      links.map(async (link) => {
        const tag = await ctx.db.get(link.tagId);
        return tag;
      })
    );

    return tags.filter(Boolean);
  },
});
