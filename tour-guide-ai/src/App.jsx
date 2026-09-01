import { useState, useEffect } from "react";;
import {
  MapPin,
  CalendarDays,
  Wallet,
  Users,
  Navigation,
  ShieldCheck,
  CloudRain,
  Snowflake,
  Wind,
  Thermometer,
  Eye,
  Route,
  Clock,
  IndianRupee,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Mountain,
  Search,
  ChevronRight,
} from "lucide-react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

import "./App.css";
function RouteMap({ from, to, routeType }) {
  const [locations, setLocations] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [error, setError] = useState("");
  const [selectedRoute, setSelectedRoute] = useState("safest");

  useEffect(() => {
    const getRoute = async () => {
      try {
        setError("");

        // Geocode starting location
        const fromResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            from + ", India"
          )}&limit=1`
        );

        const fromData = await fromResponse.json();

        // Geocode destination
        const toResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            to + ", India"
          )}&limit=1`
        );

        const toData = await toResponse.json();

        if (!fromData.length || !toData.length) {
          setError("Could not find one of the locations.");
          return;
        }

        const start = {
          lat: Number(fromData[0].lat),
          lon: Number(fromData[0].lon),
        };

        const destination = {
          lat: Number(toData[0].lat),
          lon: Number(toData[0].lon),
        };

        setLocations({
          start,
          destination,
        });

        // Get actual road route
        const routeResponse = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${start.lon},${start.lat};${destination.lon},${destination.lat}?overview=full&geometries=geojson&alternatives=true`
        );

        const routeData = await routeResponse.json();

        if (
          routeData.routes &&
          routeData.routes.length > 0
        ) {
          const allRoutes = routeData.routes.map((route) =>
            route.geometry.coordinates.map(
              ([lon, lat]) => [lat, lon]
            )
          );

          setRoutes(allRoutes);
        }
      } catch (err) {
        console.error("Map error:", err);
        setError("Unable to load route.");
      }
    };

    if (from && to) {
      getRoute();
    }
  }, [from, to]);

  if (error) {
    return (
      <div className="map-error">
        <MapPin size={25} />
        <p>{error}</p>
      </div>
    );
  }

  if (!locations) {
    return (
      <div className="map-loading">
        <Navigation size={25} />
        <p>Finding your route...</p>
      </div>
    );
  }

  const startPosition = [
    locations.start.lat,
    locations.start.lon,
  ];

  const destinationPosition = [
    locations.destination.lat,
    locations.destination.lon,
  ];

  return (
    <MapContainer
      center={startPosition}
      zoom={6}
      scrollWheelZoom={true}
      className="real-map"
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Marker position={startPosition}>
        <Popup>
          <strong>Starting Point</strong>
          <br />
          {from}
        </Popup>
      </Marker>

      <Marker position={destinationPosition}>
        <Popup>
          <strong>Destination</strong>
          <br />
          {to}
        </Popup>
      </Marker>

      {routes.length > 0 && (
        <>
          {routes.map((route, index) => (
            <Polyline
              key={index}
              positions={route}
              pathOptions={{
                weight: 4,
                opacity: 0.35,
              }}
            />
          ))}

          {routes[0] && (
            <Polyline
              positions={
                routes[
                routeType === "shortest"
                  ? 0
                  : routeType === "cheapest"
                    ? Math.min(1, routes.length - 1)
                    : routeType === "safest"
                      ? 0
                      : Math.min(2, routes.length - 1)
                ]
              }
              pathOptions={{
                weight: 7,
                opacity: 1,
              }}
            />
          )}
        </>
      )}

      <MapBounds
        start={startPosition}
        destination={destinationPosition}
      />
    </MapContainer>
  );
}

function MapBounds({ start, destination }) {
  const map = useMap();

  useEffect(() => {
    const bounds = L.latLngBounds([
      start,
      destination,
    ]);

    map.fitBounds(bounds, {
      padding: [50, 50],
    });
  }, [map, start, destination]);

  return null;
}

function App() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState("");
  const [budget, setBudget] = useState("");
  const [travelers, setTravelers] = useState(1);
  const [preference, setPreference] = useState("balanced");
  const [showResults, setShowResults] = useState(false);
  const [riskResult, setRiskResult] = useState(null);
  const [loadingRisk, setLoadingRisk] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState("safest");

  const planTrip = async (e) => {
    e.preventDefault();

    if (!from || !to || !date || !budget) {
      alert("Please fill in all required fields.");
      return;
    }

    setLoadingRisk(true);

    try {
      const weatherData = {
        temperature: 22,
        humidity: 75,
        rainfall: 25,
        wind_speed: 25,
        snowfall: 0,
        visibility: 5,
      };

      const response = await fetch(
        "http://127.0.0.1:5000/predict-risk",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(weatherData),
        }
      );

      const result = await response.json();

      console.log("ANN Result:", result);

      if (!result.success) {
        throw new Error(result.error || "Risk prediction failed");
      }

      setRiskResult(result);
      setShowResults(true);

      setTimeout(() => {
        document
          .getElementById("results")
          ?.scrollIntoView({ behavior: "smooth" });
      }, 100);

    } catch (error) {
      console.error("ANN connection error:", error);

      alert(
        "Unable to connect to the AI risk prediction server. Make sure Flask is running."
      );

    } finally {
      setLoadingRisk(false);
    }
  };

  return (
    <div className="app">

      {/* NAVBAR */}
      <nav className="navbar">
        <div className="logo">
          <div className="logo-icon">
            <Navigation size={21} />
          </div>

          <span>Safar<span className="logo-highlight"></span></span>
        </div>

        <div className="nav-links">
          <a href="#planner">Plan Trip</a>
          <a href="#routes">Routes</a>
          <a href="#risk">Risk AI</a>
          <a href="#weather">Weather</a>
        </div>

        <button className="nav-button">
          <Sparkles size={16} />
          AI Planner
        </button>
      </nav>

      {/* HERO */}
      <section className="hero">

        <div className="hero-background"></div>

        <div className="hero-content">



          <h1>
            Explore More.
            <br />
            <span>Travel Smarter.</span>
            <br />
            Stay Safer.
          </h1>

          <p>
            Plan your perfect journey, compare routes, manage your budget,
            and predict travel risks using Artificial Intelligence.
          </p>

          <button
            className="hero-button"
            onClick={() =>
              document
                .getElementById("planner")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Start Planning
            <ArrowRight size={20} />
          </button>

        </div>

        <div className="floating-card card-one">
          <ShieldCheck size={20} />
          <div>
            <strong>AI Safety</strong>
            <small>Risk prediction active</small>
          </div>
        </div>

        <div className="floating-card card-two">
          <CloudRain size={20} />
          <div>
            <strong>Weather Aware</strong>
            <small>Forecast monitored</small>
          </div>
        </div>

      </section>

      {/* PLANNER */}
      <section className="planner-section" id="planner">

        <div className="section-heading">
          <span>PLAN YOUR JOURNEY</span>
          <h2>Where are you heading?</h2>
          <p>
            Tell us about your trip and let AI find the best routes for you.
          </p>
        </div>

        <form className="planner-card" onSubmit={planTrip}>

          <div className="input-group">

            <label>
              <MapPin size={16} />
              Leaving From
            </label>

            <div className="input-wrapper">
              <Search size={18} />
              <input
                type="text"
                placeholder="e.g. Delhi"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>

          </div>

          <div className="route-arrow">
            <ArrowRight size={20} />
          </div>

          <div className="input-group">

            <label>
              <MapPin size={16} />
              Going To
            </label>

            <div className="input-wrapper">
              <Search size={18} />
              <input
                type="text"
                placeholder="e.g. Leh"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>

          </div>

          <div className="input-group">

            <label>
              <CalendarDays size={16} />
              Travel Date
            </label>

            <div className="input-wrapper">
              <CalendarDays size={18} />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

          </div>

          <div className="input-group">

            <label>
              <Wallet size={16} />
              Budget
            </label>

            <div className="input-wrapper">
              <IndianRupee size={18} />
              <input
                type="number"
                placeholder="₹ 10,000"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </div>

          </div>

          <div className="input-group">

            <label>
              <Users size={16} />
              Travelers
            </label>

            <div className="input-wrapper">
              <Users size={18} />

              <input
                type="number"
                min="1"
                value={travelers}
                onChange={(e) => setTravelers(e.target.value)}
              />
            </div>

          </div>

          <div className="input-group">

            <label>Travel Preference</label>

            <select
              value={preference}
              onChange={(e) => setPreference(e.target.value)}
            >
              <option value="balanced">⚖️ Balanced</option>
              <option value="fastest">⚡ Fastest</option>
              <option value="cheapest">💰 Cheapest</option>
              <option value="shortest">🛣️ Shortest</option>
              <option value="safest">🛡️ Safest</option>
            </select>

          </div>

          <button className="plan-button" type="submit">
            <Sparkles size={19} />
            Plan My Journey
          </button>

        </form>

      </section>

      {/* RESULTS */}
      {showResults && (
        <section className="results-section" id="results">

          <div className="trip-summary">

            <div>
              <span>Your Journey</span>

              <h2>
                {from}
                <ArrowRight size={25} />
                {to}
              </h2>
            </div>

            <div className="summary-details">
              <span>📅 {date}</span>
              <span>💰 ₹{Number(budget).toLocaleString()}</span>
              <span>👥 {travelers} traveler{travelers > 1 ? "s" : ""}</span>
            </div>

          </div>

          {/* MAP */}
          <div className="map-card" id="route-map">

            <div className="map-overlay">
              <Route size={18} />
              Live Route Preview
            </div>
            <RouteMap
              from={from}
              to={to}
              routeType={selectedRoute}
            />

          </div>

          {/* ROUTES */}
          <div className="section-heading left" id="routes">

            <span>ROUTE OPTIONS</span>

            <h2>
              Choose your way
            </h2>

            <p>
              AI has compared different routes based on distance, time,
              cost and predicted safety.
            </p>

          </div>

          <div className="route-grid">

            <RouteCard
              icon="🛣️"
              title="Shortest Route"
              distance="850 km"
              time="14h 20m"
              cost="₹6,500"
              risk="Low"
              riskClass="low"
              routeType="shortest"
              selectedRoute={selectedRoute}
              onSelectRoute={setSelectedRoute}
            />

            <RouteCard
              icon="💰"
              title="Cheapest Route"
              distance="910 km"
              time="16h 10m"
              cost="₹4,800"
              risk="Medium"
              riskClass="medium"
              routeType="cheapest"
              selectedRoute={selectedRoute}
              onSelectRoute={setSelectedRoute}
            />

            <RouteCard
              icon="🛡️"
              title="Safest Route"
              distance="880 km"
              time="15h"
              cost="₹6,200"
              risk="Low"
              riskClass="low"
              routeType="safest"
              recommended
              selectedRoute={selectedRoute}
              onSelectRoute={setSelectedRoute}
            />

            <RouteCard
              icon="⛰️"
              title="Longest Route"
              distance="1,050 km"
              time="19h"
              cost="₹7,100"
              risk="Medium"
              riskClass="medium"
              routeType="longest"
              selectedRoute={selectedRoute}
              onSelectRoute={setSelectedRoute}
            />

          </div>

          {/* AI RISK */}
          <RiskDashboard
            riskResult={riskResult}
            loadingRisk={loadingRisk}
          />

          {/* WEATHER */}
          <WeatherSection />

        </section>
      )}

      {/* DEFAULT FEATURES */}
      {!showResults && (
        <section className="features-section">

          <div className="section-heading">

            <span>WHY SAFAR AI?</span>

            <h2>
              Your journey,
              <br />
              powered by intelligence.
            </h2>

          </div>

          <div className="feature-grid">

            <FeatureCard
              icon={<Route />}
              title="Smart Routes"
              text="Compare shortest, cheapest, longest and safest routes."
            />

            <FeatureCard
              icon={<ShieldCheck />}
              title="AI Risk Prediction"
              text="Our ANN model analyzes weather conditions to estimate travel risk."
            />

            <FeatureCard
              icon={<CloudRain />}
              title="Weather Aware"
              text="Monitor rainfall, snowfall, wind and other weather conditions."
            />

            <FeatureCard
              icon={<Wallet />}
              title="Budget Friendly"
              text="Find routes that fit your travel budget."
            />

          </div>

        </section>
      )}

      {/* FOOTER */}
      <footer>

        <div className="footer-logo">
          <div className="logo-icon">
            <Navigation size={20} />
          </div>
          Safar<span>AI</span>
        </div>

        <p>
          Explore more. Travel smarter. Stay safer.
        </p>

        <div className="footer-bottom">
          <span>AI-Based Tour Guide & Disaster Risk Prediction</span>
          <span>Built for an AI/ML project 🚀</span>
        </div>

      </footer>

    </div>
  );
}


/* ROUTE CARD */

function RouteCard({
  icon,
  title,
  distance,
  time,
  cost,
  risk,
  riskClass,
  recommended,
  routeType,
  selectedRoute,
  onSelectRoute,
}) {

  return (
    <div className={`route-card ${recommended ? "recommended" : ""}`}>

      {recommended && (
        <div className="recommended-badge">
          <Sparkles size={14} />
          AI Recommended
        </div>
      )}

      <div className="route-title">

        <div className="route-icon">
          {icon}
        </div>

        <div>
          <h3>{title}</h3>
          <span className={`risk ${riskClass}`}>
            ● {risk} Risk
          </span>
        </div>

      </div>

      <div className="route-stats">

        <div>
          <Route size={17} />
          <small>Distance</small>
          <strong>{distance}</strong>
        </div>

        <div>
          <Clock size={17} />
          <small>Time</small>
          <strong>{time}</strong>
        </div>

        <div>
          <IndianRupee size={17} />
          <small>Cost</small>
          <strong>{cost}</strong>
        </div>

      </div>

      <button
        className={`view-route ${selectedRoute === routeType ? "active-route-button" : ""
          }`}
        onClick={() => {
          onSelectRoute(routeType);

          setTimeout(() => {
            document
              .getElementById("route-map")
              ?.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
          }, 100);
        }}
      >
        {selectedRoute === routeType ? "Route Selected" : "View Route"}
        <ChevronRight size={17} />
      </button>

    </div>
  );
}


/* FEATURE CARD */

function FeatureCard({ icon, title, text }) {

  return (
    <div className="feature-card">

      <div className="feature-icon">
        {icon}
      </div>

      <h3>{title}</h3>

      <p>{text}</p>

      <ChevronRight className="feature-arrow" size={20} />

    </div>
  );
}


/* RISK DASHBOARD */

function RiskDashboard({ riskResult, loadingRisk }) {

  return (
    <section className="risk-section" id="risk">

      <div className="section-heading">

        <span>ARTIFICIAL INTELLIGENCE</span>

        <h2>
          How safe is your journey?
        </h2>

        <p>
          Our ANN model analyzes weather and environmental factors
          to estimate potential travel risks.
        </p>

      </div>

      <div className="risk-dashboard">

        <div className="risk-score">

          <div className="risk-circle">

            <div>
              <strong>
                {loadingRisk
                  ? "..."
                  : riskResult
                    ? Math.round(
                      riskResult.probabilities.high * 100
                    )
                    : "--"}
              </strong>

              <small>/100</small>
            </div>

          </div>

          <div className="risk-status">
            <span>Predicted Travel Risk</span>

            {loadingRisk ? (
              <h3>ANALYZING... 🧠</h3>
            ) : riskResult ? (
              <>
                <h3>
                  {riskResult.risk_level.toUpperCase()} RISK
                  {riskResult.risk_level === "Low"
                    ? " 🟢"
                    : riskResult.risk_level === "Medium"
                      ? " 🟡"
                      : " 🔴"}
                </h3>

                <p>
                  Your ANN model has analyzed the current weather
                  conditions and predicted the travel risk.
                </p>
              </>
            ) : (
              <h3>WAITING FOR PREDICTION</h3>
            )}
          </div>

        </div>

        <div className="risk-factors">

          <RiskFactor
            icon={<CloudRain />}
            name="Rainfall"
            value={18}
            label="Low"
          />

          <RiskFactor
            icon={<Snowflake />}
            name="Snowfall"
            value={8}
            label="Very Low"
          />

          <RiskFactor
            icon={<Wind />}
            name="Wind Speed"
            value={32}
            label="Moderate"
          />

          <RiskFactor
            icon={<Thermometer />}
            name="Temperature"
            value={22}
            label="Normal"
          />

          <RiskFactor
            icon={<Eye />}
            name="Visibility"
            value={12}
            label="Good"
          />

        </div>

      </div>

      <div className="ai-explanation">

        <div className="ai-icon">
          <Sparkles />
        </div>

        <div>

          <h3>Why this risk score?</h3>

          <p>
            The AI prediction considers rainfall, snowfall, temperature,
            wind speed and visibility. The current combination indicates
            relatively favorable travel conditions.
          </p>

        </div>

      </div>

    </section>
  );
}


/* RISK FACTOR */

function RiskFactor({ icon, name, value, label }) {

  return (
    <div className="risk-factor">

      <div className="factor-header">

        <span>
          {icon}
          {name}
        </span>

        <strong>{label}</strong>

      </div>

      <div className="progress">

        <div
          className="progress-value"
          style={{ width: `${value}%` }}
        ></div>

      </div>

    </div>
  );
}


/* WEATHER */

function WeatherSection() {

  const weather = [
    {
      day: "Mon",
      icon: "☀️",
      temp: "28°C",
      condition: "Clear",
      risk: "Low",
    },
    {
      day: "Tue",
      icon: "🌤️",
      temp: "26°C",
      condition: "Partly Cloudy",
      risk: "Low",
    },
    {
      day: "Wed",
      icon: "🌧️",
      temp: "22°C",
      condition: "Rain",
      risk: "Moderate",
    },
    {
      day: "Thu",
      icon: "⛈️",
      temp: "19°C",
      condition: "Storm",
      risk: "High",
    },
    {
      day: "Fri",
      icon: "☀️",
      temp: "25°C",
      condition: "Clear",
      risk: "Low",
    },
  ];

  return (
    <section className="weather-section" id="weather">

      <div className="section-heading left">

        <span>WEATHER FORECAST</span>

        <h2>
          Weather along your journey
        </h2>

      </div>

      <div className="weather-grid">

        {weather.map((day) => (

          <div className="weather-card" key={day.day}>

            <span className="weather-day">
              {day.day}
            </span>

            <div className="weather-icon">
              {day.icon}
            </div>

            <strong>{day.temp}</strong>

            <span>{day.condition}</span>

            <small className={
              day.risk === "High"
                ? "weather-high"
                : day.risk === "Moderate"
                  ? "weather-medium"
                  : "weather-low"
            }>
              {day.risk} Risk
            </small>

          </div>

        ))}

      </div>

      <div className="weather-alert">

        <AlertTriangle size={23} />

        <div>

          <strong>Weather Alert</strong>

          <p>
            Heavy rainfall or storms may increase travel risk.
            The ANN model will analyze forecast data before
            recommending your final route.
          </p>

        </div>

      </div>

    </section>
  );
}

export default App;