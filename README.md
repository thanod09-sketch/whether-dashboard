# Atmos Weather

A responsive weather dashboard built with React and Vite. Live conditions, city search, hourly and seven-day forecasts, sunrise/sunset, and weather trends are provided by the keyless [Open-Meteo API](https://open-meteo.com/).

## Run locally

```sh
npm install
npm run dev
```

No API key or `.env` configuration is required. The dashboard requests weather data directly from Open-Meteo and refreshes conditions every 15 minutes.

## Verify

```sh
npm test
npm run build
```
