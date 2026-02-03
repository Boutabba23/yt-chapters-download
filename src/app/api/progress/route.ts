import { NextRequest } from 'next/server';
import { downloadManager } from '@/lib/downloadManager';

export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get('url');

    if (!url) {
        return new Response("URL required", { status: 400 });
    }

    const responseStream = new TransformStream();
    const writer = responseStream.writable.getWriter();
    const encoder = new TextEncoder();

    const onProgress = (data: any) => {
        try {
            writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch (e) {
            // Already closed
        }
    };

    // Send initial state if already downloading
    const initialProgress = downloadManager.getLatestProgress(url);
    if (initialProgress) {
        onProgress(initialProgress);
    }

    downloadManager.on(`progress:${url}`, onProgress);

    // Connection closer
    req.signal.onabort = () => {
        downloadManager.off(`progress:${url}`, onProgress);
        writer.close();
    };

    return new Response(responseStream.readable, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
