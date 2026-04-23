import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion } from 'framer-motion';


const ASWAN_COORDS: [number, number] = [24.0889, 32.8998];

// Custom Marker Icons for different services
const createCustomIcon = (color: string) => L.divIcon({
  html: `<div style="background-color: ${color}; width: 12px; height: 12px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 10px ${color};"></div>`,
  className: 'custom-marker-icon',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const Icons = {
  Police: createCustomIcon('#3b82f6'),   // Blue
  Hospital: createCustomIcon('#ef4444'), // Red
  Fire: createCustomIcon('#f97316'),     // Orange
  Central: createCustomIcon('#fbbf24'),  // Gold
};

const EMERGENCY_LOCATIONS = [
  { name: 'Aswan Security Directorate (مديرية أمن أسوان)', type: 'Police', coords: [24.0911, 32.8973] },
  { name: 'Aswan City Police Station (قسم أول أسوان)', type: 'Police', coords: [24.0946, 32.8980] },
  { name: 'Aswan University Hospital (مستشفى أسوان الجامعي)', type: 'Hospital', coords: [24.0850, 32.8950] },
  { name: 'Aswan General Hospital (مستشفى أسوان العام)', type: 'Hospital', coords: [24.0768, 32.8887] },
  { name: 'Red Crescent Hospital (مستشفى الهلال الأحمر)', type: 'Hospital', coords: [24.0900, 32.9000] },
  { name: 'Aswan Fire Station - Main (مركز المطافئ الرئيسي)', type: 'Fire', coords: [24.1010, 32.9030] },
  { name: 'District 2 Fire Unit (وحدة مطافئ الحي الثاني)', type: 'Fire', coords: [24.0650, 32.8850] },
  { name: 'Ambulance Center - Downtown (مركز الإسعاف الرئيسي)', type: 'Hospital', coords: [24.0880, 32.8920] },
];

export function AswanMap() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative w-full h-full min-h-[450px] rounded-3xl overflow-hidden border border-blue-500/30 shadow-[0_0_50px_rgba(59,130,246,0.15)]"
    >
      {/* Legend / Info Overlay */}
      <div className="absolute top-6 left-6 z-[1000] pointer-events-none space-y-3">
        <div className="bg-black/80 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
            <h3 className="text-white font-black text-sm uppercase tracking-tighter">
              Aswan Emergency Grid
            </h3>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[10px] text-white/70">
              <div className="w-2 h-2 rounded-full bg-[#3b82f6]" /> Police Stations
            </div>
            <div className="flex items-center gap-2 text-[10px] text-white/70">
              <div className="w-2 h-2 rounded-full bg-[#ef4444]" /> Hospitals / Ambulance
            </div>
            <div className="flex items-center gap-2 text-[10px] text-white/70">
              <div className="w-2 h-2 rounded-full bg-[#f97316]" /> Fire Departments
            </div>
          </div>
        </div>
      </div>

      <MapContainer
        center={ASWAN_COORDS}
        zoom={14}
        scrollWheelZoom={true}
        zoomControl={false}
        style={{ height: '100%', width: '100%', background: '#0a0a0a' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        <ZoomControl position="bottomright" />

        {/* Static Emergency Centers */}
        {EMERGENCY_LOCATIONS.map((loc, i) => (
          <Marker 
            key={i} 
            position={loc.coords as [number, number]} 
            icon={Icons[loc.type as keyof typeof Icons] || Icons.Central}
          >
            <Popup className="premium-popup">
              <div className="p-1">
                <div className="text-[10px] font-black uppercase text-blue-500 mb-0.5">{loc.type}</div>
                <div className="text-xs font-bold text-slate-800">{loc.name}</div>
                <div className="text-[9px] text-slate-400 mt-1">Operational • Active Units: 5</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Command Center Marker */}
        <Marker position={ASWAN_COORDS} icon={Icons.Central}>
          <Popup>
            <div className="text-center p-2">
              <div className="text-amber-500 font-black text-xs uppercase mb-1">Command Center</div>
              <div className="font-bold text-sm">مقر القيادة المركزي</div>
            </div>
          </Popup>
        </Marker>

      </MapContainer>

      {/* Cyber HUD Overlay */}
      <div className="absolute inset-0 pointer-events-none border-[20px] border-transparent shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]" />
      <div className="absolute bottom-6 left-6 z-[1000] bg-blue-600/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-blue-500/30">
        <span className="text-[10px] font-mono text-blue-400 font-bold uppercase tracking-widest">
          Coordinates: 24.0889° N, 32.8998° E
        </span>
      </div>
    </motion.div>
  );
}
