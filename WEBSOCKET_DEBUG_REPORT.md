# WebSocket Debugging Audit - Complete Report

## ISSUE SUMMARY
- **Frontend**: Vercel (Next.js)
- **Backend**: Render (FastAPI)
- **Problem**: WebSocket connection accepted but backend never receives the client's initial payload
- **Status**: Connection shows "established" in UI but analysis never starts
- **Root Cause**: Missing comprehensive logging + potential timeout/send failure on frontend

---

## CHANGES IMPLEMENTED

### 1. FRONTEND ENHANCEMENTS
**File**: `frontend/src/app/workspace/page.tsx`
**Lines**: 228-310

#### What Was Changed
Enhanced the `triggerAnalysis()` function with detailed console logging at every WebSocket step.

#### Changes Made
```
OLD: Basic socket.onopen/send with no error handling or logging
NEW: Detailed WS_STEP logs for:
  - Socket creation (WS STEP 1)
  - Socket opened event (WS STEP 2)
  - Payload object creation (WS STEP 3)
  - JSON stringification (WS STEP 4)
  - socket.send() execution with try/catch (WS STEP 5-6)
  - Message reception (WS STEP 7)
  - Error handling (WS STEP ERROR)
  - Connection close events (WS STEP CLOSE)
```

#### Specific Additions
1. **Before socket creation** (WS STEP 1):
   - Logs `wsHost` value
   - Logs full WebSocket URL
   - Logs initial `readyState` (0 = CONNECTING)

2. **In socket.onopen** (WS STEP 2-6):
   - Verifies `readyState === 1` (OPEN)
   - Creates payload object separately for inspection
   - Converts to JSON string and logs it
   - Logs JSON string length (for detection of empty payloads)
   - Wraps `socket.send()` in try/catch
   - Verifies `readyState` after send completes
   - Logs any exceptions from socket.send()

3. **New socket.onclose handler**:
   - Detects unexpected disconnects
   - Logs close code and reason
   - Logs whether close was clean or abrupt

4. **Enhanced socket.onerror**:
   - Logs readyState when error occurs
   - Provides context for debugging

---

### 2. BACKEND ENHANCEMENTS
**File**: `backend/app.py`
**Lines**: 218-300 (WebSocket handler)

#### What Was Changed
Enhanced the `websocket_analyze()` function with comprehensive logging and timeout detection.

#### Specific Additions

1. **Connection Accept** (STEP 1):
   - Visual separator (80 chars)
   - Timestamp for every log
   - Clear message when connection accepted
   - Indicates it's waiting for JSON payload

2. **receive_text() with 30-second Timeout** (STEP 2-3):
   - Wraps `websocket.receive_text()` in `asyncio.wait_for(..., timeout=30)`
   - **CRITICAL**: If this times out, it means:
     - Client connected but never sent payload
     - Frontend's `socket.send()` never executed
     - Network issue between client and server
   - Logs exact timeout with clear message

3. **Data Validation** (STEP 4-7):
   - Logs received data type and length
   - Pretty prints the raw JSON string
   - Parses JSON and logs all config keys
   - Extracts and validates all parameters
   - Lists active session IDs if validation fails

4. **Enhanced Error Handling**:
   - Full exception traceback on errors
   - Distinguishes between `WebSocketDisconnect` and other exceptions
   - Logs all close scenarios with details

---

## HOW TO INTERPRET THE NEW LOGS

### FRONTEND BROWSER CONSOLE (`console.log` output)
Look for these patterns:

#### SUCCESS SCENARIO
```
WS STEP 1: Creating WebSocket connection
WS STEP 1: Using wsHost=wss://f1-steering-api.onrender.com
WS STEP 1: Full URL=wss://f1-steering-api.onrender.com/api/ws/analyze
WS STEP 1.5: WebSocket created, waiting for onopen...
WS STEP 1.5: Initial readyState=0 (0=CONNECTING)
WS STEP 2: Socket opened
WS STEP 2: readyState=1 (1=OPEN)
WS STEP 3: Payload object created:
WS_PAYLOAD: {session_id: "...", start_frame: 0, end_frame: 100, ...}
WS STEP 4: Converted to JSON string:
WS_PAYLOAD_STRING: {"session_id":"...","start_frame":0,...}
WS_PAYLOAD_LENGTH: 156 bytes
WS STEP 5: Calling socket.send()...
WS STEP 6: socket.send() completed without error
WS STEP 6: readyState after send=1 (1=OPEN, 2=CLOSING, 3=CLOSED)
WS STEP 7: Received message from backend
```

