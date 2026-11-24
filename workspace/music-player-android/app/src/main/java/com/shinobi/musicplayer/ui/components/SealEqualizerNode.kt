package com.shinobi.musicplayer.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp
import kotlin.math.cos
import kotlin.math.sin

@Composable
fun SealEqualizerNode(
    label: String,
    frequencyHz: Int,
    currentLevelMb: Short,
    minLevelMb: Short,
    maxLevelMb: Short,
    onLevelChanged: (Short) -> Unit
) {
    val range = (maxLevelMb - minLevelMb).toFloat()
    val normalized = (currentLevelMb - minLevelMb).toFloat() / if (range == 0f) 1f else range
    var angle by remember(currentLevelMb) { mutableStateOf(normalized * 270f - 135f) }

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.padding(4.dp)
    ) {
        Box(
            modifier = Modifier
                .size(68.dp)
                .pointerInput(Unit) {
                    detectDragGestures { change, dragAmount ->
                        change.consume()
                        angle = (angle + dragAmount.x * 0.7f - dragAmount.y * 0.7f).coerceIn(-135f, 135f)
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

                drawCircle(
                    color = surfaceVariant,
                    radius = radius,
                    center = center,
                    style = Stroke(width = 3.dp.toPx())
                )

                drawArc(
                    color = primaryColor,
                    startAngle = -135f,
                    sweepAngle = angle + 135f,
                    useCenter = false,
                    style = Stroke(width = 5.dp.toPx())
                )

                val rad = Math.toRadians((angle).toDouble())
                val indicatorX = center.x + (radius - 10.dp.toPx()) * cos(rad).toFloat()
                val indicatorY = center.y + (radius - 10.dp.toPx()) * sin(rad).toFloat()
                drawCircle(
                    color = primaryColor,
                    radius = 4.dp.toPx(),
                    center = Offset(indicatorX, indicatorY)
                )
            }

            Text(
                text = "${currentLevelMb / 100}dB",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurface
            )
        }

        Spacer(modifier = Modifier.height(4.dp))
        Text(text = label, style = MaterialTheme.typography.labelSmall)
    }
}
