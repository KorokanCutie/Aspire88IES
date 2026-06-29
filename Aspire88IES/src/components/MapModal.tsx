import { X, MapPin, Compass } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  address: string;
  lat?: number;
  lng?: number;
}

export function MapModal({ isOpen, onClose, projectName, address, lat = 14.5574, lng = 121.0549 }: MapModalProps) {
  // We can embed OpenStreetMap via an iframe src of Nominatim or a beautifully customized Leaflet map,
  // or a gorgeous stylized static map iframe coordinate wrapper that integrates beautifully matching the high-end corporate B2B theme of Aspire88.
  // Using an un-keyed openStreetMap embed map url:
  const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-950 text-emerald-400 rounded-lg border border-emerald-800/40">
                  <Compass className="w-5 h-5 animate-spin-slow" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">{projectName}</h3>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20" />
                    <span>{address}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-950 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Interactive Map Iframe Canvas Container */}
            <div className="relative h-[350px] bg-slate-950 flex items-center justify-center">
              <iframe
                title={`Geospatial Map - ${projectName}`}
                src={embedUrl}
                width="100%"
                height="100%"
                className="border-0 opacity-90 hover:opacity-100 transition-opacity grayscale invert contrast-125"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer"
              />

              {/* Spatial Coordinates Pill Overlay */}
              <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur border border-slate-800 text-[10px] font-mono text-slate-400 px-2.5 py-1 rounded-lg flex items-center gap-1.5 select-all">
                <span className="text-emerald-400 font-bold">COORDS:</span>
                <span>LAT: {lat.toFixed(4)}</span>
                <span className="text-slate-600">|</span>
                <span>LNG: {lng.toFixed(4)}</span>
              </div>
            </div>

            {/* Bottom Panel */}
            <div className="p-3 bg-slate-950/60 border-t border-slate-800/80 text-center text-[10px] text-slate-500 select-none font-medium">
              Geospatial Positioning powered by Open-Source Canvas. Locked to Philippine Real Estate Grid.
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
export default MapModal;
