import test from "node:test";
import assert from "node:assert/strict";
import {
  convertTemperature,
  formatHour,
  getDayLabel,
  getGeocodingUrl,
  getWeatherDescription,
  getWeatherIcon,
  getWeatherTheme,
  getWeatherUrl,
} from "./weather.js";

test("weather code helpers classify clear, wet, and nighttime conditions", () => {
  assert.equal(getWeatherDescription(61), "Light rain");
  assert.equal(getWeatherIcon(95), "storm");
  assert.equal(getWeatherTheme(0, false), "night");
  assert.equal(getWeatherTheme(71), "snowy");
});

test("temperature conversion preserves Celsius and converts Fahrenheit", () => {
  assert.equal(convertTemperature(20, "C"), 20);
  assert.equal(convertTemperature(20, "F"), 68);
  assert.equal(convertTemperature(null, "C"), "--");
});

test("local forecast times and days format without shifting calendar dates", () => {
  assert.equal(formatHour("2026-07-14T00:00"), "12AM");
  assert.equal(formatHour("2026-07-14T13:00"), "1PM");
  assert.equal(getDayLabel("2026-07-14", 0), "Today");
  assert.equal(getDayLabel("2026-07-14", 1), new Date("2026-07-14T12:00:00").toLocaleDateString(undefined, { weekday: "short" }));
});

test("weather and geocoding URLs request the dashboard data without API keys", () => {
  const weatherUrl = new URL(getWeatherUrl(37.7, -122.4));
  assert.equal(weatherUrl.searchParams.get("forecast_days"), "7");
  assert.match(weatherUrl.searchParams.get("hourly"), /visibility/);
  assert.match(weatherUrl.searchParams.get("daily"), /sunrise/);
  assert.equal(new URL(getGeocodingUrl("San Francisco")).searchParams.get("name"), "San Francisco");
  assert.equal(weatherUrl.searchParams.has("apikey"), false);
});
