import { QRCodeSVG } from "qrcode.react";

// Import logo
import logo from "../../../assets/images/logo/Color-Logo-Transparent-Background.png";

// Import candle images
import candle1 from "../../../assets/images/candle1.png";
import candle2 from "../../../assets/images/candle2.png";
import candle3 from "../../../assets/images/candle3.png";
import candle4 from "../../../assets/images/candle4.png";
import candle5 from "../../../assets/images/candle5.png";

const Flyer2 = () => {
  const instagramUrl = "https://instagram.com/kindflames_by_shamyra";
  const zellePhone = "7326668013";
  const candleImages = [candle1, candle2, candle3, candle4, candle5];

  return (
    <div
      className="bg-white min-h-screen p-4 print:p-0"
      style={{ fontFamily: "'Montserrat', sans-serif" }}
    >
      {/* Print-optimized container - fits on one page */}
      <div className="w-[8.5in] h-[11in] mx-auto bg-white print:shadow-none shadow-lg flex flex-col print:w-full print:h-[10.5in]">
        {/* Header with logo and tagline */}
        <header className="text-center pt-3 pb-1 flex-shrink-0">
          <img
            src={logo}
            alt="Kind Flames Logo"
            className="w-[2.5in] h-auto mx-auto"
          />
          <p
            className="text-lg text-gray-700 italic -mt-1"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Luxury Handcrafted Candles Made with Love
          </p>
        </header>

        {/* Candle Images */}
        <section className="py-2 px-6 flex-shrink-0">
          <div className="flex justify-center gap-2">
            {candleImages.map((image, index) => (
              <div
                key={index}
                className="w-[1.1in] h-[1.1in] rounded-xl overflow-hidden border border-amber-200"
              >
                <img
                  src={image}
                  alt={`Kind Flames candle ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Features Section */}
        <section className="py-2 px-12 flex-shrink-0">
          <h2
            className="text-lg font-semibold text-center text-amber-800 mb-2"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Why Choose Kind Flames?
          </h2>
          <div className="grid grid-cols-2 gap-x-10 gap-y-1 text-gray-700 text-sm max-w-[6in] mx-auto">
            <div className="flex items-center">
              <span className="text-amber-600 mr-2">✦</span>
              <span>Paraffin-Free Soy Wax</span>
            </div>
            <div className="flex items-center">
              <span className="text-amber-600 mr-2">✦</span>
              <span>Zinc-Free Cotton Wicks</span>
            </div>
            <div className="flex items-center">
              <span className="text-amber-600 mr-2">✦</span>
              <span>Chemical-Free Fragrance Oils</span>
            </div>
            <div className="flex items-center">
              <span className="text-amber-600 mr-2">✦</span>
              <span>Hand-Poured with Love</span>
            </div>
            <div className="flex items-center">
              <span className="text-amber-600 mr-2">✦</span>
              <span>Sustainable & Cruelty-Free</span>
            </div>
            <div className="flex items-center">
              <span className="text-amber-600 mr-2">✦</span>
              <span>Perfect for Gifts & Self-Care</span>
            </div>
          </div>
        </section>

        {/* Shipping Notice */}
        <div className="text-center py-6 bg-amber-50 flex-shrink-0">
          <p
            className="text-base text-amber-800 font-semibold"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            📦 We Ship Nationwide! 📦
          </p>
          <p className="text-gray-600 text-xs">
            Order online and have your candles delivered right to your door
          </p>
        </div>

        {/* QR Codes Section */}
        <section className="py-3 px-6 flex-grow flex flex-col justify-center">
          <h2
            className="text-lg font-semibold text-center text-amber-800 mb-3"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Connect & Shop
          </h2>
          <div className="flex justify-center items-center gap-16">
            {/* Instagram QR Code */}
            <div className="text-center">
              <div className="bg-white p-2 rounded-2xl border-2 border-amber-300 shadow-md inline-block">
                <QRCodeSVG
                  value={instagramUrl}
                  size={120}
                  level="H"
                  fgColor="#b45309"
                />
              </div>
              <p className="mt-1 font-semibold text-gray-800 text-sm">
                Follow Us
              </p>
              <p className="text-amber-700 text-xs">@kindflames_by_shamyra</p>
            </div>

            {/* Zelle QR Code */}
            <div className="text-center">
              <div className="bg-white p-2 rounded-2xl border-2 border-purple-300 shadow-md inline-block">
                <QRCodeSVG
                  value={zellePhone}
                  size={120}
                  level="H"
                  fgColor="#7c3aed"
                />
              </div>
              <p className="mt-1 font-semibold text-gray-800 text-sm">
                Pay with Zelle
              </p>
              <p className="text-purple-700 text-xs">{zellePhone}</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-4 bg-gradient-to-r from-amber-100 via-amber-50 to-amber-100 text-center flex-shrink-0 mt-auto">
          <p className="text-gray-700 font-medium">
            Thank you for supporting small business!
          </p>
          <p className="text-amber-700 text-sm mt-0.5">
            Made with love in New Jersey
          </p>
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

export default Flyer2;
