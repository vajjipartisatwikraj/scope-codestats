/**
 * Google OAuth Check Script
 * 
 * This script checks if all required components for Google OAuth are installed and configured correctly.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Define paths
const backendEnvPath = path.join(__dirname, 'backend', '.env');
const frontendEnvPath = path.join(__dirname, 'frontend', '.env');
const backendPackageJsonPath = path.join(__dirname, 'backend', 'package.json');
const frontendPackageJsonPath = path.join(__dirname, 'frontend', 'package.json');

console.log('=== Google OAuth Configuration Check ===');

// Check if backend .env file exists and has Google OAuth configuration
if (fs.existsSync(backendEnvPath)) {
  try {
    const backendEnvContent = fs.readFileSync(backendEnvPath, 'utf8');
    console.log('\n✅ Backend .env file exists');
    
    // Check for Google OAuth configuration
    const hasGoogleClientId = backendEnvContent.includes('GOOGLE_CLIENT_ID=');
    const hasGoogleClientSecret = backendEnvContent.includes('GOOGLE_CLIENT_SECRET=');
    const hasJwtSecret = backendEnvContent.includes('JWT_SECRET=');
    const hasSessionSecret = backendEnvContent.includes('SESSION_SECRET=');
    
    console.log(`- Google Client ID: ${hasGoogleClientId ? '✅ Configured' : '❌ Missing'}`);
    console.log(`- Google Client Secret: ${hasGoogleClientSecret ? '✅ Configured' : '❌ Missing'}`);
    console.log(`- JWT Secret: ${hasJwtSecret ? '✅ Configured' : '❌ Missing'}`);
    console.log(`- Session Secret: ${hasSessionSecret ? '✅ Configured' : '❌ Missing'}`);
    
    if (!hasGoogleClientId || !hasGoogleClientSecret) {
      console.log('\n⚠️ Warning: Google OAuth credentials are missing in backend .env');
      console.log('Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your backend .env file');
    }
  } catch (error) {
    console.error('❌ Error reading backend .env file:', error.message);
  }
} else {
  console.log('❌ Backend .env file does not exist');
}

// Check if frontend .env file exists and has Google OAuth configuration
if (fs.existsSync(frontendEnvPath)) {
  try {
    const frontendEnvContent = fs.readFileSync(frontendEnvPath, 'utf8');
    console.log('\n✅ Frontend .env file exists');
    
    // Check for Google OAuth configuration - updated to check for VITE_ prefix
    const hasGoogleClientId = frontendEnvContent.includes('VITE_GOOGLE_CLIENT_ID=');
    
    console.log(`- Google Client ID: ${hasGoogleClientId ? '✅ Configured' : '❌ Missing'}`);
    
    if (!hasGoogleClientId) {
      console.log('\n⚠️ Warning: Google OAuth client ID is missing in frontend .env');
      console.log('Please add VITE_GOOGLE_CLIENT_ID to your frontend .env file');
    }
  } catch (error) {
    console.error('❌ Error reading frontend .env file:', error.message);
  }
} else {
  console.log('❌ Frontend .env file does not exist');
}

// Check if required packages are installed in backend
if (fs.existsSync(backendPackageJsonPath)) {
  try {
    const backendPackageJson = JSON.parse(fs.readFileSync(backendPackageJsonPath, 'utf8'));
    console.log('\n✅ Backend package.json exists');
    
    const dependencies = backendPackageJson.dependencies || {};
    const hasPassport = dependencies.passport !== undefined;
    const hasPassportGoogle = dependencies['passport-google-oauth20'] !== undefined;
    const hasExpressSession = dependencies['express-session'] !== undefined;
    
    console.log(`- passport: ${hasPassport ? '✅ Installed' : '❌ Missing'}`);
    console.log(`- passport-google-oauth20: ${hasPassportGoogle ? '✅ Installed' : '❌ Missing'}`);
    console.log(`- express-session: ${hasExpressSession ? '✅ Installed' : '❌ Missing'}`);
    
    if (!hasPassport || !hasPassportGoogle || !hasExpressSession) {
      console.log('\n⚠️ Warning: Some required packages are missing in backend');
      console.log('Please run the following command in the backend directory:');
      console.log('npm install passport passport-google-oauth20 express-session --save');
    }
  } catch (error) {
    console.error('❌ Error reading backend package.json:', error.message);
  }
} else {
  console.log('❌ Backend package.json does not exist');
}

// Check if required packages are installed in frontend
if (fs.existsSync(frontendPackageJsonPath)) {
  try {
    const frontendPackageJson = JSON.parse(fs.readFileSync(frontendPackageJsonPath, 'utf8'));
    console.log('\n✅ Frontend package.json exists');
    
    const dependencies = frontendPackageJson.dependencies || {};
    const hasGoogleOAuth = dependencies['@react-oauth/google'] !== undefined;
    
    console.log(`- @react-oauth/google: ${hasGoogleOAuth ? '✅ Installed' : '❌ Missing'}`);
    
    if (!hasGoogleOAuth) {
      console.log('\n⚠️ Warning: @react-oauth/google package is missing in frontend');
      console.log('Please run the following command in the frontend directory:');
      console.log('npm install @react-oauth/google --save');
    }
  } catch (error) {
    console.error('❌ Error reading frontend package.json:', error.message);
  }
} else {
  console.log('❌ Frontend package.json does not exist');
}

console.log('\n=== Code Files Check ===');

// Check if required files exist
const requiredFiles = [
  { path: path.join(__dirname, 'backend', 'config', 'passport.js'), name: 'Passport config' },
  { path: path.join(__dirname, 'backend', 'routes', 'auth', 'googleAuth.js'), name: 'Google Auth Routes' },
  { path: path.join(__dirname, 'frontend', 'src', 'contexts', 'AuthContext.jsx'), name: 'Auth Context' },
  { path: path.join(__dirname, 'frontend', 'src', 'components', 'Login.jsx'), name: 'Login Component' },
  { path: path.join(__dirname, 'frontend', 'src', 'components', 'MultiStepRegister.jsx'), name: 'Register Component' },
  { path: path.join(__dirname, 'frontend', 'src', 'components', 'GoogleAuthSuccess.jsx'), name: 'Google Auth Success Component' },
];

requiredFiles.forEach(file => {
  if (fs.existsSync(file.path)) {
    console.log(`✅ ${file.name} exists`);
  } else {
    console.log(`❌ ${file.name} does not exist at ${file.path}`);
  }
});

console.log('\n=== Final Check ===');
console.log('Please make sure you have:');
console.log('1. Created a Google Cloud project and obtained OAuth credentials');
console.log('2. Added the correct redirect URIs in the Google Cloud Console');
console.log('3. Set up the correct environment variables in both .env files');
console.log('4. Installed all required packages');
console.log('5. Modified your code to use Google OAuth authentication');

console.log('\nTo test your Google OAuth integration:');
console.log('1. Start the backend server: npm start in the backend directory');
console.log('2. Start the frontend development server: npm start in the frontend directory');
console.log('3. Navigate to http://localhost:3000 and try to log in with Google');
console.log('4. If everything is set up correctly, you should be redirected to the auth success page after authentication'); 