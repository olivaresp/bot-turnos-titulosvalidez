# 🎯 Monitor de Turnos - Validez Nacional de Títulos


Sistema automatizado que monitorea la disponibilidad de turnos en el sitio de **Validez Nacional de Títulos** del Ministerio de Educación de Argentina y envía notificaciones instantáneas a Telegram cuando hay turnos disponibles.

Solución al mensaje
> **"Lamentablemente no hay turnos disponibles debido al alto nivel de demanda. Por favor, vuelva a intentar en otro momento."**

Este bot te ayuda a conseguir un turno automáticamente sin tener que revisar constantemente la página.

[![Node.js](https://img.shields.io/badge/Node.js->=18.0.0-green.svg)](https://nodejs.org/) [![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE) [![Puppeteer](https://img.shields.io/badge/Puppeteer-22.0.0-orange.svg)](https://pptr.dev/) [![GitHub](https://img.shields.io/badge/GitHub-bot--turnos--titulosvalidez-181717?logo=github)](https://github.com/olivaresp/bot-turnos-titulosvalidez)


---

## 📋 Tabla de Contenidos

- [Requisitos](#-requisitos-previos)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Uso](#️-uso)
- [Notificaciones](#-notificaciones)
- [Licencia](#-licencia)

---

## 📋 Requisitos

- **Node.js** versión > 18.0.0
- **pnpm** (gestor de paquetes recomendado - [instalar pnpm](https://pnpm.io/installation))
- Una cuenta de **Telegram**

---

## 🔧 Instalación

### 1️⃣ Clonar o descargar el proyecto

```bash
git clone https://github.com/olivaresp/bot-turnos-titulosvalidez.git
cd bot-turnos-titulosvalidez
```

### 2️⃣ Instalar dependencias

```bash
pnpm install
```

Durante la instalación, Puppeteer descargará automáticamente una versión compatible de Chrome.

---

## ⚙️ Configuración

### 1️⃣ Crear tu Bot de Telegram

1. Abre Telegram y busca **[@BotFather](https://t.me/botfather)**
2. Envía el comando `/newbot`
3. Asigna un nombre a tu bot (ejemplo: "Monitor de Turnos")
4. Asigna un username único (debe terminar en "bot", ejemplo: "MonitorTurnosBot")
5. **Guarda el token** que te proporciona BotFather

El token tiene este formato: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`

### 2️⃣ Obtener tu Chat ID


1. Busca **[@userinfobot](https://t.me/userinfobot)** en Telegram
2. Inicia una conversación con `/start`
3. El bot te mostrará tu **Chat ID** (es un número como `123456789`)


### 3️⃣ Configurar variables de entorno

```bash
# Copiar el archivo de ejemplo
cp .env.example .env
```

Edita el archivo `.env` con tu editor favorito y configura las siguientes variables:

```env
# Token de tu bot de Telegram
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz

# Tu Chat ID de Telegram
TELEGRAM_CHAT_ID=123456789

# Intervalo de verificación en minutos (Por defecto: 1)
INTERVALO_MINUTOS=1
```

**Importante:** Asegúrate de iniciar una conversación con tu bot enviándole `/start` antes de ejecutar el monitor.

---

## ▶️ Uso

### Iniciar el monitor

```bash
pnpm start
```

Verás una salida similar a esta:

```
🚀 Iniciando monitor de turnos...
📊 Intervalo: 1 minuto(s)
───────────────────────────────────────────────────────────────────────────

🔍 Verificando turnos... (Intento #1)
⌚️ 15/02/2026 10:30:45
❌ No hay turnos disponibles

✅ Monitor activo. Presiona Ctrl+C para detener.
```

### Detener el monitor

Para detener el monitor de forma segura:

1. Presiona **`Ctrl + C`** en la terminal
2. El monitor enviará un mensaje final a Telegram con el total de verificaciones realizadas
3. El proceso se cerrará correctamente

---

## 📱 Notificaciones

El bot enviará mensajes a Telegram en los siguientes casos:

| Evento | Descripción | Emoji |
|--------|-------------|-------|
| **Inicio del monitor** | Confirma que el monitor está funcionando correctamente | 🤖 |
| **Turnos disponibles** | ¡La página está accesible y hay turnos! | 🎉 |
| **Turnos agotados** | Los turnos que estaban disponibles se agotaron | 😔 |
| **Errores consecutivos** | Se detectaron 5 o más errores seguidos | ⚠️ |
| **Monitor detenido** | El monitor fue detenido manualmente | 🛑 |

### Ejemplo de notificación:

```
🎉 ¡TURNOS DISPONIBLES!

La página de Validez Nacional de Títulos está accesible.

🔗 Acceder ahora
⏰ Detectado: 15/02/2026 10:35:22
```

---

## 📄 Licencia

Este proyecto está bajo la licencia **ISC**.

---

## 🔍 Keywords

Bot turnos validez nacional títulos, reconocimiento estudios extranjeros Argentina, turnos Ministerio Educación, "lamentablemente no hay turnos disponibles debido al alto nivel de demanda", bot telegram turnos, monitor turnos automático, validez títulos extranjeros, apostilla Argentina, convalidación títulos, homologación títulos extranjeros
