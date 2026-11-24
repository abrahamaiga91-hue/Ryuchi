import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { AndroidSourceView } from './components/AndroidSourceView';
import { EqualizerPanel } from './components/EqualizerPanel';
import { PlayerWorkspace } from './components/PlayerWorkspace';
import { TagEditorPanel } from './components/TagEditorPanel';
import { STARTER_TRACKS } from './data/starterTracks';
import {
  AudioTrack,
  EqBand,
  EqPresetId,
  MainTab,
  RepeatMode,
} from './types/music';
import {
  DEFAULT_EQ_BANDS,
  EQ_PRESETS,
  WebAudioPlayerEngine,
} from './utils/audioEngine';
import { parseAudioFileToTrack } from './utils/id3Parser';

export default function App() {
  const [tracks, setTracks] = useState<AudioTrack[]>(STARTER_TRACKS);
  const [currentTrackId, setCurrentTrackId] = useState<string>(STARTER_TRACKS[0].id);
  const [activeTab, setActiveTab] = useState<MainTab>('player');

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [volume, setVolume] = useState(0.78);

  const [eqEnabled, setEqEnabled] = useState(true);
  const [eqBands, setEqBands] = useState<EqBand[]>(DEFAULT_EQ_BANDS);
  const [activePreset, setActivePreset] = useState<EqPresetId>('Flat');
  const [bassBoostStrength, setBassBoostStrength] = useState(600);
  const [spatialAudioStrength, setSpatialAudioStrength] = useState(450);

  const engineRef = useRef<WebAudioPlayerEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new WebAudioPlayerEngine();
  }
  const engine = engineRef.current;

  const headerFileInputRef = useRef<HTMLInputElement>(null);

  const currentTrack = useMemo(
    () => tracks.find((t) => t.id === currentTrackId) ?? tracks[0] ?? null,
    [tracks, currentTrackId],
  );

  const handleNext = useCallback(() => {
    if (tracks.length === 0 || !currentTrack) return;
    if (repeatMode === 'one') {
      setCurrentTime(0);
      if (currentTrack.fileUrl) {
        engine.seekFile(0);
      }
      return;
    }

    const currentIdx = tracks.findIndex((t) => t.id === currentTrack.id);
    let nextIdx = 0;

    if (shuffleEnabled && tracks.length > 1) {
      do {
        nextIdx = Math.floor(Math.random() * tracks.length);
      } while (nextIdx === currentIdx);
    } else {
      nextIdx = currentIdx + 1;
      if (nextIdx >= tracks.length) {
        if (repeatMode === 'all') {
          nextIdx = 0;
        } else {
          setIsPlaying(false);
          setCurrentTime(0);
          engine.stopAll();
          return;
        }
      }
    }

    setCurrentTrackId(tracks[nextIdx].id);
    setCurrentTime(0);
  }, [tracks, currentTrack, repeatMode, shuffleEnabled, engine]);

  const handlePrevious = useCallback(() => {
    if (tracks.length === 0 || !currentTrack) return;
    if (currentTime > 4) {
      setCurrentTime(0);
      if (currentTrack.fileUrl) {
        engine.seekFile(0);
      }
      return;
    }
    const currentIdx = tracks.findIndex((t) => t.id === currentTrack.id);
    const prevIdx = (currentIdx - 1 + tracks.length) % tracks.length;
    setCurrentTrackId(tracks[prevIdx].id);
    setCurrentTime(0);
  }, [tracks, currentTrack, currentTime, engine]);

  useEffect(() => {
    if (!currentTrack || !isPlaying) {
      engine.stopAll();
      return;
    }

    if (currentTrack.fileUrl) {
      void engine.playFile(
        currentTrack.fileUrl,
        currentTime,
        (sec) => setCurrentTime(sec),
        () => handleNext(),
      );
    } else if (currentTrack.synthConfig) {
      void engine.playSynth(currentTrack.synthConfig);
    }

    return () => {
      engine.stopAll();
    };
    // Intentionally exclude currentTime so scrubber timer updates do not restart audio
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id, currentTrack?.fileUrl, isPlaying]);

  useEffect(() => {
    if (!isPlaying || !currentTrack || currentTrack.fileUrl) return;
    const timer = window.setInterval(() => {
      setCurrentTime((prev) => {
        if (prev + 1 >= currentTrack.durationSeconds) {
          window.setTimeout(() => handleNext(), 0);
          return 0;
        }
        return prev + 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isPlaying, currentTrack, handleNext]);

  useEffect(() => {
    return () => {
      engine.stopAll();
    };
  }, [engine]);

  const handleSelectTrack = (trackId: string) => {
    setCurrentTrackId(trackId);
    setCurrentTime(0);
    setIsPlaying(true);
  };

  const handleTogglePlay = async () => {
    await engine.resumeContext();
    setIsPlaying((prev) => !prev);
  };

  const handleSeek = (seconds: number) => {
    setCurrentTime(seconds);
    if (currentTrack?.fileUrl) {
      engine.seekFile(seconds);
    }
  };

  const handleVolumeChange = (nextVol: number) => {
    setVolume(nextVol);
    engine.setVolume(nextVol);
  };

  const handleToggleEq = (enabled: boolean) => {
    setEqEnabled(enabled);
    engine.setEqEnabled(enabled);
  };

  const handleSelectPreset = (preset: Exclude<EqPresetId, 'Custom'>) => {
    const gains = EQ_PRESETS[preset];
    if (!gains) return;
    setActivePreset(preset);
    setEqBands((prev) =>
      prev.map((band, idx) => {
        const g = gains[idx] ?? 0;
        engine.setBandGain(idx, g);
        return { ...band, gainDb: g };
      }),
    );
  };

  const handleBandChange = (index: number, gainDb: number) => {
    setActivePreset('Custom');
    engine.setBandGain(index, gainDb);
    setEqBands((prev) =>
      prev.map((band, idx) => (idx === index ? { ...band, gainDb } : band)),
    );
  };

  const handleBassBoostChange = (strength: number) => {
    setBassBoostStrength(strength);
    engine.setBassBoostStrength(strength);
  };

  const handleSpatialAudioChange = (strength: number) => {
    setSpatialAudioStrength(strength);
    engine.setSpatialAudioStrength(strength);
  };

  const handleResetEq = () => {
    handleSelectPreset('Flat');
    handleBassBoostChange(0);
    handleSpatialAudioChange(0);
  };

  const handleUploadFiles = async (fileList: FileList) => {
    const files = Array.from(fileList).filter(
      (f) =>
        f.type.startsWith('audio/') ||
        /\.(mp3|flac|wav|ogg|m4a|aac|opus)$/i.test(f.name),
    );
    if (files.length === 0) return;

    const fallbackCover = STARTER_TRACKS[0].coverUrl;
    const parsedTracks = await Promise.all(
      files.map((file) => parseAudioFileToTrack(file, fallbackCover)),
    );

    setTracks((prev) => [...parsedTracks, ...prev]);
    setCurrentTrackId(parsedTracks[0].id);
    setCurrentTime(0);
    setIsPlaying(true);
    setActiveTab('player');
  };

  const handleSaveTags = (trackId: string, updated: Partial<AudioTrack>) => {
    setTracks((prev) =>
      prev.map((track) => (track.id === trackId ? { ...track, ...updated } : track)),
    );
  };

  const navItems: Array<{ id: MainTab; label: string }> = [
    { id: 'player', label: 'Player' },
    { id: 'tags', label: 'Tag Editor' },
    { id: 'equalizer', label: 'Equalizer' },
    { id: 'source', label: 'Compose Source' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#121418] text-slate-100">
      {/* Top Bar: 3-Zone Contract */}
      <header className="sticky top-0 z-30 h-14 bg-[#121418]/90 backdrop-blur-md border-b border-[#242934]">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('player')}
            className="font-display text-base font-semibold tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5722] rounded-sm"
          >
            Shinobi Music Player
          </button>

          {/* Zone 2: Single-Line Navigation Links */}
          <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-7">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5722] rounded-sm ${
                    isActive
                      ? 'text-white underline underline-offset-8 decoration-2 decoration-[#FF5722]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="flex items-center shrink-0">
            <input
              ref={headerFileInputRef}
              type="file"
              accept="audio/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  void handleUploadFiles(e.target.files);
                  e.target.value = '';
                }
              }}
            />
            <button
              type="button"
              onClick={() => headerFileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 min-h-[38px] px-4 py-1.5 rounded-lg bg-[#D84315] text-white text-xs font-medium hover:bg-[#E64A19] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5722] focus-visible:ring-offset-2 focus-visible:ring-offset-[#121418]"
            >
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Open Audio Files</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Strip */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden border-b border-[#242934] bg-[#171A21] overflow-x-auto"
      >
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-5">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`min-h-[44px] text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                  isActive
                    ? 'border-[#FF5722] text-white'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6">
        {activeTab === 'player' && (
          <PlayerWorkspace
            tracks={tracks}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            currentTime={currentTime}
            shuffleEnabled={shuffleEnabled}
            repeatMode={repeatMode}
            volume={volume}
            engine={engine}
            onSelectTrack={handleSelectTrack}
            onTogglePlay={() => void handleTogglePlay()}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onSeek={handleSeek}
            onToggleShuffle={() => setShuffleEnabled((s) => !s)}
            onCycleRepeat={() =>
              setRepeatMode((prev) =>
                prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off',
              )
            }
            onVolumeChange={handleVolumeChange}
            onOpenTagEditor={() => setActiveTab('tags')}
            onOpenEqualizer={() => setActiveTab('equalizer')}
            onUploadFiles={(files) => void handleUploadFiles(files)}
          />
        )}

        {activeTab === 'tags' && (
          <TagEditorPanel
            tracks={tracks}
            activeTrack={currentTrack}
            onSelectTrack={(id) => setCurrentTrackId(id)}
            onSaveTags={handleSaveTags}
          />
        )}

        {activeTab === 'equalizer' && (
          <EqualizerPanel
            bands={eqBands}
            eqEnabled={eqEnabled}
            activePreset={activePreset}
            bassBoostStrength={bassBoostStrength}
            spatialAudioStrength={spatialAudioStrength}
            onToggleEq={handleToggleEq}
            onSelectPreset={handleSelectPreset}
            onBandChange={handleBandChange}
            onBassBoostChange={handleBassBoostChange}
            onSpatialAudioChange={handleSpatialAudioChange}
            onReset={handleResetEq}
          />
        )}

        {activeTab === 'source' && <AndroidSourceView />}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-[#242934] py-6 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <span>Shinobi Music Player · com.shinobi.musicplayer</span>
          <span className="font-mono">
            Media3 ExoPlayer · JAudioTagger 3.0.1 · Coil Compose
          </span>
        </div>
      </footer>
    </div>
  );
}
