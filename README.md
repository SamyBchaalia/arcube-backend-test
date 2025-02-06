# Arcube Backend - URL Shortener API

[DEMO](https://arcube.benchaalia.com)

This is the backend service for the Arcube Technical Test, an open-source URL shortener application built using NestJS. It provides API endpoints to shorten URLs, generate QR codes, track analytics, and authenticate users.

## Features

- 🚀 **NestJS** - A progressive Node.js framework for building efficient and scalable server-side applications.
- 🔥 **TypeScript** - Strongly typed backend with TypeScript for better maintainability.
- 🔗 **Short URL Generation** - Generate short URLs for easy sharing.
- 📊 **Analytics Tracking** - Monitor the number of times a shortened URL has been accessed.
- 🏷 **QR Code Support** - Generate QR codes for shortened URLs.
- 🔐 **Authentication** - Secure API endpoints with authentication.
- 🗄 **MongoDB** - Store URL mappings and analytics data efficiently.
- ✅ **ESLint & Prettier** - Linting and formatting to maintain code quality.

## Requirements

- Node.js 16+
- MongoDB

## Getting Started

Clone this repository and install dependencies:

```sh
git clone https://github.com/SamyBchaalia/arcube-backend-test.git
cd arcube-backend-test
pnpm install
```

## Environment Variables

```sh
MONGO_URI=your_mongodb_connection_string
APP_URL=http://localhost:3000
PORT=3000
```

### 🚀 Running the Development Server

Start the development server:

```shell
npm run start
```

## 📂 Project Structure

```shell
.
├── .vscode # Visual Studio Code settings
├── src
│ ├── entities
│ │ └── shorten.entity.ts # Shorten URL entity definition
│ ├── modules
│ │ └── shorten
│ │ ├── controllers
│ │ │ └── shorten.controller.ts # Controller for handling API requests
│ │ ├── dto
│ │ │ └── shorten.dto.ts # Data Transfer Objects
│ │ ├── services
│ │ │ └── shorten.service.ts # Business logic for shortening URLs
│ │ ├── validators
│ │ │ └── url-reachable.validator.ts # URL validation logic
│ │ └── shorten.module.ts # NestJS module definition
│ ├── app.controller.spec.ts # Tests for app controller
│ ├── app.controller.ts # Main application controller
│ ├── app.module.ts # Main application module
│ ├── app.service.ts # Main application service
│ ├── main.ts # Application entry point
├── test
│ ├── shorten
│ │ └── shorten.e2e-spec.ts # E2E tests for shorten module
│ └── app.e2e-spec.ts # E2E tests for the app
├── .env # Environment variables
├── .env.example # Example environment variables
├── .gitignore # Git ignore file
├── .prettierrc # Prettier configuration
├── jest-e2e.json # Jest configuration for E2E tests
├── package-lock.json # Lockfile for package manager
├── package.json # Dependencies and scripts
├── tsconfig.build.json # TypeScript build configuration
└── tsconfig.json # TypeScript configuration

```

## 🧪 Testing

Run tests using:

```shell
npm run test
```

## 🚀 Deployment

Deploy using **Vercel, Netlify, or your preferred hosting platform**:

```shell
vercel deploy # For Vercel
```

## 📜 License

This project is **open-source** under the **MIT License**.

---

Made with ♥ by [Samy Ben Chaalia](https://sami.benchaalia.com)
