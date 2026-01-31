import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  audiofiles: defineTable({
    userId: v.string(),
    storageId: v.id("_storage"),
    fileUrl: v.string(),
    fileName: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_created", ["userId", "createdAt"]),

  transcriptions: defineTable({
    userId: v.string(),
    audioFileId: v.optional(v.id("audiofiles")),
    transcriptionText: v.string(),
    provider: v.string(),
    diarizationEnabled: v.boolean(),
    status: v.string(),
    fileName: v.optional(v.string()),
    language: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_audiofile", ["audioFileId"])
    .searchIndex("search_text", {
      searchField: "transcriptionText",
      filterFields: ["userId"],
    }),

  tags: defineTable({
    name: v.string(),
    userId: v.string(),
    color: v.string(),
  }).index("by_user", ["userId"]),

  transcriptionTags: defineTable({
    transcriptionId: v.id("transcriptions"),
    tagId: v.id("tags"),
    userId: v.string(),
  })
    .index("by_transcription", ["transcriptionId"])
    .index("by_tag", ["tagId"])
    .index("by_user", ["userId"]),

  callFeedback: defineTable({
    userId: v.string(),
    transcriptionId: v.id("transcriptions"),
    feedback: v.string(), // JSON string of SalesFeedback
    overallScore: v.number(),
    model: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_transcription", ["transcriptionId"]),

  userSettings: defineTable({
    userId: v.string(),
    customPrompt: v.optional(v.string()),
    defaultProvider: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
});
