# Assets Guide: App Icons & Splash Screens

To ensure your app looks professional on the Google Play Store and iOS App Store, you must provide high-quality assets in the correct formats and sizes.

## 1. Required Assets (Location: `/assets`)

Ensure the following files exist in your `/assets` folder:

| File Name | Purpose | Recommended Size | Format |
| :--- | :--- | :--- | :--- |
| `icon.png` | Main app icon (iOS & Legacy Android) | 1024x1024 px | PNG (No transparency for iOS) |
| `adaptive-icon.png` | Foreground for Android Adaptive Icon | 1024x1024 px | PNG (Transparent background) |
| `splash.png` | App splash screen | 1242x2436 px | PNG |
| `favicon.png` | Web browser icon | 48x48 px | PNG |

## 2. Adaptive Icons (Android)
Android uses "Adaptive Icons" which consist of two layers:
1. **Foreground (`adaptive-icon.png`)**: This should be your logo on a transparent background. Keep the logo within the "Safe Zone" (the center 66% of the image) to avoid it being clipped by different mask shapes (circle, square, squircle).
2. **Background Color**: Configured in `app.json` as `backgroundColor`. Currently set to `#ffffff`.

## 3. How to Update Assets in VS Code
1. Prepare your images using a design tool (Figma, Photoshop, etc.) following the sizes above.
2. Replace the files in the `/assets` directory of this project.
3. If you name them differently, update the paths in `app.json`.

## 4. Play Store Compliance Checklist
- [ ] **Icon size**: Exactly 512x512 px (for Play Store listing) or 1024x1024 (for Expo source).
- [ ] **Transparency**: Play Store listing icon should NOT have transparency.
- [ ] **Adaptive Icon**: Ensure `adaptive-icon.png` is provided and centered.
- [ ] **Package Name**: `com.clickmax.app` is set in `app.json`.

## 5. Build Commands
To verify assets and build your project:
```bash
# Build Android APK (Preview)
eas build --platform android --profile preview

# Build Android AAB (Store Submission)
eas build --platform android --profile production
```
