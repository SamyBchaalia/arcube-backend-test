# Frontend Payment Integration Guide

This guide provides complete examples for integrating Stripe and PayPal payments into your React/Next.js frontend application.

## Table of Contents

- [Overview](#overview)
- [Payment Flow](#payment-flow)
- [Installation](#installation)
- [Stripe Integration](#stripe-integration)
- [PayPal Integration](#paypal-integration)
- [Manual Orders](#manual-orders)
- [Order Management](#order-management)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

---

## Overview

The backend supports three payment methods:

1. **Stripe Checkout**: Hosted payment page (redirect flow)
2. **PayPal Smart Buttons**: Popup payment flow (inline)
3. **Manual**: Admin-created orders (immediate completion)

### Key Concepts

- Orders are created in **PENDING** status for payment gateway orders
- Orders are created in **COMPLETED** status for manual orders
- Payment completion is handled via webhooks (backend-to-backend)
- Frontend redirects users to payment gateways and handles success/cancel flows

---

## Payment Flow

```
1. User adds items to cart
2. Frontend creates PENDING order via POST /api/orders
3. Frontend initiates payment:
   - Stripe: Create checkout session, redirect user
   - PayPal: Create order, show Smart Buttons popup
4. User completes payment on gateway
5. Gateway sends webhook to backend
6. Backend marks order as COMPLETED
7. Backend sends purchase confirmation email
8. User redirected to success page
```

---

## Installation

### Install Required Packages

```bash
# Stripe
npm install @stripe/stripe-js

# PayPal
npm install @paypal/react-paypal-js
```

---

## Stripe Integration

### 1. Setup Stripe Provider

Wrap your app with Stripe provider in `_app.tsx` (Next.js) or `App.tsx` (React):

```typescript
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function App({ Component, pageProps }) {
  return (
    <Elements stripe={stripePromise}>
      <Component {...pageProps} />
    </Elements>
  );
}

export default App;
```

### 2. Create Checkout Component

```typescript
// components/StripeCheckoutButton.tsx
import { useState } from 'react';
import { useRouter } from 'next/router';

interface StripeCheckoutButtonProps {
  orderId: string;
  accessToken: string;
}

export default function StripeCheckoutButton({
  orderId,
  accessToken,
}: StripeCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payments/stripe/create-checkout-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            orderId,
            successUrl: `${window.location.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: `${window.location.origin}/payment/cancel`,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create checkout session');
      }

      const { url } = await response.json();

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleCheckout}
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Pay with Stripe'}
      </button>
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
}
```

### 3. Handle Payment Success

```typescript
// pages/payment/success.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function PaymentSuccess() {
  const router = useRouter();
  const { session_id } = router.query;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session_id) {
      // Optional: Verify payment status with backend
      verifyPayment(session_id as string);
    }
  }, [session_id]);

  const verifyPayment = async (sessionId: string) => {
    try {
      // The webhook already handled completion
      // This is just for displaying order details to user
      setLoading(false);
    } catch (error) {
      console.error('Error verifying payment:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Verifying payment...</div>;
  }

  return (
    <div className="container mx-auto p-8">
      <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
        <h1 className="text-2xl font-bold mb-4">Payment Successful!</h1>
        <p>Your order has been confirmed. You will receive an email with download links shortly.</p>
        <button
          onClick={() => router.push('/dashboard/purchases')}
          className="mt-4 bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
        >
          View My Purchases
        </button>
      </div>
    </div>
  );
}
```

---

## PayPal Integration

### 1. Setup PayPal Provider

```typescript
// _app.tsx or App.tsx
import { PayPalScriptProvider } from '@paypal/react-paypal-js';

const paypalOptions = {
  'client-id': process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
  currency: 'USD',
  intent: 'capture',
};

function App({ Component, pageProps }) {
  return (
    <PayPalScriptProvider options={paypalOptions}>
      <Component {...pageProps} />
    </PayPalScriptProvider>
  );
}

export default App;
```

### 2. Create PayPal Button Component

```typescript
// components/PayPalCheckoutButton.tsx
import { useState } from 'react';
import { PayPalButtons } from '@paypal/react-paypal-js';

interface PayPalCheckoutButtonProps {
  orderId: string;
  accessToken: string;
  onSuccess: () => void;
}

export default function PayPalCheckoutButton({
  orderId,
  accessToken,
  onSuccess,
}: PayPalCheckoutButtonProps) {
  const [error, setError] = useState<string | null>(null);

  const createOrder = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payments/paypal/create-order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ orderId }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create PayPal order');
      }

      const data = await response.json();
      return data.orderId; // PayPal order ID
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const onApprove = async (data: any) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payments/paypal/capture-order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            paypalOrderId: data.orderID,
            orderId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to capture payment');
      }

      const result = await response.json();
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div>
      <PayPalButtons
        createOrder={createOrder}
        onApprove={onApprove}
        onError={(err) => {
          console.error('PayPal error:', err);
          setError('Payment failed. Please try again.');
        }}
        style={{
          layout: 'vertical',
          color: 'gold',
          shape: 'rect',
          label: 'paypal',
        }}
      />
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
}
```

---

## Manual Orders

Manual orders are created directly by admins and are immediately completed (no payment required).

### Admin Panel Example

```typescript
// pages/admin/orders/create.tsx
import { useState } from 'react';

