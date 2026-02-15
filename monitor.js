require('dotenv').config();
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

// Configuración
const URL_INICIAL = 'https://titulosvalidez.educacion.gob.ar/validez/detitulos/index.php';
const URL_NO_ACCESS = 'noaccess.php';
const INTERVALO_MINUTOS = process.env.INTERVALO_MINUTOS;
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Validar variables de entorno
if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID || !INTERVALO_MINUTOS) {
  console.error('Error: Faltan variables de entorno');
  console.error('Por favor configura TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID y INTERVALO_MINUTOS en el archivo .env');
  process.exit(1);
}

// Inicializar bot de Telegram
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });

// Estado del monitor
let estadoAnterior = null;
let intentos = 0;
let erroresConsecutivos = 0;

/**
 * Envía un mensaje por Telegram
 */
async function enviarMensajeTelegram(mensaje) {
  try {
    await bot.sendMessage(TELEGRAM_CHAT_ID, mensaje, { parse_mode: 'Markdown' });
    console.log('✅ Mensaje enviado a Telegram');
  } catch (error) {
    console.error('❌ Error al enviar mensaje a Telegram:', error.message);
  }
}

/**
 * Verifica si la página redirige a noaccess.php
 */
async function verificarTurnos() {
  let browser;
  try {
    console.log(`\n🔍 Verificando turnos... (Intento #${++intentos})`);
    console.log(`⌚️ ${new Date().toLocaleString('es-AR')}`);

    // Configuración de launch
    const launchOptions = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    };

    // Intentar lanzar el navegador
    try {
      browser = await puppeteer.launch(launchOptions);
    } catch (error) {
      // Si falla, intentar con Chrome del sistema
      console.log('⚠️  Intentando con Chrome del sistema...');
      launchOptions.channel = 'chrome';
      browser = await puppeteer.launch(launchOptions);
    }

    const page = await browser.newPage();
    
    // Configurar timeout y user agent
    await page.setDefaultNavigationTimeout(30000);
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Navegar a la URL
    const response = await page.goto(URL_INICIAL, {
      waitUntil: 'networkidle2'
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
                       `⏰ Detectado: ${new Date().toLocaleString('es-AR')}`;
        
        await enviarMensajeTelegram(mensaje);
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
        
        await enviarMensajeTelegram(mensaje);
      }
      
      // Notificar cuando los turnos dejan de estar disponibles
      if (estadoAnterior === 'disponible') {
        const mensaje = `😔 *Turnos ya no disponibles*\n\n` +
                       `Los turnos que estaban disponibles se agotaron.\n\n` +
                       `⏰ Detectado: ${new Date().toLocaleString('es-AR')}\n\n` +
                       `Seguiré monitoreando y te avisaré cuando vuelvan a estar disponibles! 🔔`;
        
        await enviarMensajeTelegram(mensaje);
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
      
      await enviarMensajeTelegram(mensaje);
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
  console.log('─'.repeat(75));

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
  
  await enviarMensajeTelegram(mensaje);
  process.exit(0);
});

// Iniciar
iniciarMonitor();
