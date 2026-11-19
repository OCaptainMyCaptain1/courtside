import { Routes } from '@angular/router';
import { Account } from './account/account';
import { authGuard } from './auth-guard';
import { AuthPage } from './auth-page/auth-page';
import { Checkout } from './checkout/checkout';
import { Home } from './home/home';
import { Lessons } from './lessons/lessons';
import { OrderLookup } from './order-lookup/order-lookup';
import { Reviews } from './reviews/reviews';
import { Shop } from './shop/shop';

export const routes: Routes = [
  {
    path: '',
    component: Home,
    title: 'CourtSide | Lessons, Snacks, Gear & Services'
  },
  {
    path: 'lessons',
    component: Lessons,
    title: 'CourtSide | Book a Lesson'
  },
  {
    path: 'reviews',
    component: Reviews,
    title: 'CourtSide | Customer Reviews'
  },
  {
    path: 'snacks',
    component: Shop,
    title: 'CourtSide | Snack Shop',
    data: {
      category: 'snack',
      heading: 'Snack Shop',
      lead: 'Already on court?',
      note: 'Choose "Deliver to my court" at checkout and enter your court number, and we\'ll bring your order out to you. Otherwise, pick it up at the CourtSide front desk.'
    }
  },
  {
    path: 'proshop',
    component: Shop,
    title: 'CourtSide | Pro Shop',
    data: {
      category: 'proshop',
      heading: 'Pro Shop',
      note: 'Pro Shop orders are picked up at the CourtSide front desk. We don\'t ship, so there are no delivery fees or wait times.'
    }
  },
  {
    path: 'services',
    component: Shop,
    title: 'CourtSide | Services',
    data: {
      category: 'service',
      heading: 'Services',
      note: 'Drop your racquet off at the CourtSide front desk after you check out. Stringing is ready within 24 hours, and grip installation is done while you wait. Demo racquets are picked up at the front desk.'
    }
  },
  {
    path: 'checkout',
    component: Checkout,
    title: 'CourtSide | Checkout'
  },
  {
    path: 'orders',
    component: OrderLookup,
    title: 'CourtSide | Find My Order'
  },
  {
    path: 'login',
    component: AuthPage,
    title: 'CourtSide | Sign in',
    data: { mode: 'login' }
  },
  {
    path: 'register',
    component: AuthPage,
    title: 'CourtSide | Create an account',
    data: { mode: 'register' }
  },
  {
    path: 'account',
    component: Account,
    canActivate: [authGuard],
    title: 'CourtSide | My Account'
  },
  { path: '**', redirectTo: '' }
];
