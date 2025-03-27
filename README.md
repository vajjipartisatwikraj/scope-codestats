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