
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { analyzeObject } from '../services/geminiService';
import { ObjectAnalysis, HistoryEntry } from '../types';
import { 
  Loader2, 
  History as HistoryIcon, 
  Sparkles, 
  Tag, 
  Lightbulb,
  Clock,
  Box,
  Trash2,
  X,
  Target,
  Pause,
  Play,
  Scan,
  Eye,
  Activity,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

const VisionPro: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScanTimeRef = useRef<number>(0);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAutoScan, setIsAutoScan] = useState(true);
  const [currentAnalysis, setCurrentAnalysis] = useState<ObjectAnalysis | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const [boxStyles, setBoxStyles] = useState<React.CSSProperties | null>(null);

  const setupCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
              facingMode: 'environment',
              width: { ideal: 1920 },
              height: { ideal: 1080 }
          } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraReady(true);
      }
    } catch (err) {
      setError("Camera access denied. Please enable camera permissions.");
    }
  }, []);

  useEffect(() => {
    setupCamera();
  }, [setupCamera]);

  const calculateBoxStyles = useCallback((box: [number, number, number, number]) => {
    if (!videoRef.current || !containerRef.current) return null;

    const [ymin, xmin, ymax, xmax] = box;
    const video = videoRef.current;
    const container = containerRef.current;

    const containerRect = container.getBoundingClientRect();
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    if (videoWidth === 0 || videoHeight === 0) return null;

    const containerAspect = containerRect.width / containerRect.height;
    const videoAspect = videoWidth / videoHeight;

    let scale, offsetX = 0, offsetY = 0;

    if (containerAspect > videoAspect) {
      scale = containerRect.width / videoWidth;
      offsetY = (containerRect.height - videoHeight * scale) / 2;
    } else {
      scale = containerRect.height / videoHeight;
      offsetX = (containerRect.width - videoWidth * scale) / 2;
    }

    const left = (xmin / 1000) * videoWidth * scale + offsetX;
    const top = (ymin / 1000) * videoHeight * scale + offsetY;
    const width = ((xmax - xmin) / 1000) * videoWidth * scale;
    const height = ((ymax - ymin) / 1000) * videoHeight * scale;

    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
    };
  }, []);

  useEffect(() => {
    if (currentAnalysis?.boundingBox) {
      const styles = calculateBoxStyles(currentAnalysis.boundingBox);
      setBoxStyles(styles);
    } else {
      setBoxStyles(null);
    }
  }, [currentAnalysis, calculateBoxStyles]);

  const handleCapture = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;

    const now = Date.now();
    if (now - lastScanTimeRef.current < 1000) return;
    lastScanTimeRef.current = now;

    setIsAnalyzing(true);
    setError(null);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (context && video.videoWidth > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL('image/jpeg', 0.5);

      try {
        const result = await analyzeObject(imageData);
        if (result.analysis) {
          setCurrentAnalysis(result.analysis);
          setIsMinimized(false); // Pop open on new detection
          
          const newEntry: HistoryEntry = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date(),
            analysis: result.analysis,
            image: imageData
          };
          
          setHistory(prev => [newEntry, ...prev.slice(0, 9)]);
        }
      } catch (err) {
        console.error("Tracking update failed:", err);
      } finally {
        setIsAnalyzing(false);
      }
    } else {
        setIsAnalyzing(false);
    }
  }, [isAnalyzing]);

  useEffect(() => {
    let animationFrameId: number;
    const runScan = async () => {
      if (isAutoScan && isCameraReady && !isAnalyzing) {
        await handleCapture();
      }
      animationFrameId = window.requestAnimationFrame(() => {
        setTimeout(runScan, 1800); 
      });
    };

    if (isAutoScan && isCameraReady) {
      runScan();
    }

    return () => {
      if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
    };
  }, [isAutoScan, isCameraReady, isAnalyzing, handleCapture]);

  const clearHistory = () => setHistory([]);

  return (
    <div className="relative w-full h-screen bg-black text-[#f0f0f0] overflow-hidden font-sans" ref={containerRef}>
      
      {/* Full Screen Camera Feed */}
      <div className="absolute inset-0 z-0">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/20 pointer-events-none" />
      </div>

      {/* AR HUD Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        
        {/* Dynamic Tracking Box */}
        {boxStyles && currentAnalysis && (
          <div 
            style={boxStyles}
            className="absolute border-2 border-cyan-400/60 rounded-xl shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all duration-1000 ease-in-out pointer-events-none"
          >
             {/* Box Label HUD */}
             <div className="absolute -top-10 left-0 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="bg-cyan-500/80 backdrop-blur-sm text-black text-[9px] font-black px-2.5 py-1 rounded shadow-lg flex items-center gap-1.5 uppercase tracking-tighter whitespace-nowrap">
                   <Target className="w-2.5 h-2.5" /> {currentAnalysis.name}
                </div>
             </div>
             
             {/* Corner brackets */}
             <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-cyan-400 rounded-tl-md" />
             <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-cyan-400 rounded-tr-md" />
             <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-cyan-400 rounded-bl-md" />
             <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-cyan-400 rounded-br-md" />
          </div>
        )}

        {/* Global State UI */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center gap-4">
            {isAnalyzing && (
              <div className="flex flex-col items-center gap-2 bg-black/40 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/5 shadow-xl">
                <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-cyan-400/80">Recalibrating</span>
              </div>
            )}
        </div>

        {/* Compact Floating Data Card (Repositioned to bottom-right) */}
        {currentAnalysis && (
          <div className={`absolute bottom-6 right-6 w-72 transition-all duration-500 ease-in-out pointer-events-auto z-30 ${isMinimized ? 'translate-x-[calc(100%-40px)]' : ''}`}>
            <div className="bg-black/60 backdrop-blur-3xl border border-white/10 p-5 rounded-[1.5rem] shadow-2xl relative overflow-hidden">
               {/* Toggle Button */}
               <button 
                onClick={() => setIsMinimized(!isMinimized)}
                className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center hover:bg-white/5 transition-colors border-r border-white/5"
               >
                 {isMinimized ? <ChevronLeft className="w-4 h-4 text-cyan-400" /> : <ChevronRight className="w-4 h-4 text-white/40" />}
               </button>

               <div className={`transition-opacity duration-300 ${isMinimized ? 'opacity-0 pointer-events-none' : 'opacity-100 ml-6'}`}>
                  <button 
                    onClick={() => { setCurrentAnalysis(null); setBoxStyles(null); }}
                    className="absolute -top-1 -right-1 p-2 hover:bg-white/10 rounded-full transition-colors text-white/20 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="mb-3">
                    <div className="flex items-center gap-1.5 text-cyan-400 font-black text-[8px] uppercase tracking-widest mb-1">
                      <Sparkles className="w-2.5 h-2.5" /> ID Data
                    </div>
                    <h2 className="text-xl font-black text-white tracking-tighter uppercase leading-tight">{currentAnalysis.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] text-gray-400 font-bold uppercase">{currentAnalysis.category}</span>
                      <div className="w-1 h-1 bg-cyan-400/40 rounded-full" />
                      <span className="text-[9px] text-cyan-400 font-black">{Math.round(currentAnalysis.confidence * 100)}%</span>
                    </div>
                  </div>
                  
                  <p className="text-gray-300 text-[11px] leading-relaxed mb-4 line-clamp-4">
                    {currentAnalysis.description}
                  </p>

                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap gap-1.5">
                      {currentAnalysis.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-white/5 rounded text-[8px] text-gray-400 font-black uppercase border border-white/5">
                          #{tag}
                        </span>
                      ))}
                    </div>
                    
                    <div className="p-2.5 bg-cyan-500/5 rounded-xl border border-cyan-500/10">
                      <div className="flex items-center gap-1.5 text-[7px] font-black text-cyan-400 uppercase tracking-widest mb-1">
                          <Lightbulb className="w-2.5 h-2.5" /> Insight
                      </div>
                      <p className="text-[10px] text-gray-400 leading-snug italic line-clamp-2">
                          "{currentAnalysis.interestingFacts[0]}"
                      </p>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* Interface HUD Layer */}
      <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-6">
        
        {/* Header - Minimalist */}
        <div className="flex justify-between items-start pointer-events-auto">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10 shadow-lg">
              <div className={`w-1.5 h-1.5 rounded-full ${isAutoScan ? 'bg-cyan-500 shadow-[0_0_8px_#22d3ee] animate-pulse' : 'bg-white/10'}`} />
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/80">
                {isAutoScan ? 'Active Scan' : 'Ready'}
              </span>
            </div>
          </div>
          
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10 hover:bg-white/10 transition-all active:scale-95"
          >
            <HistoryIcon className="w-4 h-4 text-white/50" />
          </button>
        </div>

        {/* Floating Minimal Controls (Bottom Left instead of Center to clear view) */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <button 
            onClick={() => setIsAutoScan(!isAutoScan)}
            className={`p-3 rounded-full border border-white/10 backdrop-blur-md transition-all shadow-xl ${isAutoScan ? 'bg-cyan-500/20 text-cyan-400' : 'bg-black/60 text-white/30'}`}
          >
            {isAutoScan ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>

          <button 
            onClick={handleCapture}
            disabled={isAnalyzing || !isCameraReady}
            className={`
              relative flex items-center justify-center w-14 h-14 rounded-full transition-all duration-500
              ${isAnalyzing 
                  ? 'bg-gray-900' 
                  : 'bg-white/10 hover:bg-white/20 active:scale-90 border border-white/20 shadow-xl'}
            `}
          >
            {isAnalyzing ? (
              <Loader2 className="w-6 h-6 text-cyan-500 animate-spin" />
            ) : (
              <Scan className="w-6 h-6 text-white/80" />
            )}
          </button>
        </div>
      </div>

      {/* History Side Panel */}
      {showHistory && (
        <div className="absolute inset-y-0 right-0 w-full sm:w-80 bg-black/95 backdrop-blur-3xl z-40 border-l border-white/5 flex flex-col shadow-2xl animate-in slide-in-from-right duration-500 pointer-events-auto">
           <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-white">Log</h3>
              </div>
              <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
           </div>
           
           <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {history.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-10">
                  <Box className="w-12 h-12 mb-2" />
                  <p className="text-[9px] uppercase font-black tracking-widest">No Log Data</p>
                </div>
              ) : (
                history.map(entry => (
                  <button 
                    key={entry.id}
                    onClick={() => {
                      setCurrentAnalysis(entry.analysis);
                      setIsMinimized(false);
                      setShowHistory(false);
                    }}
                    className="w-full flex items-center gap-3 p-2 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/5 transition-all text-left group"
                  >
                    <img src={entry.image} alt="" className="w-16 h-16 rounded-xl object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[11px] font-black truncate text-white uppercase tracking-tight">{entry.analysis.name}</h4>
                      <p className="text-[8px] text-cyan-400/50 font-black uppercase mb-1">{entry.analysis.category}</p>
                      <div className="flex items-center gap-1 text-[8px] text-gray-600 font-black uppercase">
                        <Clock className="w-2.5 h-2.5" /> {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </button>
                ))
              )}
           </div>

           {history.length > 0 && (
             <div className="p-4 border-t border-white/5">
                <button 
                  onClick={clearHistory}
                  className="w-full py-3 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-red-500/30 hover:text-red-400 hover:bg-red-400/5 rounded-xl transition-all border border-transparent hover:border-red-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Wipe Log
                </button>
             </div>
           )}
        </div>
      )}

      {error && (
         <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 bg-red-600/90 text-white px-6 py-3 rounded-full text-[9px] font-black shadow-2xl backdrop-blur-md animate-in slide-in-from-top-4">
            <div className="flex items-center gap-2">
                <X className="w-3.5 h-3.5" /> {error}
            </div>
         </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 0px; }
      `}</style>
    </div>
  );
};

export default VisionPro;
