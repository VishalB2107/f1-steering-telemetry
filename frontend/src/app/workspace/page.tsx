"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Cpu,
  Layers,
  Activity,
  FileVideo,
  Compass,
  Download,
  Play,
  Pause,
  ArrowLeft,
  Settings,
  AlertTriangle,
  RefreshCw,
  Clock,
  LayoutGrid,
  CheckCircle,
  Database
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine
} from "recharts";

const teams = [
  'RedBull', 'Ferrari', 'Mclaren', 'Mercedes', 'Williams', 'Aston Martin', 'RB', 'Hass', 'Sauber', 'Alpine'
];

const driversByTeam: Record<string, string[]> = {
  'RedBull': ['Verstappen 2025', 'Tsunoda 2025'],
  'Ferrari': ['Hamilton 2025', 'Leclerc 2025'],
  'Mclaren': ['Piastri 2025', 'Norris 2025'],
  'Mercedes': ['Antonelli 2025', 'Russell 2025'],
  'Williams': ['Albon 2025', 'Sainz 2025'],
  'Alpine': ['Gasly 2025', 'Colapinto 2025'],
  'RB': ['Hadjar 2025', 'Lawson 2025'],
  'Hass': ['Bearman 2025', 'Ocon 2025'],
  'Sauber': ['Hulk 2025', 'Bortoleto 2025'],
  'Aston Martin': ['Alonso 2025', 'Stroll 2025']
};

