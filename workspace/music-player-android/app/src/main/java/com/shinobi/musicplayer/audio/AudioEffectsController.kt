package com.shinobi.musicplayer.audio

import android.content.Context
import android.media.audiofx.BassBoost
import android.media.audiofx.Equalizer
import android.media.audiofx.Virtualizer
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

data class EqualizerBand(
    val index: Short,
    val centerFreqHz: Int,
    val label: String,
    val currentLevelMb: Short
)

data class EqualizerUiState(
    val isEnabled: Boolean = false,
    val minLevelMb: Short = -1500,
    val maxLevelMb: Short = 1500,
    val bands: List<EqualizerBand> = emptyList(),
    val presets: List<String> = emptyList(),
    val selectedPresetIndex: Int = -1,
    val bassBoostStrength: Short = 0,
    val spatialAudioStrength: Short = 0
)

class AudioEffectsController(context: Context) {
    private val prefs = context.getSharedPreferences("shinobi_eq", Context.MODE_PRIVATE)
    private var equalizer: Equalizer? = null
    private var bassBoost: BassBoost? = null
    private var virtualizer: Virtualizer? = null

    private val _uiState = MutableStateFlow(EqualizerUiState())
    val uiState: StateFlow<EqualizerUiState> = _uiState.asStateFlow()

    fun attachToAudioSession(audioSessionId: Int) {
        if (audioSessionId == 0) return
        release()
        try {
            val eq = Equalizer(0, audioSessionId)
            val bass = BassBoost(0, audioSessionId)
            val virt = Virtualizer(0, audioSessionId)

            equalizer = eq
            bassBoost = bass
            virtualizer = virt

            val isEnabled = prefs.getBoolean("eq_enabled", false)
            eq.enabled = isEnabled
            bass.enabled = isEnabled
            virt.enabled = isEnabled

            val range = eq.bandLevelRange
            val minLevel = range[0]
            val maxLevel = range[1]

            val presetCount = eq.numberOfPresets.toInt()
            val presetNames = (0 until presetCount).map { eq.getPresetName(it.toShort()) }
            val savedPreset = prefs.getInt("eq_preset", -1)

            if (savedPreset in 0 until presetCount) {
                eq.usePreset(savedPreset.toShort())
            } else {
                for (i in 0 until eq.numberOfBands.toInt()) {
                    val savedLevel = prefs.getInt("band_$i", 0).toShort()
                    eq.setBandLevel(i.toShort(), savedLevel.coerceIn(minLevel, maxLevel))
                }
            }

            val savedBass = prefs.getInt("bass_strength", 0).toShort()
            if (bass.strengthSupported) {
                bass.setStrength(savedBass.coerceIn(0.toShort(), 2000.toShort()))
            }

            val savedSpatial = prefs.getInt("spatial_strength", 0).toShort()
            if (virt.strengthSupported) {
                virt.setStrength(savedSpatial.coerceIn(0.toShort(), 1000.toShort()))
            }

            _uiState.value = EqualizerUiState(
                isEnabled = isEnabled,
                minLevelMb = minLevel,
                maxLevelMb = maxLevel,
                bands = buildBandList(eq),
                presets = presetNames,
                selectedPresetIndex = savedPreset,
                bassBoostStrength = savedBass,
                spatialAudioStrength = savedSpatial
            )
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun setEnabled(enabled: Boolean) {
        equalizer?.enabled = enabled
        bassBoost?.enabled = enabled
        virtualizer?.enabled = enabled
        prefs.edit().putBoolean("eq_enabled", enabled).apply()
        _uiState.update { it.copy(isEnabled = enabled) }
    }

    fun setBandLevel(bandIndex: Short, levelMb: Short) {
        val eq = equalizer ?: return
        val clamped = levelMb.coerceIn(_uiState.value.minLevelMb, _uiState.value.maxLevelMb)
        eq.setBandLevel(bandIndex, clamped)
        prefs.edit()
            .putInt("band_$bandIndex", clamped.toInt())
            .putInt("eq_preset", -1)
            .apply()
        _uiState.update { it.copy(selectedPresetIndex = -1, bands = buildBandList(eq)) }
    }

    fun setBassBoost(strength: Short) {
        val bass = bassBoost ?: return
        val clamped = strength.coerceIn(0.toShort(), 2000.toShort())
        if (bass.strengthSupported) {
            bass.setStrength(clamped)
        }
        prefs.edit().putInt("bass_strength", clamped.toInt()).apply()
        _uiState.update { it.copy(bassBoostStrength = clamped) }
    }

    fun setSpatialAudio(strength: Short) {
        val virt = virtualizer ?: return
        val clamped = strength.coerceIn(0.toShort(), 1000.toShort())
        if (virt.strengthSupported) {
            virt.setStrength(clamped)
        }
        prefs.edit().putInt("spatial_strength", clamped.toInt()).apply()
        _uiState.update { it.copy(spatialAudioStrength = clamped) }
    }

    private fun buildBandList(eq: Equalizer): List<EqualizerBand> {
        return (0 until eq.numberOfBands.toInt()).map { i ->
            val index = i.toShort()
            val hz = eq.getCenterFreq(index) / 1000
            EqualizerBand(
                index = index,
                centerFreqHz = hz,
                label = if (hz >= 1000) "${hz / 1000}kHz" else "${hz}Hz",
                currentLevelMb = eq.getBandLevel(index)
            )
        }
    }

    fun release() {
        equalizer?.release()
        bassBoost?.release()
        virtualizer?.release()
        equalizer = null
        bassBoost = null
        virtualizer = null
    }
}
