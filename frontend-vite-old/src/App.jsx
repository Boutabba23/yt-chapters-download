import { useState, useEffect, useRef } from 'react'
import './App.css'

function App() {
  const [url, setUrl] = useState('')
  const [videoInfo, setVideoInfo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [paused, setPaused] = useState(false)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')
  const [quality, setQuality] = useState('bestvideo[height<=1080]+bestaudio/best[height<=1080]')
  const [split, setSplit] = useState(false)
  const [selectedChapters, setSelectedChapters] = useState([])
  const ws = useRef(null)

  useEffect(() => {
    // Setup websocket for progress updates
    ws.current = new WebSocket(`ws://${window.location.hostname}:8000/ws/progress`)

    ws.current.onmessage = (event) => {
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
        alert('Download Complete!')
      } else if (data.type === 'error') {
        setDownloading(false)
        setPaused(false)
        setError(data.message)
      }
    }

    return () => {
      if (ws.current) ws.current.close()
    }
  }, [])

  const fetchVideoInfo = async () => {
    if (!url) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch('http://localhost:8000/api/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })
      const data = await response.json()
      if (response.ok) {
        setVideoInfo(data)
        // Auto-select all chapters by default
        if (data.chapters) {
          setSelectedChapters(data.chapters.map(c => c.index))
        }
      } else {
        setError(data.detail || 'Failed to fetch video info')
      }
    } catch (err) {
      setError('Connection refused. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  const startDownload = async () => {
    setDownloading(true)
    setPaused(false)
    setError('')
    try {
      const response = await fetch('http://localhost:8000/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          quality,
          split,
          selected_chapters: split ? selectedChapters.map(idx => parseInt(idx)) : null
        })
      })
      if (!response.ok) {
        const data = await response.json()
        setError(data.detail || 'Failed to start download')
        setDownloading(false)
      }
    } catch (err) {
      setError('Failed to connect to backend')
      setDownloading(false)
    }
  }

  const pauseDownload = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })
      if (!response.ok) {
        const data = await response.json()
        setError(data.detail || 'Failed to pause download')
      }
    } catch (err) {
      setError('Failed to connect to backend')
    }
  }

  return (
    <div className="container">
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
            onClick={fetchVideoInfo}
            disabled={loading || downloading || !url}
            className="btn-fetch"
          >
            {loading ? 'Fetching...' : 'Get Info'}
          </button>
        </div>

        {error && <div className="error-badge">{error}</div>}

        {videoInfo && (
          <div className="video-card fade-in">
            <div className="video-preview">
              {videoInfo.thumbnail && <img src={videoInfo.thumbnail} alt="Video Thumbnail" className="thumbnail" />}
              <div className="video-details">
                <h2>{videoInfo.title}</h2>
                <div className="meta">
                  <span>Duration: {Math.floor(videoInfo.duration / 60)}:{(videoInfo.duration % 60).toString().padStart(2, '0')}</span>
                </div>
              </div>
            </div>

            <div className="controls">
              <div className="control-item">
                <label>Quality</label>
                <select value={quality} onChange={(e) => setQuality(e.target.value)} disabled={downloading}>
                  <option value="bestvideo[height<=1080]+bestaudio/best[height<=1080]">1080p (Best)</option>
                  <option value="bestvideo[height<=720]+bestaudio/best[height<=720]">720p</option>
                  <option value="bestvideo[height<=480]+bestaudio/best[height<=480]">480p</option>
                </select>
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
                    <button onClick={() => setSelectedChapters(videoInfo.chapters.map(c => c.index))} disabled={downloading}>Select All</button>
                    <button onClick={() => setSelectedChapters([])} disabled={downloading}>None</button>
                  </div>
                </div>
                <div className="scroll-area">
                  {videoInfo.chapters.map((chap, i) => (
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
              {downloading ? 'Downloading...' : 'Download Now'}
            </button>
          </div>
        )}

        {progress && (
          <div className="progress-overlay">
            <div className="progress-content">
              <h3>{paused ? 'Download Paused' : `Downloading ${progress.percent}`}</h3>
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
        <p>&copy; 2026 Antigravity - Powered by yt-dlp & FastAPI</p>
      </footer>
    </div>
  )
}

export default App
