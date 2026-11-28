import java.net.URI

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.ktlint)
}

val apiBaseUrl = providers.gradleProperty("rutinaApiBaseUrl").getOrElse("http://10.0.2.2:8000")
val apiUri = URI(apiBaseUrl)
require(
    apiUri.scheme in setOf("http", "https") &&
        apiUri.host != null &&
        apiUri.userInfo == null &&
        apiUri.rawQuery == null &&
        apiUri.rawFragment == null &&
        apiUri.rawPath in setOf("", "/") &&
        (apiUri.port == -1 || apiUri.port in 1..65535),
) {
    "rutinaApiBaseUrl must be an HTTP(S) origin without a path, credentials, query or fragment"
}

val testVersionCode = providers.gradleProperty("rutinaTestVersionCode").getOrElse("1").toInt()
require(testVersionCode in 1..2_100_000_000) { "rutinaTestVersionCode is out of range" }

val testKeystore = providers.environmentVariable("RUTINA_TEST_KEYSTORE").orNull
val testKeystorePassword = providers.environmentVariable("RUTINA_TEST_KEYSTORE_PASSWORD").orNull
require((testKeystore == null) == (testKeystorePassword == null)) {
    "Set both RUTINA_TEST_KEYSTORE and RUTINA_TEST_KEYSTORE_PASSWORD to sign the test APK"
}

android {
    namespace = "app.rutina"
    compileSdk = 36
    buildToolsVersion = "35.0.0"

    defaultConfig {
        applicationId = "app.rutina"
        minSdk = 31
        targetSdk = 36
        versionCode = testVersionCode
        versionName = "0.1.$testVersionCode"
        buildConfigField("String", "API_BASE_URL", "\"${apiUri.toASCIIString().trimEnd('/')}\"")
    }

    val testSigning =
        if (testKeystore != null && testKeystorePassword != null) {
            signingConfigs.create("rutinaTest") {
                storeFile = file(testKeystore)
                storePassword = testKeystorePassword
                keyAlias = "rutina-test"
                keyPassword = testKeystorePassword
                storeType = "PKCS12"
            }
        } else {
            null
        }

    buildTypes {
        debug {
            applicationIdSuffix = ".test"
            signingConfig = testSigning
        }
    }

    buildFeatures {
        buildConfig = true
        compose = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

kotlin {
    jvmToolchain(17)
}

ktlint {
    version.set(libs.versions.ktlint)
    filter {
        exclude("**/build/**")
    }
}

dependencies {
    implementation(platform(libs.compose.bom))
    implementation(libs.activity.compose)
    implementation(libs.compose.material3)
    implementation(libs.coroutines.android)
    implementation(libs.lifecycle.runtime.compose)
    implementation(libs.lifecycle.viewmodel.ktx)
    testImplementation(libs.coroutines.test)
    testImplementation(libs.junit)
}
