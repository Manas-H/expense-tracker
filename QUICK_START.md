# 🚀 Quick Start: Firebase Setup for Expense Tracker

## 5-Minute Setup Guide

### Step 1: Create Firebase Project

Go to [firebase.google.com](https://firebase.google.com) and create a new project

### Step 2: Get Your Credentials

In Firebase Console → Project Settings → Copy these values:

```
API Key
Auth Domain
Project ID
Storage Bucket
Messaging Sender ID
App ID
Measurement ID (optional)
```

### Step 3: Fill Your .env File

Open `.env` in your project root and paste:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_value_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_value_here
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_value_here
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_value_here
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_value_here
EXPO_PUBLIC_FIREBASE_APP_ID=your_value_here
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your_value_here
```

### Step 4: Enable Authentication

In Firebase Console → Authentication → Get Started

- Toggle "Email/Password" ON
- Toggle "Google" ON (for later)
- Click Save

### Step 5: Test It!

```bash
npm start
```

Then:

1. Go to Signup page
2. Create account with email + password
3. Should redirect to home page ✅

## What's Already Done ✅

- ✅ Firebase packages installed
- ✅ Login page with Firebase
- ✅ Signup page with Firebase
- ✅ Error handling & validation
- ✅ Auto-login after signup
- ✅ Auth persistence (remember me)
- ✅ Google Sign-In prepared

## The Setup Files

| File                | Purpose                               |
| ------------------- | ------------------------------------- |
| `.env`              | Your Firebase secrets (KEEP PRIVATE!) |
| `.env.example`      | Template for team members             |
| `firebaseConfig.ts` | Firebase setup module                 |
| `FIREBASE_SETUP.md` | Detailed guide                        |

## Common Errors & Fixes

| Error                      | Fix                             |
| -------------------------- | ------------------------------- |
| "Configuration incomplete" | Fill all fields in `.env`       |
| "Auth not initialized"     | Restart dev server: `npm start` |
| "Email already in use"     | Try different email for signup  |
| "Weak password"            | Password must be 6+ characters  |

## Next Features

After basic setup works:

1. Google Sign-In integration
2. User profile/preferences
3. Expense data storage
4. Analytics dashboard

## Need Help?

See `FIREBASE_SETUP.md` for:

- Full setup walkthrough
- Google Sign-In setup
- Security rules
- Troubleshooting guide

---

**Now go get those Firebase credentials and start building! 🎉**
