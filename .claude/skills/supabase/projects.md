# Supabase Projects & Organizations

You are a Supabase project management specialist. This skill helps you manage Supabase projects, organizations, and costs.

## What This Skill Replaces

This skill replaces the following MCP tools:
- `mcp__supabase__list_organizations` - List all organizations
- `mcp__supabase__get_organization` - Get organization details
- `mcp__supabase__list_projects` - List all projects
- `mcp__supabase__get_project` - Get project details
- `mcp__supabase__create_project` - Create a new project
- `mcp__supabase__get_cost` - Estimate project/branch costs
- `mcp__supabase__confirm_cost` - Confirm cost before creation
- `mcp__supabase__pause_project` - Pause a project
- `mcp__supabase__restore_project` - Restore a paused project

## Project Context

**Current Project:** `ughfpgtntupnedjotmrr`
**Access Token:** Available in environment as `$SUPABASE_ACCESS_TOKEN`

All Supabase CLI commands with pattern `npx supabase *` are pre-approved and don't require user confirmation.

## Common Operations

### 1. List Organizations

**View all organizations you belong to:**
```bash
npx supabase orgs list
```

This shows:
- Organization name
- Organization ID
- Your role (owner, admin, member)

### 2. List Projects

**View all projects across all organizations:**
```bash
npx supabase projects list
```

This shows:
- Project name
- Project ID/Reference
- Organization
- Region
- Status (active, paused, restoring)
- Created date

**Filter by organization:**
```bash
npx supabase projects list --org-id your-org-id
```

### 3. Get Project Details

**View detailed information about a project:**
```bash
npx supabase projects get ughfpgtntupnedjotmrr
```

Returns:
- Project name
- Database host
- Region
- Plan (Free, Pro, Team)
- Status
- Created/updated timestamps

### 4. Create a New Project

**Creating a project involves costs. Always check pricing first!**

**Step 1: Check available regions:**
```bash
npx supabase projects regions
```

Available regions:
- `us-west-1` - Northern California
- `us-east-1` - Northern Virginia
- `eu-west-1` - Ireland
- `ap-southeast-1` - Singapore
- (and others)

**Step 2: Estimate costs:**

Pro projects cost approximately:
- **Compute:** $25/month (base)
- **Database:** ~$0.125/GB per month
- **Storage:** ~$0.021/GB per month
- **Bandwidth:** ~$0.09/GB

Branches cost:
- ~$0.01344/hour (~$10/month per branch)

**Step 3: Create the project:**
```bash
npx supabase projects create my-new-project \
  --org-id your-org-id \
  --db-password secure_password_here \
  --region us-west-1 \
  --plan pro
```

**Important:**
- Choose a strong database password
- Select region close to your users
- Free tier: 2 projects per organization
- Pro tier: Unlimited projects (but $25/month each)

### 5. Pause a Project

**Pause a project to reduce costs (Pro plan only):**
```bash
npx supabase projects pause ughfpgtntupnedjotmrr
```

**What happens:**
- Database becomes inaccessible
- Edge Functions stop running
- No compute charges while paused
- Data is preserved
- Storage charges still apply

**Use when:**
- Development project not currently in use
- Testing/staging environment between test cycles
- Want to minimize costs temporarily

### 6. Restore a Paused Project

**Resume a paused project:**
```bash
npx supabase projects restore ughfpgtntupnedjotmrr
```

**What happens:**
- Database comes back online
- Edge Functions resume
- All data intact
- Compute charges resume

**Restoration time:** ~1-2 minutes

### 7. Get Organization Details

**View organization information:**
```bash
npx supabase orgs get your-org-id
```

Returns:
- Organization name
- Billing email
- Plan tier
- Member count

## Advanced: Using Management API

For operations not available via CLI, use the Supabase Management API via WebFetch or bash with curl.

### API Authentication

