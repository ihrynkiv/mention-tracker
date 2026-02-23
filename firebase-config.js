// Firebase Web App Configuration
// You'll need to get these values from Firebase Console > Project Settings > Web Apps
const firebaseConfig = {
    apiKey: "YOUR_API_KEY", // Get from Firebase Console
    authDomain: "mishatracker-2e4c8.firebaseapp.com",
    projectId: "mishatracker-2e4c8",
    storageBucket: "mishatracker-2e4c8.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // Get from Firebase Console
    appId: "YOUR_APP_ID" // Get from Firebase Console
};

// To get the proper configuration values:
// 1. Go to https://console.firebase.google.com/
// 2. Select your project: mishatracker-2e4c8
// 3. Go to Project Settings (gear icon)
// 4. Scroll down to "Your apps" section
// 5. Click "Add app" and select Web (</>) if you haven't created a web app yet
// 6. Copy the configuration object from there and replace the values above

export { firebaseConfig };