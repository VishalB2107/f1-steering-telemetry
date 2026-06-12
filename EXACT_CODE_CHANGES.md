# Exact Code Changes - Before & After

## CHANGE 1: Frontend WebSocket Logging

**File**: `frontend/src/app/workspace/page.tsx`
**Function**: `triggerAnalysis()`
**Lines**: 228-310

### BEFORE (Original Code)
```typescript
  // Execute Analysis via WebSocket
  const triggerAnalysis = () => {
    if (!sessionId) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    setLogHistory(["[SYS_CORE] Establishing WebSocket telemetry link..."]);
    
    const startTime = Date.now();

    const socket = new WebSocket(`${wsHost}/api/ws/analyze`);

    socket.onopen = () => {
      setLogHistory(prev => [...prev, "[SYS_CORE] Connection established. Transmitting processing packet..."]);
      socket.send(JSON.stringify({
        session_id: sessionId,
        start_frame: startFrame,
        end_frame: endFrame,
        driver_crop_type: selectedDriver,
        postprocessing_mode: postprocessingMode
      }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.stage === "Completed") {
        setAnalysisStage("Completed");
        setAnalysisProgress(100);
        setAnalysisMessage(data.message);
        setResultsData(data.results);
        setStatistics(data.statistics);
        
        const durationSec = ((Date.now() - startTime) / 1000).toFixed(0);
        const min = Math.floor(parseInt(durationSec) / 60);
        const sec = parseInt(durationSec) % 60;
        setAnalysisTime(`${min}m ${sec}s`);
        
        setLogHistory(prev => [...prev, `[SYS_CORE] Completed: ${data.message}`]);
        setIsAnalyzing(false);
        socket.close();
      } else if (data.stage === "Error") {
        setAnalysisError(data.message);
        setIsAnalyzing(false);
        socket.close();
      } else {
        setAnalysisStage(data.stage);
        setAnalysisProgress(data.progress);
        setAnalysisMessage(data.message);
        setLogHistory(prev => [...prev, `[${data.stage.toUpperCase()}] ${data.message}`]);
      }
    };

    socket.onerror = (err) => {
      console.error("WebSocket Error:", err);
      setAnalysisError("Telemetry connection dropped by host");
      setIsAnalyzing(false);
    };
  };
```

