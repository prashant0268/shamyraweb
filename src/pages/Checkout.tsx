import { useState, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { createOrder } from '../utils/firestoreHelpers';
import { redirectToStripeCheckout, createPayPalOrder, capturePayPalOrder } from '../services/paymentService';
import Button from '../components/ui/Button';
import { ShippingAddress } from '../types';

type PaymentMethod = 'stripe' | 'paypal' | null;

const Checkout = () => {
  const { user, loginAsGuest } = useAuth();
  const { cartItems, getCartTotal, clearCart } = useCart();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [formData, setFormData] = useState<ShippingAddress>({
    fullName: '',
    email: user?.email || '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: ''
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validateForm = (): boolean => {
    if (!formData.fullName || !formData.email || !formData.address ||
      !formData.city || !formData.state || !formData.zipCode || !formData.phone) {
      setError('Please fill in all shipping information fields');
      return false;
    }
    return true;
  };

  const handleStripeCheckout = async () => {
    if (!validateForm()) return;

    setError('');
    setLoading(true);

    try {
      // If user is not logged in, sign in as guest
      let currentUser = user;
      if (!currentUser) {
        const guestCredential = await loginAsGuest();
        currentUser = {
          uid: guestCredential.user.uid,
          email: formData.email || null,
          displayName: formData.fullName || 'Guest'
        };
      }

      // Save pending order to Firestore
      await createOrder(currentUser.uid, {
        items: cartItems,
        total: getCartTotal(),
        shippingAddress: formData,
        paymentMethod: 'stripe',
        paymentStatus: 'pending'
      });

      // Redirect to Stripe checkout
      await redirectToStripeCheckout(cartItems, formData);
    } catch (err: any) {
      const errorMessage = err?.message || err?.code || 'Unknown error';
      setError(`Failed to initiate payment: ${errorMessage}`);
      console.error('Stripe checkout error:', err);
      setLoading(false);
    }
  };

  const handlePayPalCreateOrder = async (): Promise<string> => {
    console.log('[PayPal Debug] handlePayPalCreateOrder called');
    if (!validateForm()) {
      throw new Error('Please fill in shipping information');
    }

    try {
      console.log('[PayPal Debug] Calling createPayPalOrder...');
      const orderId = await createPayPalOrder(cartItems, getCartTotal());
      console.log('[PayPal Debug] Order created, ID:', orderId);
      return orderId;
    } catch (err) {
      console.error('[PayPal Debug] Create order error:', err);
      throw err;
    }
  };

  const handlePayPalApprove = async (data: { orderID: string }) => {
    setLoading(true);
    setError('');

    try {
      // If user is not logged in, sign in as guest
      let currentUser = user;
      if (!currentUser) {
        const guestCredential = await loginAsGuest();
        currentUser = {
          uid: guestCredential.user.uid,
          email: formData.email || null,
          displayName: formData.fullName || 'Guest'
        };
      }

      // Capture PayPal payment
      const result = await capturePayPalOrder(data.orderID);

      if (result.status === 'COMPLETED') {
        // Save completed order to Firestore
        await createOrder(currentUser.uid, {
          items: cartItems,
          total: getCartTotal(),
          shippingAddress: formData,
          paymentMethod: 'paypal',
          paymentStatus: 'completed',
          paypalOrderId: data.orderID
        });

        clearCart();
        navigate('/order-confirmation?payment=paypal');
      } else {
        setError('Payment was not completed. Please try again.');
      }
    } catch (err) {
      setError('Failed to process payment. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Your Cart is Empty</h1>
          <p className="text-gray-600 mb-8">Add items to your cart before checking out</p>
          <Button onClick={() => navigate('/products')}>Browse Products</Button>
        </div>
      </div>
    );
  }

  // Use production PayPal client ID on kindflames.com, sandbox otherwise
  const isProduction = window.location.hostname === 'kindflames.com' || window.location.hostname === 'www.kindflames.com';
  const paypalClientId = isProduction
    ? import.meta.env.VITE_PAYPAL_CLIENT_ID_LIVE
    : import.meta.env.VITE_PAYPAL_CLIENT_ID;

  console.log('[PayPal Debug] isProduction:', isProduction);
  console.log('[PayPal Debug] clientId:', paypalClientId?.substring(0, 15) + '...');

  return (
    <PayPalScriptProvider options={{
      clientId: paypalClientId || 'test',
      currency: 'USD',
      intent: 'capture'
    }}>
      <div className="min-h-screen py-8 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-8">Checkout</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            {/* Shipping Information Form */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-semibold mb-6">Shipping Information</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      required
                      value={formData.fullName}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address *
                    </label>
                    <input
                      type="text"
                      name="address"
                      required
                      value={formData.address}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City *
                      </label>
                      <input
                        type="text"
                        name="city"
                        required
                        value={formData.city}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-amber-500 focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State *
                      </label>
                      <input
                        type="text"
                        name="state"
                        required
                        value={formData.state}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-amber-500 focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ZIP Code *
                      </label>
                      <input
                        type="text"
                        name="zipCode"
                        required
                        value={formData.zipCode}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-amber-500 focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone *
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        required
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-amber-500 focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-semibold mb-6">Payment Method</h2>

                <div className="space-y-4">
                  {/* Stripe Option - Hidden on production until account is set up */}
                  {!isProduction && (
                    <div
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${paymentMethod === 'stripe'
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-gray-200 hover:border-gray-300'
                        }`}
                      onClick={() => setPaymentMethod('stripe')}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethod === 'stripe'}
                          onChange={() => setPaymentMethod('stripe')}
                          className="h-4 w-4 text-amber-600"
                        />
                        <div className="flex items-center gap-2">
                          <svg className="h-8 w-8" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                            <path fill="#6772E5" d="M14.75 12.75c0-.83.68-1.13 1.81-1.13 1.62 0 3.67.5 5.29 1.37V8.5c-1.77-.7-3.53-1-5.29-1-4.32 0-7.19 2.26-7.19 6.03 0 5.88 8.1 4.94 8.1 7.47 0 .98-.85 1.3-2.04 1.3-1.77 0-4.02-.73-5.81-1.71v4.56c1.98.85 3.98 1.22 5.81 1.22 4.43 0 7.47-2.19 7.47-6.01 0-6.35-8.15-5.22-8.15-7.61z"/>
                          </svg>
                          <span className="font-medium">Credit / Debit Card</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mt-2 ml-7">
                        Pay securely with your credit or debit card via Stripe
                      </p>
                    </div>
                  )}

                  {/* PayPal Option */}
                  <div
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${paymentMethod === 'paypal'
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-gray-200 hover:border-gray-300'
                      }`}
                    onClick={() => setPaymentMethod('paypal')}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={paymentMethod === 'paypal'}
                        onChange={() => setPaymentMethod('paypal')}
                        className="h-4 w-4 text-amber-600"
                      />
                      <div className="flex items-center gap-2">
                        <svg className="h-8 w-8" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                          <path fill="#003087" d="M12.5 27.5h-3l2-13h3.5c3.5 0 6 2 5.5 5.5s-3.5 5-6.5 5h-2l-.5 2.5z"/>
                          <path fill="#009CDE" d="M20 10.5c-.5 3.5-3 5.5-6.5 5.5h-1.5l-1 5h-3l-.5 2.5h3l2-13h3.5c2.5 0 4.5 1 4.5 3 0 .5 0 1-.5 2z"/>
                        </svg>
                        <span className="font-medium">PayPal</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2 ml-7">
                      Pay with your PayPal account or PayPal Credit
                    </p>
                  </div>

                  {/* Payment Buttons */}
                  {paymentMethod === 'stripe' && (
                    <Button
                      variant="primary"
                      className="w-full mt-4"
                      onClick={handleStripeCheckout}
                      disabled={loading}
                    >
                      {loading ? 'Redirecting to Stripe...' : `Pay $${getCartTotal().toFixed(2)} with Card`}
                    </Button>
                  )}

                  {paymentMethod === 'paypal' && paypalClientId && (
                    <div className="mt-4">
                      <PayPalButtons
                        style={{ layout: 'vertical', color: 'gold', shape: 'rect' }}
                        createOrder={handlePayPalCreateOrder}
                        onApprove={handlePayPalApprove}
                        onError={(err) => {
                          console.error('PayPal error:', err);
                          setError('PayPal payment failed. Please try again.');
                        }}
                        disabled={loading}
                      />
                    </div>
                  )}

                  {!paymentMethod && (
                    <p className="text-center text-gray-500 text-sm mt-4">
                      Select a payment method to continue
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div>
              <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
                <h2 className="text-2xl font-semibold mb-4">Order Summary</h2>

                <div className="space-y-3 mb-4">
                  {cartItems.map(item => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {item.name} x {item.quantity}
                      </span>
                      <span className="font-medium">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-semibold">${getCartTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping</span>
                    <span className="font-semibold text-green-600">FREE</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="text-lg font-bold">Total</span>
                    <span className="text-lg font-bold text-amber-600">
                      ${getCartTotal().toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="mt-6 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>Secure checkout powered by Stripe & PayPal</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PayPalScriptProvider>
  );
};

export default Checkout;
