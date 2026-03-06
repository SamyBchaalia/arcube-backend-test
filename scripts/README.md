# Admin Scripts

This folder contains utility scripts for managing the NBV backend application.

## 📜 Available Scripts

### 1. Make Superadmin (Lou Natale)

Makes the default admin user `lounatale@nbvgroup.ca` a superadmin.

**Usage:**
```bash
npm run make-superadmin
```

**What it does:**
- Finds user: `lounatale@nbvgroup.ca`
- Updates role to: `ADMIN`
- Activates account if inactive
- Shows user details before/after

---

### 2. Make Any User Admin

Makes any existing user an admin by email address.

**Usage:**
```bash
npm run make-admin <email>
```

**Examples:**
```bash
# Make john@example.com an admin
npm run make-admin john@example.com

# Make a guest user an admin
npm run make-admin jane@company.com
```

**What it does:**
- Finds user by email (case-insensitive)
- Updates role to: `ADMIN`
- Activates account if inactive
- Shows user details before/after
- Works with both regular users and guest users

**Requirements:**
- User must already exist in the database
- If user doesn't exist, they must sign up first

---

## 🔒 User Roles

The system has two roles:

| Role | Value | Permissions |
|------|-------|-------------|
| **ADMIN** | `admin` | Full access to all features including admin dashboard |
| **CLIENT** | `client` | Standard user access, can purchase products and chat |

---

## 📊 Script Output

Both scripts provide detailed output:

```
🚀 Starting admin script...
🔍 Looking for user: john@example.com
✅ User found: John Doe (john@example.com)
   Current role: client
   Active status: true

🔧 Updating user to ADMIN...
✅ Successfully updated user to ADMIN!

📊 Final user details:
   Name: John Doe
   Email: john@example.com
   Role: admin
   Active: true
   Guest: false
   Last Login: Feb 23, 2026

✨ Script completed successfully!
```

---

## 🛠️ Creating New Scripts

To create a new admin script:

1. Create a new TypeScript file in `scripts/` folder
2. Import necessary modules from `src/`
3. Use NestJS application context for database access
4. Add script command to `package.json`

**Template:**
```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

async function myScript() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  try {
    // Your script logic here

    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await app.close();
    process.exit(1);
  }
}

myScript();
```

---

## ⚠️ Important Notes

1. **Database Connection**: Scripts connect to the database specified in `.env`
2. **Case-Insensitive**: Email searches are case-insensitive
3. **Validation**: Scripts validate that users exist before updating
4. **Idempotent**: Running scripts multiple times is safe (checks current role)
5. **Exit Codes**: Scripts exit with code 0 on success, 1 on error
6. **TypeScript**: Scripts are written in TypeScript and use ts-node to run

---

## 🔍 Debugging

If a script fails:

1. **Check database connection**:
   ```bash
   # Verify .env has correct database credentials
   cat .env | grep DB_
   ```

2. **Check user exists**:
   ```sql
   SELECT email, role, "isActive" FROM users WHERE email = 'user@example.com';
   ```

3. **Run with verbose logging**:
   ```bash
   DEBUG=* npm run make-admin user@example.com
   ```

4. **Check TypeScript compilation**:
   ```bash
   npm run build
   ```

---

## 📝 Script List

| Script | Command | Purpose |
|--------|---------|---------|
| make-superadmin.ts | `npm run make-superadmin` | Make Lou Natale an admin |
| make-admin.ts | `npm run make-admin <email>` | Make any user an admin |

---

## 🎯 Common Use Cases

### After Fresh Database Setup
```bash
# Make the main admin user
npm run make-superadmin
```

### Promote a Guest User to Admin
```bash
# Guest user becomes admin
npm run make-admin guest@company.com
```

### Promote a Client to Admin
```bash
# Regular client becomes admin
npm run make-admin client@company.com
```

### Verify Admin Status
```bash
# Run script to see current status (no changes if already admin)
npm run make-admin user@example.com
```

---

## 📚 Related Documentation

- User authentication: `src/modules/auth/`
- User roles: `src/modules/auth/enums/user-role.enum.ts`
- Admin guards: `src/modules/auth/guards/roles.guard.ts`
- Database schema: See TypeORM entities in each module

---

**Last Updated:** February 23, 2026
**Maintainer:** Backend Team
