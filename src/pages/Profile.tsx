import { useState, useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { User, Mail, Calendar, Package, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUserOrders } from '../utils/firestoreHelpers';
import { Order } from '../types';

const Profile = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (searchParams.get('orderPlaced') === 'true') {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    }
  }, [searchParams]);

  useEffect(() => {
    const loadOrders = async () => {
      if (user) {
        const userOrders = await getUserOrders(user.uid);
        setOrders(userOrders);
        setLoading(false);
      }
    };

    loadOrders();
  }, [user]);

  if (!user) {
    return <Navigate to="/login" />;
  }

  const formatDate = (timestamp: { seconds: number; nanoseconds: number } | undefined): string => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp.seconds * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {showSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded mb-6 flex items-center gap-2">
            <CheckCircle size={20} />
            <span>Order placed successfully! Thank you for your purchase.</span>
          </div>
        )}

        <h1 className="text-4xl font-bold text-gray-800 mb-8">My Profile</h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-20 h-20 bg-primary-200 rounded-full flex items-center justify-center">
              <User size={40} className="text-primary-600" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-800">
                {user.displayName || 'User'}
              </h2>
              <p className="text-gray-600">{user.email}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Account Information</h3>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="text-gray-400" size={20} />
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="text-gray-400" size={20} />
                  <div>
                    <p className="text-sm text-gray-600">Member Since</p>
                    <p className="font-medium">
                      {user.metadata?.creationTime
                        ? new Date(user.metadata.creationTime).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <User className="text-gray-400" size={20} />
                  <div>
                    <p className="text-sm text-gray-600">User ID</p>
                    <p className="font-medium text-sm">{user.uid}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Order History */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-6">
            <Package className="text-primary-600" size={24} />
            <h3 className="text-2xl font-semibold text-gray-800">Order History</h3>
          </div>

          {loading ? (
            <p className="text-gray-600">Loading orders...</p>
          ) : orders.length === 0 ? (
            <p className="text-gray-600">You haven't placed any orders yet.</p>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-gray-800">Order #{order.id.slice(-8)}</p>
                      <p className="text-sm text-gray-600">{formatDate(order.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary-600">${order.total.toFixed(2)}</p>
                      <span className="inline-block px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">
                        {order.status}
                      </span>
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">Items:</p>
                    <ul className="space-y-1">
                      {order.items.map((item, index) => (
                        <li key={index} className="text-sm text-gray-600">
                          {item.name} x {item.quantity} - ${(item.price * item.quantity).toFixed(2)}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {order.shippingAddress && (
                    <div className="border-t mt-3 pt-3">
                      <p className="text-sm font-medium text-gray-700 mb-1">Shipping Address:</p>
                      <p className="text-sm text-gray-600">
                        {order.shippingAddress.fullName}<br />
                        {order.shippingAddress.address}<br />
                        {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
