import { useEffect, useState } from 'react';
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTranslation } from 'react-i18next';
import { LocateFixed } from 'lucide-react';
import { Button } from '../ui/index.jsx';

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

// Brand-coloured marker (avoids Leaflet's default image paths, which break in bundlers).
const pinIcon = L.divIcon({
  className: '',
  html: `<svg width="34" height="44" viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg"><path d="M17 43C17 43 32 27.5 32 17A15 15 0 0 0 2 17C2 27.5 17 43 17 43Z" fill="#146B50" stroke="#fff" stroke-width="2.5"/><circle cx="17" cy="17" r="6" fill="#fff"/></svg>`,
  iconSize: [34, 44],
  iconAnchor: [17, 43],
});

function Recenter({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom ?? map.getZoom());
  }, [center.lat, center.lng, zoom, map]);
  return null;
}

function ClickHandler({ onPick }) {
  useMapEvents({ click: (e) => onPick({ lat: +e.latlng.lat.toFixed(5), lng: +e.latlng.lng.toFixed(5) }) });
  return null;
}

/** Read-only map. When `approximate`, shows a ~1 km circle instead of an exact pin. */
export function LocationMap({ lat, lng, approximate = true, className = 'h-64' }) {
  if (lat == null || lng == null) return null;
  return (
    <div className={`overflow-hidden rounded-2xl border border-line ${className}`}>
      <MapContainer center={[lat, lng]} zoom={approximate ? 13 : 15} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer url={TILE_URL} attribution={ATTRIBUTION} />
        {approximate ? (
          <Circle center={[lat, lng]} radius={900} pathOptions={{ color: '#146B50', fillColor: '#27AE80', fillOpacity: 0.2, weight: 2 }} />
        ) : (
          <Marker position={[lat, lng]} icon={pinIcon} />
        )}
      </MapContainer>
    </div>
  );
}

/**
 * Lets the owner pick a point by clicking the map, or (only after an explicit click and
 * browser permission) by using geolocation. Geolocation is never required.
 */
export function LocationPicker({ value, fallbackCenter, onChange }) {
  const { t } = useTranslation();
  const [geoState, setGeoState] = useState({ loading: false, error: '' });
  const hasPoint = value?.lat != null && value?.lng != null;
  const center = hasPoint ? value : fallbackCenter;

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setGeoState({ loading: false, error: t('listing.geoUnavailable') });
      return;
    }
    setGeoState({ loading: true, error: '' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoState({ loading: false, error: '' });
        onChange({ lat: +pos.coords.latitude.toFixed(5), lng: +pos.coords.longitude.toFixed(5) });
      },
      (err) => {
        setGeoState({ loading: false, error: t(err.code === err.PERMISSION_DENIED ? 'listing.geoDenied' : 'listing.geoUnavailable') });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };

  return (
    <div className="space-y-3">
      <div className="h-72 overflow-hidden rounded-2xl border border-line sm:h-80">
        <MapContainer center={[center.lat, center.lng]} zoom={hasPoint ? 14 : 11} className="h-full w-full">
          <TileLayer url={TILE_URL} attribution={ATTRIBUTION} />
          <ClickHandler onPick={onChange} />
          <Recenter center={center} />
          {hasPoint && <Marker position={[value.lat, value.lng]} icon={pinIcon} />}
        </MapContainer>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className={`text-sm ${hasPoint ? 'font-medium text-primary' : 'text-muted'}`}>
          {hasPoint ? t('listing.coordsSet', { latitude: value.lat, longitude: value.lng }) : t('listing.coordsNotSet')}
        </p>
        <Button variant="outline" size="sm" onClick={locate} loading={geoState.loading}>
          {!geoState.loading && <LocateFixed className="h-4 w-4" />}
          {geoState.loading ? t('listing.locating') : t('listing.useMyLocation')}
        </Button>
      </div>
      {geoState.error && <p className="error-text">{geoState.error}</p>}
    </div>
  );
}
