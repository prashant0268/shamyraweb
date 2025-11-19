# Shamyra - Candle Store

A modern, full-featured e-commerce website for a candle store built with **TypeScript**, **React**, **Styled-Components**, **Tailwind CSS**, and **Firebase**.

## Features

- 🛍️ Browse candles by category
- 🛒 Shopping cart functionality (works as guest, no login required)
- 👤 User authentication with Firebase (login/register)
- 💳 User profile management
- 📱 Responsive design with Tailwind CSS & Styled-Components
- 🔥 Firebase integration for authentication & Firestore
- 💾 LocalStorage for guest cart persistence
- ✅ Full TypeScript type safety
- 🎨 Styled-Components for component-scoped CSS
- 📦 Order management system

## Tech Stack

- **Language**: TypeScript
- **Frontend**: React 18 with Vite
- **Styling**: Styled-Components + Tailwind CSS
- **Routing**: React Router v6
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Icons**: Lucide React
- **State Management**: React Context API
- **Build Tool**: Vite

## Project Structure

```
Shamyraweb/
├── src/
│   ├── types/
│   │   └── index.ts              # TypeScript type definitions
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx        # TypeScript + Styled-Components
│   │   │   └── Footer.tsx        # TypeScript + Styled-Components
│   │   └── ui/
│   │       ├── Button.tsx        # TypeScript + Styled-Components
│   │       └── ProductCard.tsx   # TypeScript + Styled-Components
│   ├── context/
│   │   ├── AuthContext.tsx       # Typed context providers
│   │   └── CartContext.tsx       # Typed context providers
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Products.tsx
│   │   ├── Cart.tsx
│   │   ├── Checkout.tsx
│   │   ├── Profile.tsx
│   │   ├── Login.tsx
│   │   └── Register.tsx
│   ├── config/
│   │   └── firebase.ts
│   ├── data/
│   │   └── products.ts
│   ├── utils/
│   │   └── firestoreHelpers.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── tsconfig.json                 # TypeScript configuration
├── tsconfig.node.json
├── tailwind.config.js
├── postcss.config.js
├── vite.config.ts
└── package.json
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Firebase account

### Installation

1. Clone the repository or navigate to the project directory:
   ```bash
   cd Shamyraweb
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Firebase:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or use an existing one
   - Enable Authentication (Email/Password method)
   - Copy your Firebase config
   - Update `src/config/firebase.ts` with your Firebase credentials:

   ```typescript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_AUTH_DOMAIN",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_STORAGE_BUCKET",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5173`

## Firebase Setup

1. **Authentication**:
   - Enable Email/Password authentication in Firebase Console
   - Go to Authentication > Sign-in method
   - Enable "Email/Password" provider

2. **Optional - Firestore** (for future order management):
   - Create a Firestore database
   - Set up security rules as needed

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production (with TypeScript type checking)
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run deploy` - Build and deploy to Firebase
- `npx tsc --noEmit` - Type check without building

## Features Breakdown

### Guest Features
- Browse all products
- Filter by category
- Add/remove items from cart
- Update quantities
- View cart total
- Cart persists in localStorage

### Authenticated User Features
- All guest features
- User registration
- User login/logout
- View profile information
- Access order history (placeholder)

## Product Categories

- All Candles
- Scented
- Unscented
- Soy Candles
- Beeswax
- Seasonal

## TypeScript & Styled-Components

This project is fully typed with TypeScript and uses styled-components for component styling.

**See [TYPESCRIPT.md](./TYPESCRIPT.md) for detailed documentation on:**
- Type definitions and interfaces
- Styled-components patterns
- Common TypeScript patterns
- Migration guide

**Key Benefits:**
- ✅ Type safety across the entire codebase
- ✅ Better IDE autocomplete and intellisense
- ✅ Component-scoped CSS with styled-components
- ✅ Catch errors at compile time
- ✅ Easier refactoring and maintenance

## Future Enhancements

- [ ] Checkout and payment integration (Stripe)
- [x] Order history and tracking (Firestore)
- [ ] Product reviews and ratings
- [ ] Wishlist functionality
- [ ] Admin panel for product management
- [ ] Email notifications
- [ ] Social login (Google, Facebook)
- [ ] Product search functionality
- [ ] Advanced filtering options

## License

This project is open source and available for personal and commercial use.

## Support

For issues or questions, please create an issue in the repository.
