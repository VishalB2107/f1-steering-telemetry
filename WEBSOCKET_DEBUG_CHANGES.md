# WebSocket Debug Changes - Quick Reference

## Files Modified
1. ✅ `frontend/src/app/workspace/page.tsx` - Lines 228-310
2. ✅ `backend/app.py` - Lines 218-300
3. ✅ `backend/app.py` - Lines 395-420

---

## Frontend Changes Summary

**File**: `frontend/src/app/workspace/page.tsx`
**Function**: `triggerAnalysis()` (lines 228-310)

### What Was Added
- **WS STEP 1**: Logs when WebSocket is created and the URL being used
- **WS STEP 1.5**: Logs initial readyState (0=CONNECTING)
- **WS STEP 2**: Logs when socket.onopen fires and readyState=1
- **WS STEP 3-4**: Logs the payload object and JSON string
- **WS STEP 5-6**: Wraps socket.send() in try/catch and logs success/errors
- **WS STEP 7**: Logs when backend messages are received
- **WS STEP CLOSE**: New handler to detect unexpected disconnects
- **WS STEP ERROR**: Enhanced onerror with readyState logging

### Key Additions
```javascript
// Before onopen
console.log("WS STEP 1: Creating WebSocket connection");
console.log(`WS STEP 1: Using wsHost=${wsHost}`);

// Inside onopen - logs payload before sending
console.log("WS_PAYLOAD:", payload);
console.log("WS_PAYLOAD_STRING:", jsonString);
console.log(`WS_PAYLOAD_LENGTH: ${jsonString.length} bytes`);

// Socket send wrapped in try/catch
try {
  console.log("WS STEP 5: Calling socket.send()...");
  socket.send(jsonString);
  console.log("WS STEP 6: socket.send() completed without error");
} catch (sendError) {
  console.error("WS STEP 6 ERROR: socket.send() threw an exception:", sendError);
}

// New socket.onclose handler
socket.onclose = (event) => {
  console.log("WS STEP CLOSE: WebSocket closed");
  console.log(`WS STEP CLOSE: code=${event.code}, reason=${event.reason}`);
  console.log(`WS STEP CLOSE: wasClean=${event.wasClean}`);
};
```

---

## Backend Changes Summary

**File**: `backend/app.py`
**Function**: `websocket_analyze()` 

### Change 1: Connection Accept & Timeout Wrapper (Lines 218-273)
**Status**: CRITICAL

Added:
- Timestamp logging on every message
- 30-second timeout detection on `websocket.receive_text()`
- If timeout occurs → logs "CRITICAL ERROR: websocket.receive_text() TIMEOUT!"
- This definitively proves whether client sent data or not

```python
# NEW: Timeout wrapper around receive_text
try:
    data = await asyncio.wait_for(
        websocket.receive_text(), 
        timeout=30.0  # 30 second timeout
    )
except asyncio.TimeoutError:
    print(f"[{time.time()}] ✗ CRITICAL ERROR: websocket.receive_text() TIMEOUT!")
    print(f"[{time.time()}] This means: Client never sent the payload after connection")
    return
```

### Change 2: Config Extraction & Validation (Lines 274-288)
**Status**: IMPORTANT

Added:
- Detailed logs of all extracted config values
- Clear indication if session_id is invalid
- Lists all active session IDs for debugging
- Shows exact mismatch between provided and available sessions

```python
print(f"[{time.time()}] STEP 7 - Extracted config values:")
print(f"  - session_id: {session_id}")
print(f"  - start_frame: {start_frame}")
# ... etc

if not session_id or session_id not in active_sessions:
    print(f"[{time.time()}] ERROR: Invalid session ID")
    print(f"  - session_id provided: {session_id}")
    print(f"  - active_sessions keys: {list(active_sessions.keys())}")
```

### Change 3: Enhanced Error Handling (Lines 395-420)
**Status**: IMPORTANT

Added:
- Full exception traceback on errors
- Distinguishes between WebSocketDisconnect and other exceptions
- Logs all WebSocket close scenarios with details
- Better error messages for debugging

```python
except Exception as e:
    import traceback
    print("=" * 60)
    print(f"[{time.time()}] Exception type: {type(e).__name__}")
    print(f"[{time.time()}] Exception message: {str(e)}")
    traceback.print_exc()
    print("=" * 60)
```

---

## How to Deploy

### Step 1: Push to GitHub
```bash
# From F1-UI change directory
cd frontend
git add .
git commit -m "Add comprehensive WebSocket debugging"
git push origin main

cd ../backend
git add app.py
git commit -m "Add timeout detection and detailed WebSocket logging"
git push origin main
```

### Step 2: Deployments Auto-Trigger
- **Vercel** (Frontend): Auto-deploys on push to main
- **Render** (Backend): Auto-deploys on push to main
  - OR manually click "Deploy" button in Render dashboard

