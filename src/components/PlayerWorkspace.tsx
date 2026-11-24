import React, { useEffect, useRef, useState } from 'react';
import {
  Disc3,
  Info,
  Pause,
  Play,
  Repeat,
  Repeat1,
  ScrollText,
  Shuffle,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Upload,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { AudioTrack, RepeatMode } from '../types/music';
import { WebAudioPlayerEngine } from '../utils/audioEngine';

interface PlayerWorkspaceProps {
  tracks: AudioTrack[];
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  currentTime: number;
  shuffleEnabled: boolean;
  repeatMode: RepeatMode;
  volume: number;
  engine: WebAudioPlayerEngine;
  onSelectTrack: (trackId: string) => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (seconds: number) => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onVolumeChange: (vol: number) => void;
  onOpenTagEditor: () => void;
  onOpenEqualizer: () => void;
  onUploadFiles: (files: FileList) => void;
}

function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function PlayerWorkspace({
  tracks,
  currentTrack,
  isPlaying,
  currentTime,
  shuffleEnabled,
  repeatMode,
  volume,
  engine,
  onSelectTrack,
  onTogglePlay,
  onNext,
  onPrevious,
  onSeek,
  onToggleShuffle,
  onCycleRepeat,
  onVolumeChange,
  onOpenTagEditor,
  onOpenEqualizer,
  onUploadFiles,
}: PlayerWorkspaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imgFailed, setImgFailed] = useState<Record<string, boolean>>({});
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [showInfoDialog, setShowInfoDialog] = useState(false);

  // Live Web Audio frequency spectrum rendered in Chakra Orange
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const buffer = new Uint8Array(new ArrayBuffer(64));
    let rafId = 0;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const hasAudio = isPlaying && engine.getFrequencyData(buffer);
      const barCount = 32;
      const gap = 4;
      const barWidth = (width - gap * (barCount - 1)) / barCount;

      for (let i = 0; i < barCount; i++) {
        const value = hasAudio ? buffer[i] / 255 : 0.05;
        const barHeight = Math.max(3, value * (height - 4));
        const x = i * (barWidth + gap);
        const y = height - barHeight;

        ctx.fillStyle = hasAudio ? '#FF5722' : '#2D3442';
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }

      rafId = window.requestAnimationFrame(draw);
    };

    rafId = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(rafId);
  }, [isPlaying, engine]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUploadFiles(e.dataTransfer.files);
    }
  };

  if (!currentTrack) {
    return (
      <section className="py-20 text-center">
        <h1 className="font-display text-2xl font-semibold text-slate-100">
          Empty Audio Queue
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Load local MP3, FLAC, WAV, or OGG files to start playback and inspect embedded tags.
        </p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-6 inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 rounded-lg bg-[#D84315] text-white text-sm font-medium hover:bg-[#E64A19] cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          <span>Open Audio Files</span>
        </button>
      </section>
    );
  }

  const duration = Math.max(1, currentTrack.durationSeconds);
  const progressPercent = Math.min(100, (currentTime / duration) * 100);

  return (
    <section
      aria-label="Audio player workspace"
      className="py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
    >
      {/* Left / Primary Now Playing Seal Deck */}
      <div className="lg:col-span-7 bg-[#1E222B] border border-[#2A303D] rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-stretch">
          {/* Circular Invocation Seal Artwork */}
          <div className="sm:col-span-5 flex items-center justify-center">
            <div className="relative w-full max-w-[240px] aspect-square flex items-center justify-center">
              {/* Outer Concentric Seal SVG Ring */}
              <svg
                viewBox="0 0 240 240"
                aria-hidden="true"
                className={`absolute inset-0 w-full h-full pointer-events-none ${
                  isPlaying ? 'animate-seal-spin' : ''
                }`}
              >
                <circle
                  cx="120"
                  cy="120"
                  r="114"
                  fill="none"
                  stroke={isPlaying ? '#FF5722' : '#2D3442'}
                  strokeWidth="1.5"
                  strokeDasharray="10 8"
                  strokeOpacity={isPlaying ? 0.65 : 0.9}
                />
                <circle
                  cx="120"
                  cy="120"
                  r="104"
                  fill="none"
                  stroke="#2D3442"
                  strokeWidth="1"
                />
              </svg>

              <div className="w-[80%] h-[80%] rounded-full overflow-hidden border-2 border-[#2A303D] bg-[#14171D] flex items-center justify-center shadow-inner">
                {currentTrack.coverUrl && !imgFailed[currentTrack.id] ? (
                  <img
                    src={currentTrack.coverUrl}
                    alt={`${currentTrack.album} cover art`}
                    referrerPolicy="no-referrer"
                    onError={() =>
                      setImgFailed((prev) => ({ ...prev, [currentTrack.id]: true }))
                    }
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-[#181B22] text-slate-400 p-4 text-center">
                    <Disc3 className="w-10 h-10 mb-2 text-[#FF5722]" aria-hidden="true" />
                    <span className="text-xs font-medium text-slate-300 truncate max-w-full">
                      {currentTrack.album}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Track Metadata & Quick Actions */}
          <div className="sm:col-span-7 flex flex-col justify-between gap-4 min-w-0">
            <div className="space-y-2">
              <p className="text-xs font-mono text-slate-400 truncate tabular-nums">
                {currentTrack.mimeType} · {currentTrack.bitrate} · {currentTrack.sampleRate}
                {currentTrack.year ? ` · ${currentTrack.year}` : ''}
              </p>
              <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-white leading-tight text-balance">
                {currentTrack.title}
              </h1>
              <p className="text-base text-slate-200 truncate">
                {currentTrack.artist}
              </p>
              <p className="text-sm text-slate-400 truncate">
                {currentTrack.album}
                {currentTrack.genre ? ` · ${currentTrack.genre}` : ''}
              </p>
            </div>

            {/* Live Frequency Spectrum */}
            <div className="pt-2">
              <canvas
                ref={canvasRef}
                width={320}
                height={42}
                aria-hidden="true"
                className="w-full h-[42px]"
              />
            </div>

            {/* Contextual Tool Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={onOpenTagEditor}
                className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-lg border border-[#2F3644] bg-[#161920] text-xs font-medium text-slate-200 hover:bg-[#242936] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
              >
                <ScrollText className="w-3.5 h-3.5 text-[#FF5722]" aria-hidden="true" />
                <span>Tag Scroll</span>
              </button>
              <button
                type="button"
                onClick={onOpenEqualizer}
                className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-lg border border-[#2F3644] bg-[#161920] text-xs font-medium text-slate-200 hover:bg-[#242936] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#FF5722]" aria-hidden="true" />
                <span>3D Seal EQ</span>
              </button>
              <button
                type="button"
                onClick={() => setShowInfoDialog(true)}
                className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-lg border border-[#2F3644] bg-[#161920] text-xs font-medium text-slate-200 hover:bg-[#242936] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
              >
                <Info className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                <span>Track Info</span>
              </button>
            </div>
          </div>
        </div>

        {/* Scrubber Seekbar */}
        <div className="space-y-2 pt-2">
          <input
            type="range"
            min={0}
            max={duration}
            step={1}
            value={Math.min(duration, Math.floor(currentTime))}
            onChange={(e) => onSeek(Number(e.target.value))}
            aria-label="Seek playback position"
            className="w-full accent-[#FF5722] cursor-pointer h-2 rounded-lg"
            style={{
              background: `linear-gradient(to right, #FF5722 ${progressPercent}%, #2A303D ${progressPercent}%)`,
            }}
          />
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 tabular-nums">
            <span>{formatClock(currentTime)}</span>
            <span>{formatClock(duration)}</span>
          </div>
        </div>

        {/* Transport & Volume Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-[#2A303D]">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onToggleShuffle}
              aria-label="Toggle shuffle"
              aria-pressed={shuffleEnabled}
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                shuffleEnabled
                  ? 'text-[#FF5722] bg-[#FF5722]/15'
                  : 'text-slate-400 hover:text-white hover:bg-[#262B36]'
              }`}
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onPrevious}
              aria-label="Previous track"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-200 hover:text-white hover:bg-[#262B36] transition-colors cursor-pointer"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            {/* Pulsing Chakra Play / Pause Button */}
            <div className="relative flex items-center justify-center w-16 h-16">
              {isPlaying && (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full bg-[#FF5722]/45 animate-chakra-aura pointer-events-none"
                />
              )}
              <button
                type="button"
                onClick={onTogglePlay}
                aria-label={isPlaying ? 'Pause playback' : 'Play track'}
                className="relative z-10 min-h-[54px] min-w-[54px] flex items-center justify-center rounded-full bg-[#E64A19] text-white hover:bg-[#FF5722] active:scale-95 transition-all cursor-pointer shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5722] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1E222B]"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" />
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={onNext}
              aria-label="Next track"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-200 hover:text-white hover:bg-[#262B36] transition-colors cursor-pointer"
            >
              <SkipForward className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={onCycleRepeat}
              aria-label={`Repeat mode: ${repeatMode}`}
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                repeatMode !== 'off'
                  ? 'text-[#FF5722] bg-[#FF5722]/15'
                  : 'text-slate-400 hover:text-white hover:bg-[#262B36]'
              }`}
            >
              {repeatMode === 'one' ? (
                <Repeat1 className="w-4 h-4" />
              ) : (
                <Repeat className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-40">
            <button
              type="button"
              onClick={() => onVolumeChange(volume === 0 ? 0.8 : 0)}
              aria-label={volume === 0 ? 'Unmute' : 'Mute'}
              className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
            >
              {volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={volume}
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              aria-label="Output volume"
              className="w-full accent-[#FF5722] cursor-pointer h-1.5"
            />
          </div>
        </div>
      </div>

      {/* Right Column: Playback Queue & Local File Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={handleDrop}
        className={`lg:col-span-5 bg-[#1E222B] border rounded-2xl overflow-hidden transition-colors ${
          isDraggingOver ? 'border-[#FF5722] bg-[#242935]' : 'border-[#2A303D]'
        }`}
      >
        <div className="px-5 py-4 border-b border-[#2A303D] flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-white">
              Library Queue
            </h2>
            <p className="text-xs text-slate-400 font-mono tabular-nums">
              {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                onUploadFiles(e.target.files);
                e.target.value = '';
              }
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-lg border border-[#2F3644] bg-[#161920] text-xs font-medium text-slate-200 hover:bg-[#262B36] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Upload className="w-3.5 h-3.5 text-[#FF5722]" aria-hidden="true" />
            <span>Add Audio</span>
          </button>
        </div>

        <div className="divide-y divide-[#272C38] max-h-[460px] overflow-y-auto">
          {tracks.map((track, idx) => {
            const active = track.id === currentTrack.id;
            return (
              <button
                key={track.id}
                type="button"
                onClick={() => onSelectTrack(track.id)}
                className={`w-full text-left px-5 py-3.5 flex items-center justify-between gap-4 transition-colors cursor-pointer min-h-[64px] ${
                  active ? 'bg-[#262B38]' : 'hover:bg-[#232732]'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <span
                    className={`w-5 text-xs font-mono tabular-nums shrink-0 ${
                      active && isPlaying ? 'text-[#FF5722]' : 'text-slate-500'
                    }`}
                  >
                    {active && isPlaying ? '▶' : String(idx + 1).padStart(2, '0')}
                  </span>

                  <div className="w-10 h-10 rounded-md overflow-hidden border border-[#2F3644] bg-[#14171D] shrink-0 flex items-center justify-center">
                    {track.coverUrl && !imgFailed[track.id] ? (
                      <img
                        src={track.coverUrl}
                        alt=""
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setImgFailed((prev) => ({ ...prev, [track.id]: true }))
                        }
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Disc3 className="w-4 h-4 text-slate-500" aria-hidden="true" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p
                      className={`text-sm truncate ${
                        active
                          ? 'font-semibold text-[#FF784E]'
                          : 'font-medium text-slate-100'
                      }`}
                    >
                      {track.title}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {track.artist} · {track.format}
                    </p>
                  </div>
                </div>

                <span className="text-xs font-mono text-slate-400 tabular-nums shrink-0">
                  {formatClock(track.durationSeconds)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="px-5 py-3 bg-[#171A21] border-t border-[#2A303D] text-xs text-slate-400">
          Drop MP3, FLAC, WAV, or OGG files anywhere in the queue to parse embedded ID3 tags.
        </div>
      </div>

      {/* Track Technical Info Dialog */}
      {showInfoDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="track-info-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
          onClick={() => setShowInfoDialog(false)}
        >
          <div
            className="w-full max-w-md bg-[#1E222B] border border-[#2F3644] rounded-2xl p-6 space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b border-[#2A303D] pb-4">
              <h2 id="track-info-title" className="font-display text-lg font-semibold text-white">
                Track Specifications
              </h2>
              <button
                type="button"
                onClick={() => setShowInfoDialog(false)}
                aria-label="Close track specifications"
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-[#2A303D] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <dl className="space-y-2.5 text-sm">
              {[
                ['Title', currentTrack.title],
                ['Artist', currentTrack.artist],
                ['Album', currentTrack.album],
                ['Genre', currentTrack.genre || 'Unknown'],
                ['Year', currentTrack.year || 'Unknown'],
                ['Duration', formatClock(currentTrack.durationSeconds)],
                ['Bitrate', currentTrack.bitrate],
                ['Sample Rate', currentTrack.sampleRate],
                ['File Size', formatFileSize(currentTrack.fileSizeBytes)],
                ['MIME Type', currentTrack.mimeType],
              ].map(([label, val]) => (
                <div key={label} className="flex items-center justify-between gap-4">
                  <dt className="text-slate-400 shrink-0">{label}</dt>
                  <dd className="font-mono text-xs text-slate-100 text-right truncate tabular-nums">
                    {val}
                  </dd>
                </div>
              ))}
              <div className="pt-2 border-t border-[#2A303D]">
                <dt className="text-slate-400 text-xs mb-1">File Path</dt>
                <dd className="font-mono text-[11px] text-slate-300 break-all">
                  {currentTrack.filePath}
                </dd>
              </div>
            </dl>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#2A303D]">
              <button
                type="button"
                onClick={() => setShowInfoDialog(false)}
                className="min-h-[40px] px-4 py-2 rounded-lg border border-[#2F3644] text-xs font-medium text-slate-300 hover:bg-[#262B36] cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowInfoDialog(false);
                  onOpenTagEditor();
                }}
                className="min-h-[40px] px-4 py-2 rounded-lg bg-[#D84315] text-white text-xs font-medium hover:bg-[#E64A19] cursor-pointer"
              >
                Edit Tags in Scroll
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