export default function CreateManualOrder() {
  const [userId, setUserId] = useState('');
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState('');

  const handleCreateOrder = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          items: [
            {
              itemType: 'product',
              itemId: 'product-uuid',
              quantity: 1,
            },
          ],
          paymentMethod: 'manual',
          notes: 'Admin-created order for client',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create order');
      }

      const order = await response.json();
      alert(`Order ${order.orderNumber} created successfully!`);
    } catch (error) {
      console.error('Error creating order:', error);
    }
  };

  return (
    <div>
      <h1>Create Manual Order</h1>
      {/* Order creation form */}
      <button onClick={handleCreateOrder}>Create Order</button>
    </div>
  );
}
```

---

## Order Management

### Create Order (Cart Checkout)

```typescript
// pages/checkout.tsx
import { useState } from 'react';
import { useCart } from '../context/CartContext';
import StripeCheckoutButton from '../components/StripeCheckoutButton';
import PayPalCheckoutButton from '../components/PayPalCheckoutButton';

export default function Checkout() {
  const { cartItems, clearCart } = useCart();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal'>('stripe');
  const accessToken = 'your-access-token'; // Get from auth context

  const createOrder = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          items: cartItems.map((item) => ({
            itemType: item.type, // 'product' or 'package'
            itemId: item.id,
            quantity: item.quantity,
          })),
          paymentMethod: 'stripe', // Will be PENDING
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create order');
      }

      const order = await response.json();
      setOrderId(order.id);
    } catch (error) {
      console.error('Error creating order:', error);
    }
  };

  if (!orderId) {
    return (
      <button onClick={createOrder} className="bg-blue-600 text-white px-6 py-3 rounded">
        Proceed to Payment
      </button>
    );
  }

  return (
    <div>
      <h2>Choose Payment Method</h2>

      <div className="space-y-4">
        <label>
          <input
            type="radio"
            value="stripe"
            checked={paymentMethod === 'stripe'}
            onChange={(e) => setPaymentMethod(e.target.value as 'stripe')}
          />
          Stripe (Credit Card)
        </label>

        <label>
          <input
            type="radio"
            value="paypal"
            checked={paymentMethod === 'paypal'}
            onChange={(e) => setPaymentMethod(e.target.value as 'paypal')}
          />
          PayPal
        </label>
      </div>

      {paymentMethod === 'stripe' && (
        <StripeCheckoutButton orderId={orderId} accessToken={accessToken} />
      )}

      {paymentMethod === 'paypal' && (
        <PayPalCheckoutButton
          orderId={orderId}
          accessToken={accessToken}
          onSuccess={() => {
            clearCart();
            window.location.href = '/payment/success';
          }}
        />
      )}
    </div>
  );
}
```

### View User Orders

```typescript
// pages/dashboard/orders.tsx
import { useEffect, useState } from 'react';

