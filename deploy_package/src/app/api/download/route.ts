import { NextRequest, NextResponse } from 'next/server';
import { downloadManager } from '@/lib/downloadManager';

export async function POST(req: NextRequest) {
    try {
        const { url, quality, split, selected_chapters, outdir, audio_only } = await req.json();

        if (!url) {
            return NextResponse.json({ detail: "URL is required" }, { status: 400 });
        }

        downloadManager.startDownload(url, quality, split, selected_chapters, outdir || "", audio_only || false);

        return NextResponse.json({ status: "started", message: "Download initiated" });
    } catch (error: any) {
        return NextResponse.json({ detail: error.message }, { status: 500 });
    }
}
