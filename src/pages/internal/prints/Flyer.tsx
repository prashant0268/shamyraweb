import { QRCodeSVG } from 'qrcode.react';

// Import local images
const img1 = '/img/products/cinnamon-spice-800.webp';
const img2 = '/img/products/rose-garden-800.webp';
const img7 = '/img/products/pumpkin-spice-800.webp';
const candle1 = '/img/products/lavender-dreams-800.webp';
const candle2 = '/img/products/vanilla-bliss-800.webp';
const candle3 = '/img/products/ocean-breeze-800.webp';
const candle4 = '/img/products/pure-soy-natural-800.webp';
const candle5 = '/img/products/beeswax-classic-800.webp';

const Flyer = () => {
  const flyerImages = [candle3, img1, candle1, img2, candle5, img7, candle2, candle4];

  const instagramUrl = 'https://instagram.com/kindflames_by_shamyra';

  return (
    <div className="bg-white min-h-screen p-4 print:p-0" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      {/* Print-optimized container - fits on one page */}
      <div className="w-[8.5in] h-[11in] mx-auto bg-white print:shadow-none shadow-lg flex flex-col print:w-full print:h-[10.5in]">

        {/* Header - Compact */}
        <header className="text-center py-4 bg-gradient-to-r from-amber-100 to-orange-100 print:bg-amber-50">
          <h1 className="text-4xl font-bold text-amber-800 mb-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Kind Flames</h1>
          <p className="text-lg text-amber-700 font-light tracking-wider">by Shamyra</p>
          <p className="text-sm text-gray-600 mt-1 italic" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Handcrafted Candles Made with Love</p>
        </header>

        {/* Candle Images Section - 2 rows of 4 */}
        <section className="py-3 px-6 flex-shrink-0">
          <h2 className="text-xl font-semibold text-center text-gray-800 mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Our Handcrafted Candles</h2>
          <div className="grid grid-cols-4 gap-2 max-w-[7in] mx-auto">
            {flyerImages.map((image, index) => (
              <div key={index} className="text-center">
                <div className="w-[1.6in] h-[1.6in] rounded-2xl overflow-hidden border border-amber-200 mx-auto">
                  <img
                    src={image}
                    alt={`Kind Flames candle ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Description Section - Compact */}
        <section className="py-3 px-6 bg-amber-50 flex-shrink-0">
          <h2 className="text-lg font-semibold text-center text-gray-800 mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Why Choose Kind Flames?</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-gray-700 text-sm max-w-[6in] mx-auto">
            <div className="flex items-center">
              <span className="text-amber-600 mr-2">✓</span>
              <span>100% Natural, Eco-Friendly</span>
            </div>
            <div className="flex items-center">
              <span className="text-amber-600 mr-2">✓</span>
              <span>Sustainable & Cruelty-Free</span>
            </div>
            <div className="flex items-center">
              <span className="text-amber-600 mr-2">✓</span>
              <span>Hand-Poured with Love</span>
            </div>
            <div className="flex items-center">
              <span className="text-amber-600 mr-2">✓</span>
              <span>Perfect for Gifts & Self-Care</span>
            </div>
            <div className="flex items-center">
              <span className="text-amber-600 mr-2">✓</span>
              <span>Long-Lasting Fragrances</span>
            </div>
            <div className="flex items-center">
              <span className="text-amber-600 mr-2">✓</span>
              <span>Clean Burn, No Chemicals</span>
            </div>
          </div>
        </section>

        {/* QR Code Section */}
        <section className="py-4 px-6 flex-grow flex flex-col justify-center">
          <h2 className="text-lg font-semibold text-center text-gray-800 mb-3" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Connect & Shop</h2>
          <div className="flex justify-center">
            {/* Instagram QR Code */}
            <div className="text-center">
              <div className="bg-white p-3 rounded-lg border-2 border-amber-200 inline-block">
                <QRCodeSVG
                  value={instagramUrl}
                  size={130}
                  level="H"
                  fgColor="#d97706"
                />
              </div>
              <p className="mt-2 font-semibold text-gray-800 text-sm">Follow Us on Instagram</p>
              <p className="text-amber-700 text-xs">@kindflames_by_shamyra</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 bg-gradient-to-r from-amber-100 to-orange-100 text-center print:bg-amber-50 flex-shrink-0 mt-auto">
          <p className="text-gray-700 font-medium text-xl">Thank you for supporting small business!</p>
          <p className="text-amber-700 text-base mt-2">Made with love in New Jersey</p>
        </footer>
      </div>

      {/* Print Button - Hidden when printing */}
      <div className="text-center mt-6 print:hidden">
        <button
          onClick={() => window.print()}
          className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
        >
          Print Flyer
        </button>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: letter;
            margin: 0.25in;
          }
          html, body {
            height: 100%;
            margin: 0;
            padding: 0;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
};

export default Flyer;