### AFTER (With Debug Logging)
```typescript
  // Execute Analysis via WebSocket
  const triggerAnalysis = () => {
    if (!sessionId) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    setLogHistory(["[SYS_CORE] Establishing WebSocket telemetry link..."]);
    
    const startTime = Date.now();

    console.log("WS STEP 1: Creating WebSocket connection");
    console.log(`WS STEP 1: Using wsHost=${wsHost}`);
    console.log(`WS STEP 1: Full URL=${wsHost}/api/ws/analyze`);

    const socket = new WebSocket(`${wsHost}/api/ws/analyze`);

    console.log("WS STEP 1.5: WebSocket created, waiting for onopen...");
    console.log(`WS STEP 1.5: Initial readyState=${socket.readyState} (0=CONNECTING)`);

    socket.onopen = () => {
      console.log("WS STEP 2: Socket opened");
      console.log(`WS STEP 2: readyState=${socket.readyState} (1=OPEN)`);

      const payload = {
        session_id: sessionId,
        start_frame: startFrame,
        end_frame: endFrame,
        driver_crop_type: selectedDriver,
        postprocessing_mode: postprocessingMode
      };

      console.log("WS STEP 3: Payload object created:");
      console.log("WS_PAYLOAD:", payload);

      const jsonString = JSON.stringify(payload);
      console.log("WS STEP 4: Converted to JSON string:");
      console.log("WS_PAYLOAD_STRING:", jsonString);
      console.log(`WS_PAYLOAD_LENGTH: ${jsonString.length} bytes`);

      try {
        console.log("WS STEP 5: Calling socket.send()...");
        socket.send(jsonString);
        console.log("WS STEP 6: socket.send() completed without error");
        console.log(`WS STEP 6: readyState after send=${socket.readyState} (1=OPEN, 2=CLOSING, 3=CLOSED)`);

        setLogHistory(prev => [...prev, "[SYS_CORE] Connection established. Transmitting processing packet..."]);
      } catch (sendError) {
        console.error("WS STEP 6 ERROR: socket.send() threw an exception:", sendError);
        setAnalysisError(`Failed to send payload: ${sendError}`);
        setIsAnalyzing(false);
        try {
          socket.close();
        } catch (e) {
          console.error("Error closing socket after send failure:", e);
        }
      }
    };

    socket.onmessage = (event) => {
      console.log("WS STEP 7: Received message from backend");
      console.log("WS_MESSAGE_DATA:", event.data);

      const data = JSON.parse(event.data);
      if (data.stage === "Completed") {
        setAnalysisStage("Completed");
        setAnalysisProgress(100);
        setAnalysisMessage(data.message);
        setResultsData(data.results);
        setStatistics(data.statistics);
        
        const durationSec = ((Date.now() - startTime) / 1000).toFixed(0);
        const min = Math.floor(parseInt(durationSec) / 60);
        const sec = parseInt(durationSec) % 60;
        setAnalysisTime(`${min}m ${sec}s`);
        
        setLogHistory(prev => [...prev, `[SYS_CORE] Completed: ${data.message}`]);
        setIsAnalyzing(false);
        socket.close();
      } else if (data.stage === "Error") {
        setAnalysisError(data.message);
        setIsAnalyzing(false);
        socket.close();
      } else {
        setAnalysisStage(data.stage);
        setAnalysisProgress(data.progress);
        setAnalysisMessage(data.message);
        setLogHistory(prev => [...prev, `[${data.stage.toUpperCase()}] ${data.message}`]);
      }
    };

    socket.onerror = (err) => {
      console.error("WS STEP ERROR: WebSocket error event fired:", err);
      console.error(`WS STEP ERROR: readyState=${socket.readyState}`);
      setAnalysisError("Telemetry connection error");
      setIsAnalyzing(false);
    };

    socket.onclose = (event) => {
      console.log("WS STEP CLOSE: WebSocket closed");
      console.log(`WS STEP CLOSE: code=${event.code}, reason=${event.reason}`);
      console.log(`WS STEP CLOSE: wasClean=${event.wasClean}`);
      if (!event.wasClean && !analysisError) {
        setAnalysisError("WebSocket connection closed unexpectedly");
        setIsAnalyzing(false);
      }
    };
  };
```

### Key Additions
1. **Lines 235-237**: Initial logging when socket created
2. **Lines 239-240**: Wait confirmation log
3. **Lines 242-243**: Readystate check on creation
4. **Lines 245-246**: Socket opened confirmation
5. **Lines 251-267**: Payload logging (object + JSON string)
6. **Lines 269-285**: Try/catch around socket.send()
7. **Lines 287-295**: Socket onmessage logging
8. **Lines 297-301**: Enhanced onerror with readystate
9. **Lines 303-310**: NEW socket.onclose handler

---

## CHANGE 2: Backend Timeout Detection

**File**: `backend/app.py`
**Function**: `websocket_analyze()`
**Lines**: 218-273

### BEFORE (Original Code)
```python
@app.websocket("/api/ws/analyze")
async def websocket_analyze(websocket: WebSocket):

    await websocket.accept()
    print("STEP 1 - websocket accepted")

    try:
        # 1. Receive analysis parameters
        data = await websocket.receive_text()
        
        print("RENDER DEBUG: received websocket data")
        print(data)
        print("STEP 2 - received websocket payload")

        config = json.loads(data)
        print("STEP 3 - parsed config")

        session_id = config.get("session_id")
        start_frame = int(config.get("start_frame", 0))
        end_frame = int(config.get("end_frame", -1))
        driver_crop_type = config.get("driver_crop_type")
        postprocessing_mode = config.get("postprocessing_mode", "Default")
        
        session_id = config.get("session_id")
        start_frame = int(config.get("start_frame", 0))
        end_frame = int(config.get("end_frame", -1))
```

