# Manual Backend Restart Instructions

## Option 1: Render Dashboard (Easiest)

1. Go to https://dashboard.render.com
2. Navigate to your Mujarrad backend service
3. Click the **"Manual Deploy"** dropdown in the top right
4. Select **"Restart service"**
5. Confirm the restart
6. Wait 1-2 minutes for the service to come back online

## Option 2: Using the Script (Requires API Key)

### Setup (One-time)

1. Get your Render API key:
   - Go to https://dashboard.render.com/account/settings
   - Click "API Keys" in the left sidebar
   - Create a new API key or copy existing one

2. Get your Service ID:
   - Go to https://dashboard.render.com
   - Click on your Mujarrad backend service
   - Copy the service ID from the URL (looks like `srv-xxxxxxxxxxxxxxxxxxxxx`)

3. Set environment variables:
   ```bash
   export RENDER_API_KEY='rnd_xxxxxxxxxxxxxxxxxxxxxxxxxxxx'
   export RENDER_SERVICE_ID='srv-xxxxxxxxxxxxxxxxxxxxx'
   ```

   Or add to your `~/.zshrc` or `~/.bashrc`:
   ```bash
   echo 'export RENDER_API_KEY="rnd_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"' >> ~/.zshrc
   echo 'export RENDER_SERVICE_ID="srv-xxxxxxxxxxxxxxxxxxxxx"' >> ~/.zshrc
   source ~/.zshrc
   ```

### Run the Script

```bash
./restart-backend.sh
```

Or with service ID as argument:
```bash
./restart-backend.sh srv-xxxxxxxxxxxxxxxxxxxxx
```

## Option 3: Direct cURL Command

```bash
curl -X POST \
  "https://api.render.com/v1/services/YOUR_SERVICE_ID/restart" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

Replace:
- `YOUR_SERVICE_ID` with your actual service ID
- `YOUR_API_KEY` with your Render API key

## After Restart

Wait 1-2 minutes, then test the login:

```bash
mujarrad auth login
```

The database transaction error should be resolved after the restart.

## Why This Fixes the Issue

The 500 error was caused by:
```
ERROR: current transaction is aborted, commands ignored until end of transaction block
```

This is a PostgreSQL transaction state error. Restarting the service will:
- Close all existing database connections
- Clear the aborted transaction state
- Establish fresh database connections
- Restore normal operation

## Troubleshooting

If the error persists after restart:

1. **Check Database Status**
   - Go to Render dashboard → Database
   - Ensure PostgreSQL is running and healthy

2. **Check Logs**
   - Go to Render dashboard → Service → Logs
   - Look for database connection errors

3. **Database Restart** (if needed)
   - Go to Render dashboard → Database
   - Click "Manual Deploy" → "Restart database"
   - Wait 2-3 minutes for full restart

4. **Contact Support**
   - If issue persists, contact Render support
   - Provide the error details and timestamp
