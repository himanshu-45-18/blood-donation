import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Card, Badge, Button } from '@/components/ui';
import { MapPin, Navigation, Phone, AlertTriangle, Building2, Filter, Loader2 } from 'lucide-react';
import type { Hospital, EmergencyRequest } from '@/lib/supabase';

interface EmergencyMapProps {
  hospitals: Hospital[];
  emergencies?: EmergencyRequest[];
  title?: string;
}

const KNOWN_COORDS: Record<string, [number, number]> = {
  nagpur: [21.1458, 79.0882],
  kalmeshwar: [21.2333, 78.9167],
  mumbai: [19.076, 72.8777],
  pune: [18.5204, 73.8567],
  delhi: [28.6139, 77.209],
  wardha: [20.7453, 78.6022],
  amravati: [20.9374, 77.7796],
};

export function InteractiveEmergencyMap({ hospitals, emergencies = [], title = 'Interactive Emergency & Hospital Map' }: EmergencyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markersGroup = useRef<L.LayerGroup | null>(null);

  const [filter, setFilter] = useState<'all' | 'emergencies'>('all');
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [geocodedCoords, setGeocodedCoords] = useState<Record<string, [number, number]>>({});
  const [geocoding, setGeocoding] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    const map = L.map(mapRef.current, {
      center: [21.1458, 79.0882],
      zoom: 11,
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

  // Async Geocoding with OpenStreetMap Nominatim for unknown addresses / towns like Kalmeshwar
  useEffect(() => {
    let active = true;

    async function geocodeHospitals() {
      const newCoords: Record<string, [number, number]> = { ...geocodedCoords };
      let updated = false;

      for (const hosp of hospitals) {
        if (newCoords[hosp.id]) continue;

        // Check explicit lat/lng first
        if ((hosp as any).latitude && (hosp as any).longitude) {
          newCoords[hosp.id] = [Number((hosp as any).latitude), Number((hosp as any).longitude)];
          updated = true;
          continue;
        }

        // Check known city dictionary
        const cityKey = String(hosp.city || '').toLowerCase().trim();
        const addressKey = String(hosp.address || '').toLowerCase().trim();

        if (KNOWN_COORDS[cityKey]) {
          newCoords[hosp.id] = KNOWN_COORDS[cityKey];
          updated = true;
          continue;
        }

        if (KNOWN_COORDS[addressKey]) {
          newCoords[hosp.id] = KNOWN_COORDS[addressKey];
          updated = true;
          continue;
        }

        // Dynamic OpenStreetMap Nominatim Geocoding Lookup for Kalmeshwar / any town
        const query = [hosp.address, hosp.city, 'Maharashtra', 'India'].filter(Boolean).join(', ');
        if (query) {
          setGeocoding(true);
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
              { headers: { 'User-Agent': 'BloodFlow-EmergencyApp/1.0' } },
            );
            const data = await res.json().catch(() => []);
            if (data && data[0]) {
              newCoords[hosp.id] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
              updated = true;
            }
          } catch (_) {}
        }
      }

      if (active && updated) {
        setGeocodedCoords(newCoords);
      }
      if (active) setGeocoding(false);
    }

    geocodeHospitals();

    return () => {
      active = false;
    };
  }, [hospitals]);

  // Render Map Markers
  useEffect(() => {
    if (!leafletMap.current || !markersGroup.current) return;

    markersGroup.current.clearLayers();

    const emergencyHospIds = new Set(emergencies.map((e) => e.requesting_hospital_id || e.hospital_id));
    const allLatLngs: L.LatLngExpression[] = [];

    hospitals.forEach((hosp, idx) => {
      const isEmergency = emergencyHospIds.has(hosp.id);
      if (filter === 'emergencies' && !isEmergency) return;

      // Get geocoded coords or fallback
      let coords: [number, number] = geocodedCoords[hosp.id] || KNOWN_COORDS[(hosp.city || '').toLowerCase()] || [21.1458, 79.0882];

      // Slight offset if overlapping
      if (!geocodedCoords[hosp.id]) {
        coords = [
          coords[0] + ((idx % 5) - 2) * 0.02,
          coords[1] + (((idx * 3) % 5) - 2) * 0.02,
        ];
      }

      allLatLngs.push(coords);

      const activeEm = emergencies.find((e) => (e.requesting_hospital_id || e.hospital_id) === hosp.id);

      const markerHtml = `
        <div class="relative flex items-center justify-center">
          <div class="flex h-9 w-9 items-center justify-center rounded-full ${
            isEmergency ? 'bg-red-600 text-white animate-pulse ring-4 ring-red-200 shadow-lg' : 'bg-slate-800 text-white ring-2 ring-white shadow-md'
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

    if (allLatLngs.length > 0 && leafletMap.current) {
      const bounds = L.latLngBounds(allLatLngs);
      leafletMap.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  }, [hospitals, emergencies, filter, geocodedCoords]);

  return (
    <Card className="p-4 sm:p-6 mt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-red-600" />
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            {geocoding ? (
              <Badge variant="yellow" dot className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Geocoding Location...
              </Badge>
            ) : (
              <Badge variant="red" dot>
                Live GPS Pins
              </Badge>
            )}
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
              <span className="text-slate-500 ml-2">Location: {selectedHospital.address || selectedHospital.city || 'Kalmeshwar'}</span>
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
