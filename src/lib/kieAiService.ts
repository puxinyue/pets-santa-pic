import { db } from '@/db';
import { imageGenerationTasks } from '@/db/schema/imageGeneration';
import { userCredits, creditTransactions } from '@/db/schema/stripe';
import { eq, and, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { put } from '@vercel/blob';

const API_KEY = process.env.KIE_AI_API_KEY;
const BASE_URL = 'https://api.kie.ai/api/v1';

interface CreateTaskRequest {
  model: string;
  input: {
    prompt: string;
    image_input: string[];
    aspect_ratio?: string;
    resolution?: string;
    output_format?: string;
  };
  callBackUrl?: string;
}

interface CreateTaskResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
  };
}

interface TaskStatusResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
    model: string;
    state: 'waiting' | 'processing' | 'success' | 'failed';
    param: string;
    resultJson?: string;
    failCode?: string;
    failMsg?: string;
    costTime?: number;
    completeTime?: number;
    createTime: number;
  };
}

// 创建生图任务
export async function createImageGenerationTask(
  userId: string,
  originalImageUrl: string,
  prompt: string,
  style: string
): Promise<{ taskId: string; localTaskId: string }> {
  if (!API_KEY) {
    throw new Error('KIE_AI_API_KEY is not configured');
  }

  // 检查用户积分余额
  const userCredit = await db
    .select()
    .from(userCredits)
    .where(eq(userCredits.userId, userId))
    .limit(1);

  if (!userCredit.length || userCredit[0].balance < 20) {
    throw new Error('Insufficient credits');
  }

  // 生成回调URL
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const callBackUrl = `${baseUrl}/api/callback`;

  // 创建Kie.ai任务请求
  const requestBody: CreateTaskRequest = {
    model: 'nano-banana-pro',
    input: {
      prompt: prompt,
      image_input: [originalImageUrl],
      aspect_ratio: '1:1',
      resolution: '1K',
      output_format: 'png'
    },
    callBackUrl
  };

  console.log('Creating Kie.ai task:', {
    model: requestBody.model,
    prompt: requestBody.input.prompt,
    imageInput: requestBody.input.image_input,
    callbackUrl: callBackUrl
  });

  // 调用Kie.ai API创建任务
  const response = await fetch(`${BASE_URL}/jobs/createTask`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  console.log('Kie.ai API response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Kie.ai API error response:', errorText);
    throw new Error(`Kie.ai API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data: CreateTaskResponse = await response.json();
  console.log('Kie.ai API response data:', data);

  if (data.code !== 200) {
    console.error('Kie.ai API returned error:', data.msg);
    throw new Error(`Kie.ai API error: ${data.msg}`);
  }

  // 在本地数据库中创建任务记录
  const localTaskId = randomUUID();
  const kieTaskId = data.data.taskId;

  await db.insert(imageGenerationTasks).values({
    id: localTaskId,
    userId,
    originalImageUrl,
    prompt,
    style,
    status: 'waiting',
    kieTaskId,
    creditsUsed: 20
  });

  // 扣除积分（先扣除，在任务成功时记录具体使用）
  await deductCredits(userId, 20, localTaskId);

  return { taskId: kieTaskId, localTaskId };
}

// 查询任务状态
export async function checkTaskStatus(kieTaskId: string): Promise<TaskStatusResponse['data']> {
  if (!API_KEY) {
    throw new Error('KIE_AI_API_KEY is not configured');
  }

  const response = await fetch(`${BASE_URL}/jobs/recordInfo?taskId=${kieTaskId}`, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`
    }
  });

  if (!response.ok) {
    throw new Error(`Kie.ai API error: ${response.statusText}`);
  }

  const data: TaskStatusResponse = await response.json();

  if (data.code !== 200) {
    throw new Error(`Kie.ai API error: ${data.msg}`);
  }

  return data.data;
}

// 更新任务状态和结果
export async function updateTaskStatus(
  localTaskId: string,
  status: 'success' | 'failed',
  generatedImageUrl?: string,
  errorMessage?: string
): Promise<void> {
  const updateData: any = {
    status,
    updatedAt: new Date()
  };

  if (status === 'success' && generatedImageUrl) {
    updateData.generatedImageUrl = generatedImageUrl;
    updateData.completedAt = new Date();
  } else if (status === 'failed' && errorMessage) {
    updateData.errorMessage = errorMessage;
    updateData.completedAt = new Date();
  }

  await db
    .update(imageGenerationTasks)
    .set(updateData)
    .where(eq(imageGenerationTasks.id, localTaskId));
}

// 扣除积分
async function deductCredits(userId: string, amount: number, taskId: string): Promise<void> {
  // 更新用户积分余额
  await db
    .update(userCredits)
    .set({
      balance: sql`${userCredits.balance} - ${amount}`,
      totalUsed: sql`${userCredits.totalUsed} + ${amount}`,
      updatedAt: new Date()
    })
    .where(eq(userCredits.userId, userId));

  // 记录积分交易
  await db.insert(creditTransactions).values({
    id: randomUUID(),
    userId,
    type: 'usage',
    amount: -amount,
    description: `Image generation task: ${taskId}`
  });
}

// 获取用户的生图任务
export async function getUserImageGenerationTasks(userId: string) {
  return await db
    .select()
    .from(imageGenerationTasks)
    .where(eq(imageGenerationTasks.userId, userId))
    .orderBy(imageGenerationTasks.createdAt);
}
