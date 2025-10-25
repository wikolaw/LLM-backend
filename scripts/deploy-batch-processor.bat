@echo off
echo.
echo ============================================
echo  Deploying batch-processor Edge Function
echo ============================================
echo.
echo Please go to: https://supabase.com/dashboard/project/ughfpgtntupnedjotmrr/settings/tokens
echo.
echo Create a new Personal Access Token and run:
echo   export SUPABASE_ACCESS_TOKEN=sbp_XXXXXXXXXXXX
echo   npx supabase functions deploy batch-processor
echo.
echo Or manually deploy via Supabase Dashboard:
echo   1. Go to Edge Functions in dashboard
echo   2. Click on batch-processor
echo   3. Upload updated files
echo.
pause
