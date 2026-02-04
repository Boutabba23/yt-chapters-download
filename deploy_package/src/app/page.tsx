'use client'

import { useState, useEffect, useRef } from 'react'

export default function Home() {
  const [url, setUrl] = useState('')
  const [videoInfo, setVideoInfo] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [paused, setPaused] = useState(false)
  const [progress, setProgress] = useState<any>(null)
  const [error, setError] = useState('')
  const [quality, setQuality] = useState('bestvideo[height<=1080]+bestaudio/best[height<=1080]')
  const [split, setSplit] = useState(false)
  const [selectedChapters, setSelectedChapters] = useState<any[]>([])
  const [audioMode, setAudioMode] = useState(false)
  const [theme, setTheme] = useState('midnight')
  const [history, setHistory] = useState<any[]>([])
  const eventSource = useRef<EventSource | null>(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme])

  useEffect(() => {
    const savedHistory = localStorage.getItem('download_history')
    if (savedHistory) setHistory(JSON.parse(savedHistory))

    return () => {
      if (eventSource.current) eventSource.current.close()
    }
  }, [])

  const saveToHistory = (info: any, targetUrl: string) => {
    // Helper to get ID from URL or existing ID
    const getVideoId = (input: string | undefined) => {
      if (!input) return '';
      // If it looks like an ID (11 chars, no special chars), return it
      if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
      // Otherwise try to extract from URL
      const match = input.match(/[?&]v=([^&#]+)/) || input.match(/youtu\.be\/([^&#]+)/);
      return match ? match[1] : input;
    }

    const videoId = info.id || getVideoId(targetUrl);

    if (!videoId) return;

    const newItem = {
      id: Date.now(),
      videoId: videoId,
      title: info.title,
      thumbnail: info.thumbnail,
      url: targetUrl,
      duration: info.duration,
      filesize: info.filesize,
      date: new Date().toLocaleDateString()
    }
    setHistory(prev => {
      // Aggressively deduplicate by normalized Video ID
      const filtered = prev.filter(item => {
        const itemVidId = item.videoId || getVideoId(item.url);
        return itemVidId !== videoId;
      })
      const newHistory = [newItem, ...filtered].slice(0, 10)
      localStorage.setItem('download_history', JSON.stringify(newHistory))
      return newHistory
    })
  }

  const fetchVideoInfo = async (targetUrl = url, targetQuality = quality) => {
    if (!targetUrl) return
    setLoading(true)
    setError('')
    // Clear previous selection but don't clear videoInfo yet to avoid jarring jump
    // unless it's a completely different URL
    if (targetUrl !== url) setVideoInfo(null)

    try {
      const response = await fetch('/api/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl, quality: targetQuality })
      })
      const data = await response.json()
      if (response.ok) {
        setVideoInfo(data)
        saveToHistory(data, targetUrl)
        if (data.chapters) {
          setSelectedChapters(data.chapters.map((c: any) => c.index))
        }
      } else {
        setError(data.detail || 'Failed to fetch video info')
      }
    } catch (err) {
      setError('Connection refused. Is the server running?')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (url && videoInfo) {
      fetchVideoInfo(url, quality)
    }
  }, [quality])

  const startDownload = async () => {
    if (!videoInfo) return
    setDownloading(true)
    setPaused(false)
    setError('')

    // Close existing SSE if any
    if (eventSource.current) eventSource.current.close()

    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          quality,
          split,
          selected_chapters: split ? selectedChapters.map(idx => parseInt(idx)) : null,
          audio_only: audioMode
        })
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.detail || 'Failed to start download')
        setDownloading(false)
        return
      }

      // Start listening for progress via SSE
      eventSource.current = new EventSource(`/api/progress?url=${encodeURIComponent(url)}`)

      eventSource.current.onmessage = (event) => {
        const data = JSON.parse(event.data)
        if (data.type === 'progress') {
          setProgress(data)
          setDownloading(true)
          setPaused(false)
        } else if (data.type === 'paused') {
          setDownloading(false)
          setPaused(true)
        } else if (data.type === 'done') {
          setDownloading(false)
          setPaused(false)
          setProgress(null)
          if (eventSource.current) eventSource.current.close()
          alert('Download Complete!')
        } else if (data.type === 'error') {
          setDownloading(false)
          setPaused(false)
          setError(data.message)
          if (eventSource.current) eventSource.current.close()
        }
      }

      eventSource.current.onerror = () => {
        if (eventSource.current) eventSource.current.close()
        setDownloading(false)
      }

    } catch (err) {
      setError('Failed to connect to server')
      setDownloading(false)
    }
  }

  const pauseDownload = async () => {
    try {
      const response = await fetch('/api/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })
      if (!response.ok) {
        const data = await response.json()
        setError(data.detail || 'Failed to pause download')
      }
    } catch (err) {
      setError('Failed to connect to server')
    }
  }

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return [h, m, s]
      .map(v => v.toString().padStart(2, '0'))
      .join(':');
  }

  const formatSize = (bytes: number) => {
    if (!bytes) return 'N/A';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  const removeFromHistory = (e: React.MouseEvent, itemId: number) => {
    e.stopPropagation();
    setHistory(prev => {
      const newHistory = prev.filter(item => item.id !== itemId);
      localStorage.setItem('download_history', JSON.stringify(newHistory));
      return newHistory;
    });
  }

  return (
    <div className="container">
      <div className="theme-selector">
        {['midnight', 'obsidian', 'aurora', 'frost'].map(t => (
          <div
            key={t}
            className={`theme-dot ${t} ${theme === t ? 'active' : ''}`}
            onClick={() => setTheme(t)}
            title={t.charAt(0).toUpperCase() + t.slice(1)}
          />
        ))}
      </div>

      <header>
        <h1>Antigravity Chapters</h1>
        <p>Premium YouTube Downloader with Automatic Chapter Extraction</p>
      </header>

      <main className="glass-panel">
        <div className="input-group">
          <input
            type="text"
            placeholder="Paste YouTube URL here..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={downloading}
          />
          <button
            onClick={() => fetchVideoInfo()}
            disabled={loading || downloading || !url}
            className="btn-fetch"
          >
            {loading ? 'Fetching...' : 'Get Info'}
          </button>
        </div>

        {error && <div className="error-badge">{error}</div>}


        {!videoInfo && !loading && history.length > 0 && (
          <div className="history-section fade-in">
            <h3>Recent Downloads</h3>
            <div className="history-grid">
              {history.map((item) => (
                <div key={item.id} className="history-card" onClick={() => { setUrl(item.url); fetchVideoInfo(item.url); }}>
                  <img src={item.thumbnail} alt="" />
                  <div className="history-info">
                    <h4>{item.title}</h4>
                    <div className="history-meta">
                      <span>{formatDuration(item.duration)}</span>
                      <span className="separator">|</span>
                      <span>{formatSize(item.filesize)}</span>
                      <button
                        className="delete-btn"
                        onClick={(e) => removeFromHistory(e, item.id)}
                        title="Remove from history"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {videoInfo && (
          <div className="video-card fade-in">
            <div className="video-preview">
              {videoInfo.thumbnail && <img src={videoInfo.thumbnail} alt="Video Thumbnail" className="thumbnail" />}
              <div className="video-details">
                <h2>{videoInfo.title}</h2>
                <div className="meta">
                  <span>Duration: {formatDuration(videoInfo.duration)}</span>
                  <span className="separator">|</span>
                  <span>Size: {formatSize(videoInfo.filesize)}</span>
                </div>
              </div>
            </div>

            <div className="controls">
              <div className="control-item">
                <label>Format & Quality</label>
                <div className="control-row">
                  <select
                    value={audioMode ? 'audio' : 'video'}
                    onChange={(e) => setAudioMode(e.target.value === 'audio')}
                    disabled={downloading}
                    className="format-select"
                  >
                    <option value="video">Video (MP4)</option>
                    <option value="audio">Audio (MP3)</option>
                  </select>
                  {!audioMode && (
                    <select value={quality} onChange={(e) => setQuality(e.target.value)} disabled={downloading}>
                      <option value="bestvideo[height<=1080]+bestaudio/best[height<=1080]">1080p</option>
                      <option value="bestvideo[height<=720]+bestaudio/best[height<=720]">720p</option>
                      <option value="bestvideo[height<=480]+bestaudio/best[height<=480]">480p</option>
                    </select>
                  )}
                </div>
              </div>

              <div className="control-item">
                <label className="checkbox-label">
                  <input type="checkbox" checked={split} onChange={(e) => setSplit(e.target.checked)} disabled={downloading} />
                  Split into Chapters
                </label>
              </div>
            </div>

            {videoInfo.chapters && videoInfo.chapters.length > 0 && (
              <div className="chapters-list">
                <div className="chapters-header">
                  <h3>Detected Chapters ({videoInfo.chapters.length})</h3>
                  <div className="chapter-actions">
                    <button onClick={() => setSelectedChapters(videoInfo.chapters.map((c: any) => c.index))} disabled={downloading}>Select All</button>
                    <button onClick={() => setSelectedChapters([])} disabled={downloading}>None</button>
                  </div>
                </div>
                <div className="scroll-area">
                  {videoInfo.chapters.map((chap: any, i: number) => (
                    <div key={i} className={`chapter-item ${selectedChapters.includes(chap.index) ? 'selected' : ''}`}
                      onClick={() => {
                        if (downloading) return;
                        setSelectedChapters(prev =>
                          prev.includes(chap.index)
                            ? prev.filter(idx => idx !== chap.index)
                            : [...prev, chap.index]
                        )
                      }}>
                      <input
                        type="checkbox"
                        checked={selectedChapters.includes(chap.index)}
                        readOnly
                        disabled={downloading}
                      />
                      <span className="time">{chap.time}</span>
                      <span className="name">{chap.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              className={`btn-download ${downloading ? 'downloading' : ''}`}
              onClick={startDownload}
              disabled={downloading}
            >
              {downloading ? 'Downloading...' : `Download ${audioMode ? 'Audio' : 'Video'}`}
            </button>
          </div>
        )}

        {progress && (
          <div className="progress-overlay">
            <div className="progress-content">
              <h3>{progress.percent === '100%' ? 'Download Complete' : (paused ? 'Download Paused' : `Downloading ${progress.percent}`)}</h3>
              <div className="progress-bar-bg">
                <div
                  className="progress-bar-fill"
                  style={{ width: progress.percent }}
                ></div>
              </div>
              <div className="progress-details-grid">
                <div className="progress-stat-card">
                  <label>Speed</label>
                  <span>{paused ? '0 KB/s' : progress.speed}</span>
                </div>
                <div className="progress-stat-card">
                  <label>Remaining Time</label>
                  <span>{paused ? '--:--' : progress.eta}</span>
                </div>
                <div className="progress-stat-card">
                  <label>Status</label>
                  <span>{paused ? 'Paused' : (progress.message || 'Processing...')}</span>
                </div>
              </div>
              <div className="progress-actions">
                {paused ? (
                  <button className="btn-resume" onClick={startDownload}>Resume Download</button>
                ) : (
                  <button className="btn-pause" onClick={pauseDownload} disabled={progress.percent === '100%'}>Pause Download</button>
                )}
                <button className="btn-cancel" onClick={() => { setProgress(null); setDownloading(false); setPaused(false); }}>Close</button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer>
        <p>&copy; 2026 Antigravity - Powered by Next.js & Python</p>
      </footer>
    </div>
  )
}
