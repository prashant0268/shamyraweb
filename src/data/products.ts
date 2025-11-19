import { Product, Category } from '../types';

export const categories: Category[] = [
  { id: 'all', name: 'All Candles' },
  { id: 'scented', name: 'Scented' },
  { id: 'unscented', name: 'Unscented' },
  { id: 'soy', name: 'Soy Candles' },
  { id: 'beeswax', name: 'Beeswax' },
  { id: 'seasonal', name: 'Seasonal' }
];

export const products: Product[] = [
  {
    id: 1,
    name: 'Lavender Dreams',
    description: 'Soothing lavender scent perfect for relaxation',
    price: 24.99,
    category: 'scented',
    image: 'https://images.unsplash.com/photo-1602874801006-40d6e5d8c99f?w=400&h=400&fit=crop',
    featured: true,
    inStock: true
  },
  {
    id: 2,
    name: 'Vanilla Bliss',
    description: 'Sweet vanilla aroma that fills your space',
    price: 22.99,
    category: 'scented',
    image: 'https://images.unsplash.com/photo-1602874801100-bc649315c851?w=400&h=400&fit=crop',
    featured: true,
    inStock: true
  },
  {
    id: 3,
    name: 'Ocean Breeze',
    description: 'Fresh ocean scent for a calming atmosphere',
    price: 26.99,
    category: 'scented',
    image: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=400&h=400&fit=crop',
    featured: true,
    inStock: true
  },
  {
    id: 4,
    name: 'Pure Soy Natural',
    description: 'Unscented natural soy candle',
    price: 19.99,
    category: 'soy',
    image: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=400&h=400&fit=crop',
    featured: false,
    inStock: true
  },
  {
    id: 5,
    name: 'Beeswax Classic',
    description: 'Pure beeswax candle with natural honey scent',
    price: 29.99,
    category: 'beeswax',
    image: 'https://images.unsplash.com/photo-1602874801100-bc649315c851?w=400&h=400&fit=crop',
    featured: false,
    inStock: true
  },
  {
    id: 6,
    name: 'Cinnamon Spice',
    description: 'Warm cinnamon fragrance for cozy evenings',
    price: 23.99,
    category: 'seasonal',
    image: 'https://images.unsplash.com/photo-1602874801006-40d6e5d8c99f?w=400&h=400&fit=crop',
    featured: true,
    inStock: true
  },
  {
    id: 7,
    name: 'Rose Garden',
    description: 'Delicate rose scent for a romantic ambiance',
    price: 27.99,
    category: 'scented',
    image: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=400&h=400&fit=crop',
    featured: false,
    inStock: true
  },
  {
    id: 8,
    name: 'Pine Forest',
    description: 'Fresh pine scent reminiscent of winter walks',
    price: 25.99,
    category: 'seasonal',
    image: 'https://images.unsplash.com/photo-1602874801100-bc649315c851?w=400&h=400&fit=crop',
    featured: false,
    inStock: true
  },
  {
    id: 9,
    name: 'Eucalyptus Mint',
    description: 'Refreshing eucalyptus and mint blend',
    price: 24.99,
    category: 'scented',
    image: 'https://images.unsplash.com/photo-1602874801006-40d6e5d8c99f?w=400&h=400&fit=crop',
    featured: false,
    inStock: true
  },
  {
    id: 10,
    name: 'Coconut Paradise',
    description: 'Tropical coconut scent for summer vibes',
    price: 23.99,
    category: 'scented',
    image: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=400&h=400&fit=crop',
    featured: false,
    inStock: true
  },
  {
    id: 11,
    name: 'Unscented White',
    description: 'Pure white candle without fragrance',
    price: 18.99,
    category: 'unscented',
    image: 'https://images.unsplash.com/photo-1602874801100-bc649315c851?w=400&h=400&fit=crop',
    featured: false,
    inStock: true
  },
  {
    id: 12,
    name: 'Pumpkin Spice',
    description: 'Fall favorite with warm pumpkin spice',
    price: 26.99,
    category: 'seasonal',
    image: 'https://images.unsplash.com/photo-1602874801006-40d6e5d8c99f?w=400&h=400&fit=crop',
    featured: false,
    inStock: true
  }
];
