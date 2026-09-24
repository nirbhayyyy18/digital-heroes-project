# Digital Heroes – Assignment Project

A full-stack web application developed as part of the assignment provided by **Digital Heroes**.

The application is designed as a subscription-based golf platform where users can manage their golf scores, participate in monthly draws, support charities through their subscription, and track their winnings.

The project also includes a dedicated admin panel for managing users, subscriptions, charities, draws, winners, and reports.

---

## Live Application

**Live Website:**  
https://digital-heroes-project-mu.vercel.app/

**GitHub Repository:**  
https://github.com/nirbhayyyy18/digital-heroes-project

---

## Project Overview

The application provides two main interfaces:

### User Panel

Users can:

- Register and log in
- Manage their profile
- Subscribe to monthly or yearly plans
- View subscription status and renewal information
- Add, edit and delete golf scores
- Maintain their latest five scores
- Browse available charities
- Select a charity
- Set their charity contribution percentage
- Make independent charity donations
- Participate in monthly draws
- View draw results
- View winnings and prize information
- Submit winner verification proof
- Track the status of their winnings

### Admin Panel

Administrators can:

- View and manage users
- Manage user scores
- View subscription information
- Create and manage monthly draws
- Simulate draws
- Publish draw results
- Manage charities
- Manage charity events and media
- Activate or deactivate charities
- Manage winners
- Review winner verification
- Update payout status
- View reports and application statistics

---

## Key Features

### Authentication

- User registration and login
- Email format validation
- Supabase Authentication
- Protected user routes
- Admin access control
- Session-based authentication

### Subscription Management

- Monthly subscription
- Yearly subscription
- Stripe Checkout integration
- Subscription activation
- Subscription renewal tracking
- Subscription cancellation
- Payment failure handling

### Golf Score Management

Users can manage their Stableford scores through the dashboard.

The system supports:

- Adding a new score
- Editing an existing score
- Deleting a score
- Maintaining the latest five scores
- Score date management
- Validation of score values

### Charity Management

Users can browse and select charities available on the platform.

The charity section includes:

- Charity directory
- Charity search and filtering
- Charity profiles
- Charity descriptions
- Charity events
- Charity media
- Contribution percentage selection
- Independent donations

### Monthly Draw

The application includes a monthly draw system based on user entries.

The draw workflow includes:

1. Collect eligible user entries
2. Generate winning numbers
3. Calculate number matches
4. Identify winners
5. Calculate prize distribution
6. Publish the draw result
7. Process winner verification

### Prize Distribution

The prize pool is divided across three matching categories:

| Match | Prize Allocation |
|---|---:|
| 5 Number Match | 40% |
| 4 Number Match | 35% |
| 3 Number Match | 25% |

If there is no winner in the 5-number category, the jackpot amount is carried forward to the next draw.

When multiple users win in the same category, the available prize amount is divided equally between the winners.

### Winner Verification

The winner workflow allows:

- Winner proof submission
- Admin review
- Approval or rejection
- Payout status tracking

### Email Notifications

Email notifications are integrated for important application events, including:

- Subscription activation
- Subscription renewal
- Subscription cancellation
- Payment failure
- Draw results
- Winner verification
- Payout-related updates

---

## Technology Stack

| Category | Technology |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Styling | CSS |
| Backend | Next.js API Routes |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| Payments | Stripe |
| Email | Resend |
| Deployment | Vercel |
| Version Control | Git & GitHub |

---

## Project Structure

