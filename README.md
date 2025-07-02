# TrackMySUbs - Subscription Management App

A comprehensive subscription tracking application built with Next.js, Firebase, Stripe, and Google APIs.

## Features

- 📊 Dashboard with subscription overview
- 💳 Stripe payment integration for premium features
- 📧 Gmail scanning for automatic subscription detection
- 📅 Calendar view for premium users
- 📱 SMS notifications via Twilio
- 🎨 Brand-specific subscription icons
- 🔐 Secure authentication with Firebase

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Firebase (Auth, Firestore)
- **Payments**: Stripe
- **Email Integration**: Gmail API
- **SMS**: Twilio
- **Icons**: Lucide React
- **Calendar**: React Calendar

## Prerequisites

- Node.js 18+ and npm
- Firebase project
- Stripe account
- Google Cloud Console project with Gmail API enabled
- Twilio account (free tier supported)

## Environment Variables

Create a `.env.local` file in the root directory:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Google APIs
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd TrackMySUbs
npm install
```

### 2. Firebase Setup

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication and Firestore Database
3. Add a web app to your Firebase project
4. Copy the config values to your `.env.local` file
5. Set up Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /subscriptions/{subscriptionId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
```

### 3. Stripe Setup

1. Create a Stripe account at [Stripe Dashboard](https://dashboard.stripe.com/)
2. Get your publishable and secret keys from the API keys section
3. Create a webhook endpoint:
   - Go to Developers > Webhooks
   - Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
   - Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy the webhook signing secret
4. Create products and prices in Stripe Dashboard for your premium plan

### 4. Google APIs Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Gmail API
4. Create OAuth 2.0 credentials:
   - Go to APIs & Services > Credentials
   - Create OAuth client ID for web application
   - Add authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
   - Download the credentials and add to `.env.local`

### 5. Twilio Setup

1. Create a Twilio account at [Twilio Console](https://console.twilio.com/)
2. Get your Account SID and Auth Token from the dashboard
3. Get a Twilio phone number (free trial includes one)
4. Add credentials to `.env.local`

### 6. Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Testing

### Stripe Webhooks (Local Development)

1. Install Stripe CLI:
```bash
curl -s https://packages.stripe.com/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg
echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.com/stripe-cli-buster-main main" | sudo tee -a /etc/apt/sources.list.d/stripe.list
sudo apt update
sudo apt install stripe
```

2. Login and forward webhooks:
```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

3. Use the webhook signing secret from the CLI output in your `.env.local`

### Gmail Integration Testing

1. Ensure you have test emails with subscription confirmations
2. Use the Gmail scan feature in the app
3. Check the console for API responses

### SMS Testing

1. Twilio free accounts can only send to verified phone numbers
2. Add your phone number to verified numbers in Twilio Console
3. Test SMS notifications from the app

## Production Deployment

### Environment Variables for Production

- Update all test API keys to production keys
- Set proper domain for OAuth redirects
- Update Stripe webhook endpoint URL
- Configure proper CORS settings

### Security Considerations

- Enable Firestore security rules
- Use HTTPS for all webhook endpoints
- Validate all webhook signatures
- Implement rate limiting for API endpoints
- Secure environment variable storage

## Project Structure

```
src/
├── app/              # Next.js app directory
├── components/       # React components
├── lib/             # Utility functions and configs
├── hooks/           # Custom React hooks
└── types/           # TypeScript type definitions
```

## API Endpoints

- `POST /api/webhooks/stripe` - Stripe webhook handler
- `POST /api/gmail/scan` - Gmail scanning endpoint
- `POST /api/sms/send` - SMS notification endpoint
- `GET /api/subscriptions` - Get user subscriptions
- `POST /api/subscriptions` - Create subscription

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For questions or issues, please open a GitHub issue or contact [your-email@domain.com]
