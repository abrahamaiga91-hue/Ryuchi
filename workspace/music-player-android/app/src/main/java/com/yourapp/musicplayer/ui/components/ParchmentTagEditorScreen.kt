package com.yourapp.musicplayer.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// Parchment Color Palette (Ink & Scroll aesthetics)
private val ParchmentBackground = Color(0xFFF7F2E7)
private val ParchmentSurface = Color(0xFFEFE6D2)
private val ScrollBorderColor = Color(0xFF8C6D46)
private val ScrollRollerColor = Color(0xFF593E25)
private val InkTextColor = Color(0xFF2C221E)

@Composable
fun ParchmentTagEditorScreen(
    initialTitle: String,
    initialArtist: String,
    initialAlbum: String,
    initialYear: String,
    initialGenre: String,
    isVisible: Boolean,
    onSave: (title: String, artist: String, album: String, year: String, genre: String) -> Unit,
    onDismiss: () -> Unit
) {
    var title by remember(initialTitle) { mutableStateOf(initialTitle) }
    var artist by remember(initialArtist) { mutableStateOf(initialArtist) }
    var album by remember(initialAlbum) { mutableStateOf(initialAlbum) }
    var year by remember(initialYear) { mutableStateOf(initialYear) }
    var genre by remember(initialGenre) { mutableStateOf(initialGenre) }

    AnimatedVisibility(
        visible = isVisible,
        enter = fadeIn(animationSpec = tween(400)) + expandVertically(animationSpec = tween(400))
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.6f)),
            contentAlignment = Alignment.Center
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth(0.9f)
                    .wrapContentHeight()
                    .clip(RoundedCornerShape(8.dp))
                    .border(2.dp, ScrollBorderColor, RoundedCornerShape(8.dp))
                    .background(ParchmentBackground)
                    .padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // --- Top Scroll Roller (Wooden Handle) ---
                Box(
                    modifier = Modifier
                        .fillMaxWidth(0.7f)
                        .height(14.dp)
                        .clip(RoundedCornerShape(7.dp))
                        .background(ScrollRollerColor)
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Scroll Title Header
                Text(
                    text = "SCEAU DE METADONNÉES",
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 2.sp,
                        color = InkTextColor
                    )
                )

                Text(
                    text = "Ajustement des inscriptions du rouleau",
                    style = MaterialTheme.typography.bodySmall.copy(
                        color = ScrollBorderColor
                    )
                )

                Spacer(modifier = Modifier.height(16.dp))

                // --- Calligraphic Ink Input Fields ---
                ParchmentTextField(label = "Titre (Title)", value = title, onValueChange = { title = it })
                Spacer(modifier = Modifier.height(8.dp))
                ParchmentTextField(label = "Artiste (Artist)", value = artist, onValueChange = { artist = it })
                Spacer(modifier = Modifier.height(8.dp))
                ParchmentTextField(label = "Album", value = album, onValueChange = { album = it })
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Box(modifier = Modifier.weight(1f)) {
                        ParchmentTextField(label = "Année", value = year, onValueChange = { year = it })
                    }
                    Box(modifier = Modifier.weight(1f)) {
                        ParchmentTextField(label = "Genre", value = genre, onValueChange = { genre = it })
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // --- Action Seals (Buttons) ---
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    Button(
                        onClick = onDismiss,
                        colors = ButtonDefaults.buttonColors(containerColor = ScrollBorderColor)
                    ) {
                        Icon(Icons.Default.Close, contentDescription = "Annuler", tint = Color.White)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Sceller", color = Color.White)
                    }

                    Button(
                        onClick = { onSave(title, artist, album, year, genre) },
                        colors = ButtonDefaults.buttonColors(containerColor = ScrollRollerColor)
                    ) {
                        Icon(Icons.Default.Check, contentDescription = "Enregistrer", tint = Color.White)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Inscrire", color = Color.White)
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // --- Bottom Scroll Roller (Wooden Handle) ---
                Box(
                    modifier = Modifier
                        .fillMaxWidth(0.7f)
                        .height(14.dp)
                        .clip(RoundedCornerShape(7.dp))
                        .background(ScrollRollerColor)
                )
            }
        }
    }
}

@Composable
fun ParchmentTextField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label, color = ScrollBorderColor) },
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(4.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedContainerColor = ParchmentSurface,
            unfocusedContainerColor = ParchmentSurface,
            focusedBorderColor = ScrollBorderColor,
            unfocusedBorderColor = ScrollBorderColor.copy(alpha = 0.6f),
            focusedTextColor = InkTextColor,
            unfocusedTextColor = InkTextColor
        ),
        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
        singleLine = true
    )
}
