import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/get-session';
import { db } from '@/db';
import { createImageGenerationTask } from '@/lib/kieAiService';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { imageUrl, prompt, style } = await request.json();

    if (!imageUrl || !prompt || !style) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const { taskId, localTaskId } = await createImageGenerationTask(
      session.user.id,
      imageUrl,
      prompt,
      style
    );

    return NextResponse.json({
      success: true,
      taskId: localTaskId,
      kieTaskId: taskId,
      message: 'Task created successfully'
    });
  } catch (error) {
    console.error('Error creating image generation task:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
