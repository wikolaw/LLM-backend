# Setup Test User for Playwright

## Step 1: Enable Email/Password Authentication in Supabase

1. Go to: https://supabase.com/dashboard/project/ughfpgtntupnedjotmrr/auth/providers

2. Find "Email" provider in the list

3. Click on it to configure

4. Make sure these settings are enabled:
   - ✅ **Enable Email provider**: ON
   - ✅ **Enable sign ups**: ON
   - ❌ **Confirm email**: OFF (Important for testing!)

5. Click "Save"

---

## Step 2: Create Test User

### Option A: Via Supabase Dashboard (Easiest)

1. Go to: https://supabase.com/dashboard/project/ughfpgtntupnedjotmrr/auth/users

2. Click "Add user" button

3. Fill in:
   - **Email**: `test@playwright.local`
   - **Password**: `TestPassword123!`
   - **Auto Confirm User**: ✅ (Check this!)

4. Click "Create user"

### Option B: Via SQL Editor

1. Go to: https://supabase.com/dashboard/project/ughfpgtntupnedjotmrr/sql/new

2. Run this SQL:

```sql
-- Create test user with confirmed email
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'test@playwright.local',
  crypt('TestPassword123!', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  NOW(),
  NOW(),
  '',
  ''
);
```

3. Click "Run"

---

## Step 3: Verify Test User

### Test Login Manually

1. Go to: http://localhost:3000/auth/login

2. Click "Use password instead"

3. Enter:
   - Email: `test@playwright.local`
   - Password: `TestPassword123!`

4. Click "Sign in with password"

5. Should redirect to dashboard ✅

---

## Step 4: Test with Playwright

Now you can automate with Playwright:

```javascript
// Navigate to login
await page.goto('http://localhost:3000/auth/login');

// Click "Use password instead"
await page.click('text=Use password instead');

// Fill credentials
await page.fill('[name="email"]', 'test@playwright.local');
await page.fill('[name="password"]', 'TestPassword123!');

// Submit
await page.click('button:has-text("Sign in with password")');

// Wait for redirect
await page.waitForURL('**/dashboard');

// Now you're authenticated and can test the full workflow!
```

---

## Troubleshooting

### "Invalid login credentials"
- Make sure you completed Step 1 (Enable Email provider)
- Make sure "Confirm email" is OFF
- Try creating user again via Dashboard (Option A)

### "Email already exists"
- User already created! Just try logging in
- Or delete and recreate in Auth Users page

### Password authentication not working
- Check that Email provider is enabled in Supabase
- Make sure you're using `signInWithPassword` not `signInWithOtp`
- Clear browser cache/cookies and try again

---

## Test Credentials

```
Email: test@playwright.local
Password: TestPassword123!
```

**These credentials are shown on the login page for convenience.**

---

Once you've completed Step 1 & 2, the application will be fully ready for Playwright automation!
