"use client";

import { useState, useEffect } from "react";
import { ScriptDownload } from "./ScriptDownload";

export function CommandBuilder() {
    const [url, setUrl] = useState("");
    const [isAudioOnly, setIsAudioOnly] = useState(false);
    const [splitChapters, setSplitChapters] = useState(false);
    const [addMetadata, setAddMetadata] = useState(true);
    const [command, setCommand] = useState("");

    useEffect(() => {
        let cmd = `yt-dlp "${url || "URL_HERE"}"`;

        // Audio Only Logic
        if (isAudioOnly) {
            cmd = `yt-dlp -x --audio-format mp3`;
            if (addMetadata) cmd += ` --add-metadata --embed-thumbnail`;
            if (splitChapters) cmd += ` --split-chapters -o "chapter: %(section_number)s - %(section_title)s.%(ext)s"`;
            cmd += ` "${url || "URL_HERE"}"`;
        } else {
            // Video Logic
            if (addMetadata) cmd = `yt-dlp --add-metadata --embed-thumbnail`;
            else cmd = `yt-dlp`;

            if (splitChapters) cmd += ` --split-chapters -o "chapter: %(section_number)s - %(section_title)s.%(ext)s"`;

            cmd += ` "${url || "URL_HERE"}"`;
        }

        setCommand(cmd);
    }, [url, isAudioOnly, splitChapters, addMetadata]);

    return (
        <div className="w-full max-w-2xl mx-auto space-y-6">
            <div className="space-y-4 p-6 bg-card border border-border rounded-xl shadow-sm">
                <h2 className="text-xl font-semibold mb-4">1. Configure Download</h2>

                {/* URL Input */}
                <div className="space-y-2">
                    <label className="text-sm font-medium opacity-80">YouTube URL</label>
                    <input
                        type="text"
                        placeholder="https://youtu.be/..."
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="w-full p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                    />
                </div>

                {/* Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {/* Audio vs Video */}
                    <div className="flex items-center space-x-3 p-3 border border-border rounded-lg hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setIsAudioOnly(!isAudioOnly)}>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isAudioOnly ? "border-primary" : "border-gray-500"}`}>
                            {isAudioOnly && <div className="w-3 h-3 bg-primary rounded-full" />}
                        </div>
                        <span className="font-medium">Audio Only (MP3)</span>
                    </div>

                    {/* Split Chapters */}
                    <div className="flex items-center space-x-3 p-3 border border-border rounded-lg hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setSplitChapters(!splitChapters)}>
                        <input type="checkbox" checked={splitChapters} readOnly className="w-5 h-5 accent-primary" />
                        <span className="font-medium">Split by Chapters</span>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center space-x-3 p-3 border border-border rounded-lg hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setAddMetadata(!addMetadata)}>
                        <input type="checkbox" checked={addMetadata} readOnly className="w-5 h-5 accent-primary" />
                        <span className="font-medium">Embed Metadata</span>
                    </div>
                </div>
            </div>

            {/* Command Output */}
            <div className="p-6 bg-card border border-border rounded-xl shadow-sm space-y-4">
                <h2 className="text-xl font-semibold">2. Generate Command</h2>
                <div className="relative group">
                    <pre className="p-4 bg-black/80 text-green-400 font-mono text-sm rounded-lg overflow-x-auto whitespace-pre-wrap break-all border border-white/10">
                        {command}
                    </pre>
                    <button
                        onClick={() => navigator.clipboard.writeText(command)}
                        className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        Copy
                    </button>
                </div>

                <ScriptDownload command={command} filename="download_video" />
            </div>
        </div>
    );
}
