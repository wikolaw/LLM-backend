# Supabase Developer Tools

You are a Supabase development utilities specialist. This skill provides access to essential developer tools like API keys, logs, monitoring, and documentation.

## What This Skill Replaces

This skill replaces the following MCP tools:
- `mcp__supabase__get_project_url` - Get project API URL
- `mcp__supabase__get_anon_key` - Get anonymous/public API key
- `mcp__supabase__get_logs` - View logs for debugging
- `mcp__supabase__get_advisors` - Get security/performance recommendations
- `mcp__supabase__search_docs` - Search Supabase documentation

## Project Context

**Project Reference:** `ughfpgtntupnedjotmrr`
**Project URL:** `https://ughfpgtntupnedjotmrr.supabase.co`
**Access Token:** Available in environment as `$SUPABASE_ACCESS_TOKEN`

All Supabase CLI commands with pattern `npx supabase *` are pre-approved.

## Common Operations

### 1. Get Project URL

**Retrieve the API base URL for your project:**
```bash
echo "https://ughfpgtntupnedjotmrr.supabase.co"
```

**For other projects:**
```bash
# Format: https://{project-ref}.supabase.co
npx supabase projects get PROJECT_REF --output json | jq -r '.endpoint'
```

**API endpoints:**
- REST API: `https://ughfpgtntupnedjotmrr.supabase.co/rest/v1/`
- Auth: `https://ughfpgtntupnedjotmrr.supabase.co/auth/v1/`
- Storage: `https://ughfpgtntupnedjotmrr.supabase.co/storage/v1/`
- Realtime: `wss://ughfpgtntupnedjotmrr.supabase.co/realtime/v1/`
- Edge Functions: `https://ughfpgtntupnedjotmrr.supabase.co/functions/v1/`

### 2. Get API Keys

**Get anonymous (public) key via API:**
```bash
curl -X GET "https://api.supabase.com/v1/projects/ughfpgtntupnedjotmrr/api-keys" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  | jq -r '.anon'
```

**Get service role key (admin) via API:**
```bash
curl -X GET "https://api.supabase.com/v1/projects/ughfpgtntupnedjotmrr/api-keys" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  | jq -r '.service_role'
```

**Both keys in one command:**
```bash
curl -X GET "https://api.supabase.com/v1/projects/ughfpgtntupnedjotmrr/api-keys" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"
```

Returns:
```json
{
  "anon": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "service_role": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Key purposes:**
- **Anon Key:** Client-side, respects RLS policies, safe to expose
- **Service Role Key:** Server-side only, bypasses RLS, NEVER expose publicly

### 3. View Logs

**View recent logs for debugging:**

**API logs (REST, Auth, Storage):**
```bash
curl -X GET "https://api.supabase.com/v1/projects/ughfpgtntupnedjotmrr/logs?service=api&limit=50" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"
```

**Database logs (PostgreSQL):**
```bash
curl -X GET "https://api.supabase.com/v1/projects/ughfpgtntupnedjotmrr/logs?service=postgres&limit=50" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"
```

**Auth logs:**
```bash
curl -X GET "https://api.supabase.com/v1/projects/ughfpgtntupnedjotmrr/logs?service=auth&limit=50" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"
```

**Edge Function logs:**
```bash
npx supabase functions logs run-llm-inference --limit 50 --project-ref ughfpgtntupnedjotmrr
```

**Filter by level (error, warn, info):**
```bash
curl -X GET "https://api.supabase.com/v1/projects/ughfpgtntupnedjotmrr/logs?service=api&level=error&limit=50" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"
```

**Time range (last hour):**
```bash
# ISO 8601 timestamp
START_TIME=$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)
curl -X GET "https://api.supabase.com/v1/projects/ughfpgtntupnedjotmrr/logs?service=api&start=$START_TIME" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"
```

### 4. Get Security & Performance Advisors

**Check for security issues:**
```bash
curl -X GET "https://api.supabase.com/v1/projects/ughfpgtntupnedjotmrr/advisors/security" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"
```

Returns recommendations like:
- Missing RLS policies on tables
- Exposed service role key
- Weak authentication settings
- Public storage buckets

**Check for performance issues:**
```bash
curl -X GET "https://api.supabase.com/v1/projects/ughfpgtntupnedjotmrr/advisors/performance" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"
```

Returns recommendations like:
- Missing indexes on frequently queried columns
- Slow queries
- Connection pool issues
- Large table scans

**Example output:**
```json
{
  "advisors": [
    {
      "type": "security",
      "severity": "high",
      "title": "Missing RLS policy on 'documents' table",
      "description": "Table 'documents' has RLS enabled but no policies defined",
      "remediation_url": "https://supabase.com/docs/guides/auth/row-level-security"
    }
  ]
}
```

### 5. Search Supabase Documentation

**For documentation searches, use WebSearch or WebFetch:**

**Search via WebSearch tool:**
```
WebSearch("supabase row level security policies")
WebSearch("supabase edge functions typescript")
WebSearch("supabase storage upload file")
```

**Fetch specific docs via WebFetch:**
```
WebFetch("https://supabase.com/docs/guides/database/postgres/row-level-security", "Explain RLS policies")
WebFetch("https://supabase.com/docs/guides/functions", "How to deploy edge functions")
```

**Official documentation sites:**
- Main docs: https://supabase.com/docs
- API Reference: https://supabase.com/docs/reference
- Guides: https://supabase.com/docs/guides
- Examples: https://github.com/supabase/supabase/tree/master/examples

## Common Workflows

### Workflow 1: Debug API Errors

```bash
# 1. Check recent API logs for errors
curl -X GET "https://api.supabase.com/v1/projects/ughfpgtntupnedjotmrr/logs?service=api&level=error&limit=20" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  | jq '.[] | {timestamp, message, metadata}'

