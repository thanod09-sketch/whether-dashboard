import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  Eye,
  Gauge,
  LocateFixed,
  MapPin,
  Moon,
  Search,
  Sunrise,
  Sunset,
  Sun,
  Thermometer,
  Wind,
} from "lucide-react";
import {
  convertTemperature,
  DEFAULT_LOCATION,
  formatHour,
  getDayLabel,
  getGeocodingUrl,
  getLocationLabel,
  getWeatherDescription,
  getWeatherIcon,
  getWeatherTheme,
  getWeatherUrl,
} from "./weather.js";

const RECENT_LOCATIONS_KEY = "atmos-recent-locations";
const WEATHER_REFRESH_MS = 15 * 60 * 1000;

function WeatherIcon({ code, isDay = true, className = "" }) {
  const icon = getWeatherIcon(code, isDay);
  const icons = {
    sun: Sun,
    moon: Moon,
    "partly-cloudy": isDay ? CloudSun : CloudMoon,
    cloud: Cloud,
    fog: CloudFog,
    rain: CloudRain,
    snow: CloudSnow,
    storm: CloudLightning,
  };
  const Icon = icons[icon] ?? Cloud;
  return <Icon className={`weather-icon icon-${icon} ${className}`} strokeWidth={1.5} aria-hidden="true" />;
}

function WeatherChart({ data, unit, mode, onModeChange }) {
  const values = mode === "temperature"
    ? data.map((item) => convertTemperature(item.temperature_2m, unit))
    : data.map((item) => item.precipitation_probability ?? 0);
  const width = 720;
  const height = 190;
  const padding = { top: 24, right: 18, bottom: 30, left: 18 };
  const min = mode === "temperature" ? (values.length ? Math.min(...values) - 3 : 0) : 0;
  const max = mode === "temperature" ? (values.length ? Math.max(...values) + 3 : 40) : 100;
  const span = Math.max(max - min, 1);
  const points = values.map((value, index) => ({
    x: padding.left + (index * (width - padding.left - padding.right)) / Math.max(values.length - 1, 1),
    y: padding.top + ((max - value) / span) * (height - padding.top - padding.bottom),
    value,
  }));
  const line = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const area = points.length
    ? `${line} L ${points.at(-1).x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`
    : "";
  const guideLines = [0, 1, 2, 3].map((index) => padding.top + (index * (height - padding.top - padding.bottom)) / 3);

  return (
    <section className="card chart-card" aria-labelledby="chart-title">
      <div className="section-heading chart-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-dot" /> WEATHER TRENDS</div>
          <h2 id="chart-title">A little look ahead</h2>
        </div>
        <div className="segmented-control" role="group" aria-label="Chart display">
          <button type="button" className={mode === "temperature" ? "selected" : ""} onClick={() => onModeChange("temperature")}>Temperature</button>
          <button type="button" className={mode === "rain" ? "selected" : ""} onClick={() => onModeChange("rain")}>Rain</button>
        </div>
      </div>
      <div className="chart-plot">
        <div className="chart-labels" aria-hidden="true">
          {mode === "temperature"
            ? [Math.round(max), Math.round(max - span / 3), Math.round(max - (2 * span) / 3), Math.round(min)].map((value, index) => (
              <span key={index}>{value}°</span>
            ))
            : ["100%", "67%", "33%", "0%"].map((value) => <span key={value}>{value}</span>)}
        </div>
        <svg className="weather-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={`${mode === "temperature" ? "Temperature" : "Chance of rain"} for the next 24 hours`}>
          <defs>
            <linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-color)" stopOpacity=".27" />
              <stop offset="100%" stopColor="var(--chart-color)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {guideLines.map((y) => <line key={y} x1={padding.left} y1={y} x2={width - padding.right} y2={y} className="chart-grid-line" />)}
          {points.length > 0 && <path d={area} fill="url(#chart-fill)" />}
          {points.length > 0 && <path d={line} className="chart-line" />}
          {points.map((point, index) => (
            <circle key={`${point.x}-${index}`} cx={point.x} cy={point.y} r={index % 3 === 0 ? 3.5 : 2.5} className="chart-point">
              <title>{`${formatHour(data[index]?.time)}: ${point.value}${mode === "temperature" ? "°" : "%"}`}</title>
            </circle>
          ))}
        </svg>
        <div className="chart-times" aria-hidden="true">
          {data.filter((_, index) => index % 4 === 0).map((item) => <span key={item.time}>{formatHour(item.time)}</span>)}
        </div>
      </div>
    </section>
  );
}

