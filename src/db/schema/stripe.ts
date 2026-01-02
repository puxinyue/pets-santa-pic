import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { user } from "./auth/user";

// 支付历史表
export const paymentHistory = pgTable("payment_history", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id),
  stripePaymentIntentId: text("stripe_payment_intent_id"), // 可为空，在支付完成时通过 webhook 更新
  stripeSessionId: text("stripe_session_id").notNull(), // session ID 在创建时就有
  amount: integer("amount").notNull(), // 金额（分为单位）
  currency: text("currency").notNull().default("usd"),
  status: text("status").notNull(), // 'pending', 'completed', 'failed', 'refunded'
  credits: integer("credits").notNull(), // 购买的积分数量
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()),
});

// 积分使用记录表
export const creditTransactions = pgTable("credit_transactions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id),
  paymentId: text("payment_id").references(() => paymentHistory.id), // 关联的支付记录
  type: text("type").notNull(), // 'purchase', 'usage', 'refund'
  amount: integer("amount").notNull(), // 积分数量（正数为增加，负数为消费）
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow(),
});

// 用户积分余额表
export const userCredits = pgTable("user_credits", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique().references(() => user.id),
  balance: integer("balance").notNull().default(0), // 当前积分余额
  totalPurchased: integer("total_purchased").notNull().default(0), // 总购买积分
  totalUsed: integer("total_used").notNull().default(0), // 总使用积分
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()),
});

export type PaymentHistory = typeof paymentHistory.$inferSelect;
export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type UserCredits = typeof userCredits.$inferSelect;
