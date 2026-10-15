import { LOCAL_CATALOG as products } from '../../lib/catalog';
import backgroundImage from '../../assets/background/background.jpg';

const fontOptions = [
  {
    name: 'Option 1: Elegant & Warm',
    heading: "'Playfair Display', serif",
    body: "'Lato', sans-serif",
    description: 'Classic, sophisticated, premium feel',
  },
  {
    name: 'Option 2: Modern & Clean',
    heading: "'Cormorant Garamond', serif",
    body: "'Montserrat', sans-serif",
    description: 'Contemporary elegance, easy to read',
  },
  {
    name: 'Option 3: Soft & Cozy',
    heading: "'Libre Baskerville', serif",
    body: "'Nunito', sans-serif",
    description: 'Warm, friendly, approachable',
  },
  {
    name: 'Option 4: Minimalist & Luxe',
    heading: "'Bodoni Moda', serif",
    body: "'Inter', sans-serif",
    description: 'High-end, boutique feel',
  },
  {
    name: 'Option 5: Handcrafted Feel',
    heading: "'DM Serif Display', serif",
    body: "'DM Sans', sans-serif",
    description: 'Artisanal, handmade aesthetic',
  },
];

const featuredProducts = products.filter(p => p.featured).slice(0, 4);

const FontPreview = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gray-900/95 text-white py-8 px-4 text-center sticky top-0 z-50">
        <h1 className="text-2xl font-bold mb-2">Font Preview for Kind Flames</h1>
        <p className="text-gray-300">Scroll down to see each font option applied to the home page layout</p>
      </div>

      {fontOptions.map((option, index) => (
        <section
          key={index}
          className="border-b-8 border-gray-300"
          style={{
            fontFamily: option.body,
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
          }}
        >
          {/* Option Header */}
          <div className="bg-primary-600 text-white py-6 px-4">
            <div className="max-w-7xl mx-auto">
              <h2 className="text-2xl font-bold" style={{ fontFamily: option.heading }}>
                {option.name}
              </h2>
              <p className="mt-1 opacity-90">{option.description}</p>
              <p className="mt-2 text-sm opacity-75">
                Headings: {option.heading} | Body: {option.body}
              </p>
            </div>
          </div>

          {/* Simulated Navbar */}
          <nav className="bg-white/90 shadow-sm py-4 px-4">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <span
                className="text-2xl font-bold text-primary-600"
                style={{ fontFamily: option.heading }}
              >
                Kind Flames
              </span>
              <div className="flex gap-6 text-gray-600">
                <span>Home</span>
                <span>Products</span>
                <span>About</span>
                <span>Cart</span>
              </div>
            </div>
          </nav>

          {/* Hero Section */}
          <div className="bg-gradient-to-r from-primary-100/90 to-primary-200/90 py-16 px-4">
            <div className="max-w-7xl mx-auto text-center">
              <h1
                className="text-5xl font-bold text-gray-800 mb-6"
                style={{ fontFamily: option.heading }}
              >
                Welcome to Kind Flames
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                Discover our handcrafted, premium candles that transform any space into a haven of tranquility and warmth.
              </p>
              <button className="bg-primary-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-primary-700 transition-colors">
                Shop Now
              </button>
            </div>
          </div>

          {/* Featured Products */}
          <div className="py-12 px-4 bg-white/80">
            <div className="max-w-7xl mx-auto">
              <h2
                className="text-3xl font-bold text-gray-800 mb-8 text-center"
                style={{ fontFamily: option.heading }}
              >
                Featured Candles
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {featuredProducts.map(product => (
                  <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="aspect-square bg-gray-100">
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <h3
                        className="text-lg font-semibold text-gray-800"
                        style={{ fontFamily: option.heading }}
                      >
                        {product.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">{product.family}</p>
                      <p className="text-gray-600 text-sm mt-2 line-clamp-2">{product.description}</p>
                      <div className="mt-3 flex justify-between items-center">
                        <span className="text-lg font-bold text-primary-600">
                          ${(product.variants[0]?.price ?? 0).toFixed(2)}
                        </span>
                        <button className="bg-primary-600 text-white px-4 py-2 rounded text-sm hover:bg-primary-700 transition-colors">
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* About Section */}
          <div className="bg-primary-100/90 py-12 px-4">
            <div className="max-w-7xl mx-auto">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <h2
                    className="text-3xl font-bold text-gray-800 mb-4"
                    style={{ fontFamily: option.heading }}
                  >
                    Why Choose Kind Flames?
                  </h2>
                  <p className="text-gray-600 mb-4">
                    At Kind Flames, we believe in creating more than just candles. We craft experiences that elevate your everyday moments into something extraordinary.
                  </p>
                  <ul className="space-y-3 text-gray-600">
                    <li className="flex items-start">
                      <span className="text-primary-600 mr-2">✓</span>
                      100% natural, eco-friendly ingredients
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary-600 mr-2">✓</span>
                      Hand-poured with love and care
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary-600 mr-2">✓</span>
                      Long-lasting, premium fragrances
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary-600 mr-2">✓</span>
                      Sustainable and cruelty-free
                    </li>
                  </ul>
                </div>
                <div className="aspect-video bg-primary-200 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500 text-lg">Image Placeholder</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* Footer */}
      <div className="bg-gray-900/95 text-white py-8 px-4 text-center">
        <p>End of Font Preview</p>
        <p className="text-gray-400 mt-2">Pick your favorite and let me know!</p>
      </div>
    </div>
  );
};

export default FontPreview;
