import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { 
  Sparkles, 
  ArrowRight, 
  MapPin, 
  Filter, 
  Search, 
  Layers, 
  X, 
  Package, 
  HeartHandshake, 
  Zap, 
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Check,
  Eye
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Category icon mapper helper
const getCategoryIcon = (category = '') => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('bilişim') || cat.includes('bilgisayar') || cat.includes('it') || cat.includes('computer')) return '💻';
  if (cat.includes('mobilya') || cat.includes('sıra') || cat.includes('furniture') || cat.includes('desk')) return '🪑';
  if (cat.includes('fen') || cat.includes('laboratuvar') || cat.includes('science') || cat.includes('lab')) return '🔬';
  if (cat.includes('kütüphane') || cat.includes('kitap') || cat.includes('library') || cat.includes('book')) return '📚';
  if (cat.includes('spor') || cat.includes('sport')) return '⚽';
  if (cat.includes('sanat') || cat.includes('müzik') || cat.includes('art') || cat.includes('music')) return '🎨';
  return '📦';
};

// Calculates curved intermediate points between two coordinates (Quadratic Bézier)
function getCurvedPath(lat1, lng1, lat2, lng2, curvature = 0.15) {
  const points = [];
  const steps = 30;

  const midLat = (lat1 + lat2) / 2;
  const midLng = (lng1 + lng2) / 2;

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

// Custom Leaflet DivIcon for an Individual School Marker with Product Chip
const createSchoolProductIcon = ({ school, surplusCount, needCount, topItemTitle, topItemIcon, primaryType }) => {
  let badgeBg = 'bg-slate-700';
  let badgeBorder = 'border-slate-800';
  let pillBg = 'bg-white/95 text-slate-800 border-slate-300';
  let dotColor = 'bg-amber-500';

  if (primaryType === 'SURPLUS') {
    badgeBg = 'bg-emerald-600';
    badgeBorder = 'border-emerald-700';
    pillBg = 'bg-emerald-50 text-emerald-950 border-emerald-300 shadow-emerald-900/10';
    dotColor = 'bg-emerald-500';
  } else if (primaryType === 'NEED') {
    badgeBg = 'bg-blue-600';
    badgeBorder = 'border-blue-700';
    pillBg = 'bg-blue-50 text-blue-950 border-blue-300 shadow-blue-900/10';
    dotColor = 'bg-blue-500';
  } else if (primaryType === 'BOTH') {
    badgeBg = 'bg-amber-600';
    badgeBorder = 'border-amber-700';
    pillBg = 'bg-amber-50 text-amber-950 border-amber-300 shadow-amber-900/10';
    dotColor = 'bg-amber-500';
  }

  const truncatedItem = topItemTitle
    ? (topItemTitle.length > 20 ? topItemTitle.slice(0, 19) + '…' : topItemTitle)
    : school.name;

  return L.divIcon({
    className: 'custom-school-marker-wrapper',
    html: `
      <div class="relative flex items-center group cursor-pointer transition-all duration-200" style="transform: translate(-18px, -18px);">
        <!-- School Core Pin -->
        <div class="relative flex items-center justify-center w-9 h-9 rounded-full ${badgeBg} border-2 ${badgeBorder} text-white shadow-md transition-transform duration-200 group-hover:scale-110">
          <span class="text-sm">🏫</span>
          <span class="absolute -top-1 -right-1 flex h-3 w-3">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full ${dotColor} opacity-75"></span>
            <span class="relative inline-flex rounded-full h-3 w-3 ${dotColor} border border-white"></span>
          </span>
        </div>

        <!-- Attached Product Badge / Chip -->
        <div class="ml-1.5 flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold border shadow-md backdrop-blur-xs whitespace-nowrap transition-all duration-200 group-hover:scale-105 ${pillBg}">
          <span class="text-xs">${topItemIcon}</span>
          <span class="truncate max-w-[130px] font-semibold">${truncatedItem}</span>
          ${surplusCount > 1 ? `<span class="ml-0.5 text-[9px] px-1 py-0.2 rounded-full bg-emerald-200/80 text-emerald-900 font-extrabold">+${surplusCount}</span>` : ''}
          ${needCount > 1 && surplusCount <= 1 ? `<span class="ml-0.5 text-[9px] px-1 py-0.2 rounded-full bg-blue-200/80 text-blue-900 font-extrabold">+${needCount}</span>` : ''}
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -22]
  });
};

// Custom Leaflet DivIcon for Clustered Nodes (Uzaklaştıkça birleşen noktalar)
const createClusterIcon = (cluster) => {
  const { schoolCount, totalItems } = cluster;
  return L.divIcon({
    className: 'custom-cluster-wrapper',
    html: `
      <div class="relative flex items-center justify-center cursor-pointer group" style="transform: translate(-24px, -24px);">
        <!-- Subtle pulsing animated aura -->
        <span class="absolute inline-flex h-12 w-12 rounded-full bg-amber-400 opacity-40 animate-ping"></span>
        <div class="relative flex flex-col items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-white font-extrabold shadow-lg border-2 border-white transition-transform duration-200 group-hover:scale-115">
          <span class="text-xs font-black tracking-tight leading-none">${schoolCount}</span>
          <span class="text-[8px] font-bold tracking-tight opacity-95 leading-tight uppercase mt-0.5">
            ${totalItems > 0 ? `${totalItems} itm` : 'sch'}
          </span>
        </div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24]
  });
};

