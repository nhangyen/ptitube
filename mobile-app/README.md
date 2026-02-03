# VisionShare Mobile App

This is the React Native (Expo) project for the VisionShare application.

## Prerequisites
- Node.js (LTS)
- Expo Go app on your physical device (Android/iOS)

## Setup
1.  Install dependencies:
    ```bash
    npm install
    ```

2.  Start the development server:
    ```bash
    npx expo start
    ```

3.  Scan the QR code with your phone (using Expo Go or Camera app).

## Structure
-   `app/(tabs)`: Main screens (Feed, Upload, Profile).
-   `components/`: Reusable UI components.
-   `assets/`: Images and fonts.

## Connecting to Backend
The app needs to connect to the Backend running on your PC.
1.  Find your PC's Local IP address (e.g., `192.168.1.5`).
2.  Update the API base URL in the config (to be created in `src/config.js` or `.env`):
    ```js
    export const API_URL = "http://192.168.1.12:8080/api";
    ```
    *Note: Do not use `localhost` because that refers to the phone itself.*
