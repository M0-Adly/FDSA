import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion } from 'framer-motion';

// Fix for default marker icons in Leaflet with Webpack/Vite
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

const ASWAN_COORDS: [number, number] = [24.0889, 32.8998];

export function AswanMap() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative w-full h-full min-h-[400px] rounded-2xl overflow-hidden border border-blue-500/20 shadow-2xl"
    >
      {/* Premium Overlay */}
      <div className="absolute top-4 left-4 z-[1000] pointer-events-none">
        <div className="bg-black/60 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-2xl">
          <h3 className="text-amber-400 font-black text-xs uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Live Operations: Aswan
          </h3>
          <p className="text-white/60 text-[10px] mt-1">Governorate Emergency Monitoring</p>
        </div>
      </div>

      <MapContainer
        center={ASWAN_COORDS}
        zoom={13}
        scrollWheelZoom={true}
        zoomControl={false}
        style={{ height: '100%', width: '100%', background: '#1a1a1a' }}
      >
        {/* Dark Mode Tiles - CartoDB Dark Matter */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        <ZoomControl position="bottomright" />

        <Marker position={ASWAN_COORDS}>
          <Popup>
            <div className="text-center font-bold">
              مركز قيادة أسوان <br /> Aswan Command Center
            </div>
          </Popup>
        </Marker>

        {/* Example markers for important locations in Aswan */}
        <Marker position={[24.085, 32.895]}>
          <Popup>Police Station - District 1</Popup>
        </Marker>
        <Marker position={[24.095, 32.905]}>
          <Popup>Central Hospital</Popup>
        </Marker>
      </MapContainer>

      {/* Futuristic Scanlines Effect */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
    </motion.div>
  );
}
