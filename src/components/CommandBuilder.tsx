"use client";

import { useState, useEffect } from "react";
import { ScriptDownload } from "@/components/ScriptDownload";

export function CommandBuilder() {
    const [url, setUrl] = useState("");
    const [title, setTitle] = useState("download");
    const [isAudioOnly, setIsAudioOnly] = useState(false);
    const [quality, setQuality] = useState("1080");
    const [splitChapters, setSplitChapters] = useState(false);
    const [addMetadata, setAddMetadata] = useState(true);
    const [command, setCommand] = useState("");

    // Clean filename/folder title (removes problematic characters)
    const cleanTitle = title.replace(/[\\/*?:"<>|]/g, "").trim() || "download";

    useEffect(() => {
        const parts = ["yt-dlp"];

        // 1. Add Options
        if (isAudioOnly) {
            parts.push("-x", "--audio-format mp3");
        } else {
            // Quality selection
            const formatStr = {
                "1080": "bestvideo[height<=1080]+bestaudio/best[height<=1080]",
                "720": "bestvideo[height<=720]+bestaudio/best[height<=720]",
                "480": "bestvideo[height<=480]+bestaudio/best[height<=480]"
            }[quality] || "best";
            parts.push(`-f "${formatStr}"`);
            parts.push("--merge-output-format mp4");
        }

        if (addMetadata) {
            parts.push("--add-metadata", "--embed-thumbnail");
        }

        if (splitChapters) {
            // Precision flags + Codec hints to prevent "Conversion failed"
            parts.push("--split-chapters", "--embed-chapters", "--force-keyframes-at-cuts");
            parts.push('--postprocessor-args "ffmpeg:-c:v libx264 -preset superfast -c:a aac"');

            // Template for fragments (chapter: prefix ensures they go into the folder)
            parts.push(`-o "chapter:${cleanTitle}/%(section_number)02d - %(section_title)s.%(ext)s"`);
            // Fallback/Main template
            parts.push(`-o "${cleanTitle}/%(title)s.%(ext)s"`);
        } else {
            // Standard single-file template
            parts.push(`-o "${cleanTitle}/%(title)s.%(ext)s"`);
        }

        // 2. Add URL at the end
        parts.push(`"${url || "URL_HERE"}"`);

        setCommand(parts.join(" "));
    }, [url, title, cleanTitle, isAudioOnly, quality, splitChapters, addMetadata]);

    return (
        <div className="w-full max-w-2xl mx-auto space-y-6">
            <div className="space-y-4 p-6 bg-card border border-border rounded-xl shadow-sm">
                <h2 className="text-xl font-semibold mb-4">1. Configure Download</h2>

                {/* Simple Auto-Title logic could go here, but for now we let user input */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium opacity-80">Video Title (for folder & script name)</label>
                        <input
                            type="text"
                            placeholder="My Video"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                        />
                    </div>
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

                    {/* Quality Selector (Only shows for Video) */}
                    {!isAudioOnly && (
                        <div className="flex flex-col space-y-1">
                            <label className="text-xs font-semibold opacity-60 ml-1">Max Resolution</label>
                            <select
                                value={quality}
                                onChange={(e) => setQuality(e.target.value)}
                                className="w-full p-[9px] bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
                            >
                                <option value="1080">1080p (Full HD)</option>
                                <option value="720">720p (HD)</option>
                                <option value="480">480p (SD)</option>
                            </select>
                        </div>
                    )}

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

                <ScriptDownload command={command} filename={cleanTitle} />
            </div>
        </div>
    );
}
