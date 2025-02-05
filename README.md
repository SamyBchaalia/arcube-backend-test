Arcube Backend - URL Shortener API

This is the backend service for the Arcube Technical Test, an open-source URL shortener application built using NestJS. It provides API endpoints to shorten URLs, generate QR codes, track analytics, and authenticate users.

Features

🚀 NestJS - A progressive Node.js framework for building efficient and scalable server-side applications.

🔥 TypeScript - Strongly typed backend with TypeScript for better maintainability.

🔗 Short URL Generation - Generate short URLs for easy sharing.

📊 Analytics Tracking - Monitor the number of times a shortened URL has been accessed.

🏷 QR Code Support - Generate QR codes for shortened URLs.

🔐 Authentication - Secure API endpoints with authentication.

🗄 MongoDB - Store URL mappings and analytics data efficiently.

✅ ESLint & Prettier - Linting and formatting to maintain code quality.

Requirements

Node.js 16+

MongoDB

Getting Started

Clone this repository and install dependencies:

git clone https://github.com/SamyBchaalia/arcube-backend-test.git
cd arcube-backend-test
pnpm install

Environment Variables

Create a .env file in the root directory and configure the following:

MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
BASE_URL=http://localhost:3000

Running the Server

Start the development server:

pnpm run start:dev

The API will be available at http://localhost:3000.

API Endpoints

POST /shorten - Shorten a new URL.

GET /:shortId - Redirect to the original URL.

Project Structure

.
├── src
│ ├── auth # Authentication module
│ ├── urls # URL shortening and analytics module
│ ├── database # Database connection setup
│ ├── common # Shared utilities and middlewares
│ └── main.ts # Application entry point
├── test # Unit and integration tests
├── .eslintrc.js # ESLint configuration
├── .prettierrc # Prettier configuration
├── package.json # Dependencies and scripts
└── README.md # Project documentation

Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

Made with ❤️ by Sami Ben Chaalia
