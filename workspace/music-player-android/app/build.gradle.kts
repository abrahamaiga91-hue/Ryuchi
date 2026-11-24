plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "com.yourapp.musicplayer"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.yourapp.musicplayer"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"
    }

    buildFeatures {
        compose = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    val media3Version = "1.11.1"

    // Core Android & Compose
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)

    // Media3 (ExoPlayer + Background Service)
    implementation("androidx.media3:media3-exoplayer:$media3Version")
    implementation("androidx.media3:media3-session:$media3Version")
    implementation("androidx.media3:media3-common:$media3Version")

    // Metadata & Embedded Tag Editor
    implementation("net.jthink:jaudiotagger:3.0.1")

    // Album Art Loading
    implementation("io.coil-kt:coil-compose:2.7.0")

    // Material Icons Extended (for EQ, Shuffle, Repeat, Tag icons)
    implementation("androidx.compose.material:material-icons-extended:1.7.5")

    // Compose ViewModel
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")

    debugImplementation(libs.androidx.ui.tooling)
}
