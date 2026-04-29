import { useState, FormEvent, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { PayPalButtons } from '@paypal/react-paypal-js';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { createOrder } from '../utils/firestoreHelpers';
import Button from '../components/ui/Button';
import { ShippingAddress } from '../types';

const stripePublicKey = import.meta.env.PROD
  ? import.meta.env.VITE_STRIPE_PUBLIC_KEY_LIVE
  : import.meta.env.VITE_STRIPE_PUBLIC_KEY;

const stripePromise = stripePublicKey ? loadStripe(stripePublicKey) : null;

const FUNCTIONS_BASE = 'https://us-central1-shamyra-web.cloudfunctions.net';

interface StripeFormProps {
  total: number;
  onSuccess: (paymentId: string) => void;
  onError: (message: string) => void;
}

const StripeForm = ({ total, onSuccess, onError }: StripeFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);

    try {
      const res = await fetch(`${FUNCTIONS_BASE}/createStripePaymentIntent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Math.round(total * 100), currency: 'usd' }),
      });

      const { clientSecret, error: serverError } = await res.json();
      if (serverError) throw new Error(serverError);

      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: elements.getElement(CardElement)! },
      });

      if (error) {
        onError(error.message || 'Payment failed');
      } else if (paymentIntent?.status === 'succeeded') {
        onSuccess(paymentIntent.id);
      }
    } catch (err: any) {
      onError(err.message || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="border border-gray-300 rounded-md p-3">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': { color: '#aab7c4' },
              },
              invalid: { color: '#9e2146' },
            },
          }}
        />
      </div>
      <Button
        type="submit"
        variant="primary"
        className="w-full"
        disabled={!stripe || processing}
      >
        {processing ? 'Processing...' : `Pay $${total.toFixed(2)}`}
      </Button>
    </form>
  );
};

const Checkout = () => {
  const { user } = useAuth();
  const { cartItems, getCartTotal, clearCart } = useCart();
  const navigate = useNavigate();

  const [error, setError] = useState('');
  const [shippingConfirmed, setShippingConfirmed] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'card'>('paypal');
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

  const handleShippingSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!user) {
      setError('Please login to complete your order');
      navigate('/login');
      return;
    }

    setShippingConfirmed(true);
  };

  const handleEditShipping = () => {
    setShippingConfirmed(false);
  };

  const handleStripeSuccess = async (paymentId: string) => {
    try {
      const orderData = {
        items: cartItems,
        total: getCartTotal(),
        shippingAddress: {
          fullName: formData.fullName,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          phone: formData.phone
        },
        paymentMethod: 'stripe',
        paymentId,
        paymentStatus: 'COMPLETED'
      };

      await createOrder(user!.uid, orderData);
      clearCart();
      navigate('/profile?orderPlaced=true');
    } catch (err) {
      setError('Payment succeeded but order creation failed. Please contact support.');
      console.error(err);
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

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">Checkout</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* Shipping Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">
                {shippingConfirmed ? 'Shipping Info' : 'Shipping Information'}
              </h2>
              {shippingConfirmed && (
                <button
                  onClick={handleEditShipping}
                  className="text-sm text-primary-600 hover:text-primary-700 underline"
                >
                  Edit
                </button>
              )}
            </div>

            {shippingConfirmed ? (
              <div className="space-y-2 text-sm text-gray-700 mb-6">
                <p className="font-medium">{formData.fullName}</p>
                <p>{formData.address}</p>
                <p>{formData.city}, {formData.state} {formData.zipCode}</p>
                <p>{formData.phone}</p>
                <p>{formData.email}</p>
              </div>
            ) : (
              <form onSubmit={handleShippingSubmit} className="space-y-4">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full mt-6"
                >
                  Continue to Payment
                </Button>
              </form>
            )}

            {/* Payment Methods — shown after shipping is confirmed */}
            {shippingConfirmed && (
              <div>
                {/* Payment Method Tabs */}
                <div className="flex border-b border-gray-200 mb-6">
                  <button
                    type="button"
                    onClick={() => { setPaymentMethod('paypal'); setError(''); }}
                    className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
                      paymentMethod === 'paypal'
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    PayPal
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPaymentMethod('card'); setError(''); }}
                    className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
                      paymentMethod === 'card'
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Credit / Debit Card
                  </button>
                </div>

                {/* PayPal */}
                {paymentMethod === 'paypal' && (
                  <PayPalButtons
                    style={{ layout: 'vertical', shape: 'rect', label: 'pay' }}
                    createOrder={(_data, actions) => {
                      return actions.order.create({
                        intent: 'CAPTURE',
                        purchase_units: [{
                          amount: {
                            currency_code: 'USD',
                            value: getCartTotal().toFixed(2)
                          },
                          description: `KindFlames order - ${cartItems.length} item(s)`
                        }]
                      });
                    }}
                    onApprove={async (_data, actions) => {
                      try {
                        const details = await actions.order!.capture();

                        const orderData = {
                          items: cartItems,
                          total: getCartTotal(),
                          shippingAddress: {
                            fullName: formData.fullName,
                            address: formData.address,
                            city: formData.city,
                            state: formData.state,
                            zipCode: formData.zipCode,
                            phone: formData.phone
                          },
                          paymentMethod: 'paypal',
                          paymentId: details.id,
                          paymentStatus: details.status
                        };

                        await createOrder(user!.uid, orderData);
                        clearCart();
                        navigate('/profile?orderPlaced=true');
                      } catch (err) {
                        setError('Payment succeeded but order creation failed. Please contact support.');
                        console.error(err);
                      }
                    }}
                    onError={(err) => {
                      setError('Payment failed. Please try again.');
                      console.error('PayPal error:', err);
                    }}
                    onCancel={() => {
                      setError('Payment was cancelled. You can try again when ready.');
                    }}
                  />
                )}

                {/* Stripe Card Payment */}
                {paymentMethod === 'card' && stripePromise && (
                  <Elements stripe={stripePromise}>
                    <StripeForm
                      total={getCartTotal()}
                      onSuccess={handleStripeSuccess}
                      onError={(msg) => setError(msg)}
                    />
                  </Elements>
                )}

                {paymentMethod === 'card' && !stripePromise && (
                  <p className="text-gray-500 text-sm">Card payments are not available at this time.</p>
                )}
              </div>
            )}
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
                  <span className="font-semibold">FREE</span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="text-lg font-bold">Total</span>
                  <span className="text-lg font-bold text-primary-600">
                    ${getCartTotal().toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
