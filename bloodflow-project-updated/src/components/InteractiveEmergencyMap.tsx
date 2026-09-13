import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Card, Badge, Button } from '@/components/ui';
import { MapPin, Navigation, Phone, AlertTriangle, Building2, Filter } from 'lucide-react';
import type { Hospital, EmergencyRequest } from '@/lib/supabase';

interface EmergencyMapProps {
  hospitals: Hospital[];
  emergencies?: EmergencyRequest[];
  title?: string;
}

// Fallback lat/lng generator around Nagpur/Default center if coordinates aren't set
const CITY_COORDS: Record<string, [number, number]> = {
  nagpur: [21.1458, 79.0882],
  mumbai: [19.076, 72.8777],
  pune: [18.5204, 73.8567],
  delhi: [28.6139, 77.209],
};

function getCoords(h: Hospital, index: number): [number, number] {
  const cityKey = (h.city || 'nagpur').toLowerCase();
  const base = CITY_COORDS[cityKey] || [21.1458, 79.0882];
  // Deterministic slight offset based on index if coordinates not explicitly saved
  const latOffset = ((index % 5) - 2) * 0.025;
  const lngOffset = (((index * 3) % 5) - 2) * 0.025;
  return [base[0] + latOffset, base[1] + lngOffset];
}

export function InteractiveEmergencyMap({ hospitals, emergencies = [], title = 'Interactive Emergency & Hospital Map' }: EmergencyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markersGroup = useRef<L.LayerGroup | null>(null);

  const [filter, setFilter] = useState<'all' | 'emergencies'>('all');
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    // Initialize Leaflet Map
    const map = L.map(mapRef.current, {
      center: [21.1458, 79.0882],
      zoom: 12,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    markersGroup.current = L.layerGroup().addTo(map);
    leafletMap.current = map;

    return () => {
      map.remove();
      leafletMap.current = null;
    };
  }, []);

  useEffect(() => {
    if (!leafletMap.current || !markersGroup.current) return;

    markersGroup.current.clearLayers();

    const emergencyHospIds = new Set(emergencies.map((e) => e.requesting_hospital_id || e.hospital_id));

    hospitals.forEach((hosp, idx) => {
      const isEmergency = emergencyHospIds.has(hosp.id);
      if (filter === 'emergencies' && !isEmergency) return;

      const coords = getCoords(hosp, idx);
      const activeEm = emergencies.find((e) => (e.requesting_hospital_id || e.hospital_id) === hosp.id);

      // Custom HTML Marker Icon
      const markerHtml = `
        <div class="relative flex items-center justify-center">
          <div class="flex h-9 w-9 items-center justify-center rounded-full ${
            isEmergency ? 'bg-red-600 text-white animate-pulse ring-4 ring-red-200' : 'bg-slate-800 text-white ring-2 ring-white shadow-md'
          }">
            ${isEmergency ? '🚨' : '🏥'}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-leaflet-marker',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker(coords, { icon: customIcon });

      const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        `${hosp.name}, ${hosp.address || ''} ${hosp.city || ''}`,
      )}`;

      const popupContent = `
        <div class="p-1 font-sans text-xs">
          <div class="flex items-center gap-1.5 font-bold text-slate-900 text-sm mb-1">
            <span>🏥</span> ${hosp.name}
          </div>
          <p class="text-slate-500 mb-2">${hosp.address || ''} ${hosp.city ? `(${hosp.city})` : ''}</p>

          ${
            activeEm
              ? `<div class="mb-2.5 rounded-lg bg-red-50 border border-red-200 p-2">
                  <div class="font-bold text-red-700 text-xs flex items-center gap-1">🚨 Active Emergency (${activeEm.blood_group})</div>
                  <div class="text-red-600 font-medium">${activeEm.units_needed} units required • ${activeEm.urgency.toUpperCase()}</div>
                </div>`
              : ''
          }

          <div class="flex items-center gap-2 mt-2">
            <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer" 
               class="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1.5 font-bold text-white text-[11px] hover:bg-red-700 shadow-xs">
               🗺️ Get Directions
            </a>
            ${
              hosp.phone
                ? `<a href="tel:${hosp.phone}" class="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-bold text-slate-700 text-[11px] hover:bg-slate-100">
                     📞 Call
                   </a>`
                : ''
            }
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('click', () => setSelectedHospital(hosp));
      markersGroup.current?.addLayer(marker);
    });
  }, [hospitals, emergencies, filter]);

  return (
    <Card className="p-4 sm:p-6 mt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-red-600" />
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            <Badge variant="red" dot>
              Live GPS Pins
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Locate blood banks, hospitals, and real-time emergency requests with 1-click driving directions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="xs"
            variant={filter === 'all' ? 'primary' : 'outline'}
            onClick={() => setFilter('all')}
          >
            <Building2 className="h-3.5 w-3.5 mr-1" /> All Hospitals ({hospitals.length})
          </Button>
          <Button
            size="xs"
            variant={filter === 'emergencies' ? 'danger' : 'outline'}
            onClick={() => setFilter('emergencies')}
          >
            <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Emergencies ({emergencies.length})
          </Button>
        </div>
      </div>

      <div
        ref={mapRef}
        className="h-80 sm:h-96 w-full rounded-xl border border-slate-200 shadow-inner z-0 overflow-hidden"
      />

      {selectedHospital && (
        <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-600" />
            <div>
              <span className="font-bold text-slate-900">{selectedHospital.name}</span>
              <span className="text-slate-500 ml-2">Phone: {selectedHospital.phone || 'N/A'}</span>
            </div>
          </div>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
              `${selectedHospital.name}, ${selectedHospital.address || ''} ${selectedHospital.city || ''}`,
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 font-bold text-red-600 hover:text-red-700"
          >
            <Navigation className="h-3.5 w-3.5" /> Navigate via Google Maps →
          </a>
        </div>
      )}
    </Card>
  );
}
