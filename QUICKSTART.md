# Quick Start Guide - Shamyra Candle Store

## 🚀 Get Up and Running in 5 Minutes

### Step 1: Install Dependencies
```bash
cd Shamyraweb
npm install
```

### Step 2: Set Up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Register your app:
   - Click the web icon (</>)
   - Register app with a nickname (e.g., "Shamyra Web")
   - Copy the Firebase configuration

4. Enable Authentication:
   - In Firebase Console, go to **Authentication**
   - Click "Get Started"
   - Go to "Sign-in method" tab
   - Enable "Email/Password"
   - Click Save

### Step 3: Configure Your App

Open `src/config/firebase.js` and replace the config values:

```javascript
const firebaseConfig = {
  apiKey: "paste-your-api-key-here",
  authDomain: "paste-your-auth-domain-here",
  projectId: "paste-your-project-id-here",
  storageBucket: "paste-your-storage-bucket-here",
  messagingSenderId: "paste-your-sender-id-here",
  appId: "paste-your-app-id-here"
};
```

### Step 4: Run the App

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## ✅ Testing the App

### As a Guest User:
1. Browse products on the home page
2. Click "Products" to see all candles
3. Filter by category
4. Add items to cart
5. View cart and adjust quantities
6. **Your cart will be saved even without logging in!**

### As a Registered User:
1. Click "Login" in the navbar
2. Click "create a new account"
3. Register with email and password
4. Login with your credentials
5. Access your profile page
6. All guest cart features are available

## 📁 Project Structure Overview

```
src/
├── components/
│   ├── layout/          # Navbar & Footer
│   └── ui/              # Reusable UI components
├── context/             # React Context (Auth & Cart)
├── pages/               # All page components
├── config/              # Firebase configuration
├── data/                # Product data
└── App.jsx              # Main app with routing
```

## 🎨 Key Features Implemented

✅ Guest shopping (no login required)
✅ Shopping cart with localStorage
✅ User authentication (login/register)
✅ Category filtering
✅ Responsive design
✅ User profile page
✅ Firebase integration

## 🔧 Common Issues

**Issue**: Firebase errors on page load
**Solution**: Make sure you've updated the Firebase config in `src/config/firebase.js`

**Issue**: Can't login/register
**Solution**: Verify Email/Password authentication is enabled in Firebase Console

**Issue**: Tailwind styles not working
**Solution**: Make sure you ran `npm install` to install all dependencies

## 📝 Next Steps

- Add more products to `src/data/products.js`
- Customize colors in `tailwind.config.js`
- Add payment integration (Stripe, PayPal)
- Set up Firestore for order management

## 🎉 You're All Set!

Your candle store is now ready. Happy coding!
