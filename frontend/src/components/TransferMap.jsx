import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { School, ArrowRight, Sparkles, Package, Users, GraduationCap, MapPin } from 'lucide-react';

// Custom Scalable SVG Marker Icons using L.divIcon
const createCustomIcon = (bgColor, borderColor, text) => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        width: 38px;
        height: 38px;
        background: ${bgColor};
        border: 3px solid ${borderColor};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 800;
        font-size: 11px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.25);
        cursor: pointer;
        transition: transform 0.2s;
      " onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">
        ${text}
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -20],
  });
};

const schoolIcon = createCustomIcon('#3B82F6', '#1D4ED8', '🏫');
const surplusIcon = createCustomIcon('#F59E0B', '#D97706', '📦');
const needIcon = createCustomIcon('#10B981', '#059669', '🎯');

// Calculates curved intermediate points between two lat/lng coordinates (Quadratic Bézier)
function getCurvedPath(lat1, lng1, lat2, lng2, curvature = 0.15) {
  const points = [];
  const steps = 30;

  // Midpoint
  const midLat = (lat1 + lat2) / 2;
  const midLng = (lng1 + lng2) / 2;

  // Offset perpendicular to the chord
  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;
  const norm = Math.sqrt(dLat * dLat + dLng * dLng) || 1;

  const controlLat = midLat - (dLng / norm) * curvature * 0.5;
  const controlLng = midLng + (dLat / norm) * curvature * 0.5;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat = (1 - t) * (1 - t) * lat1 + 2 * (1 - t) * t * controlLat + t * t * lat2;
    const lng = (1 - t) * (1 - t) * lng1 + 2 * (1 - t) * t * controlLng + t * t * lng2;
    points.push([lat, lng]);
  }
  return points;
}

export const TransferMap = ({
  schools = [],
  transfers = [],
  onSelectSchool
}) => {
  // Center of Istanbul
  const defaultCenter = [41.015, 29.035];

  return (
    <div className="relative w-full h-[520px] rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50">
      
      {/* Map Legend Overlay */}
      <div className="absolute top-4 right-4 z-20 bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-slate-200/80 shadow-md text-xs space-y-1.5 pointer-events-auto">
        <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-1">
          Harita Katmanı
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-amber-500 border border-amber-600" />
          <span className="text-slate-600 font-medium">Fazla Eşya Deposu</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-600" />
          <span className="text-slate-600 font-medium">Açık İhtiyaç Bildiren Okul</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-4 h-0.5 bg-amber-500" />
          <span className="text-slate-600 font-medium">Aktif Transfer Hattı</span>
        </div>
      </div>

      <MapContainer
        center={defaultCenter}
        zoom={12}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Transfer Arcs */}
        {transfers.map((t, idx) => {
          if (!t.from_lat || !t.to_lat) return null;
          const curve = getCurvedPath(t.from_lat, t.from_lng, t.to_lat, t.to_lng);
          return (
            <Polyline
              key={t.id || idx}
              positions={curve}
              pathOptions={{
                color: '#F59E0B',
                weight: 3.5,
                opacity: 0.85,
                dashArray: '8, 8',
                lineCap: 'round'
              }}
            >
              <Popup>
                <div className="p-2 space-y-2 text-xs max-w-xs">
                  <div className="flex items-center space-x-1.5 text-amber-700 font-bold">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Onaylanmış EduShare Transferi</span>
                  </div>
                  <div className="font-semibold text-slate-900 text-sm">
                    {t.item_summary} ({t.quantity} Adet)
                  </div>
                  <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-100">
                    <span className="truncate max-w-[100px] font-medium">{t.from_school_name}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0 mx-1" />
                    <span className="truncate max-w-[100px] font-medium text-emerald-700">{t.to_school_name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px] bg-amber-50 p-2 rounded-lg font-medium text-amber-900">
                    <div>💰 Tasarruf: ₺{Number(t.estimated_savings_tl).toLocaleString('tr-TR')}</div>
                    <div>🌿 CO2: {Number(t.prevented_co2_kg).toFixed(1)} kg</div>
                  </div>
                </div>
              </Popup>
            </Polyline>
          );
        })}

        {/* School Markers */}
        {schools.map((school) => {
          return (
            <Marker
              key={school.id}
              position={[school.latitude, school.longitude]}
              icon={schoolIcon}
            >
              <Popup>
                <div className="p-2.5 max-w-xs space-y-2 font-sans">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 leading-tight">
                        {school.name}
                      </h4>
                      <p className="text-xs text-slate-500 flex items-center mt-0.5">
                        <MapPin className="w-3 h-3 mr-1 text-slate-400" />
                        {school.district} • {school.school_type}
                      </p>
                    </div>
                  </div>

                  {/* School Profile Stats */}
                  <div className="grid grid-cols-3 gap-1.5 bg-slate-50 p-2 rounded-xl text-center text-xs">
                    <div>
                      <div className="text-slate-400 text-[10px] font-semibold">ÖĞRENCİ</div>
                      <div className="font-bold text-slate-800">{school.student_count || '-'}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[10px] font-semibold">ÖĞRETMEN</div>
                      <div className="font-bold text-slate-800">{school.teacher_count || '-'}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[10px] font-semibold">DERSLİK</div>
                      <div className="font-bold text-slate-800">{school.classroom_count || '-'}</div>
                    </div>
                  </div>

                  {school.principal_name && (
                    <div className="text-[11px] text-slate-600 flex items-center justify-between pt-1 border-t border-slate-100">
                      <span className="font-medium">{school.principal_name}</span>
                      <span className="text-slate-400">{school.phone || ''}</span>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

      </MapContainer>
    </div>
  );
};
