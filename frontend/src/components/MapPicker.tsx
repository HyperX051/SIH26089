"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default icon path issues in Next.js
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = defaultIcon;

interface MapPickerProps {
  initialPosition: { lat: number; lng: number } | null;
  onLocationSelect: (lat: number, lng: number) => void;
  radius?: number;
  destinationPosition?: { lat: number; lng: number } | null;
  markers?: { id: string; lat: number; lng: number; type: 'SOS' | 'BOOKING'; popup?: string }[];
  readOnly?: boolean;
  jobs?: any[];
}

function LocationMarker({ position, onLocationSelect }: { position: any, onLocationSelect: any }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

export default function MapPicker({ initialPosition, onLocationSelect, radius, destinationPosition, markers = [], readOnly = false, jobs = [] }: MapPickerProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [route, setRoute] = useState<[number, number][]>([]);
  const defaultPos = { lat: 12.9716, lng: 77.5946 }; // Bangalore default

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (initialPosition && destinationPosition) {
      const lat1 = initialPosition.lat;
      const lng1 = initialPosition.lng;
      const lat2 = destinationPosition.lat;
      const lng2 = destinationPosition.lng;
      
      fetch(`https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=full&geometries=geojson`)
        .then(res => res.json())
        .then(data => {
          if (data.routes && data.routes.length > 0) {
            const coords = data.routes[0].geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
            setRoute(coords);
          }
        })
        .catch(err => console.error("OSRM route error:", err));
    }
  }, [initialPosition, destinationPosition]);

  if (!isMounted) return <div className="h-full w-full bg-muted animate-pulse flex items-center justify-center font-bold text-xs text-muted-foreground uppercase tracking-wider">Loading Map...</div>;

  return (
    <div className="h-full w-full relative z-0">
      <MapContainer 
        center={initialPosition || defaultPos} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {radius && (initialPosition || defaultPos) && (
          <Circle 
            center={initialPosition || defaultPos} 
            pathOptions={{ color: 'black', fillColor: '#10b981', fillOpacity: 0.2 }} 
            radius={radius * 1000} 
          />
        )}
        {!readOnly && (
          <LocationMarker 
            position={initialPosition} 
            onLocationSelect={onLocationSelect} 
          />
        )}
        {destinationPosition && (
          <>
            <Marker position={destinationPosition} icon={L.icon({
              iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
              shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41]
            })} />
            <Polyline 
              positions={route.length > 0 ? route : [
                [initialPosition?.lat || defaultPos.lat, initialPosition?.lng || defaultPos.lng],
                [destinationPosition.lat, destinationPosition.lng]
              ]} 
              pathOptions={{ color: '#10b981', weight: 4 }} 
            />
          </>
        )}
        {markers.map(m => (
          <Marker 
            key={m.id} 
            position={{ lat: m.lat, lng: m.lng }}
            icon={m.type === 'SOS' ? L.divIcon({
              className: 'pulsing-sos-marker',
              html: '<img src="https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png" class="absolute top-0 left-0" style="width: 25px; height: 41px;" /><div class="ringring"></div><div class="circle"></div>',
              iconSize: [25, 41],
              iconAnchor: [12, 41]
            }) : defaultIcon}
          >
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
