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

function App() {
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [date, setDate] = useState("");
    const [budget, setBudget] = useState("");
    const [travelers, setTravelers] = useState(1);
    const [preference, setPreference] = useState("balanced");
    const [showResults, setShowResults] = useState(false);

    const planTrip = (e) => {
        e.preventDefault();

        if (!from || !to || !date || !budget) {
            alert("Please fill in all required fields.");
            return;
        }

        setShowResults(true);

        setTimeout(() => {
            document
                .getElementById("results")
                ?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    return (
        <div className="app">

            {/* NAVBAR */}
            <nav className="navbar">
                <div className="logo">
                    <div className="logo-icon">
                        <Navigation size={21} />
                    </div>

                    <span>Safar<span className="logo-highlight">AI</span></span>
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

                    <div className="hero-badge">
                        <Sparkles size={16} />
                        AI POWERED TRAVEL SAFETY
                    </div>

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
                    <div className="map-card">

                        <div className="map-placeholder">

                            <div className="map-grid"></div>

                            <div className="map-route"></div>

                            <div className="map-marker start">
                                <MapPin size={25} />
                            </div>

                            <div className="map-marker destination">
                                <MapPin size={25} />
                            </div>

                            <div className="map-label start-label">
                                {from}
                            </div>

                            <div className="map-label destination-label">
                                {to}
                            </div>

                            <div className="map-overlay">
                                <Route size={18} />
                                Live Route Preview
                            </div>

                        </div>

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
                        />

                        <RouteCard
                            icon="💰"
                            title="Cheapest Route"
                            distance="910 km"
                            time="16h 10m"
                            cost="₹4,800"
                            risk="Medium"
                            riskClass="medium"
                        />

                        <RouteCard
                            icon="🛡️"
                            title="Safest Route"
                            distance="880 km"
                            time="15h"
                            cost="₹6,200"
                            risk="Low"
                            riskClass="low"
                            recommended
                        />

                        <RouteCard
                            icon="⛰️"
                            title="Longest Route"
                            distance="1,050 km"
                            time="19h"
                            cost="₹7,100"
                            risk="Medium"
                            riskClass="medium"
                        />

                    </div>

                    {/* AI RISK */}
                    <RiskDashboard />

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

            <button className="view-route">
                View Route
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

function RiskDashboard() {

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
                            <strong>28</strong>
                            <small>/100</small>
                        </div>

                    </div>

                    <div className="risk-status">
                        <span>Predicted Travel Risk</span>
                        <h3>LOW RISK 🟢</h3>

                        <p>
                            Current weather conditions appear relatively safe
                            for your selected journey.
                        </p>
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