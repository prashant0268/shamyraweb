import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

const OrderConfirmation = () => {
  return (
    <div className="min-h-screen py-16 bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-gray-800 mb-4">Order Placed Successfully!</h1>

          <p className="text-gray-600 mb-6">
            Thank you for your order! We've received your order and will begin processing it shortly.
            You will receive an email confirmation with your order details.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-amber-800 text-sm">
              <strong>Note:</strong> Payment will be processed separately.
              We'll contact you with payment details via email or phone.
            </p>
          </div>

          <div className="space-y-3">
            <Link to="/products">
              <Button variant="primary" className="w-full">
                Continue Shopping
              </Button>
            </Link>

            <Link to="/">
              <Button variant="outline" className="w-full">
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
