package com.yourapp.musicplayer.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp
import com.yourapp.musicplayer.audio.EqualizerUiState
import kotlin.math.*

@Composable
fun SealEqualizerNode(
    label: String,
    frequencyHz: Int,
    currentLevelMb: Short,
    minLevelMb: Short,
    maxLevelMb: Short,
    onLevelChanged: (Short) -> Unit
) {
    // Convert decibels to an angle (-135° to +135°)
    val range = (maxLevelMb - minLevelMb).toFloat()
    val normalized = (currentLevelMb - minLevelMb).toFloat() / if (range == 0f) 1f else range
    var angle by remember(currentLevelMb) { mutableStateOf(normalized * 270f - 135f) }

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.padding(8.dp)
    ) {
        Box(
            modifier = Modifier
                .size(72.dp)
                .pointerInput(Unit) {
                    detectDragGestures { change, dragAmount ->
                        change.consume()
                        // Adjust angle based on vertical/horizontal drag
                        angle = (angle + dragAmount.x * 0.7f).coerceIn(-135f, 135f)
                        // Convert angle back to millibels
                        val newNormalized = (angle + 135f) / 270f
                        val newMb = (minLevelMb + newNormalized * range).toInt().toShort()
                        onLevelChanged(newMb)
                    }
                },
            contentAlignment = Alignment.Center
        ) {
            val primaryColor = MaterialTheme.colorScheme.primary
            val surfaceVariant = MaterialTheme.colorScheme.surfaceVariant

            Canvas(modifier = Modifier.fillMaxSize()) {
                val center = Offset(size.width / 2f, size.height / 2f)
                val radius = size.minDimension / 2f - 6.dp.toPx()

                // Outer energy ring (Seal border)
                drawCircle(
                    color = surfaceVariant,
                    radius = radius,
                    center = center,
                    style = Stroke(width = 3.dp.toPx())
                )

                // Active energy arc
                drawArc(
                    color = primaryColor,
                    startAngle = -135f,
                    sweepAngle = angle + 135f,
                    useCenter = false,
                    style = Stroke(width = 5.dp.toPx())
                )

                // Core indicator node
                val rad = Math.toRadians((angle).toDouble())
                val indicatorX = center.x + (radius - 10.dp.toPx()) * cos(rad).toFloat()
                val indicatorY = center.y + (radius - 10.dp.toPx()) * sin(rad).toFloat()
                drawCircle(
                    color = primaryColor,
                    radius = 4.dp.toPx(),
                    center = Offset(indicatorX, indicatorY)
                )
            }

            // Central text value display
            Text(
                text = "${currentLevelMb / 100}dB",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurface
            )
        }

        Spacer(modifier = Modifier.height(4.dp))
        Text(text = label, style = MaterialTheme.typography.labelMedium)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SealEqualizerBottomSheet(
    eqState: EqualizerUiState,
    onToggleEnabled: (Boolean) -> Unit,
    onBandLevelChanged: (Short, Short) -> Unit,
    onPresetSelected: (Int) -> Unit,
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
                Text("Matrice de Fréquence (Sceau Audio)", style = MaterialTheme.typography.titleLarge)
                Switch(checked = eqState.isEnabled, onCheckedChange = onToggleEnabled)
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Circular nodes grid simulating frequency channels
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

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}
