import React, { useEffect, useRef, useState } from 'react';
import { Check, Disc3, Download, ImagePlus, RotateCcw } from 'lucide-react';
import { AudioTrack } from '../types/music';

interface TagEditorPanelProps {
  tracks: AudioTrack[];
  activeTrack: AudioTrack | null;
  onSelectTrack: (trackId: string) => void;
  onSaveTags: (trackId: string, updated: Partial<AudioTrack>) => void;
}

export function TagEditorPanel({
  tracks,
  activeTrack,
  onSelectTrack,
  onSaveTags,
}: TagEditorPanelProps) {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [albumArtist, setAlbumArtist] = useState('');
  const [year, setYear] = useState('');
  const [genre, setGenre] = useState('');
  const [trackNumber, setTrackNumber] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [savedNotice, setSavedNotice] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!activeTrack) return;
    setTitle(activeTrack.title);
    setArtist(activeTrack.artist);
    setAlbum(activeTrack.album);
    setAlbumArtist(activeTrack.albumArtist);
    setYear(activeTrack.year);
    setGenre(activeTrack.genre);
    setTrackNumber(activeTrack.trackNumber);
    setLyrics(activeTrack.lyrics);
    setCoverUrl(activeTrack.coverUrl);
    setSavedNotice(false);
  }, [activeTrack]);

  if (!activeTrack) {
    return (
      <section className="py-20 text-center">
        <h1 className="font-display text-2xl font-semibold text-white">
          No Track Selected
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Select or upload an audio file in the Player tab to edit its embedded metadata tags.
        </p>
      </section>
    );
  }

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCoverUrl(url);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveTags(activeTrack.id, {
      title: title.trim() || activeTrack.title,
      artist: artist.trim() || 'Unknown Artist',
      album: album.trim() || 'Unknown Album',
      albumArtist: albumArtist.trim(),
      year: year.trim(),
      genre: genre.trim(),
      trackNumber: trackNumber.trim(),
      lyrics,
      coverUrl,
    });
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2000);
  };

  const handleResetFields = () => {
    setTitle(activeTrack.title);
    setArtist(activeTrack.artist);
    setAlbum(activeTrack.album);
    setAlbumArtist(activeTrack.albumArtist);
    setYear(activeTrack.year);
    setGenre(activeTrack.genre);
    setTrackNumber(activeTrack.trackNumber);
    setLyrics(activeTrack.lyrics);
    setCoverUrl(activeTrack.coverUrl);
  };

  const handleExportMetadataJson = () => {
    const payload = {
      fileName: activeTrack.fileName,
      format: activeTrack.format,
      fieldKeys: {
        TITLE: title,
        ARTIST: artist,
        ALBUM: album,
        ALBUM_ARTIST: albumArtist,
        YEAR: year,
        GENRE: genre,
        TRACK: trackNumber,
        LYRICS: lyrics,
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeTrack.fileName}.tags.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section aria-label="Makimono parchment tag editor" className="py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#2A303D] pb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            Makimono Metadata Scroll
          </h1>
          <p className="mt-1 text-sm text-slate-400 font-mono">
            {activeTrack.fileName} · {activeTrack.format} · JAudioTagger FieldKey Schema
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="tag-track-select" className="sr-only">
            Select track to edit
          </label>
          <select
            id="tag-track-select"
            value={activeTrack.id}
            onChange={(e) => onSelectTrack(e.target.value)}
            className="min-h-[40px] px-3 py-1.5 rounded-lg border border-[#2F3644] bg-[#1E222B] text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#FF5722]"
          >
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} — {t.artist}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleExportMetadataJson}
            className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-lg border border-[#2F3644] bg-[#1E222B] text-xs font-medium text-slate-200 hover:bg-[#262B36] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-[#FF5722]" aria-hidden="true" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Makimono Scroll Container */}
      <div className="flex flex-col items-center">
        {/* Top Wooden Scroll Roller */}
        <div
          aria-hidden="true"
          className="w-[92%] max-w-4xl h-4 rounded-full bg-gradient-to-b from-[#735233] to-[#593E25] border border-[#3E2A18] shadow-md"
        />

        <form
          onSubmit={handleSubmit}
          className="w-full bg-[#F7F2E7] border-2 border-[#8C6D46] rounded-xl p-6 sm:p-8 text-[#2C221E] shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
        >
          {/* Artwork & Technical Specs Column */}
          <div className="lg:col-span-4 space-y-4">
            <h2 className="font-display text-base font-semibold text-[#2C221E]">
              Embedded Artwork (APIC)
            </h2>
            <div className="aspect-square w-full rounded-xl overflow-hidden border-2 border-[#8C6D46]/50 bg-[#EFE6D2] flex items-center justify-center">
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt="Album artwork preview"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Disc3 className="w-10 h-10 text-[#8C6D46]" />
              )}
            </div>

            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverUpload}
            />
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="w-full inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-lg border border-[#8C6D46] bg-[#EFE6D2] text-sm font-medium text-[#2C221E] hover:bg-[#E5D9BF] transition-colors cursor-pointer"
            >
              <ImagePlus className="w-4 h-4 text-[#593E25]" aria-hidden="true" />
              <span>Replace Cover Art</span>
            </button>

            <div className="pt-3 border-t border-[#8C6D46]/30 space-y-1.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#6E5336]">MIME Type</span>
                <span className="font-mono text-[#2C221E]">{activeTrack.mimeType}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#6E5336]">Bitrate</span>
                <span className="font-mono text-[#2C221E] tabular-nums">{activeTrack.bitrate}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#6E5336]">Sample Rate</span>
                <span className="font-mono text-[#2C221E] tabular-nums">{activeTrack.sampleRate}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#6E5336]">Duration</span>
                <span className="font-mono text-[#2C221E] tabular-nums">
                  {Math.floor(activeTrack.durationSeconds / 60)}:
                  {(activeTrack.durationSeconds % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#6E5336]">File Size</span>
                <span className="font-mono text-[#2C221E] tabular-nums">
                  {activeTrack.fileSizeBytes >= 1024 * 1024
                    ? `${(activeTrack.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB`
                    : `${(activeTrack.fileSizeBytes / 1024).toFixed(1)} KB`}
                </span>
              </div>
              <div className="pt-1">
                <span className="block text-[#6E5336] mb-0.5">File Path</span>
                <span className="block font-mono text-[11px] text-[#43332B] break-all">
                  {activeTrack.filePath}
                </span>
              </div>
            </div>
          </div>

          {/* Calligraphic Ink Tag Fields Column */}
          <div className="lg:col-span-8 space-y-5">
            <div className="border-b border-[#8C6D46]/30 pb-3">
              <h2 className="font-display text-lg font-bold tracking-wide text-[#2C221E]">
                Rouleau de Métadonnées
              </h2>
              <p className="text-xs text-[#6E5336]">
                Edit ID3v2 / Vorbis Comment frames before committing to audio storage
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="tag-title"
                  className="block text-xs font-semibold text-[#593E25] mb-1.5"
                >
                  Title <span className="font-mono text-[#8C6D46]">TIT2</span>
                </label>
                <input
                  id="tag-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-lg border border-[#8C6D46]/60 bg-[#EFE6D2] text-sm text-[#2C221E] focus:outline-none focus:ring-2 focus:ring-[#593E25]"
                />
              </div>

              <div>
                <label
                  htmlFor="tag-artist"
                  className="block text-xs font-semibold text-[#593E25] mb-1.5"
                >
                  Artist <span className="font-mono text-[#8C6D46]">TPE1</span>
                </label>
                <input
                  id="tag-artist"
                  type="text"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-lg border border-[#8C6D46]/60 bg-[#EFE6D2] text-sm text-[#2C221E] focus:outline-none focus:ring-2 focus:ring-[#593E25]"
                />
              </div>

              <div>
                <label
                  htmlFor="tag-album"
                  className="block text-xs font-semibold text-[#593E25] mb-1.5"
                >
                  Album <span className="font-mono text-[#8C6D46]">TALB</span>
                </label>
                <input
                  id="tag-album"
                  type="text"
                  value={album}
                  onChange={(e) => setAlbum(e.target.value)}
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-lg border border-[#8C6D46]/60 bg-[#EFE6D2] text-sm text-[#2C221E] focus:outline-none focus:ring-2 focus:ring-[#593E25]"
                />
              </div>

              <div>
                <label
                  htmlFor="tag-album-artist"
                  className="block text-xs font-semibold text-[#593E25] mb-1.5"
                >
                  Album Artist <span className="font-mono text-[#8C6D46]">TPE2</span>
                </label>
                <input
                  id="tag-album-artist"
                  type="text"
                  value={albumArtist}
                  onChange={(e) => setAlbumArtist(e.target.value)}
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-lg border border-[#8C6D46]/60 bg-[#EFE6D2] text-sm text-[#2C221E] focus:outline-none focus:ring-2 focus:ring-[#593E25]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="tag-year"
                  className="block text-xs font-semibold text-[#593E25] mb-1.5"
                >
                  Year <span className="font-mono text-[#8C6D46]">TDRC</span>
                </label>
                <input
                  id="tag-year"
                  type="text"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-lg border border-[#8C6D46]/60 bg-[#EFE6D2] text-sm font-mono tabular-nums text-[#2C221E] focus:outline-none focus:ring-2 focus:ring-[#593E25]"
                />
              </div>

              <div>
                <label
                  htmlFor="tag-track"
                  className="block text-xs font-semibold text-[#593E25] mb-1.5"
                >
                  Track # <span className="font-mono text-[#8C6D46]">TRCK</span>
                </label>
                <input
                  id="tag-track"
                  type="text"
                  value={trackNumber}
                  onChange={(e) => setTrackNumber(e.target.value)}
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-lg border border-[#8C6D46]/60 bg-[#EFE6D2] text-sm font-mono tabular-nums text-[#2C221E] focus:outline-none focus:ring-2 focus:ring-[#593E25]"
                />
              </div>

              <div>
                <label
                  htmlFor="tag-genre"
                  className="block text-xs font-semibold text-[#593E25] mb-1.5"
                >
                  Genre <span className="font-mono text-[#8C6D46]">TCON</span>
                </label>
                <input
                  id="tag-genre"
                  type="text"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-lg border border-[#8C6D46]/60 bg-[#EFE6D2] text-sm text-[#2C221E] focus:outline-none focus:ring-2 focus:ring-[#593E25]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="tag-lyrics"
                className="block text-xs font-semibold text-[#593E25] mb-1.5"
              >
                Unsynced Lyrics <span className="font-mono text-[#8C6D46]">USLT</span>
              </label>
              <textarea
                id="tag-lyrics"
                rows={4}
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#8C6D46]/60 bg-[#EFE6D2] text-sm text-[#2C221E] focus:outline-none focus:ring-2 focus:ring-[#593E25] resize-y"
              />
            </div>

            <div className="pt-3 border-t border-[#8C6D46]/30 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleResetFields}
                className="inline-flex items-center gap-1.5 min-h-[42px] px-4 py-2 rounded-lg border border-[#8C6D46] bg-[#EFE6D2] text-sm font-medium text-[#2C221E] hover:bg-[#E5D9BF] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                <span>Revert</span>
              </button>

              <div className="flex items-center gap-3">
                {savedNotice && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#593E25]">
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Tags inscribed</span>
                  </span>
                )}
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 rounded-lg bg-[#593E25] text-[#F7F2E7] text-sm font-medium hover:bg-[#46301C] transition-colors cursor-pointer whitespace-nowrap"
                >
                  Save Embedded Tags
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Bottom Wooden Scroll Roller */}
        <div
          aria-hidden="true"
          className="w-[92%] max-w-4xl h-4 rounded-full bg-gradient-to-b from-[#735233] to-[#593E25] border border-[#3E2A18] shadow-md"
        />
      </div>
    </section>
  );
}
