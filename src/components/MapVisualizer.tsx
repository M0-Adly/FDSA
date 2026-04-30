'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then(m => m.CircleMarker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });

// Separate component for location flying to avoid top-level useMap import
const LocationFlyer = ({ location }: { location: [number, number] | null }) => {
  const [map, setMap] = useState<any>(null);

  useEffect(() => {
    // Only import and use map on client side
    import('react-leaflet').then(({ useMap }) => {
      // This is still tricky because useMap is a hook.
      // Better to use a different approach.
    });
  }, []);

  return null;
};

// COMPONENT REFACTORED TO BE SSR-SAFE
export function MapVisualizer({ rootNode, focusedLocation }: any) {
  const [map, setMap] = useState<any>(null);

  useEffect(() => {
    if (focusedLocation && map) {
      map.flyTo(focusedLocation, 16, { animate: true, duration: 1.5 });
    }
  }, [focusedLocation, map]);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="w-full h-full bg-slate-900/50 animate-pulse rounded-2xl" />;

  // Fake coordinates for Aswan districts
  const districtsData = [
    { id: 1, name: 'First District', pos: [24.0889, 32.8998] },
    { id: 2, name: 'Second District', pos: [24.1100, 32.9100] }
  ];

  const getDistrictLoad = (districtId: number) => {
    let ongoing = 0;
    let pending = 0;
    
    const dist = rootNode?.children?.toArray().find((d: any) => d.district_id === districtId);
    if (dist) {
      dist.children.toArray().forEach((dept: any) => {
        ongoing += dept.ongoingReports.size();
        pending += dept.pendingReports.size();
      });
    }
    
    return { ongoing, pending };
  };

  const getMarkerColor = (ongoing: number, pending: number) => {
    const total = ongoing + pending;
    if (total > 5) return '#ef4444'; // Red
    if (total > 2) return '#f59e0b'; // Yellow
    return '#10b981'; // Green
  };

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-white/10 relative z-0">
      <MapContainer 
        center={[24.0889, 32.8998]} 
        zoom={14} 
        style={{ height: '100%', width: '100%', background: '#080c1a' }}
        zoomControl={false}
        ref={setMap}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        
        {districtsData.map(dist => {
          const load = getDistrictLoad(dist.id);
          const color = getMarkerColor(load.ongoing, load.pending);
          
          return (
            <CircleMarker
              key={dist.id}
              center={dist.pos as [number, number]}
              radius={30 + (load.ongoing + load.pending) * 2}
              pathOptions={{ fillColor: color, color: color, fillOpacity: 0.1, weight: 1, dashArray: '5, 5' }}
            >
              <Popup className="custom-popup">
                <div className="bg-slate-900 p-2 rounded text-white border border-slate-700 shadow-xl">
                  <h4 className="font-bold border-b border-slate-700 pb-1 mb-2">{dist.name}</h4>
                  <div className="text-sm">
                    <p className="text-blue-400">Total Active: {load.ongoing + load.pending}</p>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* Individual Report Markers */}
        {(() => {
          const markers: React.ReactNode[] = [];
          const districts = rootNode?.children?.toArray() || [];
          districts.forEach((dist: any) => {
            dist.children.toArray().forEach((dept: any) => {
              const allReports = [...dept.ongoingReports.toArray(), ...dept.pendingReports.toArray()];
              allReports.forEach((r: any) => {
                if (r.lat && r.lng) {
                  markers.push(
                    <CircleMarker
                      key={r.id}
                      center={[r.lat, r.lng]}
                      radius={10}
                      pathOptions={{ 
                        fillColor: '#ef4444', 
                        color: '#fff', 
                        fillOpacity: 0.9, 
                        weight: 2 
                      }}
                    >
                      <Popup>
                        <div className="p-3 min-w-[150px] bg-slate-900 text-white rounded-lg">
                          <h5 className="font-black border-b border-white/10 pb-1 mb-2 text-indigo-400 uppercase text-[10px]">{r.type}</h5>
                          <p className="text-xs leading-relaxed opacity-80">{r.description}</p>
                          <div className="mt-3 pt-2 border-t border-white/5 flex justify-between items-center">
                            <span className={`text-[9px] font-black uppercase ${r.status === 'ongoing' ? 'text-blue-400' : 'text-amber-400'}`}>{r.status}</span>
                            <span className="text-[9px] text-white/30">Priority: {r.priority}</span>
                          </div>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                }
              });
            });
          });
          return markers;
        })()}
      </MapContainer>
      
      {/* Custom styles for Leaflet popups in dark mode */}
      <style dangerouslySetInnerHTML={{__html: `
        .leaflet-popup-content-wrapper { background: transparent; padding: 0; box-shadow: none; }
        .leaflet-popup-tip { display: none; }
      `}} />
    </div>
  );
}
