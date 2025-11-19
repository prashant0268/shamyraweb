# Deployment Guide - Shamyra Candle Store

## Firebase Deployment

Your project is now fully configured with Firebase Hosting, Authentication, and Firestore!

### Current Configuration

✅ Firebase Hosting - Configured to deploy from `dist` folder
✅ Firebase Authentication - Email/Password enabled
✅ Firestore Database - Security rules configured
✅ Build script - Added deploy command

### Deployment Steps

#### 1. Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

This will deploy your security rules to protect user data.

#### 2. Build and Deploy

```bash
npm run deploy
```

This command will:
1. Build your React app (`vite build`)
2. Deploy to Firebase Hosting
3. Make your site live!

Alternatively, you can run commands separately:

```bash
# Build the app
npm run build

# Deploy to Firebase
firebase deploy
```

#### 3. Deploy Only Hosting

If you only want to deploy the website (not rules):

```bash
firebase deploy --only hosting
```

### Post-Deployment

After deployment, Firebase will provide you with:
- **Hosting URL**: `https://shamyra-web.web.app` (or your custom domain)
- **Console URL**: `https://console.firebase.google.com/project/shamyra-web`

### Environment Variables

Make sure your Firebase configuration in `src/config/firebase.js` is correct:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "shamyra-web.firebaseapp.com",
  projectId: "shamyra-web",
  storageBucket: "shamyra-web.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### Firebase Console

Access your Firebase console to:
- Monitor authentication users
- View Firestore data
- Check hosting status
- View analytics

```bash
firebase open
```

### Testing Production Build Locally

Before deploying, test the production build:

```bash
npm run build
npm run preview
```

This will serve the production build at `http://localhost:4173`

## Firestore Collections

Your database will automatically create these collections:

### 1. `users` Collection
```
users/{userId}
├── updatedAt: timestamp
└── (any additional profile data)
```

### 2. `carts` Collection
```
carts/{userId}
├── items: array
│   ├── id
│   ├── name
│   ├── price
│   └── quantity
└── updatedAt: timestamp
```

### 3. `orders` Collection
```
orders/{orderId}
├── userId: string
├── items: array
├── total: number
├── status: "pending" | "processing" | "shipped" | "delivered"
├── createdAt: timestamp
├── shippingAddress: object
└── paymentMethod: string
```

### 4. `products` Collection (Optional)
Currently using static data from `src/data/products.js`

To use Firestore for products:
1. Add products to Firestore collection
2. Update security rules to allow read access
3. Fetch products from Firestore instead of local data

## Security Rules Summary

```
✅ Users can only read/write their own data
✅ Carts are private to each user
✅ Orders are immutable after creation
✅ Products are read-only (for future admin panel)
```

## Troubleshooting

### Build Errors

If you get build errors:
```bash
npm install
npm run build
```

### Deployment Fails

Check Firebase CLI is logged in:
```bash
firebase login
firebase projects:list
```

### Rules Deployment Error

Validate rules before deploying:
```bash
firebase deploy --only firestore:rules --dry-run
```

### Cannot Access Firestore

Make sure:
1. Firestore is initialized in Firebase Console
2. Security rules are deployed
3. User is authenticated (for protected collections)

## Next Steps

### Custom Domain (Optional)

1. Go to Firebase Console → Hosting
2. Click "Add custom domain"
3. Follow the instructions to verify your domain

### Enable Analytics

Firebase Analytics is automatically included. View in Console:
```bash
firebase open analytics
```

### Monitoring

Set up monitoring and alerts:
- Go to Firebase Console → Performance
- Enable Performance Monitoring
- Set up alerts for errors

## Rollback

If you need to rollback a deployment:

```bash
firebase hosting:channel:deploy preview
firebase hosting:clone SITE_ID:live SITE_ID:previous
```

## Continuous Deployment

For automatic deployments, use GitHub Actions:

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Firebase Hosting

on:
  push:
    branches: [ main ]

jobs:
  build_and_deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install dependencies
        run: npm install
      - name: Build
        run: npm run build
      - name: Deploy to Firebase
        uses: w9jds/firebase-action@master
        with:
          args: deploy --only hosting
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

## Support

For Firebase-specific issues:
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Support](https://firebase.google.com/support)

For project issues:
- Check the README.md
- Review the code comments
- Test locally first
