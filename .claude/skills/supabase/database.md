# Supabase Database Operations

You are a Supabase database specialist. This skill helps you perform database operations using the Supabase CLI and direct SQL access.

## What This Skill Replaces

This skill replaces the following MCP tools:
- `mcp__supabase__list_tables` - List all tables in the database
- `mcp__supabase__list_extensions` - List all PostgreSQL extensions
- `mcp__supabase__list_migrations` - List all applied migrations
- `mcp__supabase__apply_migration` - Apply a new migration
- `mcp__supabase__execute_sql` - Execute raw SQL queries
- `mcp__supabase__generate_typescript_types` - Generate TypeScript types from schema

## Project Context

**Project Reference:** `ughfpgtntupnedjotmrr`
**Access Token:** Available in environment as `$SUPABASE_ACCESS_TOKEN`

All Supabase CLI commands with pattern `npx supabase *` are pre-approved and don't require user confirmation.

## Common Operations

### 1. Execute SQL Queries

**Execute a query:**
```bash
npx supabase db execute "SELECT * FROM documents LIMIT 5" --project-ref ughfpgtntupnedjotmrr
```

**Execute from a file:**
```bash
npx supabase db execute -f path/to/query.sql --project-ref ughfpgtntupnedjotmrr
```

**Examples:**
- List recent documents: `SELECT id, filename, created_at FROM documents ORDER BY created_at DESC LIMIT 10`
- Count outputs by run: `SELECT run_id, COUNT(*) FROM outputs GROUP BY run_id`
- Get quality scores: `SELECT model, quality_overall FROM outputs WHERE run_id = 'run-id' ORDER BY quality_overall DESC`

### 2. List Database Objects

**List all tables:**
```bash
npx supabase db execute "
  SELECT schemaname, tablename
  FROM pg_tables
  WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  ORDER BY schemaname, tablename
" --project-ref ughfpgtntupnedjotmrr
```

**List all extensions:**
```bash
npx supabase db execute "
  SELECT extname, extversion, comment
  FROM pg_extension
  JOIN pg_description ON pg_extension.oid = pg_description.objoid
  ORDER BY extname
" --project-ref ughfpgtntupnedjotmrr
```

**List columns for a table:**
```bash
npx supabase db execute "
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'documents'
  ORDER BY ordinal_position
" --project-ref ughfpgtntupnedjotmrr
```

### 3. Manage Migrations

**List all migrations:**
```bash
npx supabase migration list --project-ref ughfpgtntupnedjotmrr
```

**Create a new migration:**
```bash
npx supabase migration new migration_name --project-ref ughfpgtntupnedjotmrr
```

This creates a new file in `supabase/migrations/` with timestamp prefix.

**Apply migrations (push to remote):**
```bash
npx supabase db push --project-ref ughfpgtntupnedjotmrr
```

**View migration diff:**
```bash
npx supabase db diff --project-ref ughfpgtntupnedjotmrr
```

### 4. Generate TypeScript Types

**Generate types from database schema:**
```bash
npx supabase gen types typescript --project-ref ughfpgtntupnedjotmrr > lib/supabase/database.types.ts
```

This creates a TypeScript file with all table types, useful for type-safe database queries.

**Example output:**
```typescript
export type Database = {
  public: {
    Tables: {
      documents: {
        Row: {
          id: string
          user_id: string
          filename: string
          full_text: string | null
          // ...
        }
        Insert: { ... }
        Update: { ... }
      }
      // ... other tables
    }
  }
}
```

### 5. Database Schema Inspection

**View table structure:**
```bash
npx supabase db execute "\d+ documents" --project-ref ughfpgtntupnedjotmrr
```

**View indexes:**
```bash
npx supabase db execute "
  SELECT schemaname, tablename, indexname, indexdef
  FROM pg_indexes
  WHERE schemaname = 'public'
  ORDER BY tablename, indexname
" --project-ref ughfpgtntupnedjotmrr
```

**View foreign keys:**
```bash
npx supabase db execute "
  SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
  ORDER BY tc.table_name
" --project-ref ughfpgtntupnedjotmrr
```

## Error Handling

**Connection Issues:**
- Ensure `SUPABASE_ACCESS_TOKEN` is set in environment
- Verify project ref `ughfpgtntupnedjotmrr` is correct
- Check network connectivity

**SQL Errors:**
- Read error message carefully (line number, column)
- Use `\d tablename` to inspect table structure
- Test queries in Supabase Dashboard SQL Editor first

**Migration Issues:**
- Migrations must be idempotent (safe to run multiple times)
- Use `IF NOT EXISTS` for CREATE statements
- Use `IF EXISTS` for DROP statements
- Always test migrations on development branch first

## Best Practices

1. **Always read before write:** Use `SELECT` to verify data before `UPDATE`/`DELETE`
2. **Use transactions:** Wrap multiple statements in `BEGIN`/`COMMIT`
3. **Test on branches:** Create a development branch for risky operations
4. **Backup first:** Export data before major schema changes
5. **Type safety:** Regenerate TypeScript types after schema changes

## Common Workflows

### Add a new column to a table

1. Create migration:
```bash
npx supabase migration new add_status_to_documents --project-ref ughfpgtntupnedjotmrr
```

2. Edit migration file in `supabase/migrations/`:
```sql
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
```

3. Apply migration:
```bash
npx supabase db push --project-ref ughfpgtntupnedjotmrr
```

4. Regenerate types:
```bash
npx supabase gen types typescript --project-ref ughfpgtntupnedjotmrr > lib/supabase/database.types.ts
```

### Query with complex joins

```bash
npx supabase db execute "
  SELECT
    r.id as run_id,
    r.created_at,
    d.filename,
    COUNT(o.id) as output_count,
    AVG(o.quality_overall) as avg_quality
  FROM runs r
  JOIN documents d ON r.document_id = d.id
  LEFT JOIN outputs o ON r.id = o.run_id
  GROUP BY r.id, r.created_at, d.filename
  ORDER BY r.created_at DESC
  LIMIT 10
" --project-ref ughfpgtntupnedjotmrr
```

## Available Resources

- **Local documentation:** `supabase/migrations/` for migration history
- **Database schema:** Check `lib/supabase/database.types.ts` for current schema
- **Official docs:** https://supabase.com/docs/guides/database

## When to Use This Skill

Invoke this skill when you need to:
- Execute SQL queries against the database
- Create or apply migrations
- List tables, columns, or indexes
- Generate TypeScript types
- Inspect database schema
- Perform database administration tasks

**Invoke with:** `/supabase/database` or just mention "supabase database operations"
