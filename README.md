# Scope CodeStats

A competitive programming profile tracking application that aggregates and visualizes coding stats across multiple platforms.

![Scope CodeStats Screenshot](https://via.placeholder.com/800x400?text=Scope+CodeStats+Screenshot)

## Features

- **Multi-Platform Integration**: Track progress across LeetCode, CodeForces, CodeChef, GeeksforGeeks, HackerRank, and GitHub
- **Centralized Dashboard**: View all your coding stats in one place
- **Leaderboard**: Compare your progress with other users
- **Admin Dashboard**: Detailed analytics and user management for administrators
- **Profile Synchronization**: Automatically update coding stats from supported platforms
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

### Frontend
- React 18
- Material UI
- Chart.js & Recharts for data visualization
- Vite for fast development and building
- Axios for API requests

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT for authentication
- Node-cron for scheduled tasks

## Getting Started

### Prerequisites

- Node.js (v14+)
- MongoDB (v4.4+)
- Yarn or npm

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/scope-codestats.git
   cd scope-codestats
   ```

2. Install backend dependencies
   ```bash
   cd backend
   yarn install
   ```

3. Install frontend dependencies
   ```bash
   cd ../frontend
   yarn install
   ```

4. Configure environment variables
   - Create a `.env` file in the backend directory using the example below:
     ```
     MONGODB_URI=mongodb://127.0.0.1:27017/scope_codestats
     JWT_SECRET=your-secret-key-for-jwt-tokens
     PORT=5000
     ```

### Running the Application

1. Start MongoDB (if not running as a service)
   ```bash
   mongod
   ```

2. Start the backend server
   ```bash
   cd backend
   yarn start
   ```

3. Start the frontend development server
   ```bash
   cd ../frontend
   yarn start
   ```

4. Access the application at `http://localhost:3000`

## Deployment

### Backend

1. Configure production environment variables
2. Deploy to your preferred hosting service (Heroku, Digital Ocean, AWS, etc.)
3. Set up a MongoDB instance (MongoDB Atlas recommended for production)

### Frontend

1. Build the frontend
   ```bash
   cd frontend
   yarn build
   ```
2. Deploy the built files to your preferred static hosting service (Netlify, Vercel, etc.)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Material UI](https://mui.com/)
- [React](https://reactjs.org/)
- [Express](https://expressjs.com/)
- [MongoDB](https://www.mongodb.com/)
- [Recharts](https://recharts.org/)

# Profile Sync Scripts

## User Profile Sync Script

This repository includes scripts to synchronize user profiles with various coding platforms. The scripts read profile data from the User collection, create/update corresponding entries in the Profile collection, and update both collections with the latest data from coding platforms.

### Running the Script

#### Unix/Linux/macOS
```bash
cd backend/scripts
chmod +x sync-all-users.sh
./sync-all-users.sh [options]
```

#### Windows
```cmd
cd backend\scripts
sync-all-users.bat [options]
```

### Options

The following options are available:

- `-h, --help`: Show help information
- `-b=SIZE, --batch-size=SIZE`: Set batch size (default: 10)
- `-t=MS, --timeout=MS`: Set timeout in milliseconds (default: 120000)
- `-p=PLATFORM, --platform=PLATFORM`: Only sync specific platform (leetcode, github, codechef, etc.)
- `--bypass-validation`: Bypass mongoose validation (use for incomplete user profiles)

### Examples

Sync all user profiles:
```bash
./sync-all-users.sh
```

Sync only LeetCode profiles:
```bash
./sync-all-users.sh --platform=leetcode
```

Process profiles in larger batches:
```bash
./sync-all-users.sh --batch-size=20
```

Bypass validation for users with incomplete profiles:
```bash
./sync-all-users.sh --bypass-validation
```

### How It Works

1. The script reads profiles from the User collection
2. For each user with profiles:
   - It creates or updates the corresponding Profile documents
   - It fetches the latest data from each coding platform
   - It updates both the User collection and Profile collection with the latest data
3. Statistics are tracked and reported at the end of the process

### Data Flow

```
User Collection --> Profile Collection --> Platform APIs --> Update Both Collections
```

This ensures that:
1. All users in the system are properly accounted for
2. Both the User collection and Profile collection are in sync
3. The latest data from coding platforms is reflected in both collections 