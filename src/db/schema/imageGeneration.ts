import { pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { user } from "./auth/user";

// 生图任务表
export const imageGenerationTasks = pgTable("image_generation_tasks", {
  id: text("id").primaryKey(), // 任务ID，对应Kie.ai的taskId
  userId: text("user_id").notNull().references(() => user.id),
  originalImageUrl: text("original_image_url").notNull(), // 用户上传的原始图片URL
  generatedImageUrl: text("generated_image_url"), // 生成的图片URL（任务完成后填充）
  prompt: text("prompt").notNull(), // 生图提示词
  style: text("style").notNull(), // 样式类型（如Santa、Elf等）
  status: text("status").notNull().default("waiting"), // 任务状态：waiting, processing, success, failed
  kieTaskId: text("kie_task_id").notNull(), // Kie.ai返回的任务ID
  creditsUsed: integer("credits_used").notNull().default(20), // 使用的积分数量
  errorMessage: text("error_message"), // 错误信息（任务失败时填充）
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()),
  completedAt: timestamp("completedAt"), // 任务完成时间
});

export type ImageGenerationTask = typeof imageGenerationTasks.$inferSelect;
