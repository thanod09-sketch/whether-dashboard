export const DEFAULT_LOCATION = {
  name: "San Francisco",
  admin1: "California",
  country: "United States",
  latitude: 37.7749,
  longitude: -122.4194,
};

const WEATHER_CODES = {
  0: "Clear sky",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Freezing fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  56: "Freezing drizzle",
  57: "Freezing drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Freezing rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Light showers",
  81: "Rain showers",
  82: "Heavy showers",
  85: "Snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm & hail",
  99: "Thunderstorm & hail",
};

export function getWeatherDescription(code) {
  return WEATHER_CODES[code] ?? "Weather unavailable";
}

export function getWeatherTheme(code, isDay = true) {
  if (!isDay) return "night";
  if (code === 0 || code === 1) return "sunny";
  if (code === 2 || code === 3) return "cloudy";
  if ([45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rainy";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snowy";
  if ([95, 96, 99].includes(code)) return "stormy";
  return "cloudy";
}

export function getWeatherIcon(code, isDay = true) {
  if ([0, 1].includes(code)) return isDay ? "sun" : "moon";
  if (code === 2) return "partly-cloudy";
  if (code === 3) return "cloud";
  if ([45, 48].includes(code)) return "fog";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([95, 96, 99].includes(code)) return "storm";
  return "cloud";
}

export function convertTemperature(celsius, unit) {
  if (celsius == null || Number.isNaN(Number(celsius))) return "--";
  const temperature = unit === "F" ? (Number(celsius) * 9) / 5 + 32 : Number(celsius);
  return Math.round(temperature);
}

export function formatHour(time) {
  if (!time) return "--";
  const hour = Number(time.slice(11, 13));
  if (Number.isNaN(hour)) return "--";
  return `${hour % 12 || 12}${hour < 12 ? "AM" : "PM"}`;
}

export function getDayLabel(date, index) {
  if (index === 0) return "Today";
  const parsed = new Date(`${date}T12:00:00`);
  return parsed.toLocaleDateString(undefined, { weekday: "short" });
}

export function getWeatherUrl(latitude, longitude) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    timezone: "auto",
    forecast_days: "7",
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "is_day",
      "precipitation",
      "weather_code",
      "surface_pressure",
      "wind_speed_10m",
      "wind_direction_10m",
    ].join(","),
    hourly: [
      "temperature_2m",
      "precipitation_probability",
      "weather_code",
      "wind_speed_10m",
      "visibility",
    ].join(","),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "sunrise",
      "sunset",
      "uv_index_max",
      "precipitation_probability_max",
      "wind_speed_10m_max",
    ].join(","),
  });
  return `https://api.open-meteo.com/v1/forecast?${params}`;
}

export function getGeocodingUrl(query) {
  const params = new URLSearchParams({
    name: query,
    count: "6",
    language: "en",
    format: "json",
  });
  return `https://geocoding-api.open-meteo.com/v1/search?${params}`;
}

export function getLocationLabel(location) {
  return [location.name, location.admin1, location.country].filter(Boolean).join(", ");
}
