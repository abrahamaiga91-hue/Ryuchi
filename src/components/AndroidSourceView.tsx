import { useState } from 'react';
import { Archive, Check, Copy, Download } from 'lucide-react';
import { ANDROID_PROJECT_FILES } from '../data/androidComposeProject';
import { AndroidFileId } from '../types/music';
import { buildAndroidProjectZipBlob } from '../utils/zipExport';

const FILE_ORDER: AndroidFileId[] = [
  '.github/workflows/android-build.yml',
  '.gitignore',
  'README.md',
  'settings.gradle.kts',
  'build.gradle.kts',
  'gradle/libs.versions.toml',
  'gradle.properties',
  'app/build.gradle.kts',
  'AndroidManifest.xml',
  'res/values/themes.xml',
  'model/Song.kt',
  'MainActivity.kt',
  'service/PlaybackService.kt',
  'audio/PlayerConnection.kt',
  'audio/AudioEffectsController.kt',
  'data/AudioRepository.kt',
  'data/TagEditorRepository.kt',
  'viewmodel/MusicPlayerViewModel.kt',
  'util/SongFormatUtils.kt',
  'ui/ShinobiAppRoot.kt',
  'ui/components/PulsingChakraButton.kt',
  'ui/components/SealEqualizerNode.kt',
  'ui/components/SpatialEqualizerBottomSheet.kt',
  'ui/components/ParchmentTagEditorScreen.kt',
];

export function AndroidSourceView() {
  const [selectedFile, setSelectedFile] = useState<AndroidFileId>('MainActivity.kt');
  const [copied, setCopied] = useState(false);

  const code = ANDROID_PROJECT_FILES[selectedFile];
  const lines = code.split('\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleDownload = () => {
    const fileName = selectedFile.split('/').pop() || 'Source.kt';
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleDownloadRepoZip = () => {
    const blob = buildAndroidProjectZipBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'shinobi-music-player-android.zip';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section aria-label="Android Jetpack Compose source code" className="py-8 space-y-6">
      <div className="border-b border-[#2A303D] pb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            Jetpack Compose APK Source
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            com.shinobi.musicplayer · Media3 ExoPlayer · JAudioTagger 3.0.1 · Coil Compose
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadRepoZip}
          className="inline-flex items-center gap-2 min-h-[42px] px-4 py-2 rounded-lg bg-[#D84315] text-white text-xs font-medium hover:bg-[#E64A19] transition-colors cursor-pointer whitespace-nowrap"
        >
          <Archive className="w-4 h-4" aria-hidden="true" />
          <span>Download APK Project (.zip)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* File Tree */}
        <div className="lg:col-span-3 bg-[#1E222B] border border-[#2A303D] rounded-xl p-2 space-y-1 max-h-[700px] overflow-y-auto">
          {FILE_ORDER.map((fileId) => {
            const active = selectedFile === fileId;
            return (
              <button
                key={fileId}
                type="button"
                onClick={() => setSelectedFile(fileId)}
                className={`w-full text-left min-h-[40px] px-3 py-2 rounded-lg text-xs font-mono transition-colors truncate cursor-pointer ${
                  active
                    ? 'bg-[#D84315] text-white font-medium'
                    : 'text-slate-300 hover:bg-[#262B36] hover:text-white'
                }`}
              >
                {fileId}
              </button>
            );
          })}
        </div>

        {/* Code Viewer */}
        <div className="lg:col-span-9 bg-[#1E222B] border border-[#2A303D] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#2A303D] flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-xs font-medium text-white truncate">
                {selectedFile}
              </p>
              <p className="font-mono text-[11px] text-slate-400 tabular-nums">
                {lines.length} lines
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-lg border border-[#2F3644] bg-[#161920] text-xs font-medium text-slate-200 hover:bg-[#262B36] transition-colors cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5 text-[#FF5722]" aria-hidden="true" />
                <span>Download</span>
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-1.5 rounded-lg bg-[#D84315] text-white text-xs font-medium hover:bg-[#E64A19] transition-colors cursor-pointer whitespace-nowrap"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Copy File</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto bg-[#0E1014] text-slate-100 p-4 text-[13px] leading-6 font-mono max-h-[640px] overflow-y-auto">
            <table className="w-full border-collapse">
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={idx} className="hover:bg-[#191D25]">
                    <td className="select-none pr-4 text-right text-slate-600 tabular-nums w-10 align-top">
                      {idx + 1}
                    </td>
                    <td className="whitespace-pre text-slate-100">{line || ' '}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
