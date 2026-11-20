import { useCallback, useEffect, useRef, useState } from "react";
import { fetchAtlantaWeather, formatTemp } from "./weather.js";
import "./App.css";

const REFRESH_EVERY_MS = 10 * 60 * 1000;
const STALE_AFTER_MS = 5 * 60 * 1000;

const BUILDINGS = [
  [0, 148, 78, 72],
  [78, 168, 46, 52],
  [124, 118, 92, 102],
  [216, 156, 54, 64],
  [270, 96, 78, 124],
  [348, 138, 70, 82],
  [418, 108, 96, 112],
  [514, 162, 58, 58],
  [572, 72, 86, 148],
  [658, 128, 74, 92],
  [732, 100, 88, 120],
  [820, 150, 64, 70],
  [884, 86, 92, 134],
  [976, 140, 70, 80],
  [1046, 112, 84, 108],
  [1130, 158, 70, 62],
];

function WeatherIcon({ kind }) {
  if (kind === "clear") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="5" />
        <path d="M16 4v3M16 25v3M4 16h3M25 16h3M7.5 7.5l2.1 2.1M22.4 22.4l2.1 2.1M24.5 7.5l-2.1 2.1M9.6 22.4l-2.1 2.1" />
      </svg>
    );
  }

  if (kind === "partly") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 4v2M5 12H3M8 6.5 6.6 5.1M18 6.5l1.4-1.4" />
        <path d="M13 22h10a4.5 4.5 0 0 0 .4-9 6 6 0 0 0-11.5 1.6A3.8 3.8 0 0 0 13 22Z" />
      </svg>
    );
  }

  if (kind === "rain" || kind === "storm") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M11 18h12a4.2 4.2 0 0 0 .3-8.4A5.6 5.6 0 0 0 12.2 8 3.6 3.6 0 0 0 11 18Z" />
        {kind === "storm" ? (
          <path d="M17 18.5 14 24h3l-1.2 4.5L21 21h-3l1.2-2.5Z" />
        ) : (
          <path d="M13 21.5v4M17 21v5M21 21.5v4" />
        )}
      </svg>
    );
  }

  if (kind === "snow") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M11 17h12a4.2 4.2 0 0 0 .3-8.4A5.6 5.6 0 0 0 12.2 7 3.6 3.6 0 0 0 11 17Z" />
        <path d="M13 22v4M17 21v5M21 22v4M11.5 24h3M15.5 23.5h3M19.5 24h3" />
      </svg>
    );
  }

  if (kind === "fog") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M8 12h16M6 17h20M9 22h14" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M10 22h13a5 5 0 0 0 .4-10A6.5 6.5 0 0 0 11.4 9 4.2 4.2 0 0 0 10 22Z" />
    </svg>
  );
}

function Skyline() {
  return (
    <svg className="skyline" viewBox="0 0 1200 220" preserveAspectRatio="none" aria-hidden="true">
      {BUILDINGS.map(([x, y, width, height]) => (
        <rect key={`${x}-${height}`} x={x} y={y} width={width} height={height} />
      ))}
      <rect x="608" y="40" width="4" height="34" />
      <rect x="300" y="72" width="3" height="26" />
      <rect x="922" y="62" width="3" height="26" />
    </svg>
  );
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "—";
  return `${Math.round(value)}%`;
}

function WindDetail({ weather }) {
  if (!Number.isFinite(weather.windMph) || Math.round(weather.windMph) === 0) {
    return (
      <>
        Calma
        <span>sin viento notable</span>
      </>
    );
  }

  const direction = weather.windFrom ? ` ${weather.windFrom}` : "";
  return (
    <>
      {`${Math.round(weather.windMph)} mph${direction}`}
      <span>{`${Math.round(weather.windKmh)} km/h`}</span>
    </>
  );
}

