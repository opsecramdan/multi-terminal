# Multi Terminal

Multi-protocol network device management app untuk ISP. Akses SSH, Telnet, MikroTik API, dan HTTP/HTTPS dari satu aplikasi mobile.

## Fitur

- 📱 **Multi-protocol terminal** — SSH, Telnet, MikroTik RouterOS API, HTTP/HTTPS WebView
- 🔍 **Network Scanner** — Scan subnet, port scan, MAC OUI vendor detection, device fingerprinting
- 🔧 **MikroTik API** — Native RouterOS API implementation (port 8728/8729)
- 🔒 **Secure** — Credentials tersimpan di OS Keychain (iOS Keychain / Android Keystore)
- 🔄 **OTA Updates** — Update tanpa download ulang dari Play Store

## Target Devices

MikroTik, FortiGate, Juniper, Huawei, Cisco, TP-Link, Linksys, D-Link, Ubiquiti, dan perangkat jaringan lainnya.

## Tech Stack

- React Native + Expo (TypeScript)
- Zustand (state management)
- expo-updates (OTA updates)
- EAS Build (cloud build)

## Development

```bash
# Install dependencies
npm install

# Start dev server
npx expo start

# Build APK
eas build --platform android --profile preview
```

## License

Private — Fibernet Networks Indonesia
