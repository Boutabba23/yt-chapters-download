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
import socket

# Redirect stdout temporarily to capture everything else
old_stdout = sys.stdout
sys.stdout = io.StringIO()

sys.path.append('${backendPath.replace(/\\/g, '\\\\')}')
from handleYDL import get_infos
import engine

try:
    # Debug: Check System DNS first
    try:
        ip = socket.gethostbyname('youtube.com')
        print(f"DEBUG: DNS OK (youtube.com -> {ip})", file=sys.stderr)
    except Exception as e:
        print(f"DEBUG: System DNS FAILED: {str(e)}", file=sys.stderr)

    # Use quality if provided to get more accurate filesize
    opts = {
        'quiet': True, 
        'force_ipv4': True,
        'nocheckcertificate': True,
        'socket_timeout': 30,
        'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
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

        // Detect python command
        let pythonCmd = 'python';
        const checkPython3 = spawnSync('python3', ['--version']);
        if (checkPython3.status === 0) {
            pythonCmd = 'python3';
        }

        const result = spawnSync(pythonCmd, ['-c', pythonCode]);

        if (result.status !== 0) {
            const errorStr = result.stderr ? result.stderr.toString() : "Unknown python error";
            return NextResponse.json({ detail: errorStr || "Failed to fetch video info" }, { status: 500 });
        }

        const stdout = result.stdout ? result.stdout.toString() : "";
        if (!stdout) {
            return NextResponse.json({ detail: "No output from python process" }, { status: 500 });
        }

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
