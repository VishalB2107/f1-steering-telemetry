# Deployment Commands

## Quick Deploy Guide

### Prerequisites
- Git installed and configured
- GitHub account with access to f1-steering-telemetry repo
- Vercel and Render accounts connected to GitHub

---

## Step-by-Step Deployment

### 1. Verify Changes Are Correct

```bash
# Navigate to the workspace
cd "c:\Users\Vishal B\Downloads\F1-UI change"

# Check git status
git status
```

**Expected output**:
```
On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
  (use "git add <file>..." to update the included in commit)
        modified:   frontend/src/app/workspace/page.tsx
        modified:   backend/app.py
```

---

### 2. Deploy Frontend

```bash
# Stage the frontend changes
cd frontend
git add src/app/workspace/page.tsx

# Commit with descriptive message
git commit -m "Add comprehensive WebSocket debugging logs

- Add WS_STEP logging at every WebSocket event
- Add try/catch around socket.send() for error detection  
- Add socket.onclose handler for disconnect detection
- Improve socket.onerror logging with readyState verification
- Include payload logging for debugging send failures"

# Push to GitHub (auto-triggers Vercel deployment)
git push origin main
```

**Expected output**:
```
Enumerating objects: 3, done.
Counting objects: 100% (3/3), done.
Delta compression using up to 8 threads
Compressing objects: 100% (2/2), done.
Writing objects: 100% (2/2), 258 bytes | 258.00 KiB/s, done.
Total 3 (delta 1), reused 0 (delta 0), received 0 (delta 0)
remote: Resolving deltas: 100% (1/1), done.
To github.com:yourusername/f1-steering-telemetry.git
   abc1234..def5678  main -> main
```

---

### 3. Deploy Backend

```bash
# Navigate to backend
cd ../backend

# Stage the backend changes
git add app.py

# Commit with descriptive message
git commit -m "Add WebSocket timeout detection and enhanced logging

- Add 30-second timeout to websocket.receive_text() for timeout detection
- Add detailed logging with timestamps at every STEP
- Show received data type, length, and content for debugging
- Add comprehensive error handling with full traceback
- Add session validation logging with active_sessions list
- Distinguish between WebSocketDisconnect and other exceptions"

# Push to GitHub (auto-triggers Render deployment)
git push origin main
```

**Expected output**:
```
Enumerating objects: 3, done.
Counting objects: 100% (3/3), done.
Delta compression using up to 8 threads
Compressing objects: 100% (2/2), done.
Writing objects: 100% (2/2), 1.2 KiB | 1.2 KiB/s, done.
Total 3 (delta 2), reused 0 (delta 0), received 0 (delta 0)
remote: Resolving deltas: 100% (2/2), done.
To github.com:yourusername/f1-steering-telemetry.git
   xyz9999..abc1111  main -> main
```

---

### 4. Monitor Deployments

#### Vercel (Frontend)

```bash
# Option 1: Via Dashboard
# https://vercel.com/dashboard
# - Select f1-steering-telemetry project
# - Wait for green checkmark next to main branch

# Option 2: Via CLI
npm install -g vercel
vercel logs --follow

# Expected output shows deployment progress
```

#### Render (Backend)

```bash
# Via Dashboard
# https://dashboard.render.com
# - Select "f1-steering-api" service
# - Deployments tab shows progress
# - Wait for green "Live" status

# Expected: Takes 2-5 minutes to deploy
```

---

### 5. Verify Deployments Are Live

```bash
# Test Frontend
curl -I https://f1-steering-telemetry.vercel.app

# Expected: HTTP/1.1 200 OK

# Test Backend Health Endpoint
curl https://f1-steering-api.onrender.com/api/health

# Expected: {"status": "healthy", "version": "1.0.0"}

# Test WebSocket URL (in browser console)
# Open the deployed site and look for WS_STEP logs
```

---

## Troubleshooting Deployment Issues

### Issue 1: Vercel Deployment Fails

```bash
# Check build logs
vercel logs --follow

# Verify Next.js dependencies
cd frontend
npm install

# Rebuild
npm run build

# If successful, deploy
vercel --prod
```

### Issue 2: Render Deployment Fails

```bash
# Check if app.py has syntax errors
cd backend
python -m py_compile app.py

# If errors found, fix them:
# - Check import statements
# - Verify asyncio import is present
# - Check indentation

# Verify requirements.txt has all dependencies
cat requirements.txt
# Should include: fastapi, uvicorn, asyncio (usually built-in)
```