### Step 3: Verify Deployments
- Frontend: Check https://f1-steering-telemetry.vercel.app loads
- Backend: Check https://f1-steering-api.onrender.com/api/health returns `{"status": "healthy", "version": "1.0.0"}`

---

## How to Debug

### 1. Open Developer Tools
- Press **F12** or **Right-click → Inspect**
- Go to **Console** tab

### 2. Reproduce the Issue
1. Upload a video
2. Configure analysis parameters
3. Click "Process Video Segment"

### 3. Look for WS_STEP logs in Console
Expected sequence:
```
WS STEP 1: Creating WebSocket connection
WS STEP 1: Using wsHost=wss://f1-steering-api.onrender.com
WS STEP 2: Socket opened
WS STEP 3: Payload object created
WS STEP 5: Calling socket.send()...
WS STEP 6: socket.send() completed without error
WS STEP 7: Received message from backend
```

### 4. Check Render Backend Logs Simultaneously
- Go to https://dashboard.render.com
- Select "f1-steering-api" service
- Click "Logs" tab
- Look for matching timestamps

### 5. Compare Logs
If frontend shows:
- ✅ WS STEP 2 → Backend shows: ✓ WEBSOCKET ACCEPTED
- ✅ WS STEP 6 → Backend shows: ✓ SUCCESS: Received data

If frontend shows:
- ✅ WS STEP 6 → Backend shows: ✗ CRITICAL ERROR: websocket.receive_text() TIMEOUT!
- **ROOT CAUSE**: Frontend thinks it sent, but backend never received

---

## Test Checklist

After deployment:

- [ ] Deploy frontend changes to Vercel
- [ ] Deploy backend changes to Render
- [ ] Wait 2 minutes for deployments to complete
- [ ] Open browser DevTools (F12)
- [ ] Go to Console tab
- [ ] Upload demo video (click "Load Demo" button)
- [ ] Configure range and driver
- [ ] Click "Process Video Segment"
- [ ] Verify WS_STEP logs appear in Console
- [ ] Check Render logs simultaneously
- [ ] Confirm log sequence matches expected flow

---

## Visual Guide: Where to Look

### Frontend Console (Browser F12)
```
┌─ Console tab ────────────────────────────────────────┐
│ WS STEP 1: Creating WebSocket connection             │
│ WS STEP 1: Using wsHost=wss://...                    │
│ WS STEP 2: Socket opened                             │
│ WS STEP 3: Payload object created                    │
│ WS_PAYLOAD: {session_id: "...", start_frame: 0, ...} │
│ WS STEP 5: Calling socket.send()...                  │
│ WS STEP 6: socket.send() completed without error     │
└──────────────────────────────────────────────────────┘
```

### Backend Logs (Render Dashboard)
```
┌─ Logs tab ────────────────────────────────────────────┐
│ [1718186400.00] ✓ WEBSOCKET ACCEPTED                  │
│ [1718186400.00] STEP 1: Now waiting for JSON payload  │
│ [1718186400.01] STEP 2: Calling receive_text()...     │
│ [1718186400.15] ✓ SUCCESS: Received data from client! │
│ [1718186400.15] Data length: 156 bytes                │
│ [1718186400.16] Config parsed successfully            │
└────────────────────────────────────────────────────────┘
```

---

## Most Common Issues & Solutions

### Issue 1: No WS_STEP logs appear in console
**Diagnosis**: JavaScript error before logging starts
**Solution**: 
- Check console for any red errors
- Verify `sessionId` is not null
- Verify you clicked "Process Video Segment" button

### Issue 2: WS STEP 2 never appears
**Diagnosis**: socket.onopen never fires
**Solution**:
- Check if connection is refused
- Check DevTools Network tab → WS connection
- Verify wss:// URL is correct

### Issue 3: WS STEP 6 shows "socket.send() threw exception"
**Diagnosis**: Send failed after connection opened
**Solution**:
- Connection state changed during send
- Browser quota exceeded
- Invalid payload data

### Issue 4: Backend logs show TIMEOUT after 30 seconds
**Diagnosis**: Frontend never called socket.send()
**Solution**:
- Check frontend WS_STEP logs
- Verify WS STEP 5 executed
- Check for "WS STEP 6 ERROR" messages

---

## For Production

Once root cause is identified:
1. Remove timing-sensitive logs
2. Keep only error logs and success confirmation
3. Remove detailed payload logging (contains user data)
4. Keep session ID validation errors

Example:
```javascript
// KEEP: Error cases
console.error("WS STEP 6 ERROR:", error);

// REMOVE: Verbose step-by-step
console.log("WS STEP 3: Payload object created");
```

---

## Summary

✅ **Frontend**: Comprehensive logging for every WebSocket operation
✅ **Backend**: 30-second timeout to detect when client never sends
✅ **Error Handling**: Full exception tracebacks for all failure modes
✅ **Deployment**: Ready to deploy immediately

**Next**: Deploy → Reproduce → Check logs → Identify root cause
