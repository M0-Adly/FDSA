'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then(m => m.CircleMarker), { ssr: false });

// For hooks like useMapEvents, we need a wrapper component that is only rendered inside MapContainer
const MapEventsWrapper = ({ onClick }: { onClick: (latlng: any) => void }) => {
    // We import the hook dynamically or use a workaround
    const [EventsHook, setEventsHook] = useState<any>(null);
    
    useEffect(() => {
        import('react-leaflet').then(m => setEventsHook(() => m.useMapEvents));
    }, []);

    if (!EventsHook) return null;

    return <EventsHookWrapper Hook={EventsHook} onClick={onClick} />;
};

const EventsHookWrapper = ({ Hook, onClick }: any) => {
    Hook({ click: (e: any) => onClick(e.latlng) });
    return null;
};

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
        <MapEventsWrapper onClick={(latlng: any) => onLocationSelect([latlng.lat, latlng.lng])} />
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
