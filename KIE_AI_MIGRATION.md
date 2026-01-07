# Kie.ai 生图功能迁移说明

## 概述

本项目已从 `@google/genai` 迁移到使用 `Kie.ai` 的 `nano-banana-pro` 模型来实现AI生图功能。

## 主要更改

### 1. 数据库表结构

新增了 `image_generation_tasks` 表来存储生图任务信息：

```sql
CREATE TABLE "image_generation_tasks" (
  "id" text PRIMARY KEY NOT NULL,              -- 本地任务ID
  "user_id" text NOT NULL,                     -- 用户ID
  "original_image_url" text NOT NULL,          -- 原始图片URL
  "generated_image_url" text,                  -- 生成的图片URL
  "prompt" text NOT NULL,                      -- 生图提示词
  "style" text NOT NULL,                       -- 样式类型
  "status" text DEFAULT 'waiting' NOT NULL,     -- 任务状态
  "kie_task_id" text NOT NULL,                 -- Kie.ai的任务ID
  "credits_used" integer DEFAULT 20 NOT NULL,  -- 使用的积分
  "error_message" text,                        -- 错误信息
  "createdAt" timestamp DEFAULT now(),
  "updatedAt" timestamp DEFAULT now(),
  "completedAt" timestamp
);
```

### 2. 新增API端点

#### 2.1 创建生图任务
- **路径**: `POST /api/generate-image`
- **功能**: 创建Kie.ai生图任务，扣除20积分
- **参数**: `{ imageUrl, prompt, style }`

#### 2.2 查询任务状态
- **路径**: `GET /api/task-status/[taskId]`
- **功能**: 查询生图任务状态
- **返回**: 任务状态和结果图片

#### 2.3 Kie.ai回调处理
- **路径**: `POST /api/callback`
- **功能**: 处理Kie.ai的任务完成回调
- **处理**: 下载生成图片并保存到Vercel Blob

#### 2.4 获取用户生图任务
- **路径**: `GET /api/my-creations`
- **功能**: 获取用户的所有生图任务，包括正在生成中的任务

### 3. 服务层

#### 3.1 `src/lib/kieAiService.ts`
- `createImageGenerationTask()`: 创建Kie.ai生图任务
- `checkTaskStatus()`: 查询Kie.ai任务状态
- `updateTaskStatus()`: 更新本地任务状态
- `getUserImageGenerationTasks()`: 获取用户任务列表
- `deductCredits()`: 扣除用户积分

### 4. 前端更新

#### 4.1 组件更新

**`src/components/Hero.tsx`**:
- 移除了对 `@google/genai` 的依赖
- 新增任务创建和状态轮询逻辑
- 显示实时生成进度

**`src/app/page.tsx`**:
- 更新My Creations页面，支持显示任务状态
- 显示正在生成中的任务

**`src/app/billing/page.tsx`**:
- 重构为独立的billing页面
- 支持直接访问 `/billing` 路径

#### 4.2 类型定义更新

**`src/lib/types.ts`**:
```typescript
interface Creation {
  id: string;
  originalImage: string;
  generatedImage: string;
  style: string;
  date: string;
  status?: 'waiting' | 'processing' | 'success' | 'failed';
  prompt?: string;
  errorMessage?: string;
}
```

## 积分系统

### 积分扣减
- 每次生成图片扣除 **20积分**
- 积分在任务创建时立即扣除
- 交易记录保存在 `credit_transactions` 表中

### 积分查看
- 用户可在 `/billing` 页面查看：
  - 当前积分余额
  - 总购买积分
  - 总使用积分
  - 支付历史
  - 积分交易记录

## 任务流程

### 1. 用户上传图片
- 图片上传到Vercel Blob
- 返回图片URL

### 2. 创建生图任务
- 检查用户积分（需要>=20积分）
- 调用Kie.ai API创建任务
- 保存任务信息到本地数据库
- 扣除20积分

### 3. 任务处理
- 前端开始轮询任务状态
- 每3秒查询一次任务进度

### 4. 任务完成
- Kie.ai回调到 `/api/callback`
- 下载生成的图片
- 保存到Vercel Blob
- 更新任务状态为success
- 保存生成的图片URL

### 5. 用户查看
- 在首页查看生成结果
- 在My Creations页面查看所有任务
- 在Billing页面查看积分和交易记录

## 环境变量

确保以下环境变量已正确配置：

```env
# Kie.ai API
KIE_AI_API_KEY=your_api_key

# Base URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Vercel Blob
BLOB_READ_WRITE_TOKEN=your_blob_token
```

## 回调URL

Kie.ai的回调URL格式：
```
{NEXT_PUBLIC_BASE_URL}/api/callback
```

## 注意事项

1. **数据库迁移**: 需要运行 `npm run db:migrate` 来创建新表
2. **积分检查**: 用户需要有足够的积分才能创建生图任务
3. **异步处理**: 图片生成是异步的，需要轮询状态
4. **对象存储**: 生成的图片会自动保存到Vercel Blob

## 错误处理

- 积分不足：返回错误提示
- 网络错误：自动重试
- 生成失败：显示错误信息
- 回调失败：记录日志

## 性能优化

- 图片生成时间较长，建议在前端显示加载状态
- 可考虑添加WebSocket实时推送（未来改进）
- 可添加任务队列管理（未来改进）