#### FAILURE SCENARIO 1: socket.onopen never fires
```
WS STEP 1: Creating WebSocket connection
WS STEP 1.5: Initial readyState=0
[NO WS STEP 2 message]
[Connection stuck indefinitely]
```
**Diagnosis**: Connection failed to establish. Check:
- Frontend can reach backend domain
- Backend is running
- No CORS/firewall blocking

#### FAILURE SCENARIO 2: socket.send() throws error
```
WS STEP 5: Calling socket.send()...
WS STEP 6 ERROR: socket.send() threw an exception: [error details]
```
**Diagnosis**: Send failed during execution. Check:
- Connection state changed mid-send
- Browser quota exceeded
- Invalid data type

#### FAILURE SCENARIO 3: Connection closes after send
```
WS STEP 6: readyState after send=3 (1=OPEN, 2=CLOSING, 3=CLOSED)
WS STEP CLOSE: WebSocket closed
WS STEP CLOSE: code=1006, reason=
WS STEP CLOSE: wasClean=false
```
**Diagnosis**: Connection closed unexpectedly after send. Check:
- Backend crashed before receiving data
- Network disconnection
- Timeout on backend

---

### BACKEND SERVER LOGS (Render console)
Look for these patterns:

#### SUCCESS SCENARIO
```
================================================================================
[1718186400.00] ✓ WEBSOCKET ACCEPTED - Client connected
[1718186400.00] STEP 1: WebSocket connection accepted from client
[1718186400.00] STEP 1: Now waiting for JSON payload from client...
================================================================================
[1718186400.01] STEP 2: Calling websocket.receive_text()...
[1718186400.01] STEP 2: Setting timeout to 30 seconds to detect hanging...
================================================================================
[1718186400.15] ✓ SUCCESS: Received data from client!
[1718186400.15] STEP 3: Data received after 0.14 seconds
[1718186400.15] STEP 3: Data type: str
[1718186400.15] STEP 3: Data length: 156 bytes
[1718186400.15] STEP 4: Data content:
{"session_id":"abc123","start_frame":0,"end_frame":100,...}
================================================================================
[1718186400.16] STEP 5: Parsing JSON configuration...
[1718186400.16] STEP 6: ✓ Config parsed successfully
```

#### FAILURE SCENARIO 1: 30-second timeout
```
================================================================================
[1718186400.00] ✓ WEBSOCKET ACCEPTED - Client connected
[1718186400.00] STEP 1: WebSocket connection accepted from client
[1718186400.00] STEP 1: Now waiting for JSON payload from client...
================================================================================
[1718186400.01] STEP 2: Calling websocket.receive_text()...
[1718186400.01] STEP 2: Setting timeout to 30 seconds to detect hanging...
[1718186430.05] ✗ CRITICAL ERROR: websocket.receive_text() TIMEOUT!
[1718186430.05] The receive call waited 30 seconds but received NOTHING from client
[1718186430.05] This means: Client never sent the payload after connection
[1718186430.05] Total time since accept: 30.05 seconds
```
**Diagnosis**: CLIENT NEVER SENT THE PAYLOAD
- Frontend's `socket.send()` is NOT executing
- OR frontend `socket.onopen` is NOT firing
- Look at frontend browser console for WS_STEP logs

#### FAILURE SCENARIO 2: Invalid session ID
```
[1718186400.16] STEP 7 - Extracted config values:
  - session_id: abc123
  - start_frame: 0
  - end_frame: 100
  - driver_crop_type: Verstappen
  - postprocessing_mode: Default
[1718186400.17] ERROR: Invalid session ID
  - session_id provided: abc123
  - active_sessions keys: ['xyz789', 'def456']
```
**Diagnosis**: Session ID mismatch between upload and analysis
- User uploaded with backend A, analyzed with backend B
- Session expired (cleared from memory)
- Database consistency issue

#### FAILURE SCENARIO 3: Exception during processing
```
================================================================================
ERROR during WebSocket analysis:
[1718186402.50] Exception type: ValueError
[1718186402.50] Exception message: could not convert string to int
[1718186402.50] Full traceback:
[Full Python traceback...]
================================================================================
```
**Diagnosis**: Backend error during frame processing
- Invalid frame number
- Corrupted video file
- Model loading failure

---

## DEPLOYMENT INSTRUCTIONS

### 1. Deploy Frontend to Vercel
```bash
cd frontend
git add .
git commit -m "Add comprehensive WebSocket debugging"
git push origin main
# Vercel auto-deploys on push
```

