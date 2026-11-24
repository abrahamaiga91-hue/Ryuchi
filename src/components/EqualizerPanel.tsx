import React, { useRef } from 'react';
import { RotateCcw } from 'lucide-react';
import { EqBand, EqPresetId } from '../types/music';
import { EQ_PRESETS } from '../utils/audioEngine';

interface EqualizerPanelProps {
  bands: EqBand[];
  eqEnabled: boolean;
  activePreset: EqPresetId;
  bassBoostStrength: number; // 0..2000
  spatialAudioStrength: number; // 0..1000
  onToggleEq: (enabled: boolean) => void;
  onSelectPreset: (preset: Exclude<EqPresetId, 'Custom'>) => void;
  onBandChange: (index: number, gainDb: number) => void;
  onBassBoostChange: (strength: number) => void;
  onSpatialAudioChange: (strength: number) => void;
  onReset: () => void;
}

interface SealNodeDialProps {
  band: EqBand;
  disabled: boolean;
  onChange: (nextGainDb: number) => void;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = Math.abs(endAngle - startAngle) <= 180 ? '0' : '1';
  return ['M', start.x, start.y, 'A', r, r, 0, largeArcFlag, 0, end.x, end.y].join(' ');
}

function SealNodeDial({ band, disabled, onChange }: SealNodeDialProps) {
  const dragStartRef = useRef<{ y: number; x: number; startGain: number } | null>(null);

  // Map -12..+12 dB to -135°..+135°
  const clamped = Math.max(-12, Math.min(12, band.gainDb));
  const normalized = (clamped + 12) / 24;
  const angleDeg = normalized * 270 - 135;

  const cx = 56;
  const cy = 56;
  const radius = 42;
  const trackArc = describeArc(cx, cy, radius, -135, 135);
  const activeArc =
    angleDeg > -134.5 ? describeArc(cx, cy, radius, -135, angleDeg) : '';
  const knobPos = polarToCartesian(cx, cy, radius - 9, angleDeg);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startGain: clamped,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || !dragStartRef.current) return;
    const dy = dragStartRef.current.y - e.clientY;
    const dx = e.clientX - dragStartRef.current.x;
    const delta = (dy + dx * 0.6) / 6;
    const stepped = Math.round((dragStartRef.current.startGain + delta) * 2) / 2;
    onChange(Math.max(-12, Math.min(12, stepped)));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore if already released
      }
      dragStartRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault();
      onChange(Math.min(12, clamped + 0.5));
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault();
      onChange(Math.max(-12, clamped - 0.5));
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChange(-12);
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange(12);
    }
  };

  return (
    <div className="flex flex-col items-center p-4 rounded-xl border border-[#2A303D] bg-[#161920] space-y-3">
      <div
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={`${band.label} circular seal gain`}
        aria-valuemin={-12}
        aria-valuemax={12}
        aria-valuenow={clamped}
        aria-disabled={disabled}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        className={`relative w-28 h-28 select-none touch-none rounded-full flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5722] ${
          disabled ? 'opacity-45 cursor-not-allowed' : 'cursor-ns-resize'
        }`}
      >
        <svg viewBox="0 0 112 112" className="w-full h-full">
          {/* Outer subtle seal track */}
          <path
            d={trackArc}
            fill="none"
            stroke="#2A303D"
            strokeWidth="5"
            strokeLinecap="round"
          />
          {/* Active Chakra Orange energy arc */}
          {activeArc && (
            <path
              d={activeArc}
              fill="none"
              stroke={disabled ? '#64748B' : '#FF5722'}
              strokeWidth="5"
              strokeLinecap="round"
            />
          )}
          {/* Inner seal boundary */}
          <circle
            cx={cx}
            cy={cy}
            r={28}
            fill="#1E222B"
            stroke="#2A303D"
            strokeWidth="1"
          />
          {/* Core indicator node */}
          <circle
            cx={knobPos.x}
            cy={knobPos.y}
            r="4"
            fill={disabled ? '#64748B' : '#FF5722'}
          />
        </svg>

        <span className="absolute font-mono text-xs font-medium text-white tabular-nums pointer-events-none">
          {clamped > 0 ? `+${clamped.toFixed(1)}` : clamped.toFixed(1)}
        </span>
      </div>

      {/* Precision accessible slider fallback for fine clicks */}
      <input
        type="range"
        min={-12}
        max={12}
        step={0.5}
        value={clamped}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={`${band.label} gain slider`}
        className="w-full accent-[#FF5722] cursor-pointer disabled:opacity-40"
      />

      <span className="font-mono text-xs text-slate-300 whitespace-nowrap">
        {band.label}
      </span>
    </div>
  );
}