```text
digital-heroes-project/
│
├── public/
│
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── signup/
│   │   │
│   │   ├── admin/
│   │   │   ├── users/
│   │   │   ├── draws/
│   │   │   ├── charities/
│   │   │   ├── winners/
│   │   │   └── reports/
│   │   │
│   │   ├── dashboard/
│   │   │   ├── scores/
│   │   │   ├── charity/
│   │   │   ├── subscription/
│   │   │   └── winnings/
│   │   │
│   │   ├── charities/
│   │   │
│   │   └── api/
│   │       ├── admin/
│   │       ├── draws/
│   │       ├── scores/
│   │       ├── donations/
│   │       └── stripe/
│   │
│   ├── components/
│   │
│   └── lib/
│       ├── supabase/
│       ├── draw-engine.ts
│       ├── email.ts
│       ├── stripe.ts
│       └── subscription.ts
│
├── supabase/
│
├── package.json
├── next.config.js
└── README.md
Main Application Routes
Public Routes
Page	Route
Homepage	/
Login	/login
Signup	/signup
Charities	/charities
User Routes
Page	Route
Dashboard	/dashboard
Subscription	/dashboard/subscription
Scores	/dashboard/scores
Charity	/dashboard/charity
Winnings	/dashboard/winnings
Admin Routes
Page	Route
Admin Dashboard	/admin
User Management	/admin/users
Draw Management	/admin/draws
Charity Management	/admin/charities
Winner Management	/admin/winners
Reports	/admin/reports
Getting Started
Prerequisites

Make sure the following are installed:

Node.js
npm
Git

The application also requires configured accounts/projects for:

Supabase
Stripe
Resend
Installation

Clone the repository:

git clone https://github.com/nirbhayyyy18/digital-heroes-project.git

Navigate to the project directory:

cd digital-heroes-project

Install the dependencies:

npm install
Environment Variables

Create a .env.local file in the root directory.

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

SUPABASE_SERVICE_ROLE_KEY=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_MONTHLY_PRICE_ID=
STRIPE_YEARLY_PRICE_ID=

NEXT_PUBLIC_SITE_URL=

RESEND_API_KEY=
RESEND_FROM_EMAIL=

The actual values should be configured locally and in the deployment environment.

Do not commit .env.local or any secret keys to the repository.

Running the Project

Start the development server:

npm run dev

The application will be available at:

http://localhost:3000
Database & Backend

The project uses Supabase for:

PostgreSQL database
Authentication
Row Level Security
Realtime updates
Server-side database operations

The backend functionality is implemented using Next.js API routes and server-side utilities.

Payment Integration

Stripe is used to handle subscription payments.

The subscription flow is:

User
  ↓
Select Subscription Plan
  ↓
Stripe Checkout
  ↓
Payment
  ↓
Stripe Webhook
  ↓
Subscription Status Updated
  ↓
User Dashboard

The application handles subscription lifecycle events such as activation, renewal, cancellation and payment failure.

Draw Flow

The monthly draw follows this general process:

Active Subscribers
        ↓
User Scores
        ↓
Draw Entries
        ↓
Winning Numbers
        ↓
Match Calculation
        ↓
Winner Identification
        ↓
Prize Calculation
        ↓
Draw Publication
        ↓
Winner Verification
        ↓
Payout

The draw logic is implemented in a reusable draw engine so that simulation and publishing use the same core calculation logic.

Charity Flow

The charity contribution workflow is:

User
  ↓
Browse Charities
  ↓
Select Charity
  ↓
Choose Contribution Percentage
  ↓
Subscription Payment
  ↓
Charity Contribution

Users can also make independent donations to supported charities.

Security

The application includes:

Supabase Authentication
Protected routes
Role-based access control
Supabase Row Level Security
Server-side payment operations
Protected administrative operations
Environment-based configuration for secrets
Stripe webhook validation

Sensitive credentials are not stored in the source code.

Testing

The major application workflows were tested during development.

Authentication
User registration
User login
Valid email login
Invalid email validation
Incorrect password handling
Protected routes
Subscription
Monthly subscription
Yearly subscription
Subscription status
Renewal information
Cancellation flow
Payment failure handling
Scores
Add score
Edit score
Delete score
Latest five score handling
Score validation
Charity
Charity directory
Charity selection
Contribution percentage
Independent donations
Charity management
Draw
Draw simulation
Winning number generation
Match calculation
Prize calculation
Draw publication
Winner identification
Admin
User management
Score management
Charity management
Draw management
Winner verification
Reports
UI
Responsive layout
Login and signup flows
Dashboard navigation
Error handling
Form validation
Deployment

The application is deployed using Vercel.

Production URL:

https://digital-heroes-project-muv.vercel.app/

The source code is hosted on GitHub and connected to the Vercel deployment.

Repository

GitHub:
https://github.com/nirbhayyyy18/digital-heroes-project

Assignment Information

This application was developed as part of the Digital Heroes assignment.

The implementation covers the requested user-facing functionality, administrative functionality, subscription flow, golf score management, charity features, monthly draw system, winner management, payment integration and production deployment.

Author

Nirbhay Tiwari