### 2. Deploy Backend to Render
```bash
# Push changes to GitHub
cd backend
git add app.py
git commit -m "Add timeout detection and detailed WebSocket logging"
git push origin main

# Go to Render dashboard
# - Backend auto-redeploys on push, OR
# - Click "Deploy" button manually
```

### 3. Reproduce the Issue on Cloud
1. Go to https://f1-steering-telemetry.vercel.app
2. Upload video and configure analysis
3. Click "Process Video Segment"
4. **OPEN BROWSER DEVELOPER TOOLS** (F12 or Right-click → Inspect)
5. Go to **Console** tab
6. Look for `WS STEP` messages
7. **SIMULTANEOUSLY** check Render logs:
   - Go to Render dashboard
   - Select F1 Steering API backend
   - Click "Logs" tab
   - Look for the matching timestamps
8. Compare Frontend logs with Backend logs

---

## EXPECTED DEBUG FLOW

### Timeline of Events (Success Case)
1. **T+0ms**: Frontend creates WebSocket (WS STEP 1)
2. **T+50-200ms**: Backend accepts connection (WEBSOCKET ACCEPTED)
3. **T+200-300ms**: Frontend sends payload (WS STEP 5-6)
4. **T+300-500ms**: Backend receives payload (SUCCESS: Received data)
5. **T+500ms onwards**: Backend sends progress messages

### If Backend Logs Don't Appear
- Backend didn't receive the connection at all → check network/CORS
- Backend received connection but no receive timeout logs → check Render platform

### If Frontend Shows Success But Backend Shows Timeout
- **ROOT CAUSE CONFIRMED**: Frontend thinks it sent, but backend never received
- Check: Network capture tools (DevTools → Network → WS), browser extensions blocking WebSocket

---

## NEXT DEBUGGING STEPS

### If 30-second timeout occurs in backend logs:
1. **Check Firefox/Chrome DevTools Network tab**:
   - Click on the WebSocket connection
   - Check "Frames" tab for any sent frames
   - If no frames sent, frontend never called `socket.send()`

2. **Verify frontend successfully reaches `socket.onopen`**:
   - Look for "WS STEP 2: Socket opened" in console
   - If missing, connection is failing to establish

3. **Check for errors in onopen**:
   - Look for "WS STEP 6 ERROR" in console
   - This would indicate socket.send() threw an exception

### If connection closes immediately after send:
- Look for "WS STEP CLOSE" with code 1006 or 1011
- This indicates backend error or timeout
- Check backend logs for exceptions

### If data is received but session ID is invalid:
- Verify same backend is being used for upload and analysis
- Check that you're not switching between local/cloud modes
- Verify localStorage is not being cleared between requests

---

## KEY METRICS TO MONITOR

| Metric | Good Value | Bad Value |
|--------|-----------|-----------|
| Connection accept time | <100ms | >500ms (slow network) |
| Receive time | <500ms | 30s timeout |
| JSON string length | >100 bytes | 0 bytes |
| socket.readyState after send | 1 (OPEN) | 3 (CLOSED) |
| Backend receive latency | <300ms | >1000ms |

---

## RENDER-SPECIFIC NOTES

Render has known quirks with WebSocket connections:
1. **Timeout defaults**: Render may close idle connections after 55 seconds
   - Our 30-second timeout in backend will trigger before that
2. **Connection pooling**: Multiple connection attempts may be load-balanced
3. **Deployment cold starts**: First request after deploy may be slow
   - Causes timeout if receive takes >30 seconds

**Solution**: If you get a 30-second timeout on first run:
- Run again (backend is now warm)
- Increase timeout to 60 seconds if consistently slow

---

## FILES MODIFIED

| File | Lines | Changes |
|------|-------|---------|
| frontend/src/app/workspace/page.tsx | 228-310 | Added comprehensive WS_STEP logging |
| backend/app.py | 218-300 | Added 30s timeout + detailed logging |
| backend/app.py | 395-420 | Enhanced error handling |

---

## SUMMARY

You now have complete visibility into:
- ✅ When frontend creates the WebSocket
- ✅ Whether frontend's onopen fires
- ✅ Whether frontend's send() executes
- ✅ What payload is being sent
- ✅ Whether backend accepts the connection
- ✅ Whether backend receives the data
- ✅ How long each step takes
- ✅ Exact error messages if anything fails

**Next step**: Deploy these changes and reproduce the issue. The logs will show EXACTLY where the problem occurs.