export default function WorkspacePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // API host configuration (points to FastAPI server on port 8000)
  const isLocal =
    typeof window !== "undefined" &&
    localStorage.getItem("backendMode") === "local";

  const apiHost = isLocal
    ? "http://localhost:8000"
    : "https://f1-steering-api.onrender.com";

  const wsHost = isLocal
    ? "ws://localhost:8000"
    : "wss://f1-steering-api.onrender.com";

  // Session states
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>("");
  const [totalFrames, setTotalFrames] = useState<number>(0);
  const [fps, setFps] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [videoWidth, setVideoWidth] = useState<number>(1920);
  const [videoHeight, setVideoHeight] = useState<number>(1080);
  const [backendMode, setBackendMode] = useState(() => {
  if (typeof window === "undefined") {
    return "cloud";
  }

  return localStorage.getItem("backendMode") || "cloud";
});
  
  // Selection ranges
  const [startFrameMin, setStartFrameMin] = useState<number>(0);
  const [startFrameMax, setStartFrameMax] = useState<number>(100);
  const [endFrameMin, setEndFrameMin] = useState<number>(900);
  const [endFrameMax, setEndFrameMax] = useState<number>(1000);

  const [startFrame, setStartFrame] = useState<number>(0);
  const [endFrame, setEndFrame] = useState<number>(0);
  const [startThumbnails, setStartThumbnails] = useState<Record<number, string>>({});
  const [endThumbnails, setEndThumbnails] = useState<Record<number, string>>({});
  
  // Crop previews
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [selectedDriver, setSelectedDriver] = useState<string>("");
  const [cropPreview, setCropPreview] = useState<string | null>(null);
  const [isLoadingCrop, setIsLoadingCrop] = useState<boolean>(false);

  // Settings
  const [postprocessingMode, setPostprocessingMode] = useState<string>("Default");

  // Telemetry Run WebSocket States
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisStage, setAnalysisStage] = useState<string>("Idle");
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [analysisMessage, setAnalysisMessage] = useState<string>("");
  const [logHistory, setLogHistory] = useState<string[]>([]);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Result metrics
  const [resultsData, setResultsData] = useState<any[] | null>(null);
  const [statistics, setStatistics] = useState<any | null>(null);
  const [analysisTime, setAnalysisTime] = useState<string>("");

  // Video playback states for graph playhead synchronization
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [hoveredTime, setHoveredTime] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Handle Video Upload or Demo Session
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    uploadFileToBackend(file);
  };

  const loadDemoSession = async () => {
    setIsUploading(true);
    setAnalysisError(null);
    try {
      const res = await fetch(`${apiHost}/api/upload?demo=true`, {
        method: "POST"
      });
      if (!res.ok) throw new Error("Failed to load demo video session");
      const data = await res.json();
      initializeSession(data);
    } catch (err: any) {
      setAnalysisError(err.message || "Failed to initialize demo session");
    } finally {
      setIsUploading(false);
    }
  };

  const uploadFileToBackend = async (file: File) => {
    setIsUploading(true);
    setAnalysisError(null);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${apiHost}/api/upload`, {
        method: "POST",
        body: formData
      });
      if (!res.ok) throw new Error("Failed to upload video to processing server");
      const data = await res.json();
      initializeSession(data);
    } catch (err: any) {
      setAnalysisError(err.message || "Failed to upload video");
    } finally {
      setIsUploading(false);
    }
  };

  const initializeSession = (data: any) => {
    setSessionId(data.session_id);
    setFilename(data.filename);
    setTotalFrames(data.total_frames);
    setFps(data.fps);
    setDuration(data.duration);
    setVideoWidth(data.width);
    setVideoHeight(data.height);

    setStartFrameMin(data.start_frame_min);
    setStartFrameMax(data.start_frame_max);
    setEndFrameMin(data.end_frame_min);
    setEndFrameMax(data.end_frame_max);

    setStartFrame(data.start_frame_min);
    setEndFrame(data.end_frame_max);

    // Map base64 thumbnail dicts
    setStartThumbnails(data.start_thumbnails);
    setEndThumbnails(data.end_thumbnails);

    // Default to Verstappen on RedBull for crop representation
    setSelectedTeam("RedBull");
    setSelectedDriver("Verstappen 2025");

    // Clear previous results
    setResultsData(null);
    setStatistics(null);
  };

  // Fetch crop preview on configuration change
  useEffect(() => {
    if (!sessionId || !selectedDriver) return;

    const fetchCropPreview = async () => {
      setIsLoadingCrop(true);
      try {
        const query = `session_id=${sessionId}&frame_number=${startFrame}&driver_crop_type=${encodeURIComponent(selectedDriver)}`;
        const res = await fetch(`${apiHost}/api/crop-preview?${query}`);
        if (!res.ok) throw new Error("Failed to generate crop preview");
        const data = await res.json();
        setCropPreview(data.crop_image);
      } catch (err) {
        console.error("Error loading crop preview:", err);
      } finally {
        setIsLoadingCrop(false);
      }
    };

    // Debounce preview loads slightly
    const timer = setTimeout(fetchCropPreview, 250);
    return () => clearTimeout(timer);
  }, [sessionId, selectedDriver, startFrame]);

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

  // Video synchronization effects
  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  // Handle user clicking on the chart to seek the video
  const handleChartClick = (e: any) => {
    if (e && e.activeLabel !== undefined && videoRef.current) {
      const clickTime = parseFloat(e.activeLabel);
      videoRef.current.currentTime = clickTime;
      setCurrentTime(clickTime);
    }
  };

  // Handle Export File Downloads
  const downloadCSV = () => {
    if (!resultsData) return;
    const headers = "frame_number,steering_angle,time\n";
    const rows = resultsData.map(r => `${r.frame_number},${r.steering_angle},${r.time}`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedDriver.replace(/\s+/g, '_')}_Steering_Telemetry.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadJSON = () => {
    if (!resultsData || !statistics) return;
    const output = {
      metadata: {
        filename,
        driver: selectedDriver,
        team: selectedTeam,
        frames_range: `${startFrame}-${endFrame}`,
        mode: postprocessingMode,
        timestamp: new Date().toISOString()
      },
      statistics,
      telemetry: resultsData
    };
    const blob = new Blob([JSON.stringify(output, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedDriver.replace(/\s+/g, '_')}_Steering_Telemetry.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-f1-black flex flex-col justify-between text-white select-none relative overflow-x-hidden">

    <div className="fixed top-4 right-4 z-50 flex gap-2">
      <button
        onClick={() => {
          localStorage.setItem("backendMode", "local");
          setBackendMode("local");
          window.location.reload();
        }}
        className="px-3 py-2 bg-green-600 rounded"
      >
        🟢 Local
      </button>

      <button
        onClick={() => {
          localStorage.setItem("backendMode", "cloud");
          setBackendMode("cloud");
          window.location.reload();
        }}
        className="px-3 py-2 bg-blue-600 rounded"
      >
        ☁ Cloud
      </button>
    </div>
    <div className="fixed top-16 right-4 z-50 bg-black border border-gray-700 px-3 py-1 rounded text-xs">
  Active Backend:
  <span className="font-bold ml-1">
    {backendMode === "local"
      ? "🟢 localhost:8000"
      : "☁ Render"}
  </span>
</div>
      {/* Top Navigation */}
      <header className="border-b border-f1-border bg-f1-black/90 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="hover:text-f1-red transition-colors mr-2">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="h-5 w-1.5 bg-f1-red skew-x-[-12deg]" />
            <div className="h-5 w-3 bg-f1-red skew-x-[-12deg]" />
            <div>
              <span className="font-black tracking-tighter text-lg uppercase text-white block">
                F1 STEERING ANGLE MODEL
              </span>
              <span className="text-[9px] tracking-widest text-f1-blue font-bold uppercase block mt-0.5">
                AI-Powered Telemetry Reconstruction
              </span>
            </div>
          </div>
        </div>

        {/* Selected Driver Banner */}
        {sessionId && (
          <div className="flex items-center gap-3 bg-f1-card/80 border border-f1-border px-4 py-1.5 rounded">
            <div className="h-2 w-2 rounded-full bg-f1-red animate-pulse" />
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Session Active:</span>
            <span className="text-xs font-bold tracking-tight text-white uppercase">{selectedDriver}</span>
            <span className="text-[10px] bg-f1-red/10 border border-f1-red/30 text-f1-red px-2 py-0.5 rounded font-black text-center">{selectedTeam}</span>
          </div>
        )}
      </header>

      {/* Main Workspace Frame */}
      <div className="flex-grow p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================= SIDEBAR: ANALYSIS WORKFLOW (lg:col-span-3) ================= */}
        <aside className="lg:col-span-3 space-y-6 flex flex-col h-full justify-between">
          <div className="bg-f1-card border border-f1-border p-5 rounded relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 bg-f1-red h-full" />
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-5 flex items-center gap-2">
              <Settings className="w-4 h-4 text-f1-red" /> Analysis Workflow
            </h3>

            {/* Workflow steps */}
            <div className="space-y-6">
              {/* Step 1: Upload */}
              <div className="flex items-start gap-3 relative">
                <div className={`h-6 w-6 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 ${sessionId ? 'border-f1-green bg-f1-green/10 text-f1-green' : 'border-gray-700 text-gray-400'}`}>
                  {sessionId ? <CheckCircle className="w-4 h-4 text-f1-green" /> : "1"}
                </div>
                <div className="text-xs">
                  <h4 className="font-bold uppercase tracking-wide">1. Upload Video</h4>
                  <p className="text-gray-500 text-[10px] mt-0.5 truncate max-w-[180px]">
                    {sessionId ? filename : "No session loaded"}
                  </p>
                </div>
              </div>

              {/* Step 2: Frame selection */}
              <div className="flex items-start gap-3 relative">
                <div className={`h-6 w-6 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 ${sessionId ? 'border-f1-green bg-f1-green/10 text-f1-green' : 'border-gray-800 text-gray-600'}`}>
                  {sessionId ? <CheckCircle className="w-4 h-4 text-f1-green" /> : "2"}
                </div>
                <div className="text-xs">
                  <h4 className={`font-bold uppercase tracking-wide ${sessionId ? 'text-white' : 'text-gray-600'}`}>2. Select Frames</h4>
                  <p className="text-gray-500 text-[10px] mt-0.5">
                    {sessionId ? `Range: ${startFrame} – ${endFrame}` : "Awaiting video ingestion"}
                  </p>
                </div>
              </div>

              {/* Step 3: Driver Selection */}
              <div className="flex items-start gap-3 relative">
                <div className={`h-6 w-6 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 ${sessionId ? 'border-f1-green bg-f1-green/10 text-f1-green' : 'border-gray-800 text-gray-600'}`}>
                  {sessionId ? <CheckCircle className="w-4 h-4 text-f1-green" /> : "3"}
                </div>
                <div className="text-xs">
                  <h4 className={`font-bold uppercase tracking-wide ${sessionId ? 'text-white' : 'text-gray-600'}`}>3. Driver Profile</h4>
                  <p className="text-gray-500 text-[10px] mt-0.5">
                    {sessionId ? selectedDriver : "Awaiting configuration"}
                  </p>
                </div>
              </div>

              {/* Step 4: Postprocessing */}
              <div className="flex items-start gap-3 relative">
                <div className={`h-6 w-6 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 ${sessionId ? 'border-f1-green bg-f1-green/10 text-f1-green' : 'border-gray-800 text-gray-600'}`}>
                  {sessionId ? <CheckCircle className="w-4 h-4 text-f1-green" /> : "4"}
                </div>
                <div className="text-xs">
                  <h4 className={`font-bold uppercase tracking-wide ${sessionId ? 'text-white' : 'text-gray-600'}`}>4. Postprocessing</h4>
                  <p className="text-gray-500 text-[10px] mt-0.5">
                    {sessionId ? `${postprocessingMode} Mode` : "Awaiting settings"}
                  </p>
                </div>
              </div>

              {/* Step 5: Analyze */}
              <div className="flex items-start gap-3 relative">
                <div className={`h-6 w-6 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 ${resultsData ? 'border-f1-green bg-f1-green/10 text-f1-green' : isAnalyzing ? 'border-f1-red bg-f1-red/10 text-f1-red animate-pulse' : 'border-gray-800 text-gray-600'}`}>
                  {resultsData ? <CheckCircle className="w-4 h-4 text-f1-green" /> : "5"}
                </div>
                <div className="text-xs">
                  <h4 className={`font-bold uppercase tracking-wide ${sessionId ? 'text-white' : 'text-gray-600'}`}>5. Analyze</h4>
                  <p className="text-gray-500 text-[10px] mt-0.5">
                    {resultsData ? "Completed" : isAnalyzing ? "Processing..." : "Ready to process"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Session Info Details */}
          {sessionId && (
            <div className="bg-f1-card border border-f1-border p-5 rounded">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                <Database className="w-4 h-4 text-f1-blue" /> Session Info
              </h3>
              <div className="space-y-3.5 text-xs">
                <div className="flex justify-between items-center border-b border-f1-border/40 pb-2">
                  <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Video Duration</span>
                  <span className="font-semibold text-white tracking-tight">{duration} sec</span>
                </div>
                <div className="flex justify-between items-center border-b border-f1-border/40 pb-2">
                  <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">FPS (Original)</span>
                  <span className="font-semibold text-white tracking-tight">{fps}</span>
                </div>
                <div className="flex justify-between items-center border-b border-f1-border/40 pb-2">
                  <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Frames Selected</span>
                  <span className="font-semibold text-white tracking-tight">{endFrame - startFrame + 1}</span>
                </div>
                <div className="flex justify-between items-center border-b border-f1-border/40 pb-2">
                  <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Resolution</span>
                  <span className="font-semibold text-white tracking-tight">{videoWidth} x {videoHeight}</span>
                </div>
                <div className="flex justify-between items-center border-b border-f1-border/40 pb-2">
                  <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Model Version</span>
                  <span className="font-semibold text-f1-blue tracking-tight">best-224.onnx</span>
                </div>
                {resultsData && (
                  <div className="flex justify-between items-center border-b border-f1-border/40 pb-2">
                    <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Analysis Time</span>
                    <span className="font-semibold text-f1-green tracking-tight">{analysisTime}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </aside>

        {/* ================= CENTRAL VIEWPORT (lg:col-span-6) ================= */}
        <main className="lg:col-span-6 space-y-6">
          {/* A. If no session loaded: Ingestion Console */}
          {!sessionId ? (
            <div className="bg-f1-card border border-f1-border p-10 rounded text-center flex flex-col items-center justify-center min-h-[500px] relative">
              <div className="h-16 w-16 bg-f1-red/10 border border-f1-red/20 rounded-full flex items-center justify-center text-f1-red mb-6">
                <Upload className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black uppercase tracking-wider text-white mb-2">Ingest Racing Session</h2>
              <p className="text-gray-400 text-sm max-w-md mx-auto mb-8">
                Upload cockpit footage or load the demo session to reconstruct high-fidelity steering telemetry profiles.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 w-full justify-center max-w-sm">
                <button
                  onClick={loadDemoSession}
                  disabled={isUploading}
                  className="px-6 py-3 bg-f1-card hover:bg-f1-gray border border-f1-border hover:border-gray-500 font-bold uppercase tracking-widest text-xs rounded transition-all duration-300 flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-f1-blue" /> Initializing...
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4 text-f1-blue" /> Load Demo Session
                    </>
                  )}
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-6 py-3 bg-f1-red hover:bg-red-700 text-white font-bold uppercase tracking-widest text-xs rounded transition-all duration-300 shadow-lg shadow-f1-red/10 flex items-center justify-center gap-2 border-b-4 border-red-800"
                >
                  <Upload className="w-4 h-4" /> Upload Onboard MP4
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              {analysisError && (
                <div className="mt-6 p-4 rounded bg-red-950/40 border border-red-800/40 text-red-400 text-xs flex items-center gap-2.5 max-w-sm">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span>{analysisError}</span>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* B. Session Summary Header (Dashboard style) */}
              <div className="grid grid-cols-5 gap-4 bg-f1-card border border-f1-border p-4 rounded relative">
                <div className="text-center border-r border-f1-border/40">
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Driver</span>
                  <span className="text-xs font-bold block truncate uppercase text-white">{selectedDriver.split(" ")[0]}</span>
                  <span className="text-[9px] text-gray-400 block">{selectedTeam}</span>
                </div>
                <div className="text-center border-r border-f1-border/40">
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Track</span>
                  <span className="text-xs font-bold block truncate uppercase text-white">Unknown Track</span>
                  <span className="text-[9px] text-gray-400 block">GPS Out</span>
                </div>
                <div className="text-center border-r border-f1-border/40">
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Session</span>
                  <span className="text-xs font-bold block truncate uppercase text-white">Custom Analysis</span>
                  <span className="text-[9px] text-gray-400 block">Onboard Video</span>
                </div>
                <div className="text-center border-r border-f1-border/40">
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Date</span>
                  <span className="text-xs font-bold block truncate uppercase text-white">{new Date().toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}</span>
                  <span className="text-[9px] text-gray-400 block">Local Capture</span>
                </div>
                <div className="text-center">
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Model</span>
                  <span className="text-xs font-bold block truncate uppercase text-f1-blue">F1 Steering Angle</span>
                  <span className="text-[9px] text-gray-400 block">v2.1 (best-224)</span>
                </div>
              </div>

              {/* C. Graph Panel / Loader Overlay */}
              <div className="bg-f1-card border border-f1-border p-5 rounded relative min-h-[360px] flex flex-col justify-between overflow-hidden">
                <AnimatePresence mode="wait">
                  {/* Processing / Analyzing Screen */}
                  {isAnalyzing && (
                    <motion.div
                      key="analyzing"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-f1-black/95 flex flex-col items-center justify-center p-6 z-30"
                    >
                      <div className="w-full max-w-md space-y-6">
                        <div className="flex items-center justify-between border-b border-f1-border pb-3">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 bg-f1-red rounded-full animate-ping" />
                            <span className="text-xs font-black uppercase tracking-widest text-f1-red">SYSTEM PROCESSING ENGINE</span>
                          </div>
                          <span className="text-xs font-bold text-f1-blue tracking-tight">{analysisProgress}%</span>
                        </div>

                        {/* Dial Indicator */}
                        <div className="flex justify-center py-4 relative">
                          <div className="relative h-28 w-28 rounded-full border-4 border-f1-gray-light flex items-center justify-center">
                            {/* Inner Spin */}
                            <motion.div 
                              animate={{ rotate: 360 }}
                              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                              className="absolute inset-0 border-t-4 border-f1-red rounded-full pointer-events-none"
                            />
                            <div className="text-center">
                              <span className="text-3xl font-black tracking-tighter text-white">{analysisProgress}%</span>
                              <span className="text-[9px] text-gray-500 uppercase font-black block tracking-widest mt-1">INFERENCE</span>
                            </div>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="h-1.5 w-full bg-f1-gray-light rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-f1-red"
                            initial={{ width: "0%" }}
                            animate={{ width: `${analysisProgress}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>

                        {/* Logs console */}
                        <div className="bg-black/90 p-4 border border-f1-border font-mono text-[9px] text-f1-green h-28 overflow-y-auto f1-scrollbar rounded flex flex-col gap-1.5">
                          {logHistory.map((log, i) => (
                            <div key={i} className="leading-relaxed">
                              {log}
                            </div>
                          ))}
                          <div className="h-1 w-1 bg-f1-green animate-pulse" />
                        </div>

                        <div className="text-center">
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">{analysisStage}</h4>
                          <p className="text-[10px] text-gray-500 mt-1">{analysisMessage}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Standard results state */}
                  {!resultsData ? (
                    <div key="empty-state" className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                      <div className="h-12 w-12 rounded-full border border-f1-border flex items-center justify-center text-gray-500">
                        <Activity className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold uppercase tracking-wider">Awaiting Telemetry Run</h4>
                        <p className="text-xs text-gray-500 max-w-sm mt-1">
                          Configure your range options, select a driver profile, and click "Process Video Segment" to generate calculations.
                        </p>
                      </div>
                      <button
                        onClick={triggerAnalysis}
                        className="px-6 py-2.5 bg-f1-red hover:bg-red-700 text-white font-bold uppercase tracking-widest text-xs rounded transition-all duration-300 border-b-2 border-red-800"
                      >
                        Process Video Segment
                      </button>
                    </div>
                  ) : (
                    /* High fidelity Recharts chart */
                    <motion.div
                      key="chart"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-4 w-full h-full flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-white">Steering Angle Over Time</span>
                        <div className="flex items-center gap-4 text-[10px]">
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-6 bg-white" />
                            <span className="text-gray-400 font-bold uppercase tracking-wide">Steering Angle</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="h-3 w-6 bg-gray-500/10 border border-dashed border-gray-700" />
                            <span className="text-gray-400 font-bold uppercase tracking-wide">Straight Zone (-10° to 10°)</span>
                          </div>
                        </div>
                      </div>

                      <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={resultsData}
                            onClick={handleChartClick}
                            onMouseMove={(e: any) => {
                              if (e && e.activePayload) {
                                setHoveredTime(e.activePayload[0].payload.time);
                              }
                            }}
                            onMouseLeave={() => setHoveredTime(null)}
                            margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                            <XAxis
                              dataKey="time"
                              stroke="#555"
                              fontSize={10}
                              tickFormatter={(tick) => `${parseFloat(tick).toFixed(1)}s`}
                            />
                            <YAxis
                              domain={[-180, 180]}
                              ticks={[-180, -90, 0, 90, 180]}
                              stroke="#555"
                              fontSize={10}
                            />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const item = payload[0].payload;
                                  return (
                                    <div className="bg-f1-card border border-f1-border p-2.5 rounded shadow-xl text-[10px]">
                                      <p className="font-bold text-gray-500 uppercase tracking-wider mb-1">Time: {item.time.toFixed(3)}s</p>
                                      <p className="font-black text-white">Angle: <span className="text-f1-red">{item.steering_angle.toFixed(2)}°</span></p>
                                      <p className="text-gray-400 mt-0.5">Frame: {item.frame_number}</p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            
                            {/* Horizontal Reference Lines */}
                            <ReferenceLine y={0} stroke="rgba(225, 6, 0, 0.4)" strokeWidth={1.5} label={{ value: "0°", fill: "rgba(225, 6, 0, 0.4)", fontSize: 9, position: "right" }} />
                            <ReferenceLine y={90} stroke="rgba(225, 6, 0, 0.2)" strokeDasharray="4 4" label={{ value: "90° R", fill: "rgba(225, 6, 0, 0.2)", fontSize: 9, position: "right" }} />
                            <ReferenceLine y={-90} stroke="rgba(225, 6, 0, 0.2)" strokeDasharray="4 4" label={{ value: "-90° L", fill: "rgba(225, 6, 0, 0.2)", fontSize: 9, position: "right" }} />

                            {/* Reference area for Straight Range */}
                            {/* We can construct this in Recharts using ReferenceLine at -10 and 10 or shading. Alternatively, draw reference lines */}
                            <ReferenceLine y={10} stroke="rgba(255,255,255,0.05)" strokeDasharray="2 2" />
                            <ReferenceLine y={-10} stroke="rgba(255,255,255,0.05)" strokeDasharray="2 2" />

                            {/* Main Line */}
                            <Line
                              type="monotone"
                              dataKey="steering_angle"
                              stroke="#ffffff"
                              strokeWidth={1.2}
                              dot={false}
                              activeDot={{ r: 4, fill: "#E10600", stroke: "#fff" }}
                            />

                            {/* Moving playhead line */}
                            <ReferenceLine x={currentTime} stroke="#00D2FF" strokeWidth={1.5} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* D. Bottom Section: Video Onboard Player & Frame Selector Timeline */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-f1-card border border-f1-border p-5 rounded">
                
                {/* 1. Onboard Preview player */}
                <div className="flex flex-col justify-between h-full">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                    <FileVideo className="w-4 h-4 text-f1-red" /> Onboard Preview
                  </h4>
                  <div className="bg-black aspect-video rounded border border-f1-border flex items-center justify-center relative group overflow-hidden">
                    {/* Native Video */}
                    {sessionId && (
                      <video
                        ref={videoRef}
                        src={`${apiHost}/api/video?session_id=${sessionId}`}
                        className="w-full h-full object-cover"
                        onTimeUpdate={handleTimeUpdate}
                        onEnded={() => setIsPlaying(false)}
                        muted
                      />
                    )}
                    
                    {/* Dummy/Mock representation if local video fails to display directly */}
                    {!sessionId ? (
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">No video session loaded</span>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button
                          onClick={handlePlayPause}
                          className="h-12 w-12 rounded-full bg-f1-red/90 hover:bg-f1-red text-white flex items-center justify-center shadow-lg transition-transform duration-200 transform hover:scale-105"
                        >
                          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
                        </button>
                        <span className="text-[9px] text-white uppercase tracking-widest font-black mt-3 bg-black/80 px-2 py-0.5 rounded border border-f1-border">
                          {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Range Timeline Selectors */}
                <div className="flex flex-col justify-between h-full">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-f1-blue" /> Frame Selection
                  </h4>
                  
                  {/* Slider controls */}
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">
                        <span>Start Frame: {startFrame}</span>
                        <span>End Frame: {endFrame}</span>
                      </div>
                      
                      <div className="space-y-2">
                        {/* Start Frame Slider */}
                        <div className="flex items-center gap-2.5">
                          <span className="text-[9px] text-gray-500 font-bold w-12">Start:</span>
                          <input
                            type="range"
                            min={startFrameMin}
                            max={startFrameMax}
                            value={startFrame}
                            onChange={(e) => setStartFrame(parseInt(e.target.value))}
                            className="flex-grow accent-f1-red h-1 bg-f1-gray rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                        {/* End Frame Slider */}
                        <div className="flex items-center gap-2.5">
                          <span className="text-[9px] text-gray-500 font-bold w-12">End:</span>
                          <input
                            type="range"
                            min={endFrameMin}
                            max={endFrameMax}
                            value={endFrame}
                            onChange={(e) => setEndFrame(parseInt(e.target.value))}
                            className="flex-grow accent-f1-red h-1 bg-f1-gray rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Previews: Start / End Thumbnail Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Start frame crop/preview */}
                      <div className="text-center">
                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wide block mb-1">Start Preview</span>
                        <div className="bg-black/95 aspect-video rounded border border-f1-border flex items-center justify-center overflow-hidden">
                          {startThumbnails[startFrame] ? (
                            <img src={startThumbnails[startFrame]} alt="Start frame" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[8px] text-gray-600 block uppercase">No preview</span>
                          )}
                        </div>
                      </div>

                      {/* End frame crop/preview */}
                      <div className="text-center">
                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wide block mb-1">End Preview</span>
                        <div className="bg-black/95 aspect-video rounded border border-f1-border flex items-center justify-center overflow-hidden">
                          {endThumbnails[endFrame] ? (
                            <img src={endThumbnails[endFrame]} alt="End frame" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[8px] text-gray-600 block uppercase">No preview</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </>
          )}
        </main>

        {/* ================= RIGHT METRICS & EXPORTS (lg:col-span-3) ================= */}
        <aside className="lg:col-span-3 space-y-6">
          
          {/* Driver profile calibration card */}
          {sessionId && (
            <div className="bg-f1-card border border-f1-border p-5 rounded relative">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-f1-red" /> Driver Profile
              </h3>
              
              <div className="space-y-4">
                {/* Team select */}
                <div className="space-y-1">
                  <label className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Select Team</label>
                  <select
                    value={selectedTeam}
                    onChange={(e) => {
                      const t = e.target.value;
                      setSelectedTeam(t);
                      setSelectedDriver(driversByTeam[t][0]);
                    }}
                    className="w-full bg-f1-gray border border-f1-border p-2 rounded text-xs text-white focus:outline-none focus:border-f1-red font-semibold uppercase"
                  >
                    {teams.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Driver select */}
                <div className="space-y-1">
                  <label className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Select Driver</label>
                  <select
                    value={selectedDriver}
                    onChange={(e) => setSelectedDriver(e.target.value)}
                    className="w-full bg-f1-gray border border-f1-border p-2 rounded text-xs text-white focus:outline-none focus:border-f1-red font-semibold uppercase"
                  >
                    {selectedTeam && driversByTeam[selectedTeam]?.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Crop preview box */}
                <div className="space-y-1">
                  <label className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Steering Crop Bounds</label>
                  <div className="bg-black/95 aspect-square border border-f1-border rounded flex items-center justify-center relative overflow-hidden">
                    {isLoadingCrop ? (
                      <RefreshCw className="w-6 h-6 animate-spin text-f1-blue" />
                    ) : cropPreview ? (
                      <img src={cropPreview} alt="Driver Crop" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[9px] text-gray-600 font-black uppercase tracking-wider">Processing bounds</span>
                    )}
                  </div>
                  <span className="text-[8px] text-gray-500 text-center block mt-1">
                    Auto-cropped via YOLOv8 helmet segmenter overlay.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Postprocessing configs */}
          {sessionId && (
            <div className="bg-f1-card border border-f1-border p-5 rounded">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                <Settings className="w-4 h-4 text-f1-blue" /> Calibration Mode
              </h3>
              
              <div className="flex flex-col gap-2.5 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    value="Default"
                    checked={postprocessingMode === "Default"}
                    onChange={() => setPostprocessingMode("Default")}
                    className="accent-f1-red"
                  />
                  <span className="font-semibold">Default Mode (Best for 90%)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    value="Low ilumination"
                    checked={postprocessingMode === "Low ilumination"}
                    onChange={() => setPostprocessingMode("Low ilumination")}
                    className="accent-f1-red"
                  />
                  <span className="font-semibold">Low Illumination Mode</span>
                </label>
              </div>
            </div>
          )}

          {/* Steering statistics (Center right) */}
          {resultsData && statistics && (
            <div className="bg-f1-card border border-f1-border p-5 rounded relative overflow-hidden">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-5 flex items-center gap-2">
                <Activity className="w-4 h-4 text-f1-red" /> Steering Statistics
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-f1-border/40 pb-2">
                  <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Mean Angle</span>
                  <span className={`text-xl font-black ${statistics.mean_angle >= 0 ? 'text-white' : 'text-f1-blue'}`}>
                    {statistics.mean_angle}°
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-f1-border/40 pb-2">
                  <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Max Right Turn</span>
                  <span className="text-xl font-black text-f1-green">
                    {statistics.max_right}°
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-f1-border/40 pb-2">
                  <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Max Left Turn</span>
                  <span className="text-xl font-black text-f1-red">
                    {statistics.max_left}°
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-f1-border/40 pb-2">
                  <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Avg. Change Rate</span>
                  <span className="text-xl font-black text-white">
                    {statistics.avg_change_rate}°/frame
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Export tools (Bottom right) */}
          {resultsData && (
            <div className="bg-f1-card border border-f1-border p-5 rounded space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 border-b border-f1-border/40 pb-2 flex items-center gap-2">
                <Download className="w-4 h-4 text-f1-green" /> Export & Download
              </h3>

              <div className="space-y-2.5">
                <button
                  onClick={downloadCSV}
                  className="w-full py-2 px-3 bg-f1-gray hover:bg-f1-gray-light border border-f1-border hover:border-gray-500 rounded text-left text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-between"
                >
                  <span>Download CSV</span>
                  <Download className="w-3.5 h-3.5 text-f1-blue" />
                </button>

                <button
                  onClick={downloadJSON}
                  className="w-full py-2 px-3 bg-f1-gray hover:bg-f1-gray-light border border-f1-border hover:border-gray-500 rounded text-left text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-between"
                >
                  <span>Download JSON</span>
                  <Download className="w-3.5 h-3.5 text-f1-blue" />
                </button>

                <button
                  onClick={() => window.print()}
                  className="w-full py-2 px-3 bg-f1-gray hover:bg-f1-gray-light border border-f1-border hover:border-gray-500 rounded text-left text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-between"
                >
                  <span>Download Report (PDF)</span>
                  <Download className="w-3.5 h-3.5 text-f1-blue" />
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Footer */}
      <footer className="border-t border-f1-border bg-f1-black/95 py-4 px-6 text-center text-[10px] text-gray-600 flex justify-between items-center">
        <span>© 2026 F1 Steering Angle Model. Built for engineering teams and telemetry enthusiasts.</span>
        <span>Built with Next.js & FastAPI WebSocket Engine</span>
      </footer>
    </div>
  );
}
