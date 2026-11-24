package com.yourapp.musicplayer.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.yourapp.musicplayer.audio.EqualizerUiState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SpatialEqualizerBottomSheet(
    eqState: EqualizerUiState,
    spatialAudioStrength: Short, // 0 à 1000 pour la spatialisation 3D
    extendedBassStrength: Short, // 0 à 2000 pour des basses ultra-profondes
    onToggleEnabled: (Boolean) -> Unit,
    onBandLevelChanged: (Short, Short) -> Unit,
    onSpatialChanged: (Short) -> Unit,
    onBassChanged: (Short) -> Unit,
    onDismiss: () -> Unit
) {
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp)
                .navigationBarsPadding(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Matrice 3D HD & Sceau Acoustique", style = MaterialTheme.typography.titleLarge)
                Switch(checked = eqState.isEnabled, onCheckedChange = onToggleEnabled)
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Cercles de fréquences (Nœuds du Sceau)
            if (eqState.bands.isNotEmpty()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    eqState.bands.forEach { band ->
                        SealEqualizerNode(
                            label = band.label,
                            frequencyHz = band.centerFreqHz,
                            currentLevelMb = band.currentLevelMb,
                            minLevelMb = eqState.minLevelMb,
                            maxLevelMb = eqState.maxLevelMb,
                            onLevelChanged = { newLevel ->
                                onBandLevelChanged(band.index, newLevel)
                            }
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))
            HorizontalDivider(color = Color.Gray.copy(alpha = 0.3f))
            Spacer(modifier = Modifier.height(16.dp))

            // --- SECTION 3D HD : Audio Spatial & Surround ---
            Column(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Champ Sonore Spatial 3D (HD)", style = MaterialTheme.typography.bodyMedium)
                    Text("${spatialAudioStrength / 10}%", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
                }
                Slider(
                    value = spatialAudioStrength.toFloat(),
                    onValueChange = { onSpatialChanged(it.toInt().toShort()) },
                    valueRange = 0f..1000f,
                    enabled = eqState.isEnabled
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // --- SECTION BASSES ÉTENDUES : Profondeur Maximale ---
            Column(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Amplification Basses Profondes (Sub-Bass)", style = MaterialTheme.typography.bodyMedium)
                    Text("${extendedBassStrength / 20}%", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
                }
                Slider(
                    value = extendedBassStrength.toFloat(),
                    onValueChange = { onBassChanged(it.toInt().toShort()) },
                    valueRange = 0f..2000f, // Plage élargie pour un impact physique réaliste
                    enabled = eqState.isEnabled
                )
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}
