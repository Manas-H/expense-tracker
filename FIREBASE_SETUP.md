# Firebase Setup Guide for Expense Tracker

This guide will help you configure Firebase authentication for your expense tracker app.

## Prerequisites

- Firebase account (create one at [firebase.google.com](https://firebase.google.com))
- Google Cloud Console access
- npm/yarn installed

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a project"
3. Enter your project name (e.g., "Expense Tracker")
4. Accept the terms and create the project
5. Wait for the project to be created

## Step 2: Get Your Firebase Credentials

1. In the Firebase Console, click the gear icon (⚙️) and select "Project Settings"
2. Go to the "General" tab
3. Scroll down to find your Web API credentials
4. Copy the following values:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`
   - `measurementId` (optional)

## Step 3: Configure Environment Variables

1. Open the `.env` file in your project root
2. Fill in the Firebase credentials you copied:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id_here
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id_here
```

## Step 4: Enable Authentication Methods

1. In the Firebase Console, go to "Build" → "Authentication"
2. Click "Get Started"
3. Enable the following sign-in methods:
   - **Email/Password**: Click on it, toggle "Enable", and save
   - **Google** (for Google Sign-In):
     - Click on Google
     - Toggle "Enable"
     - You'll see a notification saying "This provider is not configured"
     - Add your project's support email if prompted
     - Save

## Step 5: Set Up Google Sign-In (Optional)

### For Web:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Make sure your Firebase project is selected
3. Go to "APIs & Services" → "Credentials"
4. Click "Create Credentials" → "OAuth client ID"
5. Select "Web application"
6. Add authorized redirect URIs:
   - `http://localhost:3000`
   - `http://localhost:8080`
   - Your production domain
7. Copy the "Client ID"
8. Add it to `.env`:

```env
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_web_client_id_here
```

### For iOS:

1. In Google Cloud Console, create a new OAuth client ID for "iOS"
2. Add your Bundle ID (found in your Xcode project)
3. Add your Team ID and Key ID
4. Download the config file and follow Apple's setup instructions

### For Android:

1. In Google Cloud Console, create a new OAuth client ID for "Android"
2. Get your app's SHA-1 certificate fingerprint
3. Add your package name (usually `com.yourcompany.expensetracker`)
4. Add it to `.env`:

```env
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your_android_client_id_here
```

## Step 6: Test Your Setup

1. Start your development server: `npm start`
2. Test email/password signup on the signup page
3. Test login on the login page
4. Successful authentication will redirect to the app

## Troubleshooting

### "Firebase configuration is incomplete" error

- Make sure all required fields in `.env` are filled
- Check that you haven't added any extra spaces or quotes

### "user-not-found" error during login

- Make sure you created an account first using the signup page
- Check that the email is correct

### "weak-password" error during signup

- Password must be at least 6 characters
- Try using a stronger password

### Google Sign-In not working

- Verify that Google authentication is enabled in Firebase Console
- Check that your Client IDs are correct
- Make sure you're testing on the correct platform (web/iOS/Android)

## Security Notes

⚠️ **Important Security Information:**

1. **Never commit `.env` to git** - It contains sensitive credentials
2. Add `.env` to your `.gitignore` file:
   ```
   .env
   ```
3. Always use `.env.example` as a template for other developers
4. In production, use Firebase security rules to protect your data
5. Enable "Email link sign-in" for passwordless authentication (optional)

## Firebase Security Rules

For production, set up security rules in Firestore:

1. Go to "Firestore Database"
2. Click "Rules" tab
3. Update rules to allow only authenticated users:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth.uid == uid;
    }
    match /expenses/{uid}/userExpenses/{document=**} {
      allow read, write: if request.auth.uid == uid;
    }
  }
}
```

## Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Web SDK](https://firebase.google.com/docs/web/setup)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Google Sign-In Documentation](https://developers.google.com/identity)

## Next Steps

After setting up Firebase:

1. Implement user profile creation after signup
2. Store user expense data in Firestore
3. Set up expense categories and budgets
4. Implement data synchronization across devices
5. Add expense analytics and reporting
