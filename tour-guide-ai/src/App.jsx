import RouteMap from "./components/RouteMap";
import { useState } from "react";
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
import "./App.css";

/*
  SAFAR AI - Dynamic Tour Guide + Disaster Risk Prediction

  External services used by this frontend:
  1. Nominatim / OpenStreetMap - place search/geocoding
  2. OSRM - road route calculation
  3. Open-Meteo - current/forecast weather
  4. Local Flask ANN backend - http://127.0.0.1:5000/predict-risk

  The public geocoding/routing/weather services do not require an API key.
  For production deployment, use your own backend/proxy and follow each
  service's usage policy.
*/

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";
const ANN_API_URL = "http://127.0.0.1:5000/predict-risk";

const INDIA_BOUNDS = {
  minLat: 6,
  maxLat: 37.5,
  minLon: 68,
  maxLon: 97.5,
};

const DEFAULT_RISK = {
  risk_level: "Medium",
  probabilities: {
    low: 0.35,
    medium: 0.5,
    high: 0.15,
  },
};

const formatDistance = (km) => `${Math.round(km).toLocaleString()} km`;

const formatDuration = (seconds) => {
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

const formatCurrency = (amount) =>
  `₹${Math.max(0, Math.round(amount)).toLocaleString("en-IN")}`;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getRiskClass = (risk) => {
  const value = String(risk || "").toLowerCase();
  if (value === "low") return "low";
  if (value === "high") return "high";
  return "medium";
};

const getRiskScore = (riskResult) => {
  if (!riskResult?.probabilities) return null;

  const { low, medium, high } = riskResult.probabilities;

  return Math.round(
    (Number(low) || 0) * 0 +
    (Number(medium) || 0) * 50 +
    (Number(high) || 0) * 100
  );
};

const getRiskLabel = (riskResult) =>
  riskResult?.risk_level || "Medium";

const calculateHeuristicRisk = (weather) => {
  let score = 0;

  const rainfall = Number(weather.rainfall) || 0;
  const snowfall = Number(weather.snowfall) || 0;
  const wind = Number(weather.wind_speed) || 0;
  const temperature = Number(weather.temperature) || 0;
  const visibility = Number(weather.visibility) || 10;

  if (rainfall >= 50) score += 35;
  else if (rainfall >= 20) score += 20;
  else if (rainfall >= 5) score += 8;

  if (snowfall >= 10) score += 30;
  else if (snowfall >= 2) score += 15;

  if (wind >= 50) score += 25;
  else if (wind >= 30) score += 15;
  else if (wind >= 20) score += 8;

  if (temperature <= 0 || temperature >= 45) score += 20;
  else if (temperature <= 5 || temperature >= 40) score += 10;

  if (visibility < 2) score += 30;
  else if (visibility < 5) score += 18;
  else if (visibility < 8) score += 8;

  const high = clamp(score / 100, 0, 1);
  const medium = clamp((0.45 - high * 0.25), 0.05, 0.6);
  const low = clamp(1 - high - medium, 0.05, 0.9);

  let risk_level = "Low";
  if (high >= 0.55) risk_level = "High";
  else if (high >= 0.25) risk_level = "Medium";

  return {
    success: true,
    source: "frontend weather fallback",
    risk_level,
    probabilities: {
      low,
      medium,
      high,
    },
    weather,
  };
};

async function geocodePlace(place) {
  const query = place.includes(",")
    ? place
    : `${place}, India`;

  const response = await fetch(
    `${NOMINATIM_URL}?format=jsonv2&limit=1&countrycodes=in&addressdetails=1&q=${encodeURIComponent(
      query
    )}`,
    {
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error("Location search service is unavailable.");
  }

  const data = await response.json();

  if (!data.length) {
    throw new Error(`Could not find "${place}". Try a city, district or landmark in India.`);
  }

  const result = data[0];
  const lat = Number(result.lat);
  const lon = Number(result.lon);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < INDIA_BOUNDS.minLat ||
    lat > INDIA_BOUNDS.maxLat ||
    lon < INDIA_BOUNDS.minLon ||
    lon > INDIA_BOUNDS.maxLon
  ) {
    throw new Error(`"${place}" could not be matched to a location in India.`);
  }

  return {
    name:
      result.display_name?.split(",")[0]?.trim() ||
      place,
    lat,
    lon,
    displayName: result.display_name,
  };
}

async function getRoutes(fromCoords, toCoords) {
  const coordinates = `${fromCoords.lon},${fromCoords.lat};${toCoords.lon},${toCoords.lat}`;

  const response = await fetch(
    `${OSRM_URL}/${coordinates}?overview=full&geometries=geojson&steps=false&alternatives=true`,
    {
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error("Road routing service is unavailable.");
  }

  const data = await response.json();

  if (data.code !== "Ok" || !data.routes?.length) {
    throw new Error("No drivable route was found between these locations.");
  }

  return data.routes;
}


async function getWeather(lat, lon, date) {
  if (!date) {
    throw new Error("Please select a travel date.");
  }

  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: [
      "temperature_2m",
      "relative_humidity_2m",
      "precipitation",
      "rain",
      "snowfall",
      "wind_speed_10m",
      "visibility",
      "pressure_msl",
    ].join(","),
    timezone: "auto",
    forecast_days: "16",
  });

  const response = await fetch(`${WEATHER_URL}?${params}`);

  if (!response.ok) {
    throw new Error("Unable to retrieve forecast weather.");
  }

  const data = await response.json();
  const hourly = data.hourly;

  if (!hourly?.time?.length) {
    throw new Error("The weather service returned no hourly data.");
  }

  // Keep only hours belonging to the selected travel date.
  const indices = hourly.time
    .map((time, index) => time.startsWith(date) ? index : -1)
    .filter((index) => index !== -1);

  if (indices.length === 0) {
    throw new Error(
      `No forecast is available for ${date}. Try a date within the available forecast period.`
    );
  }

  const numberAt = (key, index) => {
    const value = Number(hourly[key]?.[index]);
    return Number.isFinite(value) ? value : null;
  };

  // Choose a real hourly observation/forecast with comparatively
  // adverse weather, rather than using today's weather by mistake.
  const severity = (index) => {
    const rain = numberAt("precipitation", index) ?? 0;
    const snow = numberAt("snowfall", index) ?? 0;
    const wind = numberAt("wind_speed_10m", index) ?? 0;
    const visibility = numberAt("visibility", index);

    return (
      rain * 3 +
      snow * 4 +
      wind * 0.15 +
      (visibility === null ? 0 : Math.max(0, 8 - visibility / 1000) * 2)
    );
  };

  const selectedIndex = indices.reduce((worst, index) =>
    severity(index) > severity(worst) ? index : worst
  );

  const readRequired = (key) => {
    const value = numberAt(key, selectedIndex);

    if (value === null) {
      throw new Error(
        `Weather data for ${key} is missing on ${date}.`
      );
    }

    return value;
  };

  const pressureHpa = readRequired("pressure_msl");

  return {
    temperature: readRequired("temperature_2m"),
    humidity: readRequired("relative_humidity_2m"),
    rainfall: readRequired("precipitation"),
    wind_speed: readRequired("wind_speed_10m"),
    snowfall: readRequired("snowfall"),
    visibility: readRequired("visibility") / 1000,
    // Dataset values appear to use kPa, whereas the API reports hPa.
    pressure: pressureHpa / 10,
    weather_time: hourly.time[selectedIndex],
    weather_source: "Open-Meteo hourly forecast",
  };
}


