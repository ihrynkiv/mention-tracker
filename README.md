# 🔥 Misha Tracker

A simple web application to track daily mentions of "Михайло" with streak counting and user statistics.

## Features

- Simple username/password authentication (no complex validation)
- Daily mention tracking with "Згадали Михайла?" question
- Fireworks animation on mention recording
- Streak counter showing consecutive days of mentions
- User statistics showing most frequent mentioners
- Responsive design for mobile and desktop

## Setup Instructions

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select the existing `mishatracker-2e4c8` project
3. Enable Firestore Database:
   - Go to Build > Firestore Database
   - Create database in production mode
   - Choose a location for your database
4. Get your Firebase configuration:
   - Go to Project Settings (gear icon)
   - Scroll down to "Your apps" section
   - Click "Add app" and select Web (</>) if you haven't created a web app yet
   - Copy the configuration object
5. Update `app.js`:
   - Replace the placeholder values in the `firebaseConfig` object with your actual Firebase configuration

### 2. Firebase Security Rules

Set up Firestore security rules in the Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to users collection
    match /users/{document=**} {
      allow read, write: if true;
    }
    
    // Allow read/write access to mentions collection
    match /mentions/{document=**} {
      allow read, write: if true;
    }
  }
}
```

### 3. GitHub Pages Deployment

1. Push this repository to GitHub
2. Go to your repository settings
3. Navigate to Pages section
4. Select source branch (usually `main`)
5. Your site will be available at `https://yourusername.github.io/mention-tracker`

### 4. Local Development

Simply open `index.html` in a web browser or use a local server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js (with http-server)
npx http-server

# Using PHP
php -S localhost:8000
```

## Database Structure

### Users Collection
```javascript
{
  username: "string",
  password: "string", // Plain text (not recommended for production)
  createdAt: "timestamp",
  mentionCount: "number"
}
```

### Mentions Collection
```javascript
{
  date: "string", // Date string (e.g., "Mon Feb 23 2026")
  timestamp: "timestamp",
  mentionedBy: "string" // username
}
```

## Security Note

This application uses simple username/password authentication without proper encryption or validation. It's intended for demonstration purposes only. For production use, implement proper authentication and security measures.

## Technologies Used

- HTML5, CSS3, JavaScript
- Firebase Firestore for database
- GitHub Pages for hosting
- No build process required - pure static files

## Live Demo

Once deployed, users can:
1. Create account with any username/password
2. Log in to track mentions
3. Click "Так!" to record that "Михайло" was mentioned today
4. View streak counter and statistics
5. See fireworks animation on successful mention recording