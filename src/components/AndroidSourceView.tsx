import { useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import { ANDROID_PROJECT_FILES } from '../data/androidComposeProject';
import { AndroidFileId } from '../types/music';

const FILE_ORDER: AndroidFileId[] = [
  'app/build.gradle.kts',
  'AndroidManifest.xml',
  'model/Song.kt',
  'MainActivity.kt',
  'service/PlaybackService.kt',
  'audio/PlayerConnection.kt',
  'audio/AudioEffectsController.kt',
  'data/AudioRepository.kt',
  'data/TagEditorRepository.kt',
  'viewmodel/MusicPlayerViewModel.kt',
  'util/SongFormatUtils.kt',
  'ui/NowPlayingScreen.kt',
  'ui/NinjaMusicPlayerRoot.kt',
  'ui/components/PulsingChakraButton.kt',
  'ui/components/SealEqualizerNode.kt',
  'ui/components/SpatialEqualizerBottomSheet.kt',
  'ui/components/ParchmentTagEditorScreen.kt',
  'ui/TagEditorSheet.kt',
];

export function AndroidSourceView() {
  const [selectedFile, setSelectedFile] = useState<AndroidFileId>(
    'audio/AudioEffectsController.kt',
  );
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

  return (
    <section aria-label="Android Jetpack Compose source code" className="py-8 space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
          Jetpack Compose Project Source
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          com.yourapp.musicplayer · Media3 1.11.1 · JAudioTagger 3.0.1 · Coil Compose 2.7.0
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* File Tree */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-2 space-y-1">
          {FILE_ORDER.map((fileId) => {
            const active = selectedFile === fileId;
            return (
              <button
                key={fileId}
                type="button"
                onClick={() => setSelectedFile(fileId)}
                className={`w-full text-left min-h-[40px] px-3 py-2 rounded-lg text-xs font-mono transition-colors truncate cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white font-medium'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {fileId}
              </button>
            );
          })}
        </div>

        {/* Code Viewer */}
        <div className="lg:col-span-9 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-xs font-medium text-slate-900 truncate">
                {selectedFile}
              </p>
              <p className="font-mono text-[11px] text-slate-500 tabular-nums">
                {lines.length} lines
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Download</span>
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
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

          <div className="overflow-x-auto bg-slate-950 text-slate-100 p-4 text-[13px] leading-6 font-mono max-h-[640px] overflow-y-auto">
            <table className="w-full border-collapse">
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/70">
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
