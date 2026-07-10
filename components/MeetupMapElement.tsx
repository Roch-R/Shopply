"use client";
import { useEffect, useRef } from "react";
import L from "leaflet";

interface MeetupMapElementProps {
  myId: number;
  peerId: number;
  myName: string;
  peerName: string;
  myLocation: { lat: number; lng: number } | null;
  peerLocation: { lat: number; lng: number } | null;
  meetupPoint: { lat: number; lng: number } | null;
  onSetMeetupPoint: (point: { lat: number; lng: number }) => void;
}

export default function MeetupMapElement({
  myId,
  peerId,
  myName,
  peerName,
  myLocation,
  peerLocation,
  meetupPoint,
  onSetMeetupPoint,
}: MeetupMapElementProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const myMarkerRef = useRef<L.Marker | null>(null);
  const peerMarkerRef = useRef<L.Marker | null>(null);
  const meetupMarkerRef = useRef<L.Marker | null>(null);
  const lineRef = useRef<L.Polyline | null>(null);

  // Helper to create custom HTML/CSS pulsing pin icons
  const createCustomIcon = (color: string, label: string, isPulsing = false) => {
    return L.divIcon({
      html: `
        <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; transform: translate(-3px, -3px);">
          ${
            isPulsing
              ? `
            <div style="
              position: absolute;
              width: 50px;
              height: 50px;
              border-radius: 50%;
              background: ${color};
              opacity: 0.3;
              animation: map-ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
            "></div>
          `
              : ""
          }
          <svg viewBox="0 0 24 24" width="36" height="36" style="filter: drop-shadow(0px 3px 6px rgba(0,0,0,0.35)); position: relative; z-index: 10;">
            <path d="M12 2a8 8 0 00-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 00-8-8z" fill="${color}"/>
            <circle cx="12" cy="10" r="3.5" fill="#fff"/>
          </svg>
          <div style="
            position: absolute;
            bottom: -22px;
            background: rgba(15, 23, 42, 0.85);
            color: #fff;
            font-size: 10px;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 4px;
            white-space: nowrap;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            border: 0.5px solid rgba(255,255,255,0.15);
            z-index: 12;
          ">${label}</div>
        </div>
        <style>
          @keyframes map-ping {
            0% { transform: scale(0.4); opacity: 0.6; }
            100% { transform: scale(1.6); opacity: 0; }
          }
        </style>
      `,
      className: "",
      iconSize: [36, 36],
      iconAnchor: [18, 36],
    });
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Use default coordinates (Manila, Philippines) if no locations exist yet
    const initialLat = myLocation?.lat || peerLocation?.lat || 14.5995;
    const initialLng = myLocation?.lng || peerLocation?.lng || 120.9842;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
    }).setView([initialLat, initialLng], 15);

    // Load OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Add zoom control at bottom-right
    L.control.zoom({ position: "bottomright" }).addTo(map);

    mapRef.current = map;

    // Map Click to Suggest Meetup Point
    map.on("click", (e: L.LeafletMouseEvent) => {
      onSetMeetupPoint({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Markers, Lines, and Center viewport to encompass markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const bounds: L.LatLngExpression[] = [];

    // 1. Plot My Location
    if (myLocation) {
      const latlng: L.LatLngExpression = [myLocation.lat, myLocation.lng];
      bounds.push(latlng);

      if (myMarkerRef.current) {
        myMarkerRef.current.setLatLng(latlng);
      } else {
        myMarkerRef.current = L.marker(latlng, {
          icon: createCustomIcon("#2563eb", `${myName} (You)`, true),
        }).addTo(map);
      }
    } else if (myMarkerRef.current) {
      map.removeLayer(myMarkerRef.current);
      myMarkerRef.current = null;
    }

    // 2. Plot Peer Location
    if (peerLocation) {
      const latlng: L.LatLngExpression = [peerLocation.lat, peerLocation.lng];
      bounds.push(latlng);

      if (peerMarkerRef.current) {
        peerMarkerRef.current.setLatLng(latlng);
      } else {
        peerMarkerRef.current = L.marker(latlng, {
          icon: createCustomIcon("#ef4444", peerName, true),
        }).addTo(map);
      }
    } else if (peerMarkerRef.current) {
      map.removeLayer(peerMarkerRef.current);
      peerMarkerRef.current = null;
    }

    // 3. Draw dotted line connecting Buyer & Seller
    if (myLocation && peerLocation) {
      const path: L.LatLngExpression[] = [
        [myLocation.lat, myLocation.lng],
        [peerLocation.lat, peerLocation.lng],
      ];
      if (lineRef.current) {
        lineRef.current.setLatLngs(path);
      } else {
        lineRef.current = L.polyline(path, {
          color: "#6366f1",
          weight: 3,
          dashArray: "6, 8",
          opacity: 0.7,
        }).addTo(map);
      }
    } else if (lineRef.current) {
      map.removeLayer(lineRef.current);
      lineRef.current = null;
    }

    // 4. Plot Meetup Suggested Point
    if (meetupPoint) {
      const latlng: L.LatLngExpression = [meetupPoint.lat, meetupPoint.lng];
      bounds.push(latlng);

      if (meetupMarkerRef.current) {
        meetupMarkerRef.current.setLatLng(latlng);
      } else {
        meetupMarkerRef.current = L.marker(latlng, {
          icon: createCustomIcon("#10b981", "Suggested Meet-up", false),
          draggable: true,
        }).addTo(map);

        // When user drags suggested point, update Firestore coordinates
        meetupMarkerRef.current.on("dragend", (e: any) => {
          const newPos = e.target.getLatLng();
          onSetMeetupPoint({ lat: newPos.lat, lng: newPos.lng });
        });
      }
    } else if (meetupMarkerRef.current) {
      map.removeLayer(meetupMarkerRef.current);
      meetupMarkerRef.current = null;
    }

    // Fit map bounds to show all markers together
    if (bounds.length > 1) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [50, 50] });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 16);
    }
  }, [myLocation, peerLocation, meetupPoint, myName, peerName]);

  return <div ref={mapContainerRef} style={{ width: "100%", height: "100%", borderRadius: 16 }} />;
}
