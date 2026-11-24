export type RepeatMode = 'off' | 'all' | 'one';

export type EqPresetId =
  | 'Flat'
  | 'Warm'
  | 'Vocal'
  | 'Bass Boost'
  | 'Acoustic'
  | 'Custom';

export type MainTab = 'player' | 'tags' | 'equalizer' | 'source';

export type AndroidFileId =
  | '.github/workflows/android-build.yml'
  | '.gitignore'
  | 'README.md'
  | 'settings.gradle.kts'
  | 'build.gradle.kts'
  | 'gradle/libs.versions.toml'
  | 'gradle.properties'
  | 'app/build.gradle.kts'
  | 'AndroidManifest.xml'
  | 'res/values/themes.xml'
  | 'model/Song.kt'
  | 'MainActivity.kt'
  | 'service/PlaybackService.kt'
  | 'audio/PlayerConnection.kt'
  | 'audio/AudioEffectsController.kt'
  | 'data/AudioRepository.kt'
  | 'data/TagEditorRepository.kt'
  | 'viewmodel/MusicPlayerViewModel.kt'
  | 'util/SongFormatUtils.kt'
  | 'ui/ShinobiAppRoot.kt'
  | 'ui/components/PulsingChakraButton.kt'
  | 'ui/components/SealEqualizerNode.kt'
  | 'ui/components/SpatialEqualizerBottomSheet.kt'
  | 'ui/components/ParchmentTagEditorScreen.kt';

export interface SynthVoiceConfig {
  rootHz: number;
  chordRatios: number[];
  tempoBpm: number;
}

export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  albumArtist: string;
  year: string;
  genre: string;
  trackNumber: string;
  durationSeconds: number;
  durationMs: number;
  filePath: string;
  fileSizeBytes: number;
  mimeType: string;
  bitrate: string;
  sampleRate: string;
  format: string;
  sampleInfo: string;
  coverUrl: string;
  fileUrl?: string;
  fileName: string;
  lyrics: string;
  isLocalUpload: boolean;
  synthConfig?: SynthVoiceConfig;
}

export interface EqBand {
  frequencyHz: number;
  label: string;
  gainDb: number;
}