### Issue 3: Deployment Gets Stuck

```bash
# For Vercel:
# Cancel and retry
vercel --prod --force

# For Render:
# Click "Cancel Deployment" in Render dashboard
# Click "Deploy" again
```

---

## Verification Checklist

After deployment, verify:

- [ ] Frontend deployed to Vercel (check status on vercel.com)
- [ ] Backend deployed to Render (check status on render.com)
- [ ] Can access https://f1-steering-telemetry.vercel.app
- [ ] Backend health endpoint returns 200: `curl https://f1-steering-api.onrender.com/api/health`
- [ ] No errors in browser console (open DevTools F12)
- [ ] Can upload video successfully
- [ ] Can load crop preview successfully

---

## Post-Deployment Testing

### Test 1: Quick Smoke Test

```bash
# 1. Open https://f1-steering-telemetry.vercel.app
# 2. Press F12 to open DevTools
# 3. Go to Console tab
# 4. Click "Load Demo"
# 5. Click "Process Video Segment"
# 6. Look for WS_STEP logs in console
```

### Test 2: Full Integration Test

```bash
# 1. Simultaneously open:
#    - https://f1-steering-telemetry.vercel.app (DevTools open)
#    - https://dashboard.render.com (Logs tab open)
# 2. Upload video
# 3. Configure analysis parameters
# 4. Click "Process Video Segment"
# 5. Watch both console and backend logs in parallel
# 6. Compare timestamps and log sequence
```

---

## Rollback Instructions (If Needed)

If deployment causes issues:

```bash
# For Frontend - Revert to previous Vercel deployment
# https://vercel.com/dashboard → f1-steering-telemetry → Deployments
# Click previous successful deployment → "Promote to Production"

# For Backend - Revert to previous Render deployment
# https://dashboard.render.com → f1-steering-api → Deployments
# Click previous successful deployment → "Redeploy"

# Or manually revert git commits
git revert HEAD --no-edit
git push origin main
```

---

## Expected Timeline

| Task | Duration | Status |
|------|----------|--------|
| Git push | <1 min | Instant |
| Vercel build | 2-3 min | Check on vercel.com |
| Render build | 2-5 min | Check on render.com |
| DNS propagation | <1 min | Usually instant |
| **Total** | **5-10 min** | **Ready to test** |

---

## Success Indicators

✅ **Frontend Deployed Successfully**
- Vercel dashboard shows green checkmark
- Can access https://f1-steering-telemetry.vercel.app
- Page loads without errors
- DevTools Console is clean (no red errors)

✅ **Backend Deployed Successfully**
- Render dashboard shows "Live" status
- Health endpoint returns HTTP 200
- Can see new debug logs in Render logs

✅ **Integration Working**
- Frontend websocket logs (WS_STEP) appear in Console
- Backend receives connection (WEBSOCKET ACCEPTED shows)
- Timestamps align between frontend and backend logs

---

## Next Steps After Deployment

1. **Reproduce the Issue**
   - Upload video to cloud
   - Configure analysis
   - Click "Process Video Segment"

2. **Capture Logs**
   - Open DevTools Console (F12)
   - Open Render Logs dashboard
   - Run analysis and capture both logs

3. **Analyze Logs**
   - Compare against interpretation guide in WEBSOCKET_DEBUG_REPORT.md
   - Identify where the flow stops
   - Look for error messages

4. **Identify Root Cause**
   - Use log sequence to pinpoint failure
   - Check PRODUCTION_ISSUE_SOLUTION.md for diagnosis

5. **Implement Fix**
   - Apply appropriate fix based on root cause
   - Redeploy and verify

---

## Quick Commands Reference

```bash
# Check what changed
git diff

# Reset if needed
git reset --hard HEAD

# View git log
git log --oneline -5

# Push all changes
git add .
git commit -m "message"
git push origin main

# Check deployment status
vercel status
# (requires Vercel CLI)
```

---

## Support URLs

- Vercel Dashboard: https://vercel.com/dashboard
- Render Dashboard: https://dashboard.render.com  
- Frontend URL: https://f1-steering-telemetry.vercel.app
- Backend Health: https://f1-steering-api.onrender.com/api/health
- Backend Logs: https://dashboard.render.com/services/f1-steering-api (Logs tab)

---

## Duration Summary

**Deployment Process**: 10-15 minutes total
- Git commands: 2 minutes
- Vercel build: 2-3 minutes
- Render build: 2-5 minutes
- Verification: 1-2 minutes

**Then**: Ready to test and debug! 🚀
