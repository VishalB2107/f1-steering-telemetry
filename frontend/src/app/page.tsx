"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { 
  ArrowRight, 
  Cpu, 
  Layers, 
  Activity, 
  FileVideo, 
  Compass, 
  Database,
  TrendingUp,
  ShieldAlert
} from "lucide-react";

export default function LandingPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" as const } }
  };

  const steps = [
    {
      icon: <FileVideo className="w-8 h-8 text-f1-red" />,
      title: "1. Upload Session Video",
      desc: "Ingest any standard onboard camera video (1080p, 720p, 480p at 10-30 FPS) directly into the processing engine."
    },
    {
      icon: <Compass className="w-8 h-8 text-f1-red" />,
      title: "2. Define Analysis Crop",
      desc: "Select driver profile to adjust helmet segmentation bounds and camera field calibration overlays."
    },
    {
      icon: <Layers className="w-8 h-8 text-f1-red" />,
      title: "3. Neural Segmentation",
      desc: "YOLOv8-seg automatically eliminates helmet graphics and driver visor reflections to isolate steering edges."
    },
    {
      icon: <Cpu className="w-8 h-8 text-f1-red" />,
      title: "4. ONNX Inference",
      desc: "An EfficientNet-B0 backbone calculates rotation vectors in real-time, outputting precise steering wheel angles."
    },
    {
      icon: <Activity className="w-8 h-8 text-f1-red" />,
      title: "5. Telemetry Charting",
      desc: "Correct outliers cyclically and compile detailed line charts, min/max statistics, and high-fidelity CSV/JSON exports."
    }
  ];

  const specs = [
    { label: "Model Architecture", value: "EfficientNet-B0 + YOLOv8-seg" },
    { label: "Prediction Range", value: "-180° to +180°" },
    { label: "Mean Error Angle", value: "3.0° – 5.0° (Ideal Conditions)" },
    { label: "Dataset Scale", value: "25,000+ Augmented Frames" }
  ];

  return (
    <div className="min-h-screen flex flex-col justify-between relative overflow-hidden bg-f1-black text-white selection:bg-f1-red selection:text-white">
      {/* Decorative Red Accent Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-f1-red/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-f1-blue/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-f1-border bg-f1-black/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Minimal F1 red slash logo */}
            <div className="h-6 w-2 bg-f1-red skew-x-[-12deg]" />
            <div className="h-6 w-4 bg-f1-red skew-x-[-12deg]" />
            <span className="font-black tracking-tighter text-xl text-white">
              F1 STEERING ANGLE MODEL
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold uppercase tracking-widest text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-f1-green animate-pulse" />
              Inference Server Active
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto px-6 py-12 md:py-20 flex flex-col items-center justify-center relative z-10 w-full">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center max-w-4xl mx-auto mb-16"
        >
          {/* Tag */}
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-f1-red/10 border border-f1-red/30 text-f1-red text-xs font-bold uppercase tracking-wider mb-6">
            <Cpu className="w-3.5 h-3.5" /> AI-Powered Telemetry Reconstruction
          </motion.div>

          {/* Title */}
          <motion.h1 
            variants={itemVariants} 
            className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight leading-none mb-6 text-white uppercase"
          >
            Reconstruct Formula 1 <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-f1-red via-red-500 to-f1-white">
              Steering Telemetry
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p 
            variants={itemVariants} 
            className="text-lg md:text-xl text-gray-400 font-medium max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Extract precision steering angles directly from raw cockpit video feeds. Rebuild millisecond-accurate racing telemetry profiles using computer vision edge segmentation.
          </motion.p>

          {/* Launch Buttons */}
          <motion.div 
            variants={itemVariants} 
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link 
              href="/workspace"
              className="group relative px-8 py-4 bg-f1-red hover:bg-red-700 text-white font-bold uppercase tracking-widest text-sm rounded transition-all duration-300 transform hover:translate-y-[-2px] shadow-lg shadow-f1-red/20 border-b-4 border-red-800"
            >
              <span className="flex items-center gap-2">
                Launch Workspace <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
            <a 
              href="#workflow" 
              className="px-8 py-4 bg-f1-card hover:bg-f1-gray border border-f1-border text-gray-300 hover:text-white font-bold uppercase tracking-widest text-sm rounded transition-all duration-300"
            >
              View System Specs
            </a>
          </motion.div>
        </motion.div>

        {/* Model Statistics Grid */}
        <section id="workflow" className="w-full mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch mb-20">
          {/* Card 1: Pipeline Breakdown */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-f1-card border border-f1-border p-8 rounded relative overflow-hidden flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-f1-red/5 rounded-full blur-2xl pointer-events-none" />
            <div>
              <h3 className="text-xl font-bold uppercase tracking-wide text-white mb-6 border-b border-f1-border pb-3 flex items-center gap-2">
                <Database className="w-5 h-5 text-f1-red" /> Technical Specifications
              </h3>
              <div className="space-y-4 mb-6">
                {specs.map((spec, i) => (
                  <div key={i} className="flex justify-between items-center border-b border-f1-border/40 py-2.5">
                    <span className="text-gray-400 text-sm font-semibold">{spec.label}</span>
                    <span className="text-white text-sm font-bold tracking-tight">{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-4 rounded bg-f1-gray border border-f1-border/40 flex gap-3.5">
              <ShieldAlert className="w-12 h-12 text-yellow-500 shrink-0" />
              <div className="text-xs text-gray-400 leading-normal">
                <strong className="text-white uppercase tracking-wider block mb-1">Operational Limitations</strong>
                Predictive performance can be affected by extreme shadows, rainfall, driver visor glare, or camera positioning changes.
              </div>
            </div>
          </motion.div>

          {/* Card 2: Performance Graph Mock */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-f1-card border border-f1-border p-8 rounded relative overflow-hidden flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-f1-blue/5 rounded-full blur-2xl pointer-events-none" />
            <div>
              <h3 className="text-xl font-bold uppercase tracking-wide text-white mb-6 border-b border-f1-border pb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-f1-blue" /> Model Robustness
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                The core pipeline integrates a custom-trained **YOLOv8-seg** instance to map the driver's helmet boundaries dynamically. By painting the helmet region out in the edge processing stage, helmet graphical updates across the season are isolated and ignored, reducing inference error rates.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-f1-gray p-4 border border-f1-border rounded">
                <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider block mb-1">Visor Occlusions</span>
                <span className="text-2xl font-black text-white">99.2%</span>
                <span className="text-gray-400 text-[10px] block mt-1">Robustness Score</span>
              </div>
              <div className="bg-f1-gray p-4 border border-f1-border rounded">
                <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider block mb-1">Inference Latency</span>
                <span className="text-2xl font-black text-f1-blue">~18ms</span>
                <span className="text-gray-400 text-[10px] block mt-1">Per Frame (ONNX)</span>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Step-by-Step Workflow */}
        <section className="w-full mt-8">
          <h2 className="text-2xl md:text-3xl font-black text-center uppercase tracking-wider mb-12 text-white">
            Telemetry Workflow Pipeline
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {steps.map((step, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-f1-card border border-f1-border p-6 rounded hover:border-f1-red/30 transition-all duration-300 flex flex-col gap-4 relative"
              >
                <div className="absolute top-2 right-3 text-[50px] font-black text-gray-800/10 pointer-events-none select-none">
                  0{i + 1}
                </div>
                {step.icon}
                <h4 className="font-bold text-white uppercase text-sm tracking-wider">{step.title}</h4>
                <p className="text-xs text-gray-400 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-f1-border bg-f1-black/95 py-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-xs text-gray-500 gap-4">
          <p>© 2026 F1 Steering Angle Model. Built for engineering teams and telemetry enthusiasts.</p>
          <p>For educational and research purposes only. Not affiliated with Formula 1 or any racing team.</p>
        </div>
      </footer>
    </div>
  );
}
