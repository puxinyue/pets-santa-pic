import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { imageGenerationTasks } from '@/db/schema/imageGeneration';
import { updateTaskStatus } from '@/lib/kieAiService';
import { eq } from 'drizzle-orm';
import { put } from '@vercel/blob';

interface CallbackData {
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
}

export async function POST(request: NextRequest) {
  try {
    const callbackData: CallbackData = await request.json();

    console.log('Callback received from Kie.ai:', {
      taskId: callbackData.taskId,
      state: callbackData.state,
      hasResultJson: !!callbackData.resultJson,
      resultJson: callbackData.resultJson,
      completeTime: callbackData.completeTime
    });

    // 从Kie.ai的任务ID查询本地任务记录
    const localTask = await db
      .select()
      .from(imageGenerationTasks)
      .where(eq(imageGenerationTasks.kieTaskId, callbackData.taskId))
      .limit(1);

    if (!localTask.length) {
      console.error('Task not found for Kie.ai task ID:', callbackData.taskId);
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    const task = localTask[0];
    console.log('Found local task:', {
      taskId: task.id,
      status: task.status
    });

    // 如果任务已完成，不需要重复处理
    if (task.status === 'success' || task.status === 'failed') {
      console.log('Task already processed, skipping');
      return NextResponse.json({ success: true, message: 'Task already processed' });
    }

    // 根据状态更新任务
    if (callbackData.state === 'success') {
      console.log('Processing success state...');
      // 解析结果
      let generatedImageUrl: string | undefined;

      if (callbackData.resultJson) {
        try {
          const result = JSON.parse(callbackData.resultJson);
          console.log('Parsed result JSON:', result);

          if (result.resultUrls && result.resultUrls.length > 0) {
            const originalImageUrl = result.resultUrls[0];
            console.log('Original image URL from Kie.ai:', originalImageUrl);

            // 下载并保存图片到 Vercel Blob
            try {
              const response = await fetch(originalImageUrl);
              if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
              }

              const blob = await response.blob();
              console.log('Downloaded image blob:', {
                size: blob.size,
                type: blob.type
              });

              const fileName = `generated-${task.id}-${Date.now()}.png`;
              console.log('Saving to blob with filename:', fileName);

              const { url } = await put(fileName, blob, {
                access: 'public',
                token: process.env.BLOB_READ_WRITE_TOKEN,
              });

              generatedImageUrl = url;
              console.log('Successfully saved to blob:', url);
            } catch (imageError) {
              console.error('Error downloading/saving image:', imageError);
              // 即使下载失败，也使用原始URL
              generatedImageUrl = originalImageUrl;
            }
          } else {
            console.error('No resultUrls in result JSON');
          }
        } catch (error) {
          console.error('Error processing result JSON:', error);
        }
      } else {
        console.error('No resultJson in callback data');
      }

      if (generatedImageUrl) {
        console.log('Updating task with success and image URL');
        await updateTaskStatus(task.id, 'success', generatedImageUrl);
        console.log('Task updated successfully');
      } else {
        console.error('No generated image URL found, marking as failed');
        await updateTaskStatus(task.id, 'failed', undefined, 'No generated image URL');
      }
    } else if (callbackData.state === 'failed') {
      console.log('Processing failed state:', callbackData.failMsg);
      await updateTaskStatus(
        task.id,
        'failed',
        undefined,
        callbackData.failMsg || 'Task failed'
      );
    } else {
      console.log('Callback state is not success or failed:', callbackData.state);
    }

    return NextResponse.json({ success: true, message: 'Callback processed' });
  } catch (error) {
    console.error('Error processing callback:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