async function predictRisk(weatherData) {
  try {
    const response = await fetch(ANN_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(weatherData),
    });

    if (!response.ok) {
      throw new Error("ANN server returned an error.");
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "ANN prediction failed.");
    }

    return {
      ...result,
      source: "ANN Flask backend",
      weather: weatherData,
    };
  } catch (error) {
    console.warn("ANN backend unavailable. Using weather-based fallback.", error);
    return calculateHeuristicRisk(weatherData);
  }
}

function buildRouteOptions(routes, budget, travelers, riskResult) {
  const safeRoutes = routes.slice(0, 4);
  const baseBudget = Number(budget) || 10000;
  const people = Math.max(1, Number(travelers) || 1);

  if (!safeRoutes.length) return [];

  const riskLevel = getRiskLabel(riskResult);
  const riskClass = getRiskClass(riskLevel);

  const routeRecords = safeRoutes.map((route, index) => {
    const distanceKm = route.distance / 1000;
    const hours = route.duration / 3600;

    // A practical estimated road-trip cost for the UI.
    // This is an estimate, not a booking price.
    const estimatedCost = Math.max(
      800,
      distanceKm * 5.5 + hours * 250 + people * 350
    );

    return {
      id: `route-${index}`,
      rawRoute: route,
      distanceKm,
      durationSeconds: route.duration,
      estimatedCost,
      risk: riskLevel,
      riskClass,
    };
  });

  const shortest = [...routeRecords].sort(
    (a, b) => a.distanceKm - b.distanceKm
  )[0];

  const cheapest = [...routeRecords].sort(
    (a, b) => a.estimatedCost - b.estimatedCost
  )[0];

  const fastest = [...routeRecords].sort(
    (a, b) => a.durationSeconds - b.durationSeconds
  )[0];

  const longest = [...routeRecords].sort(
    (a, b) => b.distanceKm - a.distanceKm
  )[0];

  const selected = {
    shortest,
    cheapest,
    fastest,
    longest,
    safest: shortest,
  };

  const routeMap = new Map();

  Object.entries(selected).forEach(([type, route]) => {
    if (!route) return;

    if (!routeMap.has(route.id)) {
      routeMap.set(route.id, {
        ...route,
        routeTypes: [],
      });
    }

    routeMap.get(route.id).routeTypes.push(type);
  });

  const options = [];

  const addOption = (type, title, icon, route, recommended = false) => {
    if (!route) return;

    options.push({
      ...route,
      type,
      title,
      icon,
      recommended,
      risk: riskLevel,
      riskClass,
      routeTypes: routeMap.get(route.id)?.routeTypes || [],
      withinBudget: route.estimatedCost <= baseBudget,
    });
  };

  addOption(
    "shortest",
    "Shortest Route",
    "🛣️",
    shortest
  );

  addOption(
    "cheapest",
    "Cheapest Route",
    "💰",
    cheapest
  );

  addOption(
    "fastest",
    "Fastest Route",
    "⚡",
    fastest
  );

  addOption(
    "safest",
    "Safest Route",
    "🛡️",
    selected.safest,
    true
  );

  // If the API returns fewer alternatives, create a useful "longest"
  // comparison from the available routes.
  if (longest) {
    addOption(
      "longest",
      "Longest Route",
      "⛰️",
      longest
    );
  }

  // Avoid duplicate cards when OSRM returns fewer unique alternatives.
  const unique = [];
  const seen = new Set();

  for (const option of options) {
    const key = `${option.type}-${option.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(option);
    }
  }

  return unique;
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

  const [routeOptions, setRouteOptions] = useState([]);
  const [routeData, setRouteData] = useState(null);
  const [weatherData, setWeatherData] = useState(null);

  const [loadingTrip, setLoadingTrip] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const planTrip = async (e) => {
    e.preventDefault();

    if (!from.trim() || !to.trim() || !date || !budget) {
      setErrorMessage(
        "Please enter your starting place, destination, travel date and budget."
      );
      return;
    }

    if (from.trim().toLowerCase() === to.trim().toLowerCase()) {
      setErrorMessage("Starting point and destination cannot be the same.");
      return;
    }

    setLoadingTrip(true);
    setLoadingRisk(true);
    setErrorMessage("");
    setShowResults(false);
    setRiskResult(null);
    setRouteOptions([]);
    setRouteData(null);
    setWeatherData(null);

    try {
      // 1. Convert user-entered places into coordinates.
      const [fromCoords, toCoords] = await Promise.all([
        geocodePlace(from.trim()),
        geocodePlace(to.trim()),
      ]);

      // 2. Find real road routes using OSRM.
      const routes = await getRoutes(fromCoords, toCoords);

      // 3. Get current/forecast weather for the destination.
      const weather = await getWeather(toCoords.lat, toCoords.lon, date);

      // 4. Send the weather factors to the ANN Flask backend.
      const prediction = await predictRisk(weather);

      // 5. Build dynamic route cards from actual route distances/times.
      const options = buildRouteOptions(
        routes,
        budget,
        travelers,
        prediction
      );

      if (!options.length) {
        throw new Error("No route options could be generated.");
      }

      let preferredType = preference;

      if (preference === "balanced") {
        const balanced = [...options].sort((a, b) => {
          const distanceRatio =
            a.distanceKm / Math.max(...options.map((r) => r.distanceKm), 1);
          const costRatio =
            a.estimatedCost /
            Math.max(...options.map((r) => r.estimatedCost), 1);
          const timeRatio =
            a.durationSeconds /
            Math.max(...options.map((r) => r.durationSeconds), 1);

          const scoreA = distanceRatio + costRatio + timeRatio;

          const distanceRatioB =
            b.distanceKm / Math.max(...options.map((r) => r.distanceKm), 1);
          const costRatioB =
            b.estimatedCost /
            Math.max(...options.map((r) => r.estimatedCost), 1);
          const timeRatioB =
            b.durationSeconds /
            Math.max(...options.map((r) => r.durationSeconds), 1);

          const scoreB =
            distanceRatioB + costRatioB + timeRatioB;

          return scoreA - scoreB;
        })[0];

        preferredType = balanced?.type || "safest";
      }

      const preferredOption =
        options.find((option) => option.type === preferredType) ||
        options.find((option) => option.type === "safest") ||
        options[0];

      setFrom(fromCoords.name || from.trim());
      setTo(toCoords.name || to.trim());
      setRouteData({
        from: fromCoords,
        to: toCoords,
        routes,
      });
      setWeatherData(weather);
      setRiskResult(prediction);
      setRouteOptions(options);
      setSelectedRoute(preferredOption.type);
      setShowResults(true);

      setTimeout(() => {
        document
          .getElementById("results")
          ?.scrollIntoView({ behavior: "smooth" });
      }, 150);
    } catch (error) {
      console.error("Trip planning error:", error);
      setErrorMessage(
        error.message ||
        "Unable to plan this journey. Please check the locations and try again."
      );
    } finally {
      setLoadingTrip(false);
      setLoadingRisk(false);
    }
  };

  const selectedOption =
    routeOptions.find((option) => option.type === selectedRoute) ||
    routeOptions[0];

  return (
    <div className="app">
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="logo">
          <div className="logo-icon">
            <Navigation size={21} />
          </div>

          <span>
            Safar<span className="logo-highlight"></span>
          </span>
        </div>

        <div className="nav-links">
          <a href="#planner">Plan Trip</a>
          <a href="#routes">Routes</a>
          <a href="#risk">Risk AI</a>
          <a href="#weather">Weather</a>
        </div>

        <button
          className="nav-button"
          type="button"
          onClick={() =>
            document
              .getElementById("planner")
              ?.scrollIntoView({ behavior: "smooth" })
          }
        >
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
            Plan journeys across India, compare real road routes, check
            weather conditions, and predict travel risks using Artificial
            Intelligence.
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
            Search almost any destination in India and let Safar AI calculate
            the real road route, weather and travel risk.
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
                placeholder="e.g. Delhi, Mumbai, Jaipur"
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
                placeholder="e.g. Leh, Goa, Manali"
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
                min={new Date().toISOString().split("T")[0]}
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
                min="1"
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
                onChange={(e) =>
                  setTravelers(Math.max(1, Number(e.target.value) || 1))
                }
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

          <button
            className="plan-button"
            type="submit"
            disabled={loadingTrip}
          >
            <Sparkles size={19} />
            {loadingTrip ? "Planning Journey..." : "Plan My Journey"}
          </button>
        </form>

        {errorMessage && (
          <div className="planner-error" role="alert">
            <AlertTriangle size={20} />
            <div>
              <strong>Unable to plan this trip</strong>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        {loadingTrip && (
          <div className="planner-loading">
            <div className="loading-spinner"></div>
            <div>
              <strong>Building your journey...</strong>
              <p>
                Searching locations, calculating road routes and checking
                weather conditions.
              </p>
            </div>
          </div>
        )}
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

              {routeData && (
                <small>
                  {routeData.from.displayName} → {routeData.to.displayName}
                </small>
              )}
            </div>

            <div className="summary-details">
              <span>📅 {date}</span>
              <span>💰 ₹{Number(budget).toLocaleString("en-IN")}</span>
              <span>
                👥 {travelers} traveler{Number(travelers) > 1 ? "s" : ""}
              </span>
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
              routeData={routeData}
              selectedRouteData={selectedOption}
            />
          </div>

          {/* ROUTES */}
          <div className="section-heading left" id="routes">
            <span>ROUTE OPTIONS</span>

            <h2>Choose your way</h2>

            <p>
              Routes are calculated from the locations you entered. Distance
              and travel time come from real road-network data. Cost is an
              estimated travel cost for comparison.
            </p>
          </div>

          <div className="route-grid">
            {routeOptions.map((option) => (
              <RouteCard
                key={`${option.type}-${option.id}`}
                icon={option.icon}
                title={option.title}
                distance={formatDistance(option.distanceKm)}
                time={formatDuration(option.durationSeconds)}
                cost={formatCurrency(option.estimatedCost)}
                risk={option.risk}
                riskClass={option.riskClass}
                routeType={option.type}
                recommended={
                  option.recommended ||
                  option.type === preference ||
                  (preference === "balanced" &&
                    option.type === selectedRoute)
                }
                withinBudget={option.withinBudget}
                selectedRoute={selectedRoute}
                onSelectRoute={setSelectedRoute}
              />
            ))}
          </div>

          {/* AI RISK */}
          <RiskDashboard
            riskResult={riskResult}
            weatherData={weatherData}
            loadingRisk={loadingRisk}
          />

          {/* WEATHER */}
          <WeatherSection
            weatherData={weatherData}
            destination={to}
            travelDate={date}
            riskResult={riskResult}
          />
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
              text="Search locations across India and compare real road routes by distance and time."
            />

            <FeatureCard
              icon={<ShieldCheck />}
              title="AI Risk Prediction"
              text="The ANN backend analyzes weather conditions to estimate travel risk."
            />

            <FeatureCard
              icon={<CloudRain />}
              title="Weather Aware"
              text="Use live forecast information for the destination before evaluating travel safety."
            />

            <FeatureCard
              icon={<Wallet />}
              title="Budget Friendly"
              text="Compare estimated route costs and see which options fit your travel budget."
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

        <p>Explore more. Travel smarter. Stay safer.</p>

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
  withinBudget,
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
        <div className="route-icon">{icon}</div>

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
          <small>Est. Cost</small>
          <strong>{cost}</strong>
        </div>
      </div>

      <div className="route-budget-status">
        {withinBudget ? "✓ Within your budget" : "⚠ Above your budget"}
      </div>

      <button
        className={`view-route ${selectedRoute === routeType ? "active-route-button" : ""
          }`}
        type="button"
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
      <div className="feature-icon">{icon}</div>

      <h3>{title}</h3>

      <p>{text}</p>

      <ChevronRight className="feature-arrow" size={20} />
    </div>
  );
}

/* RISK DASHBOARD */

function RiskDashboard({ riskResult, weatherData, loadingRisk }) {
  const riskScore = getRiskScore(riskResult);
  const riskLevel = getRiskLabel(riskResult);
  const riskClass = getRiskClass(riskLevel);

  const weather = weatherData || {
    rainfall: 0,
    snowfall: 0,
    wind_speed: 0,
    temperature: 0,
    visibility: 10,
  };

  const getFactorLabel = (name, value) => {
    if (name === "Rainfall") {
      if (value >= 50) return "High";
      if (value >= 20) return "Moderate";
      return "Low";
    }

    if (name === "Snowfall") {
      if (value >= 10) return "High";
      if (value >= 2) return "Moderate";
      return "Very Low";
    }

    if (name === "Wind Speed") {
      if (value >= 50) return "High";
      if (value >= 30) return "Moderate";
      return "Low";
    }

    if (name === "Temperature") {
      if (value <= 5 || value >= 40) return "Extreme";
      if (value <= 10 || value >= 35) return "Caution";
      return "Normal";
    }

    if (name === "Visibility") {
      if (value < 2) return "Poor";
      if (value < 5) return "Moderate";
      return "Good";
    }

    return "Normal";
  };

  return (
    <section className="risk-section" id="risk">
      <div className="section-heading">
        <span>ARTIFICIAL INTELLIGENCE</span>

        <h2>How safe is your journey?</h2>

        <p>
          The ANN model analyzes real weather values for the destination to
          estimate potential travel risks.
        </p>
      </div>

      <div className="risk-dashboard">
        <div className="risk-score">
          <div className="risk-circle">
            <div>
              <strong>
                {loadingRisk ? "..." : riskScore !== null ? riskScore : "--"}
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
                  {riskLevel.toUpperCase()} RISK
                  {riskClass === "low"
                    ? " 🟢"
                    : riskClass === "medium"
                      ? " 🟡"
                      : " 🔴"}
                </h3>

                <p>
                  Prediction source:{" "}
                  <strong>
                    {riskResult.source === "ANN Flask backend"
                      ? "ANN Flask backend"
                      : "weather fallback"}
                  </strong>
                  .
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
            value={clamp(Number(weather.rainfall) || 0, 0, 100)}
            label={getFactorLabel("Rainfall", Number(weather.rainfall) || 0)}
          />

          <RiskFactor
            icon={<Snowflake />}
            name="Snowfall"
            value={clamp((Number(weather.snowfall) || 0) * 5, 0, 100)}
            label={getFactorLabel("Snowfall", Number(weather.snowfall) || 0)}
          />

          <RiskFactor
            icon={<Wind />}
            name="Wind Speed"
            value={clamp((Number(weather.wind_speed) || 0) * 1.5, 0, 100)}
            label={getFactorLabel(
              "Wind Speed",
              Number(weather.wind_speed) || 0
            )}
          />

          <RiskFactor
            icon={<Thermometer />}
            name="Temperature"
            value={clamp(
              Math.abs(Number(weather.temperature) || 22) * 1.5,
              0,
              100
            )}
            label={getFactorLabel(
              "Temperature",
              Number(weather.temperature) || 22
            )}
          />

          <RiskFactor
            icon={<Eye />}
            name="Visibility"
            value={clamp(
              100 - (Number(weather.visibility) || 10) * 8,
              0,
              100
            )}
            label={getFactorLabel(
              "Visibility",
              Number(weather.visibility) || 10
            )}
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
            The prediction uses rainfall, snowfall, temperature, wind speed
            and visibility. These values are fetched dynamically for the
            selected destination and sent to the ANN service when available.
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
          style={{ width: `${clamp(value, 0, 100)}%` }}
        ></div>
      </div>
    </div>
  );
}

/* WEATHER */

function WeatherSection({
  weatherData,
  destination,
  travelDate,
  riskResult,
}) {
  const weather = weatherData || {};

  const temperature = Number(weather.temperature);
  const rainfall = Number(weather.rainfall);
  const snowfall = Number(weather.snowfall);
  const wind = Number(weather.wind_speed);
  const visibility = Number(weather.visibility);

  const risk = riskResult?.risk_level || "Medium";

  const currentWeather = [
    {
      day: "Current",
      icon:
        snowfall > 0
          ? "❄️"
          : rainfall > 10
            ? "🌧️"
            : wind > 35
              ? "💨"
              : "☀️",
      temp: Number.isFinite(temperature)
        ? `${Math.round(temperature)}°C`
        : "--",
      condition:
        snowfall > 0
          ? "Snow"
          : rainfall > 10
            ? "Rain"
            : wind > 35
              ? "Windy"
              : "Clear / Mixed",
      risk,
    },
    {
      day: "Rain",
      icon: "🌧️",
      temp: Number.isFinite(rainfall)
        ? `${rainfall.toFixed(1)} mm`
        : "--",
      condition: "Rainfall",
      risk: rainfall >= 20 ? "High" : rainfall >= 5 ? "Moderate" : "Low",
    },
    {
      day: "Snow",
      icon: "❄️",
      temp: Number.isFinite(snowfall)
        ? `${snowfall.toFixed(1)} mm`
        : "--",
      condition: "Snowfall",
      risk: snowfall >= 10 ? "High" : snowfall >= 2 ? "Moderate" : "Low",
    },
    {
      day: "Wind",
      icon: "💨",
      temp: Number.isFinite(wind)
        ? `${Math.round(wind)} km/h`
        : "--",
      condition: "Wind Speed",
      risk: wind >= 50 ? "High" : wind >= 30 ? "Moderate" : "Low",
    },
    {
      day: "Visibility",
      icon: "👁️",
      temp: Number.isFinite(visibility)
        ? `${visibility.toFixed(1)} km`
        : "--",
      condition: "Visibility",
      risk: visibility < 2 ? "High" : visibility < 5 ? "Moderate" : "Low",
    },
  ];

  return (
    <section className="weather-section" id="weather">
      <div className="section-heading left">
        <span>WEATHER CONDITIONS</span>

        <h2>Weather at {destination || "your destination"}</h2>

        <p>
          Weather information used for the AI risk prediction.
          {travelDate ? ` Travel date: ${travelDate}.` : ""}
        </p>
      </div>

      <div className="weather-grid">
        {currentWeather.map((item) => (
          <div className="weather-card" key={item.day}>
            <span className="weather-day">{item.day}</span>

            <div className="weather-icon">{item.icon}</div>

            <strong>{item.temp}</strong>

            <span>{item.condition}</span>

            <small
              className={
                item.risk === "High"
                  ? "weather-high"
                  : item.risk === "Moderate" || item.risk === "Medium"
                    ? "weather-medium"
                    : "weather-low"
              }
            >
              {item.risk} Risk
            </small>
          </div>
        ))}
      </div>

      <div className="weather-alert">
        <AlertTriangle size={23} />

        <div>
          <strong>Weather Alert</strong>

          <p>
            Weather can change during travel. Heavy rainfall, snowfall,
            strong winds or poor visibility may increase road-travel risk.
            Always check official local advisories before starting your trip.
          </p>
        </div>
      </div>
    </section>
  );
}

export default App;