### AFTER (With Timeout Detection)
```python
@app.websocket("/api/ws/analyze")
async def websocket_analyze(websocket: WebSocket):
    import time
    import asyncio
    
    ws_start_time = time.time()
    
    await websocket.accept()
    print("=" * 80)
    print(f"[{time.time()}] ✓ WEBSOCKET ACCEPTED - Client connected")
    print(f"[{time.time()}] STEP 1: WebSocket connection accepted from client")
    print(f"[{time.time()}] STEP 1: Now waiting for JSON payload from client...")
    print("=" * 80)

    try:
        # 1. Receive analysis parameters with timeout detection
        receive_start = time.time()
        print(f"[{receive_start}] STEP 2: Calling websocket.receive_text()...")
        print(f"[{receive_start}] STEP 2: Setting timeout to 30 seconds to detect hanging...")
        
        try:
            # Set a 30 second timeout to detect if receive is hanging
            data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
            receive_end = time.time()
            
            print("=" * 80)
            print(f"[{receive_end}] ✓ SUCCESS: Received data from client!")
            print(f"[{receive_end}] STEP 3: Data received after {receive_end - receive_start:.2f} seconds")
            print(f"[{receive_end}] STEP 3: Data type: {type(data).__name__}")
            print(f"[{receive_end}] STEP 3: Data length: {len(data)} bytes")
            print(f"[{receive_end}] STEP 4: Data content:")
            print(data)
            print("=" * 80)
            
        except asyncio.TimeoutError:
            timeout_time = time.time()
            print("=" * 80)
            print(f"[{timeout_time}] ✗ CRITICAL ERROR: websocket.receive_text() TIMEOUT!")
            print(f"[{timeout_time}] The receive call waited 30 seconds but received NOTHING from client")
            print(f"[{timeout_time}] This means: Client never sent the payload after connection")
            print(f"[{timeout_time}] Total time since accept: {timeout_time - ws_start_time:.2f} seconds")
            print("=" * 80)
            try:
                await websocket.send_json({
                    "stage": "Error",
                    "progress": 0,
                    "message": "Backend timeout: Client connected but never sent analysis payload"
                })
            except:
                pass
            return
        
        print(f"[{time.time()}] STEP 5: Parsing JSON configuration...")
        config = json.loads(data)
        print(f"[{time.time()}] STEP 6: ✓ Config parsed successfully")
        print(f"[{time.time()}] Config keys: {list(config.keys())}")
        print(f"[{time.time()}] Config content: {config}")

        session_id = config.get("session_id")
        start_frame = int(config.get("start_frame", 0))
        end_frame = int(config.get("end_frame", -1))
        driver_crop_type = config.get("driver_crop_type")
        postprocessing_mode = config.get("postprocessing_mode", "Default")
        
        print(f"[{time.time()}] STEP 7 - Extracted config values:")
        print(f"  - session_id: {session_id}")
        print(f"  - start_frame: {start_frame}")
        print(f"  - end_frame: {end_frame}")
        print(f"  - driver_crop_type: {driver_crop_type}")
        print(f"  - postprocessing_mode: {postprocessing_mode}")
```

### Key Additions
1. **Lines 220-222**: Import asyncio and track start time
2. **Lines 224-229**: Detailed logging with visual separators
3. **Lines 232-250**: Timeout wrapper with asyncio.wait_for()
4. **Lines 251-258**: Timeout error handling with detailed messages
5. **Lines 260-278**: Comprehensive config logging and extraction

---

## CHANGE 3: Backend Error Handling

**File**: `backend/app.py`
**Function**: `websocket_analyze()` - Exception handlers
**Lines**: 395-420

### BEFORE (Original Code)
```python
        })
        
    except WebSocketDisconnect:
        print("WebSocket disconnected client-side.")
    except Exception as e:
        print("Error during WebSocket analysis:", e)
        try:
            await websocket.send_json({
                "stage": "Error",
                "progress": 0,
                "message": f"Server processing error: {str(e)}"
            })
        except:
            pass
    finally:
        try:
            await websocket.close()
        except:
            pass
```

### AFTER (With Detailed Error Logging)
```python
        })
        
    except WebSocketDisconnect:
        print("=" * 60)
        print("ERROR: WebSocket disconnected client-side")
        print(f"[{time.time()}] The client closed the connection unexpectedly")
        print("=" * 60)
    except Exception as e:
        import traceback
        print("=" * 60)
        print("ERROR during WebSocket analysis:")
        print(f"[{time.time()}] Exception type: {type(e).__name__}")
        print(f"[{time.time()}] Exception message: {str(e)}")
        print(f"[{time.time()}] Full traceback:")
        traceback.print_exc()
        print("=" * 60)
        try:
            await websocket.send_json({
                "stage": "Error",
                "progress": 0,
                "message": f"Server processing error: {str(e)}"
            })
        except Exception as send_error:
            print(f"[{time.time()}] ERROR: Could not send error message to client: {send_error}")
    finally:
        try:
            await websocket.close()
            print(f"[{time.time()}] WebSocket properly closed")
        except Exception as close_error:
            print(f"[{time.time()}] ERROR closing socket: {close_error}")
```

