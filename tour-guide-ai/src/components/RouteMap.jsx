import { useEffect, useMemo, useState } from "react";
import {
    MapContainer,
    TileLayer,
    Polyline,
    Marker,
    Popup,
    useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/*
  RouteMap.jsx

  IMPORTANT:
  This component does NOT calculate a second route.
  App.jsx calculates the route using OSRM and passes the exact OSRM
  GeoJSON geometry here. This prevents the map and route cards from
  showing different routes.

  Expected App.jsx props:
    - from: display name
    - to: display name
    - routeData: {
        from: { lat, lon, name },
        to: { lat, lon, name },
        routes: [
          {
            distance,
            duration,
            geometry: {
              type: "LineString",
              coordinates: [[lon, lat], ...]
            }
          }
        ]
      }
    - selectedRouteData: the currently selected route card object
      containing rawRoute
*/

const INDIA_CENTER = [22.9734, 78.6569];

function createIcon(type) {
    const background =
        type === "start"
            ? "#5A1F2B"
            : "#8F3A4A";

    const symbol = type === "start" ? "A" : "B";

    return L.divIcon({
        className: "safar-map-marker",
        html: `
      <div style="
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: ${background};
        color: #FCF8F2;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 14px;
        border: 3px solid #FCF8F2;
        box-shadow: 0 4px 14px rgba(59, 23, 32, 0.35);
      ">
        ${symbol}
      </div>
    `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -18],
    });
}

function FitRoute({ positions }) {
    const map = useMap();

    useEffect(() => {
        if (!positions?.length) return;

        const bounds = L.latLngBounds(positions);

        if (bounds.isValid()) {
            map.fitBounds(bounds, {
                padding: [45, 45],
                maxZoom: 12,
                animate: true,
            });
        }
    }, [map, positions]);

    return null;
}

function MapResizeFix() {
    const map = useMap();

    useEffect(() => {
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 250);

        return () => clearTimeout(timer);
    }, [map]);

    return null;
}

function RouteMap({
    from,
    to,
    routeData,
    selectedRouteData,
}) {
    const [mapError, setMapError] = useState("");

    const route = selectedRouteData?.rawRoute;

    const positions = useMemo(() => {
        const geometry = route?.geometry;

        if (
            !geometry ||
            geometry.type !== "LineString" ||
            !Array.isArray(geometry.coordinates)
        ) {
            return [];
        }

        return geometry.coordinates
            .filter(
                (point) =>
                    Array.isArray(point) &&
                    point.length >= 2 &&
                    Number.isFinite(Number(point[0])) &&
                    Number.isFinite(Number(point[1]))
            )
            .map(([lon, lat]) => [Number(lat), Number(lon)]);
    }, [route]);

    const start = routeData?.from
        ? [Number(routeData.from.lat), Number(routeData.from.lon)]
        : null;

    const end = routeData?.to
        ? [Number(routeData.to.lat), Number(routeData.to.lon)]
        : null;

    useEffect(() => {
        if (!routeData || !route) {
            setMapError("Waiting for route data...");
            return;
        }

        if (!positions.length) {
            setMapError(
                "The routing service returned a route without map geometry."
            );
            return;
        }

        setMapError("");
    }, [routeData, route, positions]);

    if (!routeData || !start || !end) {
        return (
            <div className="route-map-empty">
                <span>🗺️</span>
                <strong>Route map will appear here</strong>
                <small>Enter your starting point and destination.</small>
            </div>
        );
    }

    if (mapError) {
        return (
            <div className="route-map-empty">
                <span>⚠️</span>
                <strong>Map route unavailable</strong>
                <small>{mapError}</small>
            </div>
        );
    }

    const distanceKm = route.distance
        ? (route.distance / 1000).toFixed(1)
        : selectedRouteData?.distanceKm?.toFixed(1);

    const durationHours = route.duration
        ? Math.round(route.duration / 60)
        : Math.round((selectedRouteData?.durationSeconds || 0) / 60);

    return (
        <div
            className="safar-route-map"
            style={{
                width: "100%",
                height: "520px",
                minHeight: "420px",
                borderRadius: "20px",
                overflow: "hidden",
                position: "relative",
            }}
        >
            <MapContainer
                center={INDIA_CENTER}
                zoom={5}
                scrollWheelZoom={true}
                style={{
                    width: "100%",
                    height: "100%",
                }}
            >
                <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapResizeFix />

                <FitRoute positions={positions} />

                <Polyline
                    positions={positions}
                    pathOptions={{
                        color: "#5A1F2B",
                        weight: 7,
                        opacity: 0.92,
                        lineCap: "round",
                        lineJoin: "round",
                    }}
                />

                <Polyline
                    positions={positions}
                    pathOptions={{
                        color: "#E8D8CC",
                        weight: 2,
                        opacity: 0.95,
                        lineCap: "round",
                        lineJoin: "round",
                    }}
                />

                <Marker
                    position={start}
                    icon={createIcon("start")}
                >
                    <Popup>
                        <strong>Starting Point</strong>
                        <br />
                        {routeData.from.name || from}
                    </Popup>
                </Marker>

                <Marker
                    position={end}
                    icon={createIcon("end")}
                >
                    <Popup>
                        <strong>Destination</strong>
                        <br />
                        {routeData.to.name || to}
                    </Popup>
                </Marker>
            </MapContainer>

            <div
                style={{
                    position: "absolute",
                    zIndex: 1000,
                    top: 16,
                    left: 16,
                    background: "#FCF8F2",
                    color: "#3B1720",
                    padding: "12px 16px",
                    borderRadius: "14px",
                    boxShadow: "0 5px 18px rgba(59, 23, 32, 0.18)",
                    fontSize: "13px",
                }}
            >
                <strong>
                    {from} → {to}
                </strong>
                <div style={{ marginTop: 4 }}>
                    {distanceKm} km · {Math.floor(durationHours / 60)}h{" "}
                    {durationHours % 60}m
                </div>
            </div>
        </div>
    );
}

export default RouteMap;
