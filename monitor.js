require('dotenv').config();
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

// Configuración
const URL_INICIAL = 'https://titulosvalidez.educacion.gob.ar/validez/detitulos/index.php';
const URL_NO_ACCESS = 'noaccess.php';
const INTERVALO_MINUTOS = process.env.INTERVALO_MINUTOS;
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;           // Notificaciones privadas (monitor iniciado, error, detenido)
const TELEGRAM_CHAT_ID_CANAL = process.env.TELEGRAM_CHAT_ID_CANAL; // Canal (turnos disponibles, turnos cerrados)

// Validar variables de entorno
if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID || !TELEGRAM_CHAT_ID_CANAL || !INTERVALO_MINUTOS) {
  console.error('Error: Faltan variables de entorno');
  console.error('Configura TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (privado), TELEGRAM_CHAT_ID_CANAL y INTERVALO_MINUTOS en .env');
  process.exit(1);
}

// Inicializar bot de Telegram
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });

// Zona horaria Argentina (para que la hora en mensajes sea correcta en Railway/servidores UTC)
const TZ_ARGENTINA = 'America/Argentina/Buenos_Aires';

function horaArgentina() {
  return new Date().toLocaleString('es-AR', {
    timeZone: TZ_ARGENTINA,
    hour12: false,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// Estado del monitor
let estadoAnterior = null;
let intentos = 0;
let erroresConsecutivos = 0;

/**
 * Envía un mensaje por Telegram al chat/channel indicado
 * @param {string} chatId - ID del chat o canal (@channel o numérico)
 * @param {string} mensaje - Texto del mensaje
 * @param {string} [destino='Telegram'] - Etiqueta para el log (ej: 'canal', 'privado')
 */
async function enviarMensajeTelegram(chatId, mensaje, destino = 'Telegram') {
  try {
    await bot.sendMessage(chatId, mensaje, { parse_mode: 'Markdown' });
    console.log(`✅ Mensaje enviado (${destino})`);
  } catch (error) {
    console.error(`❌ Error al enviar mensaje (${destino}):`, error.message);
  }
}

/**
 * Verifica si la página redirige a noaccess.php
 */
async function verificarTurnos() {
  let browser;
  try {
    console.log(`\n🔍 Verificando turnos... (Intento #${++intentos})`);
    console.log(`⌚️ ${horaArgentina()}`);

    // Configuración de launch (optimizada para contenedores/Docker/Railway)
    const launchOptions = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--no-first-run',
        '--disable-crash-reporter',
        '--disable-breakpad',
        '--disable-features=site-per-process',
        '--memory-pressure-off',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--disable-dbus',
        '--disable-ipc-flooding-protection',
        '--max-old-space-size=512'
      ]
    };

    // Lanzar el navegador con Chromium bundled de Puppeteer
    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();
    
    // Configurar timeout y user agent
    await page.setDefaultNavigationTimeout(30000);
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Navegar a la URL
    const response = await page.goto(URL_INICIAL, {
      waitUntil: 'domcontentloaded'
    });

    // Esperar un momento adicional para asegurar que se complete cualquier redirección
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Obtener la URL final
    const urlFinal = page.url();

    // Verificar si redirige a noaccess
    const hayTurnos = !urlFinal.includes(URL_NO_ACCESS);

    if (hayTurnos) {
      console.log('🎉 ¡HAY TURNOS DISPONIBLES!');
      
      // Solo enviar mensaje si el estado cambió
      if (estadoAnterior !== 'disponible') {
        const mensaje = `🎉 *¡TURNOS DISPONIBLES!*\n\n` +
                       `La página de Validez Nacional de Títulos está accesible.\n\n` +
                       `🔗 [Acceder ahora](${URL_INICIAL})\n\n` +
                       `⏰ Detectado: ${horaArgentina()}`;
        
        await enviarMensajeTelegram(TELEGRAM_CHAT_ID_CANAL, mensaje, 'canal');
        estadoAnterior = 'disponible';
      }
    } else {
      console.log('❌ No hay turnos disponibles');
      
      // Notificar cuando se detecta por primera vez que no hay turnos
      if (estadoAnterior === null) {
        const mensaje = `🤖 *Monitor iniciado*\n\n` +
                       `Monitoreando turnos cada ${INTERVALO_MINUTOS} minuto(s).\n` +
                       `Actualmente NO hay turnos disponibles.\n\n` +
                       `Te avisaré cuando estén disponibles! 🔔`;
        
        await enviarMensajeTelegram(TELEGRAM_CHAT_ID, mensaje, 'privado');
      }
      
      // Notificar cuando los turnos dejan de estar disponibles
      if (estadoAnterior === 'disponible') {
        const mensaje = `😔 *Turnos cerrados*\n\n` +
                       `Los turnos se han cerrado.\n\n` +
                       `⏰ Detectado: ${horaArgentina()}\n\n` +
                       `Seguiré monitoreando y te avisaré cuando vuelvan a estar disponibles! 🔔`;
        
        await enviarMensajeTelegram(TELEGRAM_CHAT_ID_CANAL, mensaje, 'canal');
      }
      
      estadoAnterior = 'no_disponible';
    }

    erroresConsecutivos = 0;

  } catch (error) {
    erroresConsecutivos++;
    console.error('❌ Error al verificar turnos:', error.message);
    
    // Enviar alerta si hay muchos errores consecutivos
    if (erroresConsecutivos >= 5) {
      const mensaje = `⚠️ *Error en el monitor*\n\n` +
                     `Se han detectado ${erroresConsecutivos} errores consecutivos.\n` +
                     `Error: ${error.message}\n\n` +
                     `El monitor seguirá intentando...`;
      
      await enviarMensajeTelegram(TELEGRAM_CHAT_ID, mensaje, 'privado');
      erroresConsecutivos = 0; // Reset para no spamear
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Inicia el monitoreo continuo
 */
async function iniciarMonitor() {
  console.log('🚀 Iniciando monitor de turnos...');
  console.log(`📊 Intervalo: ${INTERVALO_MINUTOS} minuto(s)`);
  console.log('─'.repeat(50));

  // Primera verificación
  await verificarTurnos();

  // Configurar verificación periódica
  setInterval(async () => {
    await verificarTurnos();
  }, INTERVALO_MINUTOS * 60 * 1000);

  console.log(`\n✅ Monitor activo. Presiona Ctrl+C para detener.\n`);
}

// Manejar cierre graceful
process.on('SIGINT', async () => {
  console.log('\n\n👋 Deteniendo monitor...');
  
  const mensaje = `🛑 *Monitor detenido*\n\n` +
                 `El monitor de turnos se ha detenido.\n` +
                 `Total de verificaciones: ${intentos}`;
  
  await enviarMensajeTelegram(TELEGRAM_CHAT_ID, mensaje, 'privado');
  process.exit(0);
});

// Iniciar
iniciarMonitor();
