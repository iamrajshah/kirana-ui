# Kirana POS - Mobile App

A mobile-first POS (Point of Sale) SaaS application built with Ionic React for kirana stores and small retail businesses.

## Features

- **Fast Billing**: Touch-optimized product search and cart management
- **Customer Management**: Track customers and credit balances
- **Inventory Tracking**: Real-time stock levels with low stock alerts
- **Payment Recording**: Multiple payment modes (Cash, UPI, Card, etc.)
- **Dashboard Analytics**: Daily sales, pending invoices, and key metrics
- **Role-Based Access**: OWNER, MANAGER, and CASHIER roles
- **Offline Support**: Works with intermittent connectivity
- **Multi-language**: English default with i18next support

## Tech Stack

- **Framework**: Ionic React 7
- **State Management**: Redux Toolkit + RTK Query
- **Styling**: Tailwind CSS
- **Authentication**: JWT (access + refresh tokens)
- **Localization**: i18next
- **Build Tool**: Vite

## Prerequisites

- Node.js 18+
- npm or yarn

## Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── core/
│   ├── api/          # RTK Query API slices
│   ├── auth/         # Authentication logic
│   ├── store/        # Redux store configuration
│   ├── i18n/         # Localization setup
│   ├── types/        # TypeScript types
│   └── constants/    # App constants
├── features/
│   ├── login/        # Login screen
│   ├── dashboard/    # Dashboard screen
│   ├── billing/      # POS billing screen
│   ├── customers/    # Customer management
│   ├── products/     # Product management
│   ├── inventory/    # Inventory tracking
│   └── payments/     # Payment recording
├── components/       # Reusable UI components
├── layouts/          # Layout wrappers
├── hooks/            # Custom React hooks
└── utils/            # Helper functions
```

## Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_APP_NAME=Kirana POS
VITE_APP_VERSION=1.0.0
```

## API Integration

The app expects the backend API to be running at `VITE_API_BASE_URL`. Ensure your backend matches the API contract defined in `src/core/types/index.ts`.

### Key Endpoints

- POST `/auth/login` - User login
- POST `/auth/refresh` - Refresh access token
- GET `/dashboard/stats` - Dashboard statistics
- GET `/customers` - List customers
- POST `/invoices` - Create invoice
- POST `/payments` - Record payment
- GET `/inventory` - List inventory
- GET `/products` - List products

## Mobile Build

```bash
# Add platforms
npx cap add ios
npx cap add android

# Build web assets
npm run build

# Sync with native projects
npx cap sync

# Open in IDE
npx cap open ios
npx cap open android
```

## Design Principles

1. **Mobile-First**: All screens optimized for 320px+ width
2. **Touch-Friendly**: Minimum 48px tap targets
3. **Fast Flows**: Minimal steps for common tasks
4. **Simple UI**: Clear, uncluttered interfaces
5. **One-Handed Use**: Bottom navigation, accessible controls

## Role-Based Features

- **OWNER**: Full access to all features
- **MANAGER**: All features except user management
- **CASHIER**: Billing, customers, and payments only

## License

Proprietary - All rights reserved

## Support

For issues or questions, contact support@example.com