function MetricCard({ icon: Icon, label, value, unit: metricUnit = "", note, className = "" }) {
  return (
    <div className={`metric-card ${className}`}>
      <div className="metric-top">
        <span className="metric-icon"><Icon size={17} strokeWidth={1.7} /></span>
        <span className="metric-label">{label}</span>
      </div>
      <div className="metric-value"><span>{value}</span>{metricUnit && <small>{metricUnit}</small>}</div>
      <div className="metric-note">{note}</div>
    </div>
  );
}

export default function App() {
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [unit, setUnit] = useState("C");
  const [theme, setTheme] = useState("dark");
  const [chartMode, setChartMode] = useState("temperature");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searchError, setSearchError] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [recentLocations, setRecentLocations] = useState([]);
  const searchRef = useRef(null);
  const searchBoxRef = useRef(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(RECENT_LOCATIONS_KEY) ?? "[]");
      if (Array.isArray(saved)) setRecentLocations(saved.slice(0, 4));
    } catch (storageError) {
      console.warn("Recent locations could not be loaded.", storageError);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    async function loadWeather() {
      setLoading((current) => weather ? current : true);
      setRefreshing(Boolean(weather));
      setError("");
      try {
        const response = await fetch(getWeatherUrl(location.latitude, location.longitude), { signal: controller.signal });
        if (!response.ok) throw new Error(`Weather service responded with ${response.status}.`);
        const result = await response.json();
        if (active) setWeather(result);
      } catch (fetchError) {
        if (fetchError.name !== "AbortError" && active) {
          setError(fetchError.message || "The weather could not be loaded. Please try again.");
        }
      } finally {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }
    loadWeather();
    const intervalId = window.setInterval(loadWeather, WEATHER_REFRESH_MS);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [location]);

  useEffect(() => {
    const searchTerm = query.trim();
    if (!searchOpen || searchTerm.length < 2) {
      setSuggestions([]);
      setSearchError("");
      return undefined;
    }
    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(getGeocodingUrl(searchTerm), { signal: controller.signal });
        if (!response.ok) throw new Error(`Location search responded with ${response.status}.`);
        const result = await response.json();
        setSuggestions(result.results ?? []);
        setSearchError("");
      } catch (searchError) {
        if (searchError.name !== "AbortError") {
          setSuggestions([]);
          setSearchError(searchError.message || "Location search is unavailable. Please try again.");
        }
      }
    }, 250);
    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [query, searchOpen]);

  useEffect(() => {
    function openSearch(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
        searchRef.current?.focus();
      }
    }
    document.addEventListener("keydown", openSearch);
    return () => document.removeEventListener("keydown", openSearch);
  }, []);

  useEffect(() => {
    function closeSearch(event) {
      if (!searchBoxRef.current?.contains(event.target)) setSearchOpen(false);
    }
    document.addEventListener("pointerdown", closeSearch);
    return () => document.removeEventListener("pointerdown", closeSearch);
  }, []);

  const current = weather?.current;
  const currentHourIndex = weather?.hourly?.time?.findIndex((time) => time.slice(0, 13) === current?.time?.slice(0, 13)) ?? -1;
  const currentVisibility = currentHourIndex >= 0 ? weather.hourly.visibility?.[currentHourIndex] : null;
  const hourlyForecast = useMemo(() => {
    if (!weather?.hourly || currentHourIndex < 0) return [];
    return weather.hourly.time.slice(currentHourIndex, currentHourIndex + 24).map((time, index) => {
      const sourceIndex = currentHourIndex + index;
      return {
        time,
        temperature_2m: index === 0 ? current.temperature_2m : weather.hourly.temperature_2m[sourceIndex],
        precipitation_probability: weather.hourly.precipitation_probability?.[sourceIndex] ?? 0,
        weather_code: index === 0 ? current.weather_code : weather.hourly.weather_code[sourceIndex],
      };
    });
  }, [weather, currentHourIndex]);

  const themeName = getWeatherTheme(current?.weather_code ?? 2, current?.is_day === 1);
  const localTime = current?.time?.slice(11, 16);
  const updatedTime = current?.time ? formatHour(current.time) : "";

  function chooseLocation(selectedLocation) {
    const nextLocation = {
      ...selectedLocation,
      admin1: selectedLocation.admin1 ?? "",
      country: selectedLocation.country ?? "",
    };
    setLocation(nextLocation);
    setWeather(null);
    setQuery("");
    setSuggestions([]);
    setSearchOpen(false);
    const nextRecent = [
      nextLocation,
      ...recentLocations.filter((item) => item.latitude !== nextLocation.latitude || item.longitude !== nextLocation.longitude),
    ].slice(0, 4);
    setRecentLocations(nextRecent);
    try {
      localStorage.setItem(RECENT_LOCATIONS_KEY, JSON.stringify(nextRecent));
    } catch (storageError) {
      console.warn("Recent locations could not be saved.", storageError);
    }
  }

  function findMyLocation() {
    if (!navigator.geolocation) {
      setError("Location access is not available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const response = await fetch(getGeocodingUrl(`${coords.latitude},${coords.longitude}`));
          if (!response.ok) throw new Error(`Location lookup responded with ${response.status}.`);
          const result = await response.json();
          const match = result.results?.[0];
          chooseLocation(match
            ? { ...match, latitude: coords.latitude, longitude: coords.longitude }
            : { ...DEFAULT_LOCATION, name: "Your location", admin1: "", latitude: coords.latitude, longitude: coords.longitude });
        } catch (lookupError) {
          setError(lookupError.message || "Your location could not be looked up.");
        }
      },
      (locationError) => setError(locationError.message || "Location permission was denied."),
      { timeout: 10000, maximumAge: 300000 },
    );
  }

  const temp = (value) => convertTemperature(value, unit);
  const daily = weather?.daily;
  const currentDescription = getWeatherDescription(current?.weather_code);
  const windDirection = current?.wind_direction_10m;
  const compassDirection = windDirection == null ? "" : ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(windDirection / 45) % 8];

  return (
    <main className={`app-shell weather-${themeName}`} data-theme={theme}>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="ambient ambient-three" />
      <div className="weather-particles" aria-hidden="true">
        <span className="particle particle-one" /><span className="particle particle-two" /><span className="particle particle-three" />
        <span className="particle particle-four" /><span className="particle particle-five" /><span className="particle particle-six" />
      </div>

      <div className="dashboard">
        <header className="topbar">
          <a className="brand" href="#" aria-label="Atmos home">
            <span className="brand-mark"><Sun size={21} strokeWidth={1.7} /></span>
            <span className="brand-name">atmos<span>.</span></span>
          </a>
          <div className="topbar-center">
            <div className="live-indicator"><span className="live-dot" /> LIVE WEATHER</div>
            <span className="topbar-date">{weather?.daily?.time?.[0] ? new Date(`${weather.daily.time[0]}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) : "Your daily forecast"}</span>
          </div>
          <div className="topbar-actions">
            <button type="button" className="icon-button location-button" onClick={findMyLocation} aria-label="Use my current location" title="Use my location"><LocateFixed size={18} /></button>
            <button type="button" className="theme-toggle" onClick={() => setTheme((value) => value === "dark" ? "light" : "dark")} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
              <span className="theme-toggle-thumb">{theme === "dark" ? <Moon size={13} /> : <Sun size={13} />}</span>
              <span>{theme === "dark" ? "Dark" : "Light"}</span>
            </button>
            <div className="unit-toggle" role="group" aria-label="Temperature units">
              <button type="button" aria-pressed={unit === "C"} className={unit === "C" ? "active" : ""} onClick={() => setUnit("C")}>°C</button>
              <span />
              <button type="button" aria-pressed={unit === "F"} className={unit === "F" ? "active" : ""} onClick={() => setUnit("F")}>°F</button>
            </div>
          </div>
        </header>

        <div className="dashboard-content">
          <section className="intro-row">
            <div>
              <div className="eyebrow"><span className="eyebrow-dot" /> YOUR PERSONAL WEATHER</div>
              <h1>Good weather,<br className="mobile-break" /> good <span>days.</span></h1>
              <p className="intro-copy">A little clarity for whatever today brings.</p>
            </div>
            <div className="search-wrap" ref={searchBoxRef}>
              <label className={`search-box ${searchOpen ? "search-focused" : ""}`}>
                <Search size={18} aria-hidden="true" />
                <input
                  ref={searchRef}
                  type="search"
                  placeholder="Search any city..."
                  value={query}
                  onFocus={() => setSearchOpen(true)}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setSearchOpen(true);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") setSearchOpen(false);
                    if (event.key === "Enter" && suggestions[0]) chooseLocation(suggestions[0]);
                  }}
                  aria-label="Search for a city"
                  aria-autocomplete="list"
                  aria-expanded={searchOpen && suggestions.length > 0}
                />
                <kbd>⌘ K</kbd>
              </label>
              {searchOpen && query.trim().length >= 2 && (
                <div className="suggestions" role="listbox" aria-label="City suggestions">
                  {suggestions.length > 0 ? suggestions.map((suggestion) => (
                    <button type="button" role="option" aria-selected="false" className="suggestion" key={`${suggestion.id}-${suggestion.latitude}-${suggestion.longitude}`} onClick={() => chooseLocation(suggestion)}>
                      <span className="suggestion-pin"><MapPin size={16} /></span>
                      <span className="suggestion-copy"><strong>{suggestion.name}</strong><small>{[suggestion.admin1, suggestion.country].filter(Boolean).join(", ")}</small></span>
                      <ArrowUpRight size={15} className="suggestion-arrow" />
                    </button>
                  )) : <div className="suggestion-empty">{searchError || "Finding places..."}</div>}
                </div>
              )}
            </div>
          </section>

          {recentLocations.length > 0 && (
            <nav className="recent-locations" aria-label="Recent locations">
              <span>RECENT</span>
              {recentLocations.map((recent) => (
                <button type="button" key={`${recent.latitude}-${recent.longitude}`} onClick={() => chooseLocation(recent)} className={recent.latitude === location.latitude && recent.longitude === location.longitude ? "recent-active" : ""}>
                  {recent.name}{recent.latitude === location.latitude && recent.longitude === location.longitude && <Check size={12} />}
                </button>
              ))}
            </nav>
          )}

          {error && (
            <div className="error-banner" role="alert">
              <span>{error}</span>
              <button type="button" onClick={() => setLocation((previous) => ({ ...previous }))}>Try again</button>
            </div>
          )}

          <section className="hero-grid">
            <article className="card current-card">
              <div className="current-topline">
                <div className="location-label"><MapPin size={15} /><span>{location.name}</span><ChevronDown size={14} className="location-chevron" /></div>
                <div className="live-time"><span /> LOCAL TIME {localTime || "--:--"}</div>
              </div>
              <div className="current-main">
                <div className="current-copy">
                  <div className="current-temp">{loading && !current ? <span className="loading-temp">--</span> : temp(current?.temperature_2m)}<span>°</span></div>
                  <div className="current-condition">{loading && !current ? "Finding your forecast" : currentDescription}</div>
                  <div className="feels-like"><Thermometer size={14} /> Feels like {current ? `${temp(current.apparent_temperature)}°` : "--"} <span className="feels-divider" /> H {daily ? temp(daily.temperature_2m_max[0]) : "--"}° <span className="feels-dash">/</span> L {daily ? temp(daily.temperature_2m_min[0]) : "--"}°</div>
                </div>
                <div className="hero-icon-wrap">
                  <div className="hero-icon-glow" />
                  {loading && !current ? <div className="weather-loading" /> : <WeatherIcon code={current?.weather_code} isDay={current?.is_day === 1} className="hero-weather-icon" />}
                  <span className="hero-icon-sparkle sparkle-one">✦</span><span className="hero-icon-sparkle sparkle-two">·</span><span className="hero-icon-sparkle sparkle-three">✧</span>
                </div>
              </div>
              <div className="current-footer">
                <div className="current-location-detail">
                  <div className="detail-title">{getLocationLabel(location)}</div>
                  <div className="detail-subtitle">A good day to be here.</div>
                </div>
                <div className="sun-times">
                  <div><Sunrise size={15} /><span>SUNRISE</span><strong>{daily?.sunrise?.[0]?.slice(11, 16) ?? "--:--"}</strong></div>
                  <i />
                  <div><Sunset size={15} /><span>SUNSET</span><strong>{daily?.sunset?.[0]?.slice(11, 16) ?? "--:--"}</strong></div>
                </div>
              </div>
              {refreshing && <span className="refreshing-indicator">Updating</span>}
            </article>

            <aside className="side-column">
              <div className="card quote-card">
                <div className="quote-top"><span className="quote-icon">✳</span><span>THE SKY, RIGHT NOW</span><span className="live-dot" /></div>
                <div className="quote-condition">{currentDescription}<span>.</span></div>
                <p>{current?.is_day === 1 ? "A little sunshine goes a long way. Make some room for the outdoors today." : "The day's winding down. Take a breath and enjoy the softer light."}</p>
                <div className="quote-bottom"><span>IN {location.name.toUpperCase()}</span><span>{updatedTime ? `UPDATED ${updatedTime}` : "LIVE"}</span></div>
              </div>
              <div className="metric-grid">
                <MetricCard icon={Droplets} label="HUMIDITY" value={`${current?.relative_humidity_2m ?? "--"}%`} note={current?.relative_humidity_2m > 70 ? "A little humid" : "Feels comfortable"} />
                <MetricCard icon={Wind} label="WIND" value={current ? Math.round(current.wind_speed_10m) : "--"} unit="km/h" note={compassDirection ? `From the ${compassDirection}` : "Gentle breeze"} className="wind-metric" />
                <MetricCard icon={Gauge} label="PRESSURE" value={current ? Math.round(current.surface_pressure) : "--"} unit="hPa" note="Atmospheric pressure" />
                <MetricCard icon={Eye} label="VISIBILITY" value={currentVisibility == null ? "--" : (currentVisibility / 1000).toFixed(1)} unit={currentVisibility == null ? "" : "km"} note={currentVisibility > 10000 ? "Crystal clear" : "Take it easy"} />
              </div>
            </aside>
          </section>

          <section className="card hourly-card" aria-labelledby="hourly-title">
            <div className="section-heading hourly-heading">
              <div className="section-title-group"><span className="section-icon"><Sun size={17} /></span><h2 id="hourly-title">The next few hours</h2></div>
              <span className="section-note"><CalendarDays size={14} /> NEXT 24 HOURS</span>
            </div>
            <div className="hourly-list">
              {loading && !weather ? Array.from({ length: 8 }, (_, index) => <div className="hour-item hour-skeleton" key={index}><span /><i /><b /></div>) : hourlyForecast.filter((_, index) => index % 2 === 0).map((hour, index) => (
                <div className={`hour-item ${index === 0 ? "hour-current" : ""}`} key={hour.time}>
                  <span className="hour-time">{index === 0 ? "Now" : formatHour(hour.time)}</span>
                  <WeatherIcon code={hour.weather_code} isDay={Number(hour.time.slice(11, 13)) >= 6 && Number(hour.time.slice(11, 13)) < 19} className="hour-icon" />
                  <strong>{temp(hour.temperature_2m)}°</strong>
                  <span className="hour-precip">{hour.precipitation_probability ? <><Droplets size={11} /> {hour.precipitation_probability}%</> : "\u00a0"}</span>
                </div>
              ))}
            </div>
            <div className="hourly-bottom"><span /><span>TIME OF DAY</span><span /></div>
          </section>

          <div className="bottom-grid">
            <WeatherChart data={hourlyForecast} unit={unit} mode={chartMode} onModeChange={setChartMode} />
            <section className="card forecast-card" aria-labelledby="forecast-title">
              <div className="section-heading forecast-heading">
                <div>
                  <div className="eyebrow"><span className="eyebrow-dot" /> LOOKING AHEAD</div>
                  <h2 id="forecast-title">7-day forecast</h2>
                </div>
                <span className="forecast-badge">7 DAYS</span>
              </div>
              <div className="forecast-list">
                {daily?.time?.map((date, index) => (
                  <div className={`forecast-row ${index === 0 ? "forecast-today" : ""}`} key={date}>
                    <div className="forecast-day"><span>{getDayLabel(date, index)}</span>{index === 0 && <span className="today-dot" />}</div>
                    <WeatherIcon code={daily.weather_code[index]} className="forecast-icon" />
                    <span className="forecast-condition">{getWeatherDescription(daily.weather_code[index])}</span>
                    <span className="forecast-rain">{daily.precipitation_probability_max?.[index] > 0 && <><Droplets size={12} /> {daily.precipitation_probability_max[index]}%</>}</span>
                    <div className="forecast-range"><span>{temp(daily.temperature_2m_min[index])}°</span><div className="temp-track"><i style={{ left: `${Math.min(Math.max((daily.temperature_2m_min[index] + 10) * 2.2, 0), 75)}%`, width: `${Math.min(Math.max((daily.temperature_2m_max[index] - daily.temperature_2m_min[index]) * 2.2, 15), 90)}%` }} /></div><strong>{temp(daily.temperature_2m_max[index])}°</strong></div>
                  </div>
                ))}
                {loading && !daily && Array.from({ length: 7 }, (_, index) => <div className="forecast-row forecast-skeleton" key={index}><span /><i /><b /></div>)}
              </div>
              <div className="forecast-footer"><span>FORECAST FOR {location.name.toUpperCase()}</span><span><span className="live-dot" /> UPDATED LIVE</span></div>
            </section>
          </div>

          {daily && (
            <section className="card day-summary">
              <div className="summary-icon"><Thermometer size={18} /></div>
              <div className="summary-copy"><strong>A little heads-up</strong><span>Today reaches {temp(daily.temperature_2m_max[0])}° with a high of {daily.uv_index_max?.[0] ?? 0} UV. {daily.precipitation_probability_max?.[0] > 40 ? "Keep an umbrella nearby, just in case." : "Looks like a lovely day to get outside."}</span></div>
              <span className="summary-arrow"><ArrowUpRight size={17} /></span>
            </section>
          )}

          <footer className="page-footer">
            <span><span className="footer-mark"><Sun size={14} /></span> MADE FOR THE MOMENT <span className="footer-dot">·</span> POWERED BY OPEN-METEO</span>
            <span>Weather is a good reason to look up.</span>
          </footer>
        </div>
      </div>
    </main>
  );
}
