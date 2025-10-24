# Supabase Edge Functions

You are a Supabase Edge Functions specialist. This skill helps you deploy, manage, and debug Edge Functions using the Supabase CLI.

## What This Skill Replaces

This skill replaces the following MCP tools:
- `mcp__supabase__list_edge_functions` - List all Edge Functions
- `mcp__supabase__get_edge_function` - Get function code and metadata
- `mcp__supabase__deploy_edge_function` - Deploy an Edge Function

## Project Context

**Project Reference:** `ughfpgtntupnedjotmrr`
**Access Token:** Available in environment as `$SUPABASE_ACCESS_TOKEN`
**Functions Directory:** `supabase/functions/`

All Supabase CLI commands with pattern `npx supabase *` are pre-approved and don't require user confirmation.

## Current Edge Functions

This project has the following Edge Functions:
1. **run-llm-inference** - Runs multiple LLM models via OpenRouter with quality scoring
2. **calculate-consensus** - Cross-model validation and consensus analysis

## Common Operations

### 1. Deploy Edge Functions

**Deploy a single function:**
```bash
npx supabase functions deploy run-llm-inference --project-ref ughfpgtntupnedjotmrr
```

**Deploy with custom import map:**
```bash
npx supabase functions deploy run-llm-inference \
  --import-map supabase/functions/import_map.json \
  --project-ref ughfpgtntupnedjotmrr
```

**Deploy all functions:**
```bash
npx supabase functions deploy --project-ref ughfpgtntupnedjotmrr
```

**No verify (skip SSL verification, use with caution):**
```bash
npx supabase functions deploy run-llm-inference \
  --no-verify-jwt \
  --project-ref ughfpgtntupnedjotmrr
```

### 2. List Edge Functions

**List all deployed functions:**
```bash
npx supabase functions list --project-ref ughfpgtntupnedjotmrr
```

This shows:
- Function name
- Version
- Status (active/inactive)
- Created/Updated timestamps

### 3. View Function Code

**Read local function code:**
```bash
cat supabase/functions/run-llm-inference/index.ts
```

**Read shared utilities:**
```bash
cat supabase/functions/_shared/quality-scorer.ts
cat supabase/functions/_shared/consensus-analyzer.ts
cat supabase/functions/_shared/cors.ts
```

### 4. Manage Function Secrets

**Set a secret (environment variable):**
```bash
npx supabase secrets set OPENROUTER_API_KEY=your_key_here --project-ref ughfpgtntupnedjotmrr
```

**List all secrets:**
```bash
npx supabase secrets list --project-ref ughfpgtntupnedjotmrr
```

**Unset a secret:**
```bash
npx supabase secrets unset OPENROUTER_API_KEY --project-ref ughfpgtntupnedjotmrr
```

### 5. Test Functions Locally

**Serve functions locally (for testing):**
```bash
npx supabase functions serve
```

This starts a local Edge Functions server at `http://localhost:54321/functions/v1/`

**Test function with curl:**
```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/run-llm-inference' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"runId":"test-run-id","documentText":"test text","schema":{}}'
```

### 6. View Function Logs

**Tail function logs in real-time:**
```bash
npx supabase functions logs run-llm-inference --project-ref ughfpgtntupnedjotmrr
```

**View recent logs:**
```bash
npx supabase functions logs run-llm-inference --limit 100 --project-ref ughfpgtntupnedjotmrr
```

**Filter logs by level:**
```bash
npx supabase functions logs run-llm-inference --level error --project-ref ughfpgtntupnedjotmrr
```

## Edge Function Structure

### Typical Function Layout

```
supabase/functions/
├── _shared/                    # Shared utilities
│   ├── quality-scorer.ts       # Quality scoring logic
│   ├── consensus-analyzer.ts   # Consensus analysis
│   └── cors.ts                 # CORS headers
│
├── run-llm-inference/
│   └── index.ts                # Main inference function
│
└── calculate-consensus/
    └── index.ts                # Consensus calculation
```

### Function Template

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Your function logic here
    const data = await req.json()

    return new Response(
      JSON.stringify({ success: true, data }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
```

## Deployment Workflow

### Standard Deployment Process

1. **Make changes to function code:**
```bash
# Edit the function
nano supabase/functions/run-llm-inference/index.ts
```

2. **Test locally (optional but recommended):**
```bash
npx supabase functions serve
# Test with curl or Postman
```

3. **Deploy to production:**
```bash
npx supabase functions deploy run-llm-inference --project-ref ughfpgtntupnedjotmrr
```

4. **Verify deployment:**
```bash
npx supabase functions list --project-ref ughfpgtntupnedjotmrr
```

5. **Check logs for errors:**
```bash
npx supabase functions logs run-llm-inference --limit 20 --project-ref ughfpgtntupnedjotmrr
```

### Update Shared Code

If you modify shared utilities (in `_shared/`), you must redeploy ALL functions that use them:

```bash
npx supabase functions deploy --project-ref ughfpgtntupnedjotmrr
```

This ensures all functions use the latest shared code.

## Error Handling

**Deployment Errors:**
- **Import errors:** Check import URLs are correct (use `https://esm.sh/` or `https://deno.land/`)
- **TypeScript errors:** Deno is strict - fix all type errors before deploying
- **Missing secrets:** Set environment variables via `npx supabase secrets set`

**Runtime Errors:**
- Check function logs: `npx supabase functions logs function-name`
- Verify request format matches expected schema
- Ensure CORS headers are set correctly
- Check Supabase client is initialized with correct credentials

**Performance Issues:**
- Functions have 25-second timeout limit
- Use streaming responses for long operations
- Consider splitting complex operations into multiple function calls

## Best Practices

1. **Version Control:** Always commit function code before deploying
2. **Shared Code:** Put reusable logic in `_shared/` directory
3. **Error Handling:** Always wrap main logic in try-catch
4. **CORS:** Include CORS headers in all responses
5. **Secrets:** Never hardcode API keys - use secrets management
6. **Logging:** Use `console.log` for debugging, `console.error` for errors
7. **Testing:** Test locally before deploying to production

## Common Workflows

### Deploy a new function version

```bash
# 1. View current version
npx supabase functions list --project-ref ughfpgtntupnedjotmrr

# 2. Deploy new version
npx supabase functions deploy run-llm-inference --project-ref ughfpgtntupnedjotmrr

# 3. Test with a real request
curl -X POST https://ughfpgtntupnedjotmrr.supabase.co/functions/v1/run-llm-inference \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"runId":"test","documentText":"test","schema":{}}'

# 4. Monitor logs
npx supabase functions logs run-llm-inference --project-ref ughfpgtntupnedjotmrr
```

### Create a new Edge Function

```bash
# 1. Create function directory
mkdir -p supabase/functions/my-new-function

# 2. Create index.ts file
cat > supabase/functions/my-new-function/index.ts << 'EOF'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  return new Response(JSON.stringify({ message: 'Hello from my-new-function!' }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
EOF

# 3. Deploy the function
npx supabase functions deploy my-new-function --project-ref ughfpgtntupnedjotmrr
```

## Available Resources

- **Local functions:** `supabase/functions/` directory
- **Shared utilities:** `supabase/functions/_shared/`
- **Official docs:** https://supabase.com/docs/guides/functions
- **Deno docs:** https://deno.land/manual

## When to Use This Skill

Invoke this skill when you need to:
- Deploy Edge Functions to production
- List deployed functions
- View function code or logs
- Manage function secrets (environment variables)
- Create new Edge Functions
- Debug function execution issues

**Invoke with:** `/supabase/functions` or mention "deploy edge function" or "supabase functions"
