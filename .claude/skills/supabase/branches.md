# Supabase Development Branches

You are a Supabase branching specialist. This skill helps you manage development branches for safe database schema changes and testing.

## What This Skill Replaces

This skill replaces the following MCP tools:
- `mcp__supabase__create_branch` - Create a new development branch
- `mcp__supabase__list_branches` - List all branches
- `mcp__supabase__delete_branch` - Delete a branch
- `mcp__supabase__merge_branch` - Merge branch to production
- `mcp__supabase__reset_branch` - Reset branch database
- `mcp__supabase__rebase_branch` - Rebase branch on production

## Project Context

**Project Reference:** `ughfpgtntupnedjotmrr`
**Access Token:** Available in environment as `$SUPABASE_ACCESS_TOKEN`

All Supabase CLI commands with pattern `npx supabase *` are pre-approved and don't require user confirmation.

## What are Supabase Branches?

Branches are preview environments with isolated databases, perfect for:
- Testing schema migrations safely
- Developing new features without affecting production
- Collaborative development with separate environments
- Running E2E tests against real data structures

Each branch gets:
- Isolated database (PostgreSQL)
- Separate Edge Functions deployment
- Unique API URL and keys
- Copy of production migrations (but NOT production data)

## Common Operations

### 1. List All Branches

**View all branches for the project:**
```bash
npx supabase branches list --project-ref ughfpgtntupnedjotmrr
```

This shows:
- Branch name
- Branch ID
- Status (active, creating, etc.)
- Database status
- Created date

### 2. Create a New Branch

**Create a development branch:**
```bash
npx supabase branches create dev-my-feature --project-ref ughfpgtntupnedjotmrr
```

**What happens:**
1. Creates new isolated PostgreSQL database
2. Applies all production migrations to branch
3. Generates new branch-specific API keys
4. Returns branch details (project_ref, anon_key, URL)

**Important:** Production data is NOT copied - only schema/migrations

**Get branch details after creation:**
```bash
npx supabase branches get dev-my-feature --project-ref ughfpgtntupnedjotmrr
```

Returns:
- Branch project ref (use this like main project ref)
- Branch database URL
- Branch API keys

### 3. Work with a Branch

Once created, use the branch like a normal project:

**Execute SQL on branch:**
```bash
# Get branch project ref first
BRANCH_REF=$(npx supabase branches get dev-my-feature --project-ref ughfpgtntupnedjotmrr --output json | jq -r '.project_ref')

# Then use it in commands
npx supabase db execute "SELECT * FROM documents" --project-ref $BRANCH_REF
```

**Deploy functions to branch:**
```bash
npx supabase functions deploy run-llm-inference --project-ref $BRANCH_REF
```

**Apply migrations to branch:**
```bash
npx supabase db push --project-ref $BRANCH_REF
```

### 4. Merge Branch to Production

**After testing, merge branch changes to production:**
```bash
npx supabase branches merge dev-my-feature --project-ref ughfpgtntupnedjotmrr
```

**What gets merged:**
- New migrations
- Edge Function updates
- Database schema changes

**What does NOT get merged:**
- Branch data (only schema)
- Secrets/environment variables

**Merge process:**
1. Reviews migrations created on branch
2. Applies them to production database
3. Deploys Edge Function changes
4. Marks branch as merged

### 5. Reset a Branch

**Reset branch database to match production:**
```bash
npx supabase branches reset dev-my-feature --project-ref ughfpgtntupnedjotmrr
```

**This will:**
- Delete all data in branch database
- Reapply all migrations from production
- Reset to clean state

**Use when:**
- Branch database is corrupted
- You want to start fresh
- Need to sync with latest production schema

### 6. Rebase a Branch

**Update branch with latest production migrations:**
```bash
npx supabase branches rebase dev-my-feature --project-ref ughfpgtntupnedjotmrr
```

**This will:**
- Apply any new production migrations to branch
- Keep branch-specific changes intact
- Resolve migration drift

**Use when:**
- Production has new migrations since branch created
- Branch is behind production schema
- Need to incorporate production changes

### 7. Delete a Branch

**Delete a branch when done:**
```bash
npx supabase branches delete dev-my-feature --project-ref ughfpgtntupnedjotmrr
```

**This will:**
- Delete the branch database
- Remove branch Edge Functions
- Free up branch resources

**Cannot undo** - make sure to merge first if needed!

## Branch Workflow Examples

### Workflow 1: Safe Schema Migration