# 2. If RLS-related, check security advisors
curl -X GET "https://api.supabase.com/v1/projects/ughfpgtntupnedjotmrr/advisors/security" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  | jq '.advisors[] | select(.title | contains("RLS"))'

# 3. Review RLS policies
npx supabase db execute "
  SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
  FROM pg_policies
  WHERE schemaname = 'public'
" --project-ref ughfpgtntupnedjotmrr
```

### Workflow 2: Performance Investigation

```bash
# 1. Check performance advisors
curl -X GET "https://api.supabase.com/v1/projects/ughfpgtntupnedjotmrr/advisors/performance" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"

# 2. Look for slow queries in logs
curl -X GET "https://api.supabase.com/v1/projects/ughfpgtntupnedjotmrr/logs?service=postgres&limit=50" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  | jq '.[] | select(.message | contains("slow"))'

# 3. Check for missing indexes
npx supabase db execute "
  SELECT schemaname, tablename, indexname
  FROM pg_indexes
  WHERE schemaname = 'public'
  ORDER BY tablename
" --project-ref ughfpgtntupnedjotmrr
```

### Workflow 3: Setup .env.local for Development

```bash
# 1. Get project URL
echo "NEXT_PUBLIC_SUPABASE_URL=https://ughfpgtntupnedjotmrr.supabase.co"

# 2. Get anon key
ANON_KEY=$(curl -s -X GET "https://api.supabase.com/v1/projects/ughfpgtntupnedjotmrr/api-keys" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  | jq -r '.anon')
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY"

# 3. Get service role key (server-side only)
SERVICE_KEY=$(curl -s -X GET "https://api.supabase.com/v1/projects/ughfpgtntupnedjotmrr/api-keys" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  | jq -r '.service_role')
echo "SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY"

# 4. Append to .env.local
cat >> .env.local << EOF

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://ughfpgtntupnedjotmrr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY
EOF
```

### Workflow 4: Monitor Real-time Health

```bash
# Create monitoring script
cat > monitor-supabase.sh << 'EOF'
#!/bin/bash

PROJECT_REF="ughfpgtntupnedjotmrr"

echo "=== Supabase Health Check ==="
echo "Project: $PROJECT_REF"
echo "Time: $(date)"
echo

# Check API logs for recent errors
echo "Recent API Errors:"
curl -s -X GET "https://api.supabase.com/v1/projects/$PROJECT_REF/logs?service=api&level=error&limit=5" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  | jq -r '.[] | "\(.timestamp): \(.message)"'

echo
echo "Security Advisors:"
curl -s -X GET "https://api.supabase.com/v1/projects/$PROJECT_REF/advisors/security" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  | jq -r '.advisors[] | "[\(.severity)] \(.title)"'

echo
echo "Performance Advisors:"
curl -s -X GET "https://api.supabase.com/v1/projects/$PROJECT_REF/advisors/performance" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  | jq -r '.advisors[] | "[\(.severity)] \(.title)"'
EOF

chmod +x monitor-supabase.sh
./monitor-supabase.sh
```

## Best Practices

1. **Never Commit Service Role Key:** Keep in `.env.local`, add to `.gitignore`
2. **Rotate Keys:** If service role key is exposed, rotate via dashboard
3. **Monitor Advisors:** Check security/performance advisors weekly
4. **Log Retention:** Logs retained for 7 days on Pro plan, 1 day on Free
5. **Use Anon Key in Client:** Always use anon key for browser/mobile apps
6. **Environment Variables:** Store keys in environment, not hardcoded

## Common Issues

**Can't get API keys:**
- Verify `SUPABASE_ACCESS_TOKEN` is set correctly
- Check token has project access permissions

**Logs empty or not showing:**
- Logs have limited retention (1-7 days depending on plan)
- Check time range - may need to expand
- Verify service name is correct (api, postgres, auth, etc.)

**Advisors returning errors:**
- Some advisors require Pro plan
- Check project is active (not paused)

## Security Best Practices

**API Key Management:**
- Store keys in environment variables
- Never commit to version control
- Rotate service role key if exposed
- Use anon key for client-side only

**RLS Policies:**
- Enable RLS on all tables with user data
- Test policies thoroughly
- Check security advisors for missing policies

**Monitoring:**
- Set up alerts for error spikes
- Review logs daily in production
- Monitor advisor recommendations

## When to Use This Skill

Invoke this skill when you need to:
- Get project URL or API keys
- View logs for debugging
- Check security or performance recommendations
- Search Supabase documentation
- Set up development environment
- Monitor project health

**Invoke with:** `/supabase/tools` or mention "get supabase keys" or "view logs" or "supabase advisors"
