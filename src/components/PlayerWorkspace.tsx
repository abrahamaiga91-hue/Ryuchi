import React, { useEffect, useRef, useState } from 'react';
import {
  Disc3,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Tag,
  Upload,
  Volume2,
  VolumeX,
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

  // Live Web Audio frequency spectrum
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
        const value = hasAudio ? buffer[i] / 255 : 0.04;
        const barHeight = Math.max(3, value * (height - 4));
        const x = i * (barWidth + gap);
        const y = height - barHeight;

        ctx.fillStyle = hasAudio ? '#0F766E' : '#CBD5E1';
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
        <h1 className="font-display text-2xl font-semibold text-slate-900">
          Empty Audio Queue
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Load local MP3, FLAC, WAV, or OGG files to start playback and inspect embedded tags.
        </p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-6 inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 cursor-pointer"
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
      {/* Left / Primary Now Playing Deck */}
      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-stretch">
          {/* Square Cover Artwork */}
          <div className="sm:col-span-5">
            <div className="aspect-square w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
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
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 p-4 text-center">
                  <Disc3 className="w-10 h-10 mb-2" aria-hidden="true" />
                  <span className="text-xs font-medium text-slate-500 truncate max-w-full">
                    {currentTrack.album}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Track Metadata & Quick Actions */}
          <div className="sm:col-span-7 flex flex-col justify-between gap-4 min-w-0">
            <div className="space-y-2">
              <p className="text-xs font-mono text-slate-500 truncate tabular-nums">
                {currentTrack.mimeType} · {currentTrack.bitrate} · {currentTrack.sampleRate}
                {currentTrack.year ? ` · ${currentTrack.year}` : ''}
              </p>
              <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 leading-tight text-balance">
                {currentTrack.title}
              </h1>
              <p className="text-base text-slate-700 truncate">
                {currentTrack.artist}
              </p>
              <p className="text-sm text-slate-500 truncate">
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
                className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Tag className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Edit Tags</span>
              </button>
              <button
                type="button"
                onClick={onOpenEqualizer}
                className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer whitespace-nowrap"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Equalizer</span>
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
            className="w-full accent-teal-700 cursor-pointer h-2 rounded-lg"
            style={{
              background: `linear-gradient(to right, #0F766E ${progressPercent}%, #E2E8F0 ${progressPercent}%)`,
            }}
          />
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 tabular-nums">
            <span>{formatClock(currentTime)}</span>
            <span>{formatClock(duration)}</span>
          </div>
        </div>

        {/* Transport & Volume Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onToggleShuffle}
              aria-label="Toggle shuffle"
              aria-pressed={shuffleEnabled}
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                shuffleEnabled
                  ? 'text-teal-700 bg-teal-50'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onPrevious}
              aria-label="Previous track"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={onTogglePlay}
              aria-label={isPlaying ? 'Pause playback' : 'Play track'}
              className="min-h-[52px] min-w-[52px] flex items-center justify-center rounded-full bg-slate-900 text-white hover:bg-slate-800 active:scale-95 transition-all cursor-pointer shadow-sm"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={onNext}
              aria-label="Next track"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <SkipForward className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={onCycleRepeat}
              aria-label={`Repeat mode: ${repeatMode}`}
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                repeatMode !== 'off'
                  ? 'text-teal-700 bg-teal-50'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
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
              className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-500 hover:text-slate-900 cursor-pointer"
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
              className="w-full accent-slate-900 cursor-pointer h-1.5"
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
        className={`lg:col-span-5 bg-white border rounded-2xl overflow-hidden transition-colors ${
          isDraggingOver ? 'border-teal-600 bg-teal-50/30' : 'border-slate-200'
        }`}
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Library Queue
            </h2>
            <p className="text-xs text-slate-500 font-mono tabular-nums">
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
            className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Upload className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Add Audio</span>
          </button>
        </div>

        <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
          {tracks.map((track, idx) => {
            const active = track.id === currentTrack.id;
            return (
              <button
                key={track.id}
                type="button"
                onClick={() => onSelectTrack(track.id)}
                className={`w-full text-left px-5 py-3.5 flex items-center justify-between gap-4 transition-colors cursor-pointer min-h-[64px] ${
                  active ? 'bg-slate-100/80' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <span className="w-5 text-xs font-mono text-slate-400 tabular-nums shrink-0">
                    {active && isPlaying ? '▶' : String(idx + 1).padStart(2, '0')}
                  </span>

                  <div className="w-10 h-10 rounded-md overflow-hidden border border-slate-200 bg-slate-100 shrink-0 flex items-center justify-center">
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
                      <Disc3 className="w-4 h-4 text-slate-400" aria-hidden="true" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p
                      className={`text-sm truncate ${
                        active
                          ? 'font-semibold text-teal-800'
                          : 'font-medium text-slate-900'
                      }`}
                    >
                      {track.title}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {track.artist} · {track.format}
                    </p>
                  </div>
                </div>

                <span className="text-xs font-mono text-slate-500 tabular-nums shrink-0">
                  {formatClock(track.durationSeconds)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
          Drop MP3, FLAC, WAV, or OGG files anywhere in the queue to parse embedded ID3 tags.
        </div>
      </div>
    </section>
  );
}