```bash
# 1. Create feature branch
npx supabase branches create feature-add-status-column --project-ref ughfpgtntupnedjotmrr

# 2. Get branch ref
BRANCH_REF=$(npx supabase branches get feature-add-status-column --project-ref ughfpgtntupnedjotmrr --output json | jq -r '.project_ref')

# 3. Create migration on branch
npx supabase migration new add_status_to_documents --project-ref $BRANCH_REF

# 4. Edit migration file
echo "ALTER TABLE documents ADD COLUMN status TEXT DEFAULT 'pending';" > supabase/migrations/$(ls -t supabase/migrations | head -1)

# 5. Apply to branch
npx supabase db push --project-ref $BRANCH_REF

# 6. Test on branch
npx supabase db execute "SELECT status FROM documents LIMIT 1" --project-ref $BRANCH_REF

# 7. If good, merge to production
npx supabase branches merge feature-add-status-column --project-ref ughfpgtntupnedjotmrr

# 8. Clean up
npx supabase branches delete feature-add-status-column --project-ref ughfpgtntupnedjotmrr
```

### Workflow 2: Develop New Feature

```bash
# 1. Create branch for new feature
npx supabase branches create feature-user-roles --project-ref ughfpgtntupnedjotmrr

# 2. Get branch details
npx supabase branches get feature-user-roles --project-ref ughfpgtntupnedjotmrr

# 3. Update .env.local with branch credentials for testing
# NEXT_PUBLIC_SUPABASE_URL=https://[branch-ref].supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=[branch-anon-key]

# 4. Develop feature (migrations, functions, app code)
# ... make changes ...

# 5. Test feature with branch database
npm run dev  # App now uses branch database

# 6. When ready, merge to production
npx supabase branches merge feature-user-roles --project-ref ughfpgtntupnedjotmrr

# 7. Switch .env.local back to production credentials

# 8. Delete branch
npx supabase branches delete feature-user-roles --project-ref ughfpgtntupnedjotmrr
```

### Workflow 3: Handle Migration Drift

```bash
# Scenario: Branch is behind production

# 1. List branches to check status
npx supabase branches list --project-ref ughfpgtntupnedjotmrr

# 2. Rebase branch on production (apply new production migrations)
npx supabase branches rebase dev-my-feature --project-ref ughfpgtntupnedjotmrr

# 3. Verify branch is updated
npx supabase migration list --project-ref [branch-ref]

# 4. Continue working on branch with latest schema
```

## Best Practices

1. **One Feature Per Branch:** Keep branches focused on single features
2. **Short-lived:** Merge or delete branches within a few days
3. **Test Before Merge:** Always test migrations on branch first
4. **Rebase Regularly:** Keep branch updated with production changes
5. **Clean Up:** Delete merged branches promptly
6. **Naming:** Use descriptive names: `feature-*`, `fix-*`, `test-*`

## Common Issues

**Branch creation slow:**
- Branches take 1-2 minutes to provision
- Check status: `npx supabase branches list`

**Merge conflicts:**
- Rebase branch first: `npx supabase branches rebase`
- Resolve any migration conflicts manually

**Branch costs:**
- Each branch costs ~$0.01344/hour ($10/month)
- Delete unused branches to avoid charges

**Can't connect to branch:**
- Verify branch is active: `npx supabase branches list`
- Check using correct branch project ref
- Ensure anon key is for branch, not main project

## Error Handling

**Branch already exists:**
```bash
# List existing branches first
npx supabase branches list --project-ref ughfpgtntupnedjotmrr

# Use different name or delete old branch
npx supabase branches delete old-branch-name --project-ref ughfpgtntupnedjotmrr
```

**Migration conflicts during merge:**
```bash
# Rebase first to apply production migrations
npx supabase branches rebase branch-name --project-ref ughfpgtntupnedjotmrr

# Then try merge again
npx supabase branches merge branch-name --project-ref ughfpgtntupnedjotmrr
```

**Branch stuck in "creating" state:**
```bash
# Check branch status
npx supabase branches get branch-name --project-ref ughfpgtntupnedjotmrr

# If stuck for >5 minutes, contact Supabase support or delete and recreate
```

## When to Use This Skill

Invoke this skill when you need to:
- Create development/feature branches
- Test schema migrations safely
- Merge branches to production
- Manage branch lifecycle
- Debug branch-specific issues
- Handle migration drift

**Invoke with:** `/supabase/branches` or mention "supabase branch" or "create development branch"