export default function App() {
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const requestRef = useRef(null);
  const fetchedAtRef = useRef(0);

  const load = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setError("");

    try {
      const next = await fetchAtlantaWeather(controller.signal);
      if (requestRef.current !== controller) return;
      setWeather(next);
      fetchedAtRef.current = Date.now();
    } catch (err) {
      if (err.name === "AbortError" || requestRef.current !== controller) return;
      setError(err.message || "No se pudo obtener el clima de Atlanta.");
    } finally {
      if (requestRef.current === controller) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => {
      load();
    }, 0);
    const interval = window.setInterval(() => {
      load();
    }, REFRESH_EVERY_MS);

    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
      requestRef.current?.abort();
    };
  }, [load]);

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - fetchedAtRef.current < STALE_AFTER_MS) return;
      load();
    }

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [load]);

  useEffect(() => {
    if (!weather) {
      document.title = "Temperatura en Atlanta";
      return;
    }
    document.title = `${formatTemp(weather.fahrenheit)}°F en Atlanta`;
  }, [weather]);

  const sky = weather?.kind ?? "clear";
  const timeOfDay = weather ? (weather.isDay ? "day" : "night") : "pending";
  const refreshing = loading && weather !== null;

  return (
    <main className="scene" data-sky={sky} data-time={timeOfDay}>
      <div className="orb" aria-hidden="true" />
      <article className="panel">
        <header className="top">
          <div>
            <p className="eyebrow">Clima actual · Georgia, Estados Unidos</p>
            <h1>Atlanta</h1>
          </div>
          <button
            type="button"
            className="refresh"
            onClick={load}
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? "Actualizando…" : "Actualizar"}
          </button>
        </header>

        {error ? (
          <p className="alert" role="alert">
            {weather
              ? `No se pudo actualizar. Se muestra la última lectura. ${error}`
              : error}
          </p>
        ) : null}

        {!weather && loading ? (
          <p className="status" role="status">
            Consultando el clima de Atlanta…
          </p>
        ) : null}

        {weather ? (
          <div aria-live="polite">
            <p className="sr-only">
              {refreshing
                ? "Actualizando el clima de Atlanta"
                : `Temperatura ${formatTemp(weather.fahrenheit)} grados Fahrenheit, ${formatTemp(weather.celsius)} grados Celsius. ${weather.condition}.`}
            </p>
            <div className="temps">
              <p className="temp temp-f">
                <span className="temp-value">{formatTemp(weather.fahrenheit)}</span>
                <abbr className="temp-unit" title="grados Fahrenheit">
                  °F
                </abbr>
              </p>
              <p className="temp temp-c">
                <span className="temp-value">{formatTemp(weather.celsius)}</span>
                <abbr className="temp-unit" title="grados Celsius">
                  °C
                </abbr>
              </p>
            </div>
            <p className="condition">
              <WeatherIcon kind={weather.kind} />
              <span>{weather.condition}</span>
            </p>
            <dl className="stats">
              <div>
                <dt>Sensación</dt>
                <dd>
                  {formatTemp(weather.feelsLikeFahrenheit)}°F
                  <span>{formatTemp(weather.feelsLikeCelsius)}°C</span>
                </dd>
              </div>
              <div>
                <dt>Humedad</dt>
                <dd>{formatPercent(weather.humidity)}</dd>
              </div>
              <div>
                <dt>Viento</dt>
                <dd>
                  <WindDetail weather={weather} />
                </dd>
              </div>
              <div>
                <dt>Nubosidad</dt>
                <dd>{formatPercent(weather.cloudCover)}</dd>
              </div>
            </dl>
            <footer className="meta">
              <p>
                Lectura tomada el {weather.observedLabel}, hora de Atlanta.
              </p>
              <p className="fine">
                Centro de Atlanta. Se actualiza sola cada 10 minutos. Datos de{" "}
                <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
                  Open-Meteo
                </a>
                .
              </p>
            </footer>
          </div>
        ) : null}
      </article>
      <Skyline />
    </main>
  );
}