// Interactive Clustered Markers Controller (groups schools when zoomed out)
function ClusteredMarkersLayer({
  schools = [],
  surplusItems = [],
  needRequests = [],
  onOpenSurplus,
  onOpenNeed,
  t,
  locale,
  currencySymbol
}) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  // Listen to zoom & pan
  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
    moveend: () => setZoom(map.getZoom())
  });

  // Calculate dynamic clusters based on pixel distance on current zoom
  const clusters = useMemo(() => {
    if (!map || schools.length === 0) return [];

    // Cluster distance threshold in pixels
    // When zoomed in (zoom >= 13), threshold is small (30px), allowing almost all schools to show individually
    // When zoomed out (zoom <= 11), threshold is large (75px), merging nearby Anatolian and European schools
    const clusterPixelRadius = zoom >= 13 ? 35 : (zoom === 12 ? 60 : 85);

    const schoolNodes = schools.map((school) => {
      const latLng = L.latLng(school.latitude, school.longitude);
      const point = map.latLngToContainerPoint(latLng);

      const schoolSurplus = surplusItems.filter(item => item.school_id === school.id);
      const schoolNeeds = needRequests.filter(need => need.school_id === school.id);
      const totalSurplusUnits = schoolSurplus.reduce((acc, curr) => acc + (curr.quantity || 1), 0);
      const totalNeedUnits = schoolNeeds.reduce((acc, curr) => acc + (curr.quantity_needed || 1), 0);
      const totalItems = totalSurplusUnits + totalNeedUnits;

      let primaryType = 'NEUTRAL';
      if (schoolSurplus.length > 0 && schoolNeeds.length > 0) primaryType = 'BOTH';
      else if (schoolSurplus.length > 0) primaryType = 'SURPLUS';
      else if (schoolNeeds.length > 0) primaryType = 'NEED';

      const formatItemBadge = (title = '', qty = 1) => {
        let clean = title.trim();
        if (!/^\d+/.test(clean)) {
          clean = `${qty}x ${clean}`;
        }
        return clean;
      };

      const topSurplus = schoolSurplus[0];
      const topNeed = schoolNeeds[0];
      const topItemTitle = topSurplus ? formatItemBadge(topSurplus.title, topSurplus.quantity) : (topNeed ? formatItemBadge(topNeed.title, topNeed.quantity_needed) : school.name);
      const topItemIcon = topSurplus ? getCategoryIcon(topSurplus.item_category) : (topNeed ? getCategoryIcon(topNeed.item_category) : '🏫');

      return {
        school,
        latLng,
        point,
        schoolSurplus,
        schoolNeeds,
        totalSurplusUnits,
        totalNeedUnits,
        totalItems,
        primaryType,
        topItemTitle,
        topItemIcon
      };
    });

    // Group points within clusterPixelRadius
    const grouped = [];
    const visited = new Set();

    for (let i = 0; i < schoolNodes.length; i++) {
      if (visited.has(i)) continue;
      visited.add(i);

      const clusterSchools = [schoolNodes[i]];
      for (let j = i + 1; j < schoolNodes.length; j++) {
        if (visited.has(j)) continue;
        const dist = Math.hypot(
          schoolNodes[i].point.x - schoolNodes[j].point.x,
          schoolNodes[i].point.y - schoolNodes[j].point.y
        );

        if (dist <= clusterPixelRadius) {
          visited.add(j);
          clusterSchools.push(schoolNodes[j]);
        }
      }

      if (clusterSchools.length === 1) {
        // Single individual school
        grouped.push({
          isCluster: false,
          ...clusterSchools[0]
        });
      } else {
        // Multi-school cluster
        const avgLat = clusterSchools.reduce((sum, n) => sum + n.school.latitude, 0) / clusterSchools.length;
        const avgLng = clusterSchools.reduce((sum, n) => sum + n.school.longitude, 0) / clusterSchools.length;
        const totalItems = clusterSchools.reduce((sum, n) => sum + n.totalItems, 0);

        grouped.push({
          isCluster: true,
          schoolCount: clusterSchools.length,
          totalItems,
          latitude: avgLat,
          longitude: avgLng,
          schools: clusterSchools
        });
      }
    }

    return grouped;
  }, [schools, surplusItems, needRequests, zoom, map]);

  return (
    <>
      {clusters.map((node, idx) => {
        if (node.isCluster) {
          // Render Cluster Bubble (Uzaklaştıkça birleşen düğüm)
          const clusterIcon = createClusterIcon(node);
          return (
            <Marker
              key={`cluster-${idx}-${node.schoolCount}`}
              position={[node.latitude, node.longitude]}
              icon={clusterIcon}
              eventHandlers={{
                click: () => {
                  // Zoom in into cluster bounds
                  const bounds = L.latLngBounds(node.schools.map(s => [s.school.latitude, s.school.longitude]));
                  map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
                }
              }}
            >
              <Popup>
                <div className="p-2 space-y-1.5 text-xs font-sans min-w-[180px]">
                  <div className="font-bold text-amber-900 flex items-center justify-between border-b border-amber-200 pb-1">
                    <span>{node.schoolCount} {t('hero.units.schools')}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-extrabold">
                      {node.totalItems} {t('hero.units.items')}
                    </span>
                  </div>
                  <div className="space-y-1 pt-1 text-slate-700">
                    {node.schools.map((sn, sIdx) => (
                      <div key={sIdx} className="flex items-center justify-between text-[11px]">
                        <span className="truncate max-w-[120px] font-medium">{sn.school.name}</span>
                        <span className="text-[10px] text-slate-400">{sn.school.district}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-1.5 text-[10px] text-amber-700 font-semibold text-center">
                    🔍 {t('map.popup.matchAction') || 'Click cluster to zoom & view details'}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        }

        // Render Individual School Marker with Product Chip
        const { school, schoolSurplus, schoolNeeds, primaryType, topItemTitle, topItemIcon } = node;
        const icon = createSchoolProductIcon({
          school,
          surplusCount: schoolSurplus.length,
          needCount: schoolNeeds.length,
          topItemTitle,
          topItemIcon,
          primaryType
        });

        return (
          <Marker
            key={school.id}
            position={[school.latitude, school.longitude]}
            icon={icon}
          >
            <Popup maxWidth={320} minWidth={260}>
              <div className="p-3 space-y-3 font-sans text-xs">
                
                {/* School Header */}
                <div className="border-b border-slate-100 pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 leading-snug">
                        {school.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 flex items-center mt-0.5">
                        <MapPin className="w-3 h-3 mr-1 text-slate-400 shrink-0" />
                        <span>{school.district} • {school.school_type}</span>
                      </p>
                    </div>
                  </div>

                  {/* Quick Capacity Pills */}
                  <div className="grid grid-cols-3 gap-1 bg-slate-50 p-1.5 rounded-xl text-center text-[10px] mt-2">
                    <div>
                      <span className="text-slate-400 font-bold block">{t('map.popup.students')}</span>
                      <span className="font-extrabold text-slate-800">{school.student_count || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block">{t('map.popup.teachers')}</span>
                      <span className="font-extrabold text-slate-800">{school.teacher_count || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block">{t('map.popup.classrooms')}</span>
                      <span className="font-extrabold text-slate-800">{school.classroom_count || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Available Surplus Section */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800">
                    <span className="flex items-center space-x-1">
                      <Package className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{t('map.popup.availableSurplus')} ({schoolSurplus.length})</span>
                    </span>
                  </div>

                  {schoolSurplus.length > 0 ? (
                    <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                      {schoolSurplus.map((item) => (
                        <div key={item.id} className="p-1.5 rounded-lg bg-emerald-50/70 border border-emerald-100 flex items-center justify-between text-[11px]">
                          <div className="flex items-center space-x-1.5 truncate">
                            <span>{getCategoryIcon(item.item_category)}</span>
                            <span className="font-medium text-slate-900 truncate">{item.title}</span>
                          </div>
                          <div className="text-right shrink-0 font-bold text-emerald-700 text-[10px]">
                            {item.quantity} pcs • {currencySymbol}{Number(item.estimated_unit_value_tl).toLocaleString(locale)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-400 italic bg-slate-50 px-2 py-1.5 rounded-lg">
                      {t('map.popup.noSurplus')}
                    </div>
                  )}
                </div>

                {/* Open Needs Section */}
                <div className="space-y-1.5 pt-1 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[11px] font-bold text-blue-800">
                    <span className="flex items-center space-x-1">
                      <HeartHandshake className="w-3.5 h-3.5 text-blue-600" />
                      <span>{t('map.popup.openNeeds')} ({schoolNeeds.length})</span>
                    </span>
                  </div>

                  {schoolNeeds.length > 0 ? (
                    <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                      {schoolNeeds.map((need) => (
                        <div key={need.id} className="p-1.5 rounded-lg bg-blue-50/70 border border-blue-100 flex items-center justify-between text-[11px]">
                          <div className="flex items-center space-x-1.5 truncate">
                            <span>{getCategoryIcon(need.item_category)}</span>
                            <span className="font-medium text-slate-900 truncate">{need.title}</span>
                          </div>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-extrabold bg-blue-100 text-blue-800 shrink-0">
                            {need.quantity_needed} {t('hero.units.items')}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-400 italic bg-slate-50 px-2 py-1.5 rounded-lg">
                      {t('map.popup.noNeeds')}
                    </div>
                  )}
                </div>

                {/* Direct Action Buttons */}
                <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => onOpenSurplus && onOpenSurplus()}
                    className="w-full py-1.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shadow-2xs transition-colors flex items-center justify-center space-x-1"
                  >
                    <span>+</span>
                    <span>{t('map.popup.offerSurplus')}</span>
                  </button>
                  <button
                    onClick={() => onOpenNeed && onOpenNeed()}
                    className="w-full py-1.5 px-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] shadow-2xs transition-colors flex items-center justify-center space-x-1"
                  >
                    <span>🤲</span>
                    <span>{t('map.popup.requestNeed')}</span>
                  </button>
                </div>

              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

export const TransferMap = ({
  schools = [],
  transfers = [],
  surplusItems = [],
  needRequests = [],
  onOpenSurplus,
  onOpenNeed
}) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'tr-TR';
  const currencySymbol = i18n.language?.startsWith('en') ? '$' : '₺';

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('ALL'); // 'ALL', 'SURPLUS', 'NEED', 'TRANSFERS'
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(true);

  // Basemap Style: 'esri' (sade, minimal, clean), 'hot' (warm humanitarian), 'osm' (classic)
  const [baseMapStyle, setBaseMapStyle] = useState('esri');

  const defaultCenter = [41.015, 29.035];

  // Tile layer configs - Clean & Free of watermarks
  const baseMapLayers = {
    esri: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
      name: t('map.filter.baseClean')
    },
    hot: {
      url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles by <a href="https://www.hotosm.org/">Humanitarian OpenStreetMap Team</a>',
      name: t('map.filter.baseWarm')
    },
    osm: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      name: t('map.filter.baseOsm')
    }
  };

  // Filter Categories list
  const categories = [
    { id: 'ALL', label: t('map.filter.categoryAll'), icon: '🌐' },
    { id: 'Bilişim & Bilgisayar', label: 'IT & Computers', icon: '💻' },
    { id: 'Mobilya & Sıra', label: 'Furniture & Desks', icon: '🪑' },
    { id: 'Fen & Laboratuvar', label: 'Science & Lab', icon: '🔬' },
    { id: 'Kütüphane & Kitap', label: 'Library & Books', icon: '📚' }
  ];

  // Filtered Schools
  const filteredSchools = useMemo(() => {
    return schools.filter(school => {
      // 1. Text Search (School name, district, or products held)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesSchool = 
          school.name.toLowerCase().includes(query) ||
          school.district.toLowerCase().includes(query) ||
          (school.school_type && school.school_type.toLowerCase().includes(query));

        // Check if school has surplus matching query
        const matchesSurplus = surplusItems.some(
          it => it.school_id === school.id && (it.title.toLowerCase().includes(query) || it.item_category.toLowerCase().includes(query))
        );

        // Check if school has needs matching query
        const matchesNeed = needRequests.some(
          nd => nd.school_id === school.id && (nd.title.toLowerCase().includes(query) || nd.item_category.toLowerCase().includes(query))
        );

        if (!matchesSchool && !matchesSurplus && !matchesNeed) return false;
      }

      // 2. Type Filter (SURPLUS only, NEED only)
      const schoolSurplus = surplusItems.filter(it => it.school_id === school.id);
      const schoolNeeds = needRequests.filter(nd => nd.school_id === school.id);

      if (selectedType === 'SURPLUS' && schoolSurplus.length === 0) return false;
      if (selectedType === 'NEED' && schoolNeeds.length === 0) return false;

      // 3. Category Filter
      if (selectedCategory !== 'ALL') {
        const hasMatchingSurplus = schoolSurplus.some(it => it.item_category.toLowerCase() === selectedCategory.toLowerCase());
        const hasMatchingNeed = schoolNeeds.some(nd => nd.item_category.toLowerCase() === selectedCategory.toLowerCase());
        if (!hasMatchingSurplus && !hasMatchingNeed) return false;
      }

      return true;
    });
  }, [schools, surplusItems, needRequests, searchQuery, selectedType, selectedCategory]);

  // Filtered Transfers
  const filteredTransfers = useMemo(() => {
    if (selectedType === 'SURPLUS' || selectedType === 'NEED') return []; // If only surplus/need selected, hide arcs

    return transfers.filter(tr => {
      if (!tr.from_lat || !tr.to_lat) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match = 
          tr.item_summary.toLowerCase().includes(q) ||
          tr.from_school_name.toLowerCase().includes(q) ||
          tr.to_school_name.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [transfers, selectedType, searchQuery]);

  // Active filters count
  const activeFiltersCount = (searchQuery.trim() ? 1 : 0) + (selectedType !== 'ALL' ? 1 : 0) + (selectedCategory !== 'ALL' ? 1 : 0);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedType('ALL');
    setSelectedCategory('ALL');
  };

  return (
    <div className="relative w-full h-[580px] rounded-3xl overflow-hidden border border-slate-200/90 shadow-sm bg-slate-50">
      
      {/* Floating Toggle Button for Right Filter Sidebar (Shown when sidebar is collapsed) */}
      {!isFilterPanelOpen && (
        <div className="absolute top-3.5 right-3.5 z-30 flex items-center space-x-2 pointer-events-auto animate-in fade-in duration-200">
          <button
            onClick={() => setIsFilterPanelOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 text-slate-700 hover:text-slate-900 font-bold text-xs shadow-md transition-all hover:bg-slate-50 cursor-pointer"
            title={t('map.filter.expand')}
          >
            <Filter className="w-3.5 h-3.5 text-amber-600" />
            <span className="inline">{t('map.filter.expand')}</span>
            {activeFiltersCount > 0 && (
              <span className="flex h-4 w-4 rounded-full bg-amber-500 text-white text-[10px] font-black items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
            <ChevronLeft className="w-3.5 h-3.5 ml-0.5 text-slate-400" />
          </button>
        </div>
      )}

      {/* Floating Basemap Theme Switcher Pill (Top-Left) */}
      <div className="absolute top-3.5 left-14 z-20 hidden sm:flex items-center space-x-1 p-1 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-md text-xs pointer-events-auto">
        <button
          onClick={() => setBaseMapStyle('esri')}
          className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${baseMapStyle === 'esri' ? 'bg-amber-100 text-amber-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
        >
          🌿 {t('map.filter.baseClean')}
        </button>
        <button
          onClick={() => setBaseMapStyle('hot')}
          className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${baseMapStyle === 'hot' ? 'bg-amber-100 text-amber-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
        >
          ☀️ {t('map.filter.baseWarm')}
        </button>
        <button
          onClick={() => setBaseMapStyle('osm')}
          className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${baseMapStyle === 'osm' ? 'bg-amber-100 text-amber-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
        >
          🗺️ OSM
        </button>
      </div>

      {/* RIGHT FILTER SIDEBAR (Sağ Panel Filtreleme) */}
      {isFilterPanelOpen && (
        <aside className="absolute top-3.5 right-3.5 bottom-3.5 z-20 w-[290px] sm:w-[320px] max-w-[calc(100%-28px)] bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xl flex flex-col pointer-events-auto transition-all animate-in fade-in duration-200 overflow-hidden">
          
          {/* Panel Header */}
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                <Filter className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-slate-900">
                  {t('map.filter.panelTitle')}
                </h3>
                <p className="text-[10px] text-slate-500 font-medium">
                  {t('map.filter.showingResults', { schools: filteredSchools.length, items: surplusItems.length + needRequests.length })}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsFilterPanelOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title={t('map.filter.collapse')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Filter Controls */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs">
            
            {/* Search Input */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 block">
                {t('map.filter.searchLabel')}
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('map.filter.searchPlaceholder')}
                  className="w-full pl-8 pr-7 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs font-medium placeholder-slate-400 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Layer / Type Segmented Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 block">
                {t('map.filter.typeTitle')}
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setSelectedType('ALL')}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-bold text-left transition-all border flex items-center space-x-1.5 ${
                    selectedType === 'ALL'
                      ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-2xs'
                      : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>🌟</span>
                  <span className="truncate">{t('map.filter.typeAll')}</span>
                </button>

                <button
                  onClick={() => setSelectedType('SURPLUS')}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-bold text-left transition-all border flex items-center space-x-1.5 ${
                    selectedType === 'SURPLUS'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-2xs'
                      : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Package className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">{t('map.filter.typeSurplus')}</span>
                </button>

                <button
                  onClick={() => setSelectedType('NEED')}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-bold text-left transition-all border flex items-center space-x-1.5 ${
                    selectedType === 'NEED'
                      ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-2xs'
                      : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <HeartHandshake className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="truncate">{t('map.filter.typeNeed')}</span>
                </button>

                <button
                  onClick={() => setSelectedType('TRANSFERS')}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-bold text-left transition-all border flex items-center space-x-1.5 ${
                    selectedType === 'TRANSFERS'
                      ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-2xs'
                      : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="truncate">{t('map.filter.typeTransfers')}</span>
                </button>
              </div>
            </div>

            {/* Category Filter Chips */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 block">
                {t('map.filter.categoryTitle')}
              </label>
              <div className="flex flex-wrap gap-1">
                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all border flex items-center space-x-1 ${
                        isSelected
                          ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                          : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Filter Metric Summary Box */}
            <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/70 space-y-1 text-[11px]">
              <div className="flex items-center justify-between text-amber-950 font-bold">
                <span>{t('hero.schoolsTitle')}:</span>
                <span className="font-extrabold">{filteredSchools.length} / {schools.length}</span>
              </div>
              <div className="flex items-center justify-between text-amber-900 font-medium">
                <span>{t('map.legend.surplusDepot')}:</span>
                <span className="font-bold">{surplusItems.length}</span>
              </div>
              <div className="flex items-center justify-between text-amber-900 font-medium">
                <span>{t('map.legend.openNeed')}:</span>
                <span className="font-bold">{needRequests.length}</span>
              </div>
              <div className="flex items-center justify-between text-amber-900 font-medium">
                <span>{t('map.legend.transferRoute')}:</span>
                <span className="font-bold">{filteredTransfers.length}</span>
              </div>
            </div>

          </div>

          {/* Panel Footer with Reset Action */}
          <div className="p-3 border-t border-slate-100 bg-slate-50/50 shrink-0">
            {activeFiltersCount > 0 ? (
              <button
                onClick={handleResetFilters}
                className="w-full py-2 px-3 rounded-xl bg-slate-200/80 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors flex items-center justify-center space-x-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                <span>{t('map.filter.reset')}</span>
              </button>
            ) : (
              <div className="text-center text-[10px] text-slate-400 font-medium">
                ⚡ {t('map.subtitle')}
              </div>
            )}
          </div>

        </aside>
      )}

      {/* Interactive Map Component */}
      <MapContainer
        center={defaultCenter}
        zoom={12}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        {/* Calmer, minimal, aesthetic CartoDB TileLayer (with Positron & OSM toggle) */}
        <TileLayer
          attribution={baseMapLayers[baseMapStyle].attribution}
          url={baseMapLayers[baseMapStyle].url}
          subdomains="abcd"
          maxZoom={19}
        />

        {/* Transfer Bézier Arcs (Filtered) */}
        {filteredTransfers.map((tItem, idx) => {
          const curve = getCurvedPath(tItem.from_lat, tItem.from_lng, tItem.to_lat, tItem.to_lng);
          return (
            <Polyline
              key={tItem.id || idx}
              positions={curve}
              pathOptions={{
                color: '#F59E0B',
                weight: 3.5,
                opacity: 0.9,
                dashArray: '8, 8',
                lineCap: 'round'
              }}
            >
              <Popup>
                <div className="p-2 space-y-2 text-xs max-w-xs font-sans">
                  <div className="flex items-center space-x-1.5 text-amber-700 font-bold">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>{t('map.popup.transferBadge')}</span>
                  </div>
                  <div className="font-semibold text-slate-900 text-sm">
                    {tItem.item_summary} ({tItem.quantity})
                  </div>
                  <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-100">
                    <span className="truncate max-w-[100px] font-medium">{tItem.from_school_name}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0 mx-1" />
                    <span className="truncate max-w-[100px] font-medium text-emerald-700">{tItem.to_school_name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px] bg-amber-50 p-2 rounded-lg font-medium text-amber-900">
                    <div>💰 {t('map.popup.savings')}: {currencySymbol}{Number(tItem.estimated_savings_tl).toLocaleString(locale)}</div>
                    <div>🌿 {t('map.popup.co2')}: {Number(tItem.prevented_co2_kg).toFixed(1)} kg</div>
                  </div>
                </div>
              </Popup>
            </Polyline>
          );
        })}

        {/* Dynamic Clustered Markers (Zoom-out auto-merge into clusters, zoom-in expand to product cards) */}
        <ClusteredMarkersLayer
          schools={filteredSchools}
          surplusItems={surplusItems}
          needRequests={needRequests}
          onOpenSurplus={onOpenSurplus}
          onOpenNeed={onOpenNeed}
          t={t}
          locale={locale}
          currencySymbol={currencySymbol}
        />

      </MapContainer>
    </div>
  );
};