**API Base:** `https://api.supabase.com/v1`
**Auth Header:** `Authorization: Bearer $SUPABASE_ACCESS_TOKEN`

### Example: Get Project API Keys

```bash
curl -X GET "https://api.supabase.com/v1/projects/ughfpgtntupnedjotmrr/api-keys" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"
```

Returns:
```json
{
  "anon": "eyJhbGc...",
  "service_role": "eyJhbGc..."
}
```

### Example: Get Project Settings

```bash
curl -X GET "https://api.supabase.com/v1/projects/ughfpgtntupnedjotmrr/settings" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"
```

### Example: Update Project Settings

```bash
curl -X PATCH "https://api.supabase.com/v1/projects/ughfpgtntupnedjotmrr/settings" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Project Name"
  }'
```

## Project Lifecycle Workflows

### Workflow 1: Create Development Project

```bash
# 1. List organizations to find org ID
npx supabase orgs list

# 2. Check available regions
npx supabase projects regions

# 3. Create project (Free tier)
npx supabase projects create my-dev-project \
  --org-id your-org-id \
  --db-password MySecurePassword123! \
  --region us-west-1 \
  --plan free

# 4. Wait for provisioning (~2 minutes)
# Watch status
npx supabase projects list

# 5. Once active, get project ref
npx supabase projects list | grep my-dev-project

# 6. Link local project to new remote
npx supabase link --project-ref new-project-ref

# 7. Push local migrations
npx supabase db push

# 8. Deploy Edge Functions
npx supabase functions deploy
```

### Workflow 2: Pause/Resume for Cost Savings

```bash
# Friday evening: Pause dev project
npx supabase projects pause dev-project-ref

# Monday morning: Resume dev project
npx supabase projects restore dev-project-ref

# Wait for restoration
npx supabase projects get dev-project-ref

# Verify database accessible
npx supabase db execute "SELECT 1" --project-ref dev-project-ref
```

### Workflow 3: Monitor Project Costs

**Projects don't have built-in cost monitoring via CLI. Use dashboard or API:**

```bash
# Get project usage (via API)
curl -X GET "https://api.supabase.com/v1/projects/ughfpgtntupnedjotmrr/usage" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"
```

**Cost estimation:**
- Free tier: $0/month (2 projects max)
- Pro tier base: $25/month per project
- Additional costs based on usage (compute, storage, bandwidth)

## Best Practices

1. **Use Free Tier for Development:** Save Pro tier for production
2. **Pause Unused Projects:** Reduce costs when not actively developing
3. **Strong Passwords:** Use password managers for database passwords
4. **Region Selection:** Choose region closest to users for best performance
5. **Organization:** Group projects by team/product in same organization
6. **Naming Convention:** Use descriptive names (e.g., `projectname-env`)

## Common Issues

**Project creation fails:**
- Check organization has quota available
- Verify database password meets requirements (12+ chars, mixed case, numbers)
- Ensure region is valid

**Can't pause project:**
- Only Pro plan projects can be paused
- Free tier projects are always active
- Check project status: `npx supabase projects get`

**Project stuck in "creating":**
- Wait 5 minutes - provisioning takes time
- If stuck >10 minutes, contact Supabase support

**Quota exceeded:**
- Free tier: Max 2 projects per organization
- Upgrade to Pro for unlimited projects
- Or delete unused projects

## Project Quotas & Limits

**Free Tier:**
- 500MB database
- 1GB file storage
- 2GB bandwidth per month
- 2 projects per organization

**Pro Tier:**
- 8GB database included
- 100GB file storage included
- 250GB bandwidth per month
- Unlimited projects
- Custom domains
- Daily backups

## When to Use This Skill

Invoke this skill when you need to:
- List projects or organizations
- Create a new Supabase project
- Pause or restore projects
- Check project status or details
- Estimate project costs
- Manage project lifecycle

**Invoke with:** `/supabase/projects` or mention "create supabase project" or "list projects"
