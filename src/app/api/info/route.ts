import { NextRequest, NextResponse } from 'next/server';
import { spawnSync } from 'child_process';
import path from 'path';

export async function POST(req: NextRequest) {
    try {
        const { url, quality } = await req.json();

        if (!url) {
            return NextResponse.json({ detail: "URL is required" }, { status: 400 });
        }

        const backendPath = path.join(process.cwd(), 'backend');

        // Command to get info using the existing python logic
        const pythonCode = `
import sys
import json
import os
import io

# Redirect stdout temporarily to capture everything else
old_stdout = sys.stdout
sys.stdout = io.StringIO()

sys.path.append('${backendPath.replace(/\\/g, '\\\\')}')
from handleYDL import get_infos
import engine

try:
    # Use quality if provided to get more accurate filesize
    opts = {'quiet': True}
    if "${quality || ""}" != "":
        opts['format'] = "${quality || ""}"
        
    infos = get_infos("${url}", opts)
    chapters = engine.get_chapters(infos['description'])
    thumbnail = infos.get('thumbnail') or (infos.get('thumbnails', [{}])[-1].get('url') if infos.get('thumbnails') else None)
    
    # Get estimated filesize
    filesize = infos.get('filesize') or infos.get('filesize_approx')
    
    # If merged format, sum the sizes of component formats
    if not filesize and infos.get('requested_formats'):
        filesize = sum(f.get('filesize', 0) or f.get('filesize_approx', 0) for f in infos['requested_formats'])
    
    result = {
        "title": infos['title'],
        "description": infos['description'],
        "duration": infos['duration'],
        "thumbnail": thumbnail,
        "filesize": filesize,
        "chapters": [{"index": c[0], "time": c[1], "name": c[2]} for c in chapters]
    }
    # Restore stdout and print final result with marker
    sys.stdout = old_stdout
    print("---JSON_START---")
    print(json.dumps(result))
    print("---JSON_END---")
except Exception as e:
    sys.stdout = old_stdout
    print(json.dumps({"error": str(e)}), file=sys.stderr)
    sys.exit(1)
`;

        const result = spawnSync('python', ['-c', pythonCode]);

        if (result.status !== 0) {
            const errorStr = result.stderr.toString();
            return NextResponse.json({ detail: errorStr || "Failed to fetch video info" }, { status: 500 });
        }

        const stdout = result.stdout.toString();
        const jsonMatch = stdout.match(/---JSON_START---([\s\S]*?)---JSON_END---/);

        if (!jsonMatch) {
            return NextResponse.json({ detail: "Could not find valid JSON in output: " + stdout }, { status: 500 });
        }

        const data = JSON.parse(jsonMatch[1].trim());
        if (data.error) {
            return NextResponse.json({ detail: data.error }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ detail: error.message }, { status: 500 });
    }
}
