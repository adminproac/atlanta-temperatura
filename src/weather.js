const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const ATLANTA_TIME_ZONE = "America/New_York";
const REQUEST_TIMEOUT_MS = 15000;

const ATLANTA = {
  latitude: 33.7488,
  longitude: -84.3877,
};

const CONDITIONS = {
  0: "Despejado",
  1: "Mayormente despejado",
  2: "Parcialmente nublado",
  3: "Nublado",
  45: "Niebla",
  48: "Niebla con escarcha",
  51: "Llovizna ligera",
  53: "Llovizna",
  55: "Llovizna intensa",
  56: "Llovizna helada",
  57: "Llovizna helada intensa",
  61: "Lluvia ligera",
  63: "Lluvia",
  65: "Lluvia intensa",
  66: "Lluvia helada",
  67: "Lluvia helada intensa",
  71: "Nieve ligera",
  73: "Nieve",
  75: "Nieve intensa",
  77: "Granos de nieve",
  80: "Chubascos ligeros",
  81: "Chubascos",
  82: "Chubascos fuertes",
  85: "Chubascos de nieve",
  86: "Chubascos de nieve fuertes",
  95: "Tormenta",
  96: "Tormenta con granizo",
  99: "Tormenta con granizo fuerte",
};

const WIND_FROM = [
  "del norte",
  "del noreste",
  "del este",
  "del sureste",
  "del sur",
  "del suroeste",
  "del oeste",
  "del noroeste",
];

const timeFormatter = new Intl.DateTimeFormat("es", {
  timeZone: ATLANTA_TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});

export function fahrenheitToCelsius(fahrenheit) {
  return ((fahrenheit - 32) * 5) / 9;
}

export function formatTemp(value) {
  if (!Number.isFinite(value)) return "—";
  return value.toFixed(1);
}

export function weatherKind(code) {
  if (code === 0 || code === 1) return "clear";
  if (code === 2) return "partly";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95 && code <= 99) return "storm";
  return "cloudy";
}

export function describeWeather(code) {
  return CONDITIONS[code] ?? "Condición no disponible";
}

export function windFrom(degrees) {
  if (!Number.isFinite(degrees)) return "";
  const normalized = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalized / 45) % 8;
  return WIND_FROM[index];
}

function parseAtlantaTime(isoLocal, utcOffsetSeconds) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(
    isoLocal ?? "",
  );
  if (!match || !Number.isFinite(utcOffsetSeconds)) return null;
  const [, year, month, day, hour, minute, second = "0"] = match;
  const asUtc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );
  return new Date(asUtc - utcOffsetSeconds * 1000);
}

function optionalNumber(value) {
  return Number.isFinite(value) ? value : null;
}

export async function fetchAtlantaWeather(signal) {
  const params = new URLSearchParams({
    latitude: String(ATLANTA.latitude),
    longitude: String(ATLANTA.longitude),
    current: [
      "temperature_2m",
      "apparent_temperature",
      "relative_humidity_2m",
      "weather_code",
      "wind_speed_10m",
      "wind_direction_10m",
      "is_day",
      "cloud_cover",
    ].join(","),
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    timezone: ATLANTA_TIME_ZONE,
  });

  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const combined = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

  let response;
  try {
    response = await fetch(`${FORECAST_URL}?${params}`, { signal: combined });
  } catch (error) {
    if (signal?.aborted && !timeoutSignal.aborted) throw error;
    if (timeoutSignal.aborted) {
      throw new Error("Open-Meteo tardó demasiado en responder.");
    }
    throw new Error(
      "No hay conexión con Open-Meteo. Revisa tu red e inténtalo de nuevo.",
    );
  }

  if (!response.ok) {
    throw new Error(
      `Open-Meteo respondió con un error (${response.status}). Inténtalo de nuevo.`,
    );
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("La respuesta del clima no se pudo leer.");
  }

  const current = data?.current;
  const fahrenheit = current?.temperature_2m;
  if (!Number.isFinite(fahrenheit)) {
    throw new Error("La respuesta del clima llegó incompleta.");
  }

  const feelsLikeFahrenheit = Number.isFinite(current.apparent_temperature)
    ? current.apparent_temperature
    : fahrenheit;
  const observedAt = parseAtlantaTime(current.time, data.utc_offset_seconds);
  if (!observedAt) {
    throw new Error("La respuesta del clima no trae la hora de la lectura.");
  }

  const windMph = optionalNumber(current.wind_speed_10m);

  return {
    fahrenheit,
    celsius: fahrenheitToCelsius(fahrenheit),
    feelsLikeFahrenheit,
    feelsLikeCelsius: fahrenheitToCelsius(feelsLikeFahrenheit),
    humidity: optionalNumber(current.relative_humidity_2m),
    cloudCover: optionalNumber(current.cloud_cover),
    condition: describeWeather(current.weather_code),
    kind: weatherKind(current.weather_code),
    windMph,
    windKmh: windMph === null ? null : windMph * 1.609344,
    windFrom: windFrom(current.wind_direction_10m),
    isDay: current.is_day === 1,
    observedAt,
    observedLabel: timeFormatter.format(observedAt),
  };
}
