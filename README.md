# Personal Assistant App

A cross-platform personal assistant application that combines task management features of Apple Reminders and Airtable functionality.

## Project Structure

```
├── web/                 # Next.js web application
├── mobile/             # React Native mobile application
└── server/             # Express.js backend server
```

## Technology Stack

- **Frontend**

  - Mobile: React Native
  - Web: Next.js
  - State Management: Redux
  - Styling: Tailwind CSS
  - Notifications: React Native Push Notification

- **Backend**
  - Runtime: Node.js
  - Framework: Express
  - Database: PostgreSQL
  - API: REST

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- PostgreSQL (v14 or later)
- iOS development environment (for mobile)
  - Xcode (latest version)
  - CocoaPods
- Android development environment (for mobile)
  - Android Studio
  - Android SDK

### Installation

1. Clone the repository:

```bash
git clone [repository-url]
cd personal-assistant
```

2. Install dependencies for each project:

```bash
# Web
cd web
npm install

# Mobile
cd ../mobile
npm install
cd ios && pod install && cd ..

# Server
cd ../server
npm install
```

3. Set up environment variables:

```bash
# Copy example env files
cp web/.env.example web/.env
cp mobile/.env.example mobile/.env
cp server/.env.example server/.env
```

4. Set up the database:

```bash
# Create database and run migrations
cd server
npm run db:setup
```

### Development

1. Start the backend server:

```bash
cd server
npm run dev
```

2. Start the web application:

```bash
cd web
npm run dev
```

3. Start the mobile application:

```bash
cd mobile
# For iOS
npm run ios
# For Android
npm run android
```

## Testing

Run tests for each project:

```bash
# Web
cd web
npm test

# Mobile
cd mobile
npm test

# Server
cd server
npm test
```

## Project Structure Details

### Web Application (Next.js)

- `/web/pages` - Next.js pages and routing
- `/web/components` - Reusable React components
- `/web/styles` - Global styles and Tailwind configuration
- `/web/store` - Redux store configuration and slices
- `/web/api` - API client and utilities

### Mobile Application (React Native)

- `/mobile/src/screens` - Screen components
- `/mobile/src/components` - Reusable components
- `/mobile/src/navigation` - Navigation configuration
- `/mobile/src/store` - Redux store configuration
- `/mobile/src/api` - API client and utilities

### Backend Server (Express)

- `/server/src/routes` - API route handlers
- `/server/src/controllers` - Business logic
- `/server/src/models` - Database models
- `/server/src/middleware` - Custom middleware
- `/server/src/utils` - Utility functions
- `/server/src/config` - Configuration files

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
