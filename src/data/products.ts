import { Product, Category } from '../types';

// Import local candle images
import candle1 from '../assets/images/candle1.png';
import candle2 from '../assets/images/candle2.png';
import candle3 from '../assets/images/candle3.png';
import candle4 from '../assets/images/candle4.png';
import candle5 from '../assets/images/candle5.png';
import img1 from '../assets/images/img1.png';
import img2 from '../assets/images/img2.png';
import img3 from '../assets/images/img3.png';
import img4 from '../assets/images/img4.png';
import img5 from '../assets/images/img5.png';
import img6 from '../assets/images/img6.png';
import img7 from '../assets/images/img7.png';

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
    image: candle1,
    featured: true,
    inStock: true,
    fragrance: 'French Lavender',
    isNewArrival: false,
    collections: []
  },
  {
    id: 2,
    name: 'Vanilla Bliss',
    description: 'Sweet vanilla aroma that fills your space',
    price: 22.99,
    category: 'scented',
    image: candle2,
    featured: true,
    inStock: true,
    fragrance: 'Madagascar Vanilla',
    isNewArrival: true,
    collections: []
  },
  {
    id: 3,
    name: 'Ocean Breeze',
    description: 'Fresh ocean scent for a calming atmosphere',
    price: 26.99,
    category: 'scented',
    image: candle3,
    featured: true,
    inStock: true,
    fragrance: 'Sea Salt & Driftwood',
    isNewArrival: true,
    collections: []
  },
  {
    id: 4,
    name: 'Pure Soy Natural',
    description: 'Unscented natural soy candle',
    price: 19.99,
    category: 'soy',
    image: candle4,
    featured: false,
    inStock: true,
    fragrance: 'Unscented',
    isNewArrival: false,
    collections: []
  },
  {
    id: 5,
    name: 'Beeswax Classic',
    description: 'Pure beeswax candle with natural honey scent',
    price: 29.99,
    category: 'beeswax',
    image: candle5,
    featured: false,
    inStock: true,
    fragrance: 'Natural Honey',
    isNewArrival: false,
    collections: []
  },
  {
    id: 6,
    name: 'Cinnamon Spice',
    description: 'Warm cinnamon fragrance for cozy evenings',
    price: 23.99,
    category: 'seasonal',
    image: img1,
    featured: true,
    inStock: true,
    fragrance: 'Cinnamon & Clove',
    isNewArrival: false,
    collections: ['christmas']
  },
  {
    id: 7,
    name: 'Rose Garden',
    description: 'Delicate rose scent for a romantic ambiance',
    price: 27.99,
    category: 'scented',
    image: img2,
    featured: false,
    inStock: true,
    fragrance: 'English Rose',
    isNewArrival: true,
    collections: []
  },
  {
    id: 8,
    name: 'Pine Forest',
    description: 'Fresh pine scent reminiscent of winter walks',
    price: 25.99,
    category: 'seasonal',
    image: img3,
    featured: false,
    inStock: true,
    fragrance: 'Nordic Pine',
    isNewArrival: false,
    collections: ['christmas']
  },
  {
    id: 9,
    name: 'Eucalyptus Mint',
    description: 'Refreshing eucalyptus and mint blend',
    price: 24.99,
    category: 'scented',
    image: img4,
    featured: false,
    inStock: true,
    fragrance: 'Eucalyptus & Spearmint',
    isNewArrival: true,
    collections: []
  },
  {
    id: 10,
    name: 'Coconut Paradise',
    description: 'Tropical coconut scent for summer vibes',
    price: 23.99,
    category: 'scented',
    image: img5,
    featured: false,
    inStock: true,
    fragrance: 'Toasted Coconut',
    isNewArrival: false,
    collections: []
  },
  {
    id: 11,
    name: 'Unscented White',
    description: 'Pure white candle without fragrance',
    price: 18.99,
    category: 'unscented',
    image: img6,
    featured: false,
    inStock: true,
    fragrance: 'Unscented',
    isNewArrival: false,
    collections: []
  },
  {
    id: 12,
    name: 'Pumpkin Spice',
    description: 'Fall favorite with warm pumpkin spice',
    price: 26.99,
    category: 'seasonal',
    image: img7,
    featured: false,
    inStock: true,
    fragrance: 'Pumpkin & Nutmeg',
    isNewArrival: false,
    collections: ['christmas']
  }
];
