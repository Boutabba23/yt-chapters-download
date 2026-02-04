"use client";

import { useState } from "react";

export function InstallGuide() {
    const [activeTab, setActiveTab] = useState<"windows" | "mac" | "linux">("windows");

    return (
        <div className="w-full max-w-2xl mx-auto mt-12 mb-12">
            <h3 className="text-xl font-semibold mb-6 flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                Prerequisites Setup
            </h3>

            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-border">
                    {(["windows", "mac", "linux"] as const).map((os) => (
                        <button
                            key={os}
                            onClick={() => setActiveTab(os)}
                            className={`flex-1 py-3 px-4 text-sm font-medium capitalize transition-colors ${activeTab === os
                                    ? "bg-primary/10 text-primary border-b-2 border-primary"
                                    : "text-muted-foreground hover:bg-white/5"
                                }`}
                        >
                            {os}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <p className="text-sm text-muted-foreground">
                        You need <strong>yt-dlp</strong> (the downloader) and <strong>ffmpeg</strong> (media processor) installed on your computer.
                    </p>

                    <div className="bg-black/80 rounded-lg p-4 font-mono text-sm border border-white/10 relative">
                        {activeTab === "windows" && (
                            <>
                                <div className="text-gray-400 mb-2"># Run this in PowerShell (Admin)</div>
                                <div className="text-green-400">winget install active.python.3.10</div>
                                <div className="text-green-400">winget install yt-dlp.yt-dlp</div>
                                <div className="text-green-400">winget install gyan.ffmpeg</div>
                            </>
                        )}
                        {activeTab === "mac" && (
                            <>
                                <div className="text-gray-400 mb-2"># Run this in Terminal (requires Homebrew)</div>
                                <div className="text-green-400">brew install python3</div>
                                <div className="text-green-400">brew install yt-dlp</div>
                                <div className="text-green-400">brew install ffmpeg</div>
                            </>
                        )}
                        {activeTab === "linux" && (
                            <>
                                <div className="text-gray-400 mb-2"># Ubuntu / Debian</div>
                                <div className="text-green-400">sudo apt update</div>
                                <div className="text-green-400">sudo apt install python3 python3-pip ffmpeg</div>
                                <div className="text-green-400">pip3 install yt-dlp</div>
                            </>
                        )}
                    </div>

                    <div className="text-xs text-center text-muted-foreground pt-2">
                        After installing, restart your terminal for changes to take effect.
                    </div>
                </div>
            </div>
        </div>
    );
}
