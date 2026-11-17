import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Shop } from './shop/shop';

export const routes: Routes = [
  {
    path: '',
    component: Home,
    title: 'CourtSide | Lessons, Snacks, Gear & Services'
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
  { path: '**', redirectTo: '' }
];