export function EqualizerPanel({
  bands,
  eqEnabled,
  activePreset,
  bassBoostStrength,
  spatialAudioStrength,
  onToggleEq,
  onSelectPreset,
  onBandChange,
  onBassBoostChange,
  onSpatialAudioChange,
  onReset,
}: EqualizerPanelProps) {
  const presetNames = Object.keys(EQ_PRESETS) as Array<Exclude<EqPresetId, 'Custom'>>;

  // Build SVG path for frequency response curve
  const svgWidth = 800;
  const svgHeight = 140;
  const padX = 36;
  const padY = 18;
  const usableW = svgWidth - padX * 2;
  const usableH = svgHeight - padY * 2;

  const points = bands.map((band, index) => {
    const x = padX + (index / Math.max(1, bands.length - 1)) * usableW;
    const effectiveGain = eqEnabled ? band.gainDb : 0;
    const normalized = (12 - effectiveGain) / 24;
    const y = padY + normalized * usableH;
    return { x, y };
  });

  const linePath = points
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
    .join(' ');

  return (
    <section aria-label="3D Spatial Matrix and Circular Seal Equalizer" className="py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#2A303D] pb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            3D Matrix &amp; Seal Equalizer
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            5-band Circular Seal DSP · 3D Spatial Virtualizer · Extended Sub-Bass Boost
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-medium text-slate-200">
              {eqEnabled ? 'DSP Active' : 'Bypassed'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={eqEnabled}
              aria-label="Toggle equalizer and spatial audio"
              onClick={() => onToggleEq(!eqEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5722] ${
                eqEnabled ? 'bg-[#E64A19]' : 'bg-[#2E3544]'
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
            className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-1.5 rounded-lg border border-[#2F3644] bg-[#1E222B] text-xs font-medium text-slate-200 hover:bg-[#262B36] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#FF5722]" aria-hidden="true" />
            <span>Flatten</span>
          </button>
        </div>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#1A1E26] border border-[#2A303D]">
          {presetNames.map((preset) => {
            const isActive = activePreset === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => onSelectPreset(preset)}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#E64A19] text-white'
                    : 'text-slate-300 hover:text-white hover:bg-[#252A36]'
                }`}
              >
                {preset}
              </button>
            );
          })}
          {activePreset === 'Custom' && (
            <span className="px-3 py-1.5 text-xs font-medium text-[#FF784E]">
              Custom
            </span>
          )}
        </div>
      </div>

      {/* Frequency Curve & 5 Circular Seal Nodes */}
      <div className="bg-[#1E222B] border border-[#2A303D] rounded-2xl p-6 space-y-8">
        <div className="w-full overflow-hidden rounded-xl border border-[#2A303D] bg-[#14171D] p-3">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-36"
            role="img"
            aria-label="Equalizer frequency response curve"
          >
            <line
              x1={padX}
              y1={svgHeight / 2}
              x2={svgWidth - padX}
              y2={svgHeight / 2}
              stroke="#2E3544"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
            <path
              d={linePath}
              fill="none"
              stroke={eqEnabled ? '#FF5722' : '#64748B'}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {points.map((pt, idx) => (
              <circle
                key={bands[idx].frequencyHz}
                cx={pt.x}
                cy={pt.y}
                r="4.5"
                fill={eqEnabled ? '#FF5722' : '#64748B'}
              />
            ))}
          </svg>
        </div>

        {/* 5 Circular Seal Nodes */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {bands.map((band, index) => (
            <SealNodeDial
              key={band.frequencyHz}
              band={band}
              disabled={!eqEnabled}
              onChange={(nextGainDb) => onBandChange(index, nextGainDb)}
            />
          ))}
        </div>

        {/* 3D Spatial Audio & Extended Sub-Bass */}
        <div className="pt-6 border-t border-[#2A303D] grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <label
                  htmlFor="spatial-audio-slider"
                  className="block text-sm font-medium text-white"
                >
                  3D Spatial Audio Field (HD)
                </label>
                <p className="text-xs text-slate-400">
                  Stereo virtualizer cross-delay stage (0–1000)
                </p>
              </div>
              <span className="font-mono text-xs font-medium text-[#FF784E] tabular-nums shrink-0">
                {Math.round(spatialAudioStrength / 10)}%
              </span>
            </div>
            <input
              id="spatial-audio-slider"
              type="range"
              min={0}
              max={1000}
              step={25}
              value={spatialAudioStrength}
              disabled={!eqEnabled}
              onChange={(e) => onSpatialAudioChange(Number(e.target.value))}
              className="w-full accent-[#FF5722] cursor-pointer disabled:opacity-40"
            />
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <label
                  htmlFor="bass-boost-slider"
                  className="block text-sm font-medium text-white"
                >
                  Extended Sub-Bass Boost
                </label>
                <p className="text-xs text-slate-400">
                  Deep low-shelf resonance matching Android BassBoost (0–2000)
                </p>
              </div>
              <span className="font-mono text-xs font-medium text-[#FF784E] tabular-nums shrink-0">
                {Math.round(bassBoostStrength / 20)}%
              </span>
            </div>
            <input
              id="bass-boost-slider"
              type="range"
              min={0}
              max={2000}
              step={50}
              value={bassBoostStrength}
              disabled={!eqEnabled}
              onChange={(e) => onBassBoostChange(Number(e.target.value))}
              className="w-full accent-[#FF5722] cursor-pointer disabled:opacity-40"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
