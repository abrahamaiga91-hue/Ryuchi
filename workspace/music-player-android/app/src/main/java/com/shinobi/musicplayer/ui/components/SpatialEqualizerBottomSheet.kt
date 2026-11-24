package com.shinobi.musicplayer.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.shinobi.musicplayer.audio.EqualizerUiState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SpatialEqualizerBottomSheet(
    eqState: EqualizerUiState,
    spatialAudioStrength: Short,
    extendedBassStrength: Short,
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
                Text("Matrice 3D HD & Sceau Audio", style = MaterialTheme.typography.titleLarge)
                Switch(checked = eqState.isEnabled, onCheckedChange = onToggleEnabled)
            }

            Spacer(modifier = Modifier.height(16.dp))

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

            Column(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Champ Sonore Spatial 3D", style = MaterialTheme.typography.bodyMedium)
                    Text(
                        "${spatialAudioStrength / 10}%",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
                Slider(
                    value = spatialAudioStrength.toFloat(),
                    onValueChange = { onSpatialChanged(it.toInt().toShort()) },
                    valueRange = 0f..1000f,
                    enabled = eqState.isEnabled
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Column(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Sub-Bass Étendu", style = MaterialTheme.typography.bodyMedium)
                    Text(
                        "${extendedBassStrength / 20}%",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
                Slider(
                    value = extendedBassStrength.toFloat(),
                    onValueChange = { onBassChanged(it.toInt().toShort()) },
                    valueRange = 0f..2000f,
                    enabled = eqState.isEnabled
                )
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}
