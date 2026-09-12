plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
}

fun normalizedBaseUrl(raw: String): String {
    val trimmed = raw.trim()
    return if (trimmed.endsWith("/")) trimmed else "$trimmed/"
}

fun buildConfigString(value: String): String =
    "\"${value.replace("\\", "\\\\").replace("\"", "\\\"")}\""

val debugApiBaseUrl = normalizedBaseUrl(
    providers.gradleProperty("CPEB_API_BASE_URL")
        .orElse(providers.environmentVariable("CPEB_API_BASE_URL"))
        .orElse("http://10.0.2.2:3000/")
        .get()
)

val releaseApiBaseUrlRaw = providers.gradleProperty("CPEB_RELEASE_API_BASE_URL")
    .orElse(providers.environmentVariable("CPEB_RELEASE_API_BASE_URL"))
    .orElse("")
    .get()
val releaseApiBaseUrl = if (releaseApiBaseUrlRaw.isBlank()) "https://invalid.example/" else normalizedBaseUrl(releaseApiBaseUrlRaw)
val releaseRequested = gradle.startParameter.taskNames.any { it.contains("release", ignoreCase = true) }

val releaseKeystorePath = providers.environmentVariable("ANDROID_KEYSTORE_PATH").orElse("").get()
val releaseKeystorePassword = providers.environmentVariable("ANDROID_KEYSTORE_PASSWORD").orElse("").get()
val releaseKeyAlias = providers.environmentVariable("ANDROID_KEY_ALIAS").orElse("").get()
val releaseKeyPassword = providers.environmentVariable("ANDROID_KEY_PASSWORD").orElse("").get()
val signingReady = listOf(
    releaseKeystorePath,
    releaseKeystorePassword,
    releaseKeyAlias,
    releaseKeyPassword,
).all { it.isNotBlank() }

if (releaseRequested) {
    require(releaseApiBaseUrlRaw.startsWith("https://")) {
        "Release APK requires CPEB_RELEASE_API_BASE_URL=https://..."
    }
    require(signingReady) {
        "Release APK requires ANDROID_KEYSTORE_PATH, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS and ANDROID_KEY_PASSWORD"
    }
}

android {
    namespace = "com.yasser.ub"

    compileSdk {
        version = release(36) {
            minorApiLevel = 1
        }
    }

    defaultConfig {
        applicationId = "com.yasser.ub"
        minSdk = 24
        targetSdk = 36
        versionCode = 4
        versionName = "1.2.1"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    signingConfigs {
        create("release") {
            if (signingReady) {
                storeFile = file(releaseKeystorePath)
                storePassword = releaseKeystorePassword
                keyAlias = releaseKeyAlias
                keyPassword = releaseKeyPassword
            }
        }
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".dev"
            versionNameSuffix = "-dev"
            buildConfigField("String", "CPEB_API_BASE_URL", buildConfigString(debugApiBaseUrl))
            manifestPlaceholders["usesCleartextTraffic"] = "true"
        }

        release {
            buildConfigField("String", "CPEB_API_BASE_URL", buildConfigString(releaseApiBaseUrl))
            manifestPlaceholders["usesCleartextTraffic"] = "false"
            if (signingReady) {
                signingConfig = signingConfigs.getByName("release")
            }
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
        isCoreLibraryDesugaringEnabled = true
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.5")

    implementation("androidx.compose.material:material-icons-extended")
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)

    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-gson:2.11.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")

    testImplementation(libs.junit)
    testImplementation("com.squareup.okhttp3:mockwebserver:4.12.0")

    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(libs.androidx.junit)

    debugImplementation(libs.androidx.compose.ui.test.manifest)
    debugImplementation(libs.androidx.compose.ui.tooling)
}
