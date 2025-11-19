# TypeScript & Styled-Components Guide - Shamyra

## Overview

Your Shamyra candle store project has been fully converted to TypeScript with styled-components integration! This provides:

- **Type Safety**: Catch errors at compile time
- **Better IDE Support**: Enhanced autocomplete and intellisense
- **Styled-Components**: CSS-in-JS with component-scoped styles
- **Maintainability**: Easier refactoring and code organization

## Project Structure

```
Shamyraweb/
├── src/
│   ├── types/
│   │   └── index.ts                 # All TypeScript type definitions
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx           # TypeScript + Styled Components
│   │   │   └── Footer.tsx           # TypeScript + Styled Components
│   │   └── ui/
│   │       ├── Button.tsx           # TypeScript + Styled Components
│   │       └── ProductCard.tsx      # TypeScript + Styled Components
│   ├── context/
│   │   ├── AuthContext.tsx          # Typed context providers
│   │   └── CartContext.tsx          # Typed context providers
│   ├── pages/
│   │   ├── Home.tsx                 # All pages in TypeScript
│   │   ├── Products.tsx
│   │   ├── Cart.tsx
│   │   ├── Checkout.tsx
│   │   ├── Profile.tsx
│   │   ├── Login.tsx
│   │   └── Register.tsx
│   ├── config/
│   │   └── firebase.ts              # Firebase config
│   ├── data/
│   │   └── products.ts              # Typed product data
│   ├── utils/
│   │   └── firestoreHelpers.ts      # Typed utility functions
│   ├── App.tsx                      # Main app component
│   ├── main.tsx                     # Entry point
│   └── vite-env.d.ts               # Vite type declarations
├── tsconfig.json                    # TypeScript configuration
├── tsconfig.node.json              # Node TypeScript config
└── vite.config.ts                  # Vite config with TS
```

## Type Definitions

All types are defined in `src/types/index.ts`:

### Core Types

```typescript
// Product
interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  featured: boolean;
  inStock: boolean;
}

// Cart Item (Product with quantity)
interface CartItem extends Product {
  quantity: number;
}

// Order
interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: { seconds: number; nanoseconds: number };
  shippingAddress?: ShippingAddress;
  paymentMethod?: string;
}
```

### Context Types

```typescript
interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  signup: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
}

interface CartContextType {
  cartItems: CartItem[];
  isLoading: boolean;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartCount: () => number;
}
```

## Styled-Components Integration

### Component Structure

Components now use styled-components instead of className:

```typescript
// Button.tsx
import styled from 'styled-components';
import { ButtonProps } from '../../types';

const StyledButton = styled.button<{ $variant: string }>`
  padding: 0.5rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 500;
  transition: all 0.2s;

  ${props => props.$variant === 'primary' && `
    background-color: #a18072;
    color: white;
    &:hover { background-color: #977669; }
  `}
`;

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  ...props
}) => {
  return (
    <StyledButton $variant={variant} {...props}>
      {children}
    </StyledButton>
  );
};
```

### Why $variant instead of variant?

Styled-components v6 uses the `$` prefix for transient props that shouldn't be passed to the DOM.

### Mixing Tailwind with Styled-Components

You can still use Tailwind utility classes alongside styled-components:

```typescript
// Using both
const Container = styled.div`
  display: flex;
  gap: 1rem;
`;

<Container className="max-w-7xl mx-auto px-4">
  {/* content */}
</Container>
```

## TypeScript Configuration

### tsconfig.json

Key settings:
- **strict: true** - Enables all strict type-checking options
- **noUncheckedIndexedAccess: true** - Makes array access safer
- **jsx: "react-jsx"** - Modern JSX transform (no need to import React)
- **baseUrl** and **paths** - Enables `@/` import alias

### Path Aliases

You can import using the `@/` alias:

```typescript
// Instead of
import { Product } from '../../types';

// You can use
import { Product } from '@/types';
```

## Common Patterns

### Typed Component Props

```typescript
import { FC } from 'react';
import { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
}

const ProductCard: FC<ProductCardProps> = ({ product, onAddToCart }) => {
  // component logic
};
```

### Typed State

```typescript
import { useState } from 'react';
import { CartItem } from '@/types';

const [cartItems, setCartItems] = useState<CartItem[]>([]);
const [selectedCategory, setSelectedCategory] = useState<string>('all');
```

### Typed Events

```typescript
import { ChangeEvent, FormEvent } from 'react';

const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
  setFormData({ ...formData, [e.target.name]: e.target.value });
};

const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  // submit logic
};
```

### Typed Async Functions

```typescript
const loadOrders = async (): Promise<Order[]> => {
  const orders = await getUserOrders(user.uid);
  return orders;
};
```

## Vite Configuration

The `vite.config.ts` includes:

1. **Babel Plugin for Styled-Components**
   - Better debugging with component names
   - Display names in React DevTools

2. **Path Alias Resolution**
   - `@/` maps to `src/`

3. **TypeScript Support**
   - Automatic type checking during development

## Development Workflow

### Type Checking

```bash
# Check types without building
npx tsc --noEmit

# Watch mode
npx tsc --noEmit --watch
```

### Building

```bash
# Build with type checking
npm run build

# Type errors will prevent build
```

### IDE Integration

**VS Code** (recommended):
- Install "TypeScript and JavaScript Language Features" (built-in)
- Install "vscode-styled-components" extension
- TypeScript errors show in real-time

**WebStorm/IntelliJ**:
- Built-in TypeScript support
- Styled-components syntax highlighting

## Benefits

### 1. Type Safety

```typescript
// ❌ Will error at compile time
const product: Product = {
  id: 1,
  name: "Candle",
  price: "24.99", // Error: Type 'string' is not assignable to type 'number'
};

// ✅ Correct
const product: Product = {
  id: 1,
  name: "Candle",
  price: 24.99,
  // ... other required fields
};
```

### 2. Better Autocomplete

Your IDE will suggest:
- Available props for components
- Method names and signatures
- Type-safe object properties

### 3. Refactoring Support

- Rename symbols safely across the project
- Find all usages of types/interfaces
- Detect breaking changes immediately

### 4. Component Scoping (Styled-Components)

```typescript
// Styles are scoped to this component
const Card = styled.div`
  padding: 1rem;
  border-radius: 0.5rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);

  &:hover {
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  }
`;

// No className conflicts!
```

## Migration Notes

### From JavaScript

All `.jsx` files have been converted to `.tsx`
All `.js` files have been converted to `.ts`

### From className to Styled-Components

Components now use styled-components for styling, but you can still use Tailwind classes where it makes sense (especially for layout utilities like flexbox, grid, spacing).

## Tips

1. **Always define types** - Don't use `any` unless absolutely necessary
2. **Use interfaces over types** for object shapes
3. **Leverage TypeScript inference** - Let TS infer types when obvious
4. **Use strict mode** - Already enabled in tsconfig
5. **Props with $prefix** - For styled-components transient props

## Troubleshooting

### Type Error in styled-components

```typescript
// ❌ Wrong - 'variant' will be passed to DOM
const Button = styled.button<{ variant: string }>``;

// ✅ Correct - Use $ prefix
const Button = styled.button<{ $variant: string }>``;
```

### Import Errors

```typescript
// Make sure to import types
import { Product } from '@/types';
// or
import type { Product } from '@/types';
```

### Firebase Type Issues

Firebase types are included via the `firebase` package. No additional @types needed.

## Next Steps

- Add more types as your app grows
- Create custom hooks with proper typing
- Add utility types for common patterns
- Consider adding Zod for runtime validation

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Styled-Components Docs](https://styled-components.com/docs)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
