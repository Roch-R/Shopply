"use client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Dynamically load the Leaflet Map element (SSR disabled) to prevent window reference errors during build compilation
const MeetupMapElement = dynamic(() => import("./MeetupMapElement"), {
  ssr: false,
  loading: () => (
    <div style={{ width: "100%", height: "100%", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 16 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ display: "inline-block", width: 40, height: 40, border: "4px solid #f3f3f3", borderTopColor: "#10b981", borderRadius: "50%", animation: "map-spin 1s linear infinite" }}></div>
        <p style={{ marginTop: 12, fontSize: 14, color: "#64748b", fontWeight: 500 }}>Loading Shopply Map...</p>
        <style>{`
          @keyframes map-spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </div>
  ),
});

interface MeetupMapProps {
  myId: number;
  peerId: number;
  myName: string;
  peerName: string;
  onClose: () => void;
}

export default function MeetupMap({ myId, peerId, myName, peerName, onClose }: MeetupMapProps) {
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [peerLocation, setPeerLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [meetupPoint, setMeetupPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [trackingActive, setTrackingActive] = useState(false);

  // Deterministic chatId between these two users
  const chatId = myId < peerId ? `${myId}_${peerId}` : `${peerId}_${myId}`;

  // Dynamically inject Leaflet stylesheet on mount
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // Sync Locations with Firestore in real-time
  useEffect(() => {
    const meetupDocRef = doc(db, "meetups", chatId);

    // Subscribe to updates from peer and meetup point
    const unsubscribe = onSnapshot(meetupDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        
        // Retrieve peer's location
        const isBuyer = myId < peerId; // Determine role by ID ordering
        const peerLoc = isBuyer ? data.sellerLocation : data.buyerLocation;
        if (peerLoc) {
          setPeerLocation({ lat: peerLoc.lat, lng: peerLoc.lng });
        }

        // Retrieve agreed meetup point
        if (data.meetupPoint) {
          setMeetupPoint({ lat: data.meetupPoint.lat, lng: data.meetupPoint.lng });
        }
      }
    });

    // Start watching user's GPS position
    let watchId: number | null = null;
    if ("geolocation" in navigator) {
      setTrackingActive(true);
      watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const currentLoc = { lat, lng };
          setMyLocation(currentLoc);

          // Write current location to Firestore
          const isBuyer = myId < peerId;
          const payload = isBuyer 
            ? { buyerLocation: { lat, lng, updated_at: Date.now() } }
            : { sellerLocation: { lat, lng, updated_at: Date.now() } };

          try {
            await setDoc(meetupDocRef, payload, { merge: true });
          } catch (e) {
            console.error("[MeetupMap] Firestore write error:", e);
          }
        },
        (err) => {
          console.warn("[MeetupMap] Geolocation error:", err.message);
          setErrorMsg("Please enable GPS/Location access on your phone to track coordinates.");
          setTrackingActive(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      setErrorMsg("GPS tracking is not supported by your browser/device.");
    }

    return () => {
      unsubscribe();
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [chatId, myId, peerId]);

  // Calculate direct distance using Haversine formula
  useEffect(() => {
    if (!myLocation || !peerLocation) {
      setDistance(null);
      return;
    }

    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371e3; // Earth radius in meters
    const dLat = toRad(peerLocation.lat - myLocation.lat);
    const dLng = toRad(peerLocation.lng - myLocation.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(myLocation.lat)) *
        Math.cos(toRad(peerLocation.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c;

    setDistance(Math.round(dist)); // distance in meters
  }, [myLocation, peerLocation]);

  // Handle setting meetup coordinate marker
  const handleSetMeetupPoint = async (point: { lat: number; lng: number }) => {
    setMeetupPoint(point);
    const meetupDocRef = doc(db, "meetups", chatId);
    try {
      await setDoc(meetupDocRef, {
        meetupPoint: {
          lat: point.lat,
          lng: point.lng,
          set_by: myId,
          updated_at: Date.now()
        }
      }, { merge: true });
    } catch (e) {
      console.error("[MeetupMap] Failed to save meetup point:", e);
    }
  };

  // Suggest meetup point directly in the center of user's current view
  const handleSuggestCenterPoint = () => {
    if (myLocation) {
      handleSetMeetupPoint(myLocation);
    } else if (peerLocation) {
      handleSetMeetupPoint(peerLocation);
    }
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(15, 23, 42, 0.65)",
      backdropFilter: "blur(12px)",
      zIndex: 99999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{
        background: "#fff",
        borderRadius: 24,
        width: "100%",
        maxWidth: 900,
        height: "80vh",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.2)"
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 24px",
          borderBottom: "1px solid #f1f5f9",
          display: "flex",
          alignItems: "center",
          justifyContent: "between",
          background: "#fff"
        }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: "0 0 4px" }}>
              📍 Live Meet-up Location Tracker
            </h3>
            <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
              Tracking locations with <span style={{ fontWeight: 600, color: "#10b981" }}>{peerName}</span>. Click on the map to suggest a meetup point!
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#f1f5f9",
              border: "none",
              width: 36,
              height: 36,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#64748b",
              fontWeight: 700,
              cursor: "pointer",
              transition: "background 0.2s"
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#e2e8f0"}
            onMouseLeave={e => e.currentTarget.style.background = "#f1f5f9"}
          >
            ✕
          </button>
        </div>

        {/* Map Area */}
        <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
          <MeetupMapElement
            myId={myId}
            peerId={peerId}
            myName={myName}
            peerName={peerName}
            myLocation={myLocation}
            peerLocation={peerLocation}
            meetupPoint={meetupPoint}
            onSetMeetupPoint={handleSetMeetupPoint}
          />

          {/* Left Overlay Overlay Info Card */}
          <div style={{
            position: "absolute",
            top: 16,
            left: 16,
            zIndex: 1000,
            background: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(8px)",
            padding: 16,
            borderRadius: 16,
            color: "#fff",
            width: 260,
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
            border: "0.5px solid rgba(255,255,255,0.15)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: trackingActive ? "#10b981" : "#ef4444",
                animation: trackingActive ? "pulse-tracking 1s infinite" : "none"
              }}></span>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: trackingActive ? "#10b981" : "#ef4444" }}>
                {trackingActive ? "Live GPS Tracking Active" : "GPS Tracking Offline"}
              </span>
            </div>

            {errorMsg && (
              <p style={{ fontSize: 12, color: "#fca5a5", margin: "0 0 12px", lineHeight: 1.4 }}>
                ⚠️ {errorMsg}
              </p>
            )}

            <div style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: "#94a3b8", display: "block" }}>DISTANCE TO SELLER</span>
              <span style={{ fontSize: 24, fontWeight: 800, color: "#fff" }}>
                {distance !== null ? `${distance} meters` : "Calculating..."}
              </span>
            </div>

            <div>
              <span style={{ fontSize: 11, color: "#94a3b8", display: "block", marginBottom: 4 }}>MEET-UP SPOT</span>
              {meetupPoint ? (
                <div style={{ fontSize: 12, color: "#34d399", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                  <span>✓ Suggested point set!</span>
                </div>
              ) : (
                <button
                  onClick={handleSuggestCenterPoint}
                  disabled={!myLocation && !peerLocation}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "#10b981",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#059669"}
                  onMouseLeave={e => e.currentTarget.style.background = "#10b981"}
                >
                  Suggest My Location
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes pulse-tracking {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