### Key Additions
1. **Lines 397-400**: WebSocketDisconnect with visual separator and timestamp
2. **Lines 401-412**: Generic Exception with type, message, and full traceback
3. **Lines 413-416**: Better error message sending with try/catch
4. **Lines 417-422**: Finally block with close logging

---

## CHANGE 4: Session Validation Logging

**File**: `backend/app.py`
**Lines**: 280-291 (in the receive section)

### BEFORE
```python
        if not session_id or session_id not in active_sessions:
            await websocket.send_json({"stage": "Error", "progress": 0, "message": "Invalid session ID"})
            await websocket.close()
            return

        vp = active_sessions[session_id]
        print("STEP 4 - loaded session")

        mh = ModelHandler()
        print("STEP 5 - ModelHandler created")
        
        # Load configs
        vp.mode = postprocessing_mode

        vp.load_crop_variables(driver_crop_type)
        print("STEP 6 - crop variables loaded")

        mh.fps = vp.fps

        total_frames_range = end_frame - start_frame + 1
        
        # Step 1: Loading Session
        await websocket.send_json({
            "stage": "Loading Session",
            "progress": 5,
            "message": "Initializing model architecture and session configurations..."
        })
        
        print("STEP 7 - first websocket message sent")
```

### AFTER
```python
        if not session_id or session_id not in active_sessions:
            print(f"[{time.time()}] ERROR: Invalid session ID")
            print(f"  - session_id provided: {session_id}")
            print(f"  - active_sessions keys: {list(active_sessions.keys())}")
            await websocket.send_json({"stage": "Error", "progress": 0, "message": "Invalid session ID"})
            await websocket.close()
            return

        vp = active_sessions[session_id]
        print(f"[{time.time()}] STEP 7 - Loaded session from active_sessions")

        mh = ModelHandler()
        print(f"[{time.time()}] STEP 8 - ModelHandler created")
        
        # Load configs
        vp.mode = postprocessing_mode

        vp.load_crop_variables(driver_crop_type)
        print(f"[{time.time()}] STEP 9 - Crop variables loaded")

        mh.fps = vp.fps

        total_frames_range = end_frame - start_frame + 1
        
        # Step 1: Loading Session
        print(f"[{time.time()}] STEP 10 - Sending 'Loading Session' message to client")
        await websocket.send_json({
            "stage": "Loading Session",
            "progress": 5,
            "message": "Initializing model architecture and session configurations..."
        })
        
        print(f"[{time.time()}] STEP 11 - First WebSocket message sent successfully")
```

### Key Additions
1. **Lines 281-283**: Session ID validation with error details
2. **Lines 287-297**: Renumbered STEP logs with timestamps

---

## Summary of Changes

| Component | Change Type | Lines | What It Does |
|-----------|-------------|-------|--------------|
| Frontend | Add logging | ~50 | Logs every WebSocket event from creation to close |
| Frontend | Add error handling | ~10 | Wraps socket.send() in try/catch |
| Frontend | Add onclose handler | ~8 | Detects unexpected disconnects |
| Backend | Add timeout | ~20 | Detects if client never sends data |
| Backend | Add validation logging | ~5 | Shows session ID mismatch details |
| Backend | Enhance error handling | ~20 | Full exception details and traceback |
| **TOTAL** | **+113 lines** | | **Complete WebSocket visibility** |

---

## Testing the Changes

### 1. Deploy
```bash
git add .
git commit -m "Add comprehensive WebSocket debugging"
git push origin main
```

### 2. Reproduce Issue
- Open https://f1-steering-telemetry.vercel.app
- Upload video
- Press F12 for DevTools
- Go to Console tab
- Click "Process Video Segment"

### 3. Verify Logs
Look for `WS STEP` messages in Console and backend Render logs

### 4. Identify Root Cause
Check the expected log flow chart in WEBSOCKET_DEBUG_REPORT.md
