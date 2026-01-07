import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/get-session';
import { getUserImageGenerationTasks } from '@/lib/kieAiService';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tasks = await getUserImageGenerationTasks(session.user.id);

    // 转换数据格式以匹配前端期望的Creation类型
    const creations = tasks.map(task => ({
      id: task.id,
      originalImage: task.originalImageUrl,
      generatedImage: task.generatedImageUrl || '',
      style: task.style,
      date: task.createdAt ? new Date(task.createdAt).toLocaleDateString() : '',
      status: task.status,
      prompt: task.prompt,
      errorMessage: task.errorMessage
    }));

    return NextResponse.json({ success: true, creations });
  } catch (error) {
    console.error('Error fetching user creations:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
