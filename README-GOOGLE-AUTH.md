# Google OAuth Authentication Setup for CodeStats

This document provides instructions on how to set up and use Google OAuth authentication for the CodeStats application.

## Overview

CodeStats now uses Google OAuth exclusively for authentication. Traditional email/password login and registration have been disabled.

## Prerequisites

- Google Cloud Platform account
- Node.js and npm/yarn installed
- MongoDB running locally or in the cloud

## Setup Instructions

### 1. Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing one)
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth client ID"
5. Select "Web application" as the application type
6. Add a name for your OAuth client
7. Add authorized JavaScript origins:
   - `http://localhost:3000` (for local development frontend)
   - `http://localhost:5000` (for local development backend)
8. Add authorized redirect URIs:
   - `http://localhost:5000/api/auth/google/callback`
9. Click "Create" to generate your client ID and client secret

### 2. Configure Environment Variables

#### Backend (.env file)

Create or update your `.env` file in the `backend` directory with the following variables:

```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/cp-tracker
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRE=30d
SESSION_SECRET=your_session_secret_here
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FRONTEND_URL=http://localhost:3000
```

#### Frontend (.env file)

Create or update your `.env` file in the `frontend` directory with the following variables:

```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
```

### 3. Install Required Packages

#### Backend

```bash
cd backend
npm install passport passport-google-oauth20 express-session
```

#### Frontend

```bash
cd frontend
npm install @react-oauth/google
```

## Usage

1. Start the backend server:
   ```bash
   cd backend
   npm start
   ```

2. Start the frontend development server:
   ```bash
   cd frontend
   npm start
   ```

3. Navigate to `http://localhost:3000` in your browser
4. Click "Sign in with Google" or "Sign up with Google" to authenticate

## Authentication Flow

1. User clicks the Google authentication button
2. User is redirected to Google OAuth login page
3. After successful authentication, Google redirects back to the application
4. The backend verifies the authentication and creates/updates the user account
5. The user is redirected to the dashboard with their session established

## Restrictions

- Only emails from the MLRIT domain (@mlrit.ac.in or @mlrinstitutions.ac.in) are allowed
- Traditional email/password authentication has been disabled

## Troubleshooting

- If you encounter issues with Google OAuth authentication, check:
  - Your Google Cloud Console project has the correct configurations
  - The client ID and client secret are correctly set in the environment variables
  - The authorized redirect URIs are properly configured
  - The frontend is correctly sending requests to the backend
  - The backend is properly handling Google OAuth callbacks

## Security Considerations

- Keep your Google client secret secure
- Use HTTPS in production environments
- Regularly review authentication logs for suspicious activity 