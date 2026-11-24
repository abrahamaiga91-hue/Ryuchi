import { RotateCcw } from 'lucide-react';
import { EqBand, EqPresetId } from '../types/music';
import { EQ_PRESETS } from '../utils/audioEngine';

interface EqualizerPanelProps {
  bands: EqBand[];
  eqEnabled: boolean;
  activePreset: EqPresetId;
  bassBoostStrength: number;
  onToggleEq: (enabled: boolean) => void;
  onSelectPreset: (preset: Exclude<EqPresetId, 'Custom'>) => void;
  onBandChange: (index: number, gainDb: number) => void;
  onBassBoostChange: (strength: number) => void;
  onReset: () => void;
}

export function EqualizerPanel({
  bands,
  eqEnabled,
  activePreset,
  bassBoostStrength,
  onToggleEq,
  onSelectPreset,
  onBandChange,
  onBassBoostChange,
  onReset,
}: EqualizerPanelProps) {
  const presetNames = Object.keys(EQ_PRESETS) as Array<Exclude<EqPresetId, 'Custom'>>;

  // Build SVG path for frequency response curve
  const svgWidth = 800;
  const svgHeight = 140;
  const padX = 28;
  const padY = 18;
  const usableW = svgWidth - padX * 2;
  const usableH = svgHeight - padY * 2;

  const points = bands.map((band, index) => {
    const x = padX + (index / (bands.length - 1)) * usableW;
    const effectiveGain = eqEnabled ? band.gainDb : 0;
    const normalized = (12 - effectiveGain) / 24; // +12dB top, -12dB bottom
    const y = padY + normalized * usableH;
    return { x, y };
  });

  const linePath = points
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
    .join(' ');

  return (
    <section aria-label="10-band equalizer" className="py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
            10-Band Equalizer
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Real-time Web Audio BiquadFilterNode chain · Android AudioEffect Equalizer parity
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-medium text-slate-700">
              {eqEnabled ? 'EQ Active' : 'Bypassed'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={eqEnabled}
              aria-label="Toggle equalizer"
              onClick={() => onToggleEq(!eqEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 ${
                eqEnabled ? 'bg-teal-700' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                  eqEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Flatten</span>
          </button>
        </div>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-lg bg-slate-100 border border-slate-200/80">
          {presetNames.map((preset) => {
            const isActive = activePreset === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => onSelectPreset(preset)}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {preset}
              </button>
            );
          })}
          {activePreset === 'Custom' && (
            <span className="px-3 py-1.5 text-xs font-medium text-teal-800">
              Custom
            </span>
          )}
        </div>
      </div>

      {/* Frequency Curve & 10-Band Faders */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-8">
        {/* Response Curve SVG */}
        <div className="w-full overflow-hidden rounded-xl border border-slate-100 bg-slate-50/70 p-3">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-36"
            role="img"
            aria-label="Equalizer frequency response curve"
          >
            {/* 0 dB center reference line */}
            <line
              x1={padX}
              y1={svgHeight / 2}
              x2={svgWidth - padX}
              y2={svgHeight / 2}
              stroke="#CBD5E1"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
            <path
              d={linePath}
              fill="none"
              stroke={eqEnabled ? '#0F766E' : '#94A3B8'}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {points.map((pt, idx) => (
              <circle
                key={bands[idx].frequencyHz}
                cx={pt.x}
                cy={pt.y}
                r="4"
                fill={eqEnabled ? '#0F766E' : '#94A3B8'}
              />
            ))}
          </svg>
        </div>

        {/* 10 Band Sliders */}
        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-4">
          {bands.map((band, index) => (
            <div
              key={band.frequencyHz}
              className="flex flex-col items-center p-3 rounded-xl border border-slate-100 bg-slate-50/50 space-y-3"
            >
              <span className="font-mono text-xs font-medium text-slate-900 tabular-nums">
                {band.gainDb > 0 ? `+${band.gainDb.toFixed(1)}` : band.gainDb.toFixed(1)} dB
              </span>

              <input
                type="range"
                min={-12}
                max={12}
                step={0.5}
                value={band.gainDb}
                disabled={!eqEnabled}
                onChange={(e) => onBandChange(index, Number(e.target.value))}
                aria-label={`${band.label} gain`}
                className="w-full accent-teal-700 cursor-pointer disabled:opacity-40"
              />

              <span className="font-mono text-[11px] text-slate-500 whitespace-nowrap">
                {band.label}
              </span>
            </div>
          ))}
        </div>

        {/* Bass Boost (0..1000) */}
        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <label
              htmlFor="bass-boost-slider"
              className="block text-sm font-medium text-slate-900"
            >
              Bass Boost
            </label>
            <p className="text-xs text-slate-500">
              Low-shelf DSP gain matching Android BassBoost strength (0–1000)
            </p>
          </div>
          <div className="flex items-center gap-4 w-full sm:w-80">
            <input
              id="bass-boost-slider"
              type="range"
              min={0}
              max={1000}
              step={25}
              value={bassBoostStrength}
              disabled={!eqEnabled}
              onChange={(e) => onBassBoostChange(Number(e.target.value))}
              className="w-full accent-teal-700 cursor-pointer disabled:opacity-40"
            />
            <span className="font-mono text-xs font-medium text-slate-900 tabular-nums w-20 text-right shrink-0">
              {bassBoostStrength} / 1000
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
