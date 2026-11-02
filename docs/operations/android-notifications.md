# Android notifications

The Android app receives Firebase Cloud Messaging (FCM) data messages through FCM HTTP v1; an Expo
Push account is not required. This fork deleted the hosted relay that used to send them, so these
steps cover the app-side build only; the sender returns with the mobile slice.

The old delivery runbooks (the relay's smoke and watch scripts, hosted deployment, and the cloud
sign-in that private builds used) described code this fork no longer carries and are gone; mobile
auth and notification delivery are the mobile slice's (TS9) to document again.

## Android compatibility and automated checks

The app's minimum is Android 7.0 (API 24), declared in `app.config.ts`. Compile/target SDK versions follow the locked Expo/React Native toolchain (currently API 36). Notification channels begin at API 26; the notification permission prompt begins at API 33. Live Update promotion requires API 36 and remains subject to system settings and device support. Alerts and ordinary activity cards work below API 36.

On Android 16+, open T3 Code Settings → Live Update Settings to allow status bar chips. Android controls this separately from notification permission. The chip reads `Working` during work, `Approve` for approvals, and `Answer` for input requests; completed work returns to a normal notification. Use an Android 16 QPR2 or newer emulator image to verify the shipped promotion behavior.

API 24–25 use a single inexact system alarm to expire cards after process exit, with no exact-alarm permission. Android can delay that alarm in power-saving modes. API 26+ use notification timeouts. Disabling activity, dismissal, account changes and sign-out cancel the legacy alarm. A stale expiry broadcast cannot remove a newer run's card.

The native notification tests cover API 24, 26, 33 and 36 (plus API 25 for legacy expiry) using Robolectric. To compile the module, run these tests and run Android lint, use the following command from a generated `apps/mobile/android` project with JDK 21 available. No Firebase, signing or relay secrets are required:

```sh
./gradlew :t3-agent-notifications:testDebugUnitTest :t3-agent-notifications:lintRelease -Pandroid.lint.useK2Uast=false
```

Robolectric's API 36 runtime requires JDK 21; module compilation still uses Expo's Java 17 toolchain. The existing Mobile Native Static Analysis job separately runs ktlint and detekt. The native fingerprint check marks this change as requiring a new binary; the production workflow cannot deliver it to an older binary by OTA. Settings disable Android notifications if the installed native module is missing required methods.

The lint command uses the K1 frontend because AGP's K2 frontend crashes while analyzing Worklets 0.10's Gradle Kotlin scripts. This does not disable lint checks. Live Update eligibility must be verified on a device: Robolectric's API 36 image implements older promotion rules that require colorization, while shipped Live Updates require uncolorized notifications.

## Firebase and app build

1. Create a Firebase project and register each Android application identifier you intend to build: `com.t3tools.t3code.dev`, `com.t3tools.t3code.preview`, or `com.t3tools.t3code`.
2. Download `google-services.json`. Set `T3CODE_ANDROID_GOOGLE_SERVICES_FILE` to its path when running Expo prebuild and building the app. The JSON must contain the selected variant's package identifier.
3. Create a service-account key with permission to send FCM messages for that Firebase project. Keep this private JSON outside the repository and the app bundle.
4. Enable the Firebase Cloud Messaging API in the Google project if it is not already enabled. Keep the service-account key private; whoever sends the messages holds it.
5. Build a new Android binary. A JavaScript-only update cannot install the native notification handler or Firebase configuration.

For a local development build, from `apps/mobile`:

```sh
APP_VARIANT=development \
T3CODE_ANDROID_GOOGLE_SERVICES_FILE=/absolute/path/google-services.json \
vp run android:dev
```

For an EAS build, provide the same configuration through each selected build environment, using an EAS file variable named `T3CODE_ANDROID_GOOGLE_SERVICES_FILE` for the Google services file. Make the file available to fingerprint generation as well as the native build.

Set `T3CODE_MOBILE_UPDATES_ENABLED=0` before prebuild and bundling a private binary to disable the repository's configured Expo OTA update source. A debug development-client APK requires Metro; a bundled release build is needed to verify cold-start notification taps without Expo's development launcher.
