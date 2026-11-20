# Temperatura en Atlanta

Muestra la temperatura actual en Atlanta, Georgia (Estados Unidos), en grados Fahrenheit y Celsius. También incluye la sensación térmica, el estado del cielo, la humedad, el viento y la hora en que se tomó la lectura, en la hora local de Atlanta (`America/New_York`).

Los datos salen de [Open-Meteo](https://open-meteo.com/), un servicio gratuito que no pide clave de API. La página se actualiza sola cada 10 minutos y tiene un botón para actualizarla a mano.

**Sitio en vivo:** https://adminproac.github.io/atlanta-temperatura/

## Ejecutar en local

Hace falta Node.js 22 o superior.

```bash
npm install
npm run dev
```

Abre http://localhost:5173 en el navegador.

Cada push a `main` compila el sitio y lo publica en GitHub Pages con GitHub Actions. Si la página no aparece, en el repositorio abre **Settings → Pages → Build and deployment → Source** y elige **GitHub Actions**.