export default function UserOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const accessToken = 'your-access-token';

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/orders?page=1&limit=10`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();
      setOrders(data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setLoading(false);
    }
  };

  if (loading) return <div>Loading orders...</div>;

  return (
    <div>
      <h1>My Orders</h1>
      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="border p-4 rounded">
            <h3>Order {order.orderNumber}</h3>
            <p>Status: {order.status}</p>
            <p>Total: ${order.total}</p>
            <p>Date: {new Date(order.createdAt).toLocaleDateString()}</p>

            <div className="mt-2">
              <h4>Items:</h4>
              <ul>
                {order.items.map((item) => (
                  <li key={item.id}>
                    {item.itemName} - ${item.price} x {item.quantity}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### View Purchased Products

```typescript
// pages/dashboard/purchases.tsx
import { useEffect, useState } from 'react';

export default function Purchases() {
  const [products, setProducts] = useState([]);
  const accessToken = 'your-access-token';

  useEffect(() => {
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/users/me/purchases`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();
      setProducts(data.products);
    } catch (error) {
      console.error('Error fetching purchases:', error);
    }
  };

  const handleDownload = async (productId: string) => {
    const downloadUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/products/${productId}/download`;

    // Open in new tab for download
    window.open(downloadUrl, '_blank');
  };

  return (
    <div>
      <h1>My Purchases</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <div key={product.id} className="border p-4 rounded">
            <h3>{product.name}</h3>
            <p className="text-sm text-gray-600">
              Purchased: {new Date(product.purchasedAt).toLocaleDateString()}
            </p>

            <div className="mt-4 space-y-2">
              {product.hasFile && (
                <button
                  onClick={() => handleDownload(product.id)}
                  className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                >
                  Download File
                </button>
              )}

              <a
                href={product.contentLink}
                className="block w-full bg-green-600 text-white py-2 rounded text-center hover:bg-green-700"
              >
                View Online
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Error Handling

### Common Error Scenarios

```typescript
// utils/paymentErrorHandler.ts
export function handlePaymentError(error: any): string {
  if (error.response) {
    const { status, data } = error.response;

    switch (status) {
      case 400:
        return data.message || 'Invalid payment request. Please check your order.';
      case 403:
        return 'You do not have access to this order.';
      case 404:
        return 'Order not found. Please try creating a new order.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'Payment service error. Please try again later or contact support.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  if (error.message) {
    return error.message;
  }

  return 'Payment failed. Please try again or contact support.';
}
```

### Usage in Component

```typescript
import { handlePaymentError } from '../utils/paymentErrorHandler';

try {
  // Payment logic
} catch (error) {
  const errorMessage = handlePaymentError(error);
  setError(errorMessage);
}
```

---

## Best Practices

### 1. Security

- **Never expose secret keys in frontend code**
- Use environment variables for all API keys
- Always use HTTPS in production
- Validate user authentication before creating orders
- Implement CSRF protection

### 2. User Experience

- Show loading states during payment processing
- Provide clear error messages
- Implement retry mechanisms for failed requests
- Display order confirmations immediately
- Send email confirmations

### 3. Testing

**Use test credentials:**

**Stripe Test Cards:**
- Success: `4242 4242 4242 4242`
- Declined: `4000 0000 0000 0002`
- Requires authentication: `4000 0025 0000 3155`

**PayPal Sandbox:**
- Use sandbox accounts from PayPal Developer Dashboard
- Test both successful and failed payments

### 4. Error Recovery

```typescript
// Implement retry logic for transient errors
async function createOrderWithRetry(data: any, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        return await response.json();
      }

      // Don't retry on client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        throw new Error('Client error');
      }
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
}
```

### 5. Analytics

Track payment events for monitoring:

```typescript
// utils/analytics.ts
export function trackPaymentEvent(event: string, data: any) {
  // Send to your analytics service
  console.log('Payment Event:', event, data);

  // Example with Google Analytics
  if (window.gtag) {
    window.gtag('event', event, {
      ...data,
      event_category: 'payment',
    });
  }
}

// Usage
trackPaymentEvent('payment_initiated', { method: 'stripe', amount: 99.99 });
trackPaymentEvent('payment_success', { orderId: 'ORD-123', amount: 99.99 });
trackPaymentEvent('payment_failed', { error: 'Card declined' });
```

---

## Environment Variables

Create a `.env.local` file in your frontend project:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:4000

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# PayPal
NEXT_PUBLIC_PAYPAL_CLIENT_ID=...
```

---

## API Endpoints Reference

### Orders
- `POST /api/orders` - Create new order
- `GET /api/orders` - Get user's orders (paginated)
- `GET /api/orders/:id` - Get order details
- `POST /api/orders/:id/cancel` - Cancel pending order

### Stripe
- `POST /api/payments/stripe/create-checkout-session` - Create checkout session

### PayPal
- `POST /api/payments/paypal/create-order` - Create PayPal order
- `POST /api/payments/paypal/capture-order` - Capture payment

### User Dashboard
- `GET /api/users/me` - Current user profile
- `GET /api/users/me/purchases` - Purchased products with download links
- `GET /api/users/me/orders` - Order history

### Products
- `GET /api/products/:id/content` - Full content (purchase required)
- `GET /api/products/:id/download` - Download file (purchase required)

---

## Complete Flow Example

Here's a complete checkout flow from cart to success:

```typescript
// pages/checkout/index.tsx
import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import StripeCheckoutButton from '../../components/StripeCheckoutButton';
import PayPalCheckoutButton from '../../components/PayPalCheckoutButton';

export default function CheckoutPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const { cartItems, total, clearCart } = useCart();
  const [step, setStep] = useState<'review' | 'payment'>('review');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal'>('stripe');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateOrder = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: cartItems.map((item) => ({
            itemType: item.type,
            itemId: item.id,
            quantity: item.quantity || 1,
          })),
          paymentMethod: 'stripe', // Will be PENDING
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create order');
      }

      const order = await response.json();
      setOrderId(order.id);
      setStep('payment');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    clearCart();
    router.push('/payment/success');
  };

  if (!user) {
    router.push('/login?redirect=/checkout');
    return null;
  }

  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
        <button
          onClick={() => router.push('/products')}
          className="bg-blue-600 text-white px-6 py-2 rounded"
        >
          Browse Products
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      {step === 'review' && (
        <div>
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
            <div className="space-y-3">
              {cartItems.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span>
                    {item.name} x {item.quantity}
                  </span>
                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t mt-4 pt-4">
              <div className="flex justify-between text-xl font-bold">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <button
            onClick={handleCreateOrder}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating Order...' : 'Proceed to Payment'}
          </button>
        </div>
      )}

      {step === 'payment' && orderId && (
        <div>
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Select Payment Method</h2>

            <div className="space-y-3 mb-6">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  value="stripe"
                  checked={paymentMethod === 'stripe'}
                  onChange={(e) => setPaymentMethod('stripe')}
                  className="form-radio"
                />
                <span className="text-lg">Credit Card (Stripe)</span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  value="paypal"
                  checked={paymentMethod === 'paypal'}
                  onChange={(e) => setPaymentMethod('paypal')}
                  className="form-radio"
                />
                <span className="text-lg">PayPal</span>
              </label>
            </div>

            {paymentMethod === 'stripe' && (
              <StripeCheckoutButton orderId={orderId} accessToken={token} />
            )}

            {paymentMethod === 'paypal' && (
              <PayPalCheckoutButton
                orderId={orderId}
                accessToken={token}
                onSuccess={handlePaymentSuccess}
              />
            )}
          </div>

          <button
            onClick={() => setStep('review')}
            className="text-blue-600 hover:underline"
          >
            ← Back to Order Review
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## Support

For issues or questions:
- Check the backend API documentation at `/docs`
- Review error messages in browser console
- Test with sandbox/test credentials first
- Contact support with order ID and error details

---

**Last Updated**: January 2026
