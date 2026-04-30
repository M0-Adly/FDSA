'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function MapClickHandler({ onClick }: { onClick: (latlng: any) => void }) {
  useMapEvents({
    click: (e) => onClick(e.latlng),
  });
  return null;
}

export default function MapPicker({ onLocationSelect, selectedLocation }: any) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="h-60 bg-white/5 rounded-xl animate-pulse" />;

  return (
    <div className="h-60 rounded-xl overflow-hidden border border-white/10 relative z-10">
      <MapContainer 
        center={[24.0889, 32.8998]} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        <MapClickHandler onClick={(latlng) => onLocationSelect([latlng.lat, latlng.lng])} />
        {selectedLocation && (
          <CircleMarker 
            center={selectedLocation} 
            radius={10} 
            pathOptions={{ fillColor: '#ef4444', color: '#fff', weight: 2, fillOpacity: 0.9 }} 
          />
        )}
      </MapContainer>
    </div>
  );
}
