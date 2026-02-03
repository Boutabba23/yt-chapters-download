import { NextRequest, NextResponse } from 'next/server';
import { downloadManager } from '@/lib/downloadManager';

export async function POST(req: NextRequest) {
    try {
        const { url } = await req.json();

        if (!url) {
            return NextResponse.json({ detail: "URL is required" }, { status: 400 });
        }

        downloadManager.pauseDownload(url);

        return NextResponse.json({ status: "pausing" });
    } catch (error: any) {
        return NextResponse.json({ detail: error.message }, { status: 500 });
    }
}
