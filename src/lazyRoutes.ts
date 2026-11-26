import type React from 'react';
import { lazyPage } from './lib/lazyPage';

// Pages most visitors never open stay out of the main bundle (and take PayPal / Stripe code with them).
export const Checkout = lazyPage(() => import('./pages/Checkout'));
export const OrderConfirmation = lazyPage(() => import('./pages/OrderConfirmation'));
export const Account = lazyPage(() => import('./pages/Account'));
export const Login = lazyPage(() => import('./pages/Login'));
export const Register = lazyPage(() => import('./pages/Register'));
export const Corporate = lazyPage(() => import('./pages/Corporate'));
export const OrderStatus = lazyPage(() => import('./pages/OrderStatus'));
export const Subscribe = lazyPage(() => import('./pages/Subscribe'));
export const SubscribeThanks = lazyPage<object>(() => import('./pages/Subscribe').then((m) => ({ default: m.SubscribeThanks as React.ComponentType<object> })));

/** Chunks to load before the first render when the app starts on one of these paths (see main.tsx). */
export const ROUTE_PRELOADS: [RegExp, { preload: () => Promise<unknown> }][] = [
  [/^\/checkout\/?$/, Checkout], [/^\/order-confirmation\/?$/, OrderConfirmation], [/^\/account\/?$/, Account],
  [/^\/login\/?$/, Login], [/^\/register\/?$/, Register], [/^\/corporate\/?$/, Corporate],
  [/^\/order-status\/?$/, OrderStatus], [/^\/subscribe\/?$/, Subscribe], [/^\/subscribe\/thanks\/?$/, SubscribeThanks],
];
