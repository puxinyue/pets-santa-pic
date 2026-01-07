import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/get-session';
import { db } from '@/db';
import { imageGenerationTasks } from '@/db/schema/imageGeneration';
import { checkTaskStatus } from '@/lib/kieAiService';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId } = await params;

    // 查询本地任务记录
    const localTask = await db
      .select()
      .from(imageGenerationTasks)
      .where(eq(imageGenerationTasks.id, taskId))
      .limit(1);

    if (!localTask.length) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const task = localTask[0];

    // 检查任务是否属于当前用户
    if (task.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 如果任务已完成，直接返回本地记录
    if (task.status === 'success' || task.status === 'failed') {
      return NextResponse.json({
        success: true,
        status: task.status,
        task: {
          id: task.id,
          originalImageUrl: task.originalImageUrl,
          generatedImageUrl: task.generatedImageUrl,
          style: task.style,
          prompt: task.prompt,
          status: task.status,
          errorMessage: task.errorMessage,
          createdAt: task.createdAt,
          completedAt: task.completedAt
        }
      });
    }

    // 查询Kie.ai的任务状态
    const kieTaskStatus = await checkTaskStatus(task.kieTaskId);

    console.log('Kie.ai task status:', {
      kieTaskId: task.kieTaskId,
      localStatus: task.status,
      kieStatus: kieTaskStatus.state,
      hasResult: !!kieTaskStatus.resultJson
    });

    // 如果Kie.ai的状态改变了，更新本地数据库
    if (kieTaskStatus.state !== task.status) {
      console.log('Updating local task status from', task.status, 'to', kieTaskStatus.state);

      let updateData: any = {
        status: kieTaskStatus.state,
        updatedAt: new Date()
      };

      if (kieTaskStatus.state === 'success') {
        // 如果任务成功，尝试从结果中获取图片URL
        if (kieTaskStatus.resultJson) {
          try {
            const result = JSON.parse(kieTaskStatus.resultJson);
            if (result.resultUrls && result.resultUrls.length > 0) {
              const imageUrl = result.resultUrls[0];
              console.log('Found generated image URL:', imageUrl);

              // 下载并保存图片
              try {
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                const fileName = `generated-${task.id}-${Date.now()}.png`;

                const { put } = await import('@vercel/blob');
                const { url } = await put(fileName, blob, {
                  access: 'public',
                  token: process.env.BLOB_READ_WRITE_TOKEN,
                });

                updateData.generatedImageUrl = url;
                console.log('Saved generated image to blob:', url);
              } catch (blobError) {
                console.error('Error saving to blob:', blobError);
                // 即使保存失败，也记录图片URL
                updateData.generatedImageUrl = imageUrl;
              }
            }
          } catch (parseError) {
            console.error('Error parsing result JSON:', parseError);
          }
        }
        updateData.completedAt = new Date();
      } else if (kieTaskStatus.state === 'failed') {
        updateData.errorMessage = kieTaskStatus.failMsg || 'Task failed';
        updateData.completedAt = new Date();
      }

      // 更新数据库
      await db
        .update(imageGenerationTasks)
        .set(updateData)
        .where(eq(imageGenerationTasks.id, task.id));

      console.log('Updated local task status');
    }

    // 重新查询更新后的任务
    const updatedTask = await db
      .select()
      .from(imageGenerationTasks)
      .where(eq(imageGenerationTasks.id, taskId))
      .limit(1);

    const finalTask = updatedTask[0];

    return NextResponse.json({
      success: true,
      status: finalTask.status,
      task: {
        id: finalTask.id,
        originalImageUrl: finalTask.originalImageUrl,
        generatedImageUrl: finalTask.generatedImageUrl,
        style: finalTask.style,
        prompt: finalTask.prompt,
        status: finalTask.status,
        errorMessage: finalTask.errorMessage,
        createdAt: finalTask.createdAt,
        completedAt: finalTask.completedAt
      }
    });
  } catch (error) {
    console.error('Error checking task status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
