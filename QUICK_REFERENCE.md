# WebSocket Debugging Quick Reference Card

## What Was Changed

**Frontend**: `frontend/src/app/workspace/page.tsx` - Added 80 lines of logging
**Backend**: `backend/app.py` - Added 33 lines of timeout detection + error handling

---

## Expected Log Sequence (Success Case)

### Frontend Console (Browser F12 → Console)
```
WS STEP 1: Creating WebSocket connection
WS STEP 1: Using wsHost=wss://f1-steering-api.onrender.com
WS STEP 2: Socket opened
WS STEP 3: Payload object created
WS_PAYLOAD: {session_id: "...", start_frame: 0, ...}
WS STEP 5: Calling socket.send()...
WS STEP 6: socket.send() completed without error
WS STEP 7: Received message from backend
```

### Backend Logs (Render Dashboard)
```
✓ WEBSOCKET ACCEPTED - Client connected
STEP 2: Calling websocket.receive_text()...
✓ SUCCESS: Received data from client!
Data length: 156 bytes
STEP 6: ✓ Config parsed successfully
STEP 10: Sending 'Loading Session' message to client
[Processing continues...]
```

---

## Red Flags (Something's Wrong)

| Red Flag | What It Means | Check |
|----------|---------------|-------|
| No "WS STEP 2" in console | Connection not opening | Browser console for errors |
| "WS STEP 6 ERROR" | Send failed | Error message in console |
| Backend shows TIMEOUT after 30s | Frontend never sent | Check WS STEP 6 in frontend |
| "WebSocket closed" code 1006 | Connection died | Backend crashed or timeout |
| "Invalid session ID" in backend | Session mismatch | Check you're using same backend |

---

## Deployment (< 5 minutes)

```bash
cd "c:\Users\Vishal B\Downloads\F1-UI change"

# Frontend
cd frontend
git add src/app/workspace/page.tsx
git commit -m "Add WebSocket debugging"
git push origin main

# Backend
cd ../backend
git add app.py
git commit -m "Add WebSocket timeout detection"
git push origin main

# Wait 5 minutes, then verify:
curl https://f1-steering-api.onrender.com/api/health
```

---

## Testing (After Deployment)

1. **Open** https://f1-steering-telemetry.vercel.app
2. **Press F12** for DevTools
3. **Go to Console** tab
4. **Click "Load Demo"** button
5. **Click "Process Video Segment"**
6. **Look for WS_STEP** messages in console
7. **Simultaneously check** Render Logs
8. **Compare** frontend and backend timestamps

---

## Most Likely Root Cause

**Frontend's `socket.onopen` fires but `socket.send()` never executes**

Symptoms:
- ✓ Backend accepts connection
- ✓ Backend shows "connection open"
- ❌ Backend never receives message
- ❌ UI hangs at "Transmitting processing packet..."

Verify: Look for "WS STEP 6: socket.send() completed without error" in console

---

## Debug URLs

| Component | URL |
|-----------|-----|
| Frontend | https://f1-steering-telemetry.vercel.app |
| Backend Health | https://f1-steering-api.onrender.com/api/health |
| Backend Logs | https://dashboard.render.com → f1-steering-api → Logs |
| Vercel Status | https://vercel.com/dashboard |
| Render Status | https://dashboard.render.com |

---

## If Backend Shows TIMEOUT (30s)

This is THE smoking gun. It means:

❌ **Frontend's socket.send() did NOT execute**

Check frontend console for:
1. Red error before WS STEP 6
2. Missing WS STEP 5 or WS STEP 6
3. "socket.send() threw exception" error

---

## Files to Reference

1. **PRODUCTION_ISSUE_SOLUTION.md** - Complete explanation
2. **WEBSOCKET_DEBUG_REPORT.md** - How to interpret logs
3. **EXACT_CODE_CHANGES.md** - What was changed
4. **WEBSOCKET_DEBUG_CHANGES.md** - Quick reference guide
5. **DEPLOYMENT_COMMANDS.md** - Step-by-step deploy

---

## Key Insight

**The 30-second timeout on the backend is your debug tool.**

- If it triggers → frontend never sent the data
- If it doesn't trigger → backend received the data
- This definitively proves where the problem is

---

## Chrome DevTools Network Tab Verification

1. **Open Network tab** (DevTools → Network)
2. **Filter by "WS"** (WebSocket)
3. **Trigger analysis**
4. **Click the WebSocket connection**
5. **Go to "Frames" tab**
6. **Look for "1" in send direction (→)**

If you see the message in "Frames", backend SHOULD receive it.
If you DON'T see it, frontend never sent it.

---

## One-Liner Debugging Commands

```bash
# Is backend running?
curl -I https://f1-steering-api.onrender.com/api/health

# Are you on main branch?
git status

# What files changed?
git diff --name-only

# Recent commits
git log --oneline -3

# Sync with remote
git fetch origin
git pull origin main
```

---

## The Flow (What Should Happen)

```
User clicks "Process Video Segment"
        ↓
triggerAnalysis() called
        ↓
WS STEP 1: new WebSocket() created
        ↓
WS STEP 2: socket.onopen fires
        ↓
WS STEP 3-4: Payload created
        ↓
WS STEP 5-6: socket.send() executes ← CRITICAL POINT
        ↓
Backend receives WebSocket message
        ↓
STEP 5-7: Backend logs config parsing
        ↓
Backend sends "Loading Session" response
        ↓
WS STEP 7: Frontend receives message
        ↓
UI updates with progress
        ↓
Analysis continues normally
        ↓
Results displayed when complete
```

**If it breaks at WS STEP 6 or backend TIMEOUT, that's where to look**

---

## Common Mistakes

❌ **Mistake 1**: Not waiting for deployment to complete
- **Fix**: Refresh page 5 times after pushing

❌ **Mistake 2**: Checking wrong logs
- **Fix**: Frontend console ≠ Backend logs (need both)

❌ **Mistake 3**: Switching backend modes mid-test
- **Fix**: Stay consistent (all cloud or all local)

❌ **Mistake 4**: Not opening DevTools before testing
- **Fix**: Press F12 BEFORE clicking Process button

❌ **Mistake 5**: Session expired between upload and analysis
- **Fix**: Upload and analyze within 5 minutes

---

## Success Checklist

- [ ] Code deployed (< 5 min)
- [ ] Frontend loads without errors
- [ ] DevTools Console tab open
- [ ] Reproduced issue
- [ ] Captured WS_STEP logs
- [ ] Checked backend logs simultaneously
- [ ] Identified where flow stops
- [ ] Found matching entry in SOLUTION guide
- [ ] Know exactly where the bug is

**Once you have all these ✓, root cause is IDENTIFIED**

---

## Direct Support

For issues with:
- **Logging**: Check WEBSOCKET_DEBUG_REPORT.md
- **Changes**: Check EXACT_CODE_CHANGES.md
- **Deployment**: Check DEPLOYMENT_COMMANDS.md
- **All problems**: Start with PRODUCTION_ISSUE_SOLUTION.md

---

## TL;DR

1. Deploy changes (5 min)
2. Reproduce issue on cloud
3. Open DevTools Console
4. Open Render Logs dashboard
5. Look for WS_STEP messages
6. If you see WS_STEP 6 → payload was sent
7. If you don't see WS_STEP 6 → payload never sent
8. Backend TIMEOUT (30s) = smoking gun = frontend never sent
9. Use this info to fix root cause

**You now have complete visibility into every step. Deploy and debug!**
