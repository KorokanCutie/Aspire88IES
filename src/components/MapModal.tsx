/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, ZoomIn, ZoomOut, Compass, Navigation, Layers } from 'lucide-react';
import { Project } from '../types';

interface MapModalProps {
  isOpen: boolean;
  project: Project | null;
  onClose: () => void;
}

export default function MapModal({ isOpen, project, onClose }: MapModalProps) {
  const [zoom, setZoom] = useState(14);
  const [activeTab, setActiveTab] = useState<'streets' | 'satellite' | 'terrain'>('streets');

  if (!isOpen || !project) return null;

  // Derive coordinates or simulate visual details for Manila districts
  const isBGC = project.address.toLowerCase().includes('bgc') || project.address.toLowerCase().includes('taguig');
  const isPasay = project.address.toLowerCase().includes('pasay') || project.address.toLowerCase().includes('moa') || project.address.toLowerCase().includes('mall of asia');
  const isMakati = project.address.toLowerCase().includes('makati');

  const lat = isBGC ? '14.5496' : isPasay ? '14.5351' : isMakati ? '14.5547' : '14.5995';
  const lng = isBGC ? '121.0452' : isPasay ? '120.9822' : isMakati ? '121.0244' : '120.9842';
  const areaName = isBGC ? 'Bonifacio Global City, Taguig' : isPasay ? 'Mall of Asia Complex, Pasay' : isMakati ? 'Ayala Center, Makati' : 'Metro Manila, PH';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" id="map-modal-overlay">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
          id="map-modal-backdrop"
        />

        {/* Modal Panel */}
        <motion.div
          initial={{ scale: 0.93, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.93, opacity: 0 }}
          className="relative w-full max-w-4xl h-[80vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl"
          id="map-modal-box"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40" id="map-modal-header">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl" id="map-modal-icon-container">
                <MapPin className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-100 text-lg tracking-tight" id="map-project-name">
                  {project.name}
                </h3>
                <p className="text-xs text-slate-400 font-mono" id="map-coordinates">
                  LAT: {lat}° N  |  LNG: {lng}° E  •  {areaName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition"
              id="map-modal-close-btn"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Map & Detail split */}
          <div className="flex-1 flex flex-col md:flex-row" id="map-modal-body">
            {/* Left: Interactive Mock Map */}
            <div className="flex-1 relative bg-slate-950 overflow-hidden min-h-[300px]" id="map-viewport">
              {/* Grid Lines mimicking streets */}
              <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
                backgroundImage: 'radial-gradient(circle, #334155 1px, transparent 1px)',
                backgroundSize: '24px 24px'
              }} />

              {/* Mock Street Map SVG */}
              <svg className="absolute inset-0 w-full h-full opacity-35" xmlns="http://www.w3.org/2000/svg">
                {/* Major Highway / Avenue */}
                <line x1="-50" y1="200" x2="1200" y2="400" stroke="#f59e0b" strokeWidth="8" strokeLinecap="round" />
                <line x1="-50" y1="200" x2="1200" y2="400" stroke="#fef08a" strokeWidth="2" strokeDasharray="6,4" />
                
                {/* Cross Roads */}
                <line x1="300" y1="-50" x2="450" y2="800" stroke="#475569" strokeWidth="6" />
                <line x1="600" y1="-50" x2="500" y2="800" stroke="#475569" strokeWidth="6" />
                <line x1="100" y1="100" x2="900" y2="100" stroke="#334155" strokeWidth="4" />
                <line x1="200" y1="500" x2="1000" y2="500" stroke="#334155" strokeWidth="4" strokeDasharray="10,5" />
                <line x1="150" y1="350" x2="1100" y2="150" stroke="#334155" strokeWidth="4" />

                {/* Simulated Green Park Area */}
                <rect x={isBGC ? "400" : "150"} y="180" width="180" height="120" rx="20" fill="#10b981" fillOpacity="0.15" stroke="#10b981" strokeWidth="1" strokeDasharray="4,2" />
                <text x={isBGC ? "490" : "240"} y="240" fill="#34d399" fontSize="11" fontFamily="monospace" textAnchor="middle" opacity="0.6">GREEN PARK AREA</text>

                {/* Commercial blocks */}
                <rect x="50" y="80" width="80" height="60" rx="4" fill="#3b82f6" fillOpacity="0.08" stroke="#3b82f6" strokeWidth="1" opacity="0.5" />
                <rect x="750" y="240" width="120" height="80" rx="4" fill="#3b82f6" fillOpacity="0.08" stroke="#3b82f6" strokeWidth="1" opacity="0.5" />
              </svg>

              {/* Center Map PIN pulsing */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none" id="map-pin-pulse">
                <div className="relative flex items-center justify-center">
                  <span className="absolute inline-flex h-20 w-20 rounded-full bg-amber-500 opacity-25 animate-ping" />
                  <span className="absolute inline-flex h-8 w-8 rounded-full bg-amber-500/30 border border-amber-500/50" />
                  <div className="relative bg-amber-500 text-slate-950 p-3 rounded-full shadow-lg z-10" id="map-pin-icon">
                    <MapPin className="w-6 h-6 animate-bounce" />
                  </div>
                </div>
              </div>

              {/* Map Floating HUD */}
              <div className="absolute top-4 left-4 flex flex-col gap-2 bg-slate-900/90 border border-slate-800 p-2 rounded-xl backdrop-blur-md shadow-lg" id="map-controls">
                <button
                  onClick={() => setZoom(z => Math.min(18, z + 1))}
                  className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
                  title="Zoom In"
                  id="zoom-in"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <div className="h-px bg-slate-800 my-0.5" />
                <button
                  onClick={() => setZoom(z => Math.max(10, z - 1))}
                  className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
                  title="Zoom Out"
                  id="zoom-out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
              </div>

              <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-1.5 rounded-xl backdrop-blur-md shadow-lg" id="map-style-tabs">
                {(['streets', 'satellite', 'terrain'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                      activeTab === tab 
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                    id={`tab-map-${tab}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Zoom display */}
              <div className="absolute bottom-4 left-4 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg backdrop-blur-md text-xs font-mono text-slate-400" id="zoom-indicator">
                Zoom Level: {zoom}x
              </div>

              <div className="absolute bottom-4 right-4 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg backdrop-blur-md flex items-center gap-2 text-xs font-mono text-slate-400" id="compass-indicator">
                <Compass className="w-3.5 h-3.5 text-amber-500 animate-spin" style={{ animationDuration: '8s' }} /> 
                <span>PH GPS Active</span>
              </div>
            </div>

            {/* Right: Project Location Cards */}
            <div className="w-full md:w-80 bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 p-6 flex flex-col justify-between" id="map-sidebar">
              <div className="space-y-6" id="map-sidebar-content">
                <div>
                  <h4 className="text-xs font-semibold text-amber-500 uppercase tracking-wider font-mono">
                    Project Details
                  </h4>
                  <p className="mt-1 text-slate-100 font-semibold text-base leading-tight">
                    {project.name}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Navigation className="w-4 h-4 text-slate-400 mt-1 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-slate-400">Exact Address</p>
                      <p className="text-sm text-slate-200 mt-0.5 leading-relaxed">
                        {project.address}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Layers className="w-4 h-4 text-slate-400 mt-1 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-slate-400 font-mono">Location Status</p>
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mt-1">
                        Active Project
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 space-y-2.5">
                  <p className="text-xs text-slate-400 font-mono leading-relaxed">
                    This free built-in interactive map engine models satellite tracking, landmarks, and route directions for <strong>{project.name}</strong> properties.
                  </p>
                  <p className="text-xs text-slate-500 font-mono">
                    Updated: June 2026
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-800 mt-6" id="map-sidebar-footer">
                <button
                  type="button"
                  onClick={() => {
                    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.name + ' ' + project.address)}`;
                    window.open(url, '_blank');
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-sm font-semibold transition"
                  id="open-google-maps"
                >
                  <MapPin className="w-4 h-4 text-amber-500" />
                  View on Google Maps
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
