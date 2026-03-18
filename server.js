const express = require("express");
const session = require("express-session");
const passport = require("passport");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");
const axios = require("axios");

// Configuración de autenticación (Google Strategy)
require("./auth/google");

/* --- RUTAS IMPORTADAS --- */
const authRoutes = require("./routes/auth.routes");
const mensajesRoutes = require("./routes/mensajes.routes");
const usuariosRoutes = require("./routes/usuarios.routes");

const app = express();

/* --- CONFIGURACIÓN DEL SERVIDOR --- */
// Importante para despliegues con Nginx + HTTPS
app.set("trust proxy", 1);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);
app.set("layout", "layouts/main");

/* --- MIDDLEWARES --- */
app.use(express.json()); // Soporte para JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

/* --- SESIONES --- */
app.use(
  session({
    secret: process.env.SESSION_SECRET || "panel_redimidos_seguro",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // true solo en producción con HTTPS
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 8, // 8 horas
    },
  })
);

/* --- PASSPORT (AUTENTICACIÓN) --- */
app.use(passport.initialize());
app.use(passport.session());

/**
 * Middleware: Requiere estar logueado
 */
function requireAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

/**
 * Middleware: Requiere rol de Administrador
 */
function requireAdmin(req, res, next) {
  const rol = req.user?.rol || req.user?.role;
  if (req.user && rol === "admin") {
    return next();
  }
  res.status(403).send("Acceso denegado: Se requieren permisos de administrador");
}

/* --- VARIABLES GLOBALES PARA VISTAS --- */
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.active = "";
  next();
});

/* --- DEFINICIÓN DE RUTAS --- */
app.use("/", authRoutes);
app.use("/", mensajesRoutes);
app.use("/", usuariosRoutes);

/* --- INTEGRACIÓN CON API DEL BOT (WHATSAPP) --- */
const BOT_API_URL = process.env.BOT_API_URL || "http://localhost:3001";
const BOT_API_KEY = process.env.BOT_API_KEY || "redimidos_bot_2026";

/**
 * Función auxiliar para peticiones al Bot
 */
async function callBot(method, endpoint) {
  return axios({
    method,
    url: `${BOT_API_URL}${endpoint}`,
    headers: { "x-api-key": BOT_API_KEY },
  });
}

// Vista principal del panel del Bot
app.get("/bot", requireAuth, requireAdmin, (req, res) => {
  res.render("bot");
});

// Logs del sistema
app.get("/bot/logs", requireAuth, requireAdmin, async (req, res) => {
  try {
    const response = await callBot("get", "/logs");
    res.json(response.data);
  } catch (err) {
    console.error("Error obteniendo logs:", err.message);
    res.json({ logs: [] });
  }
});

// Estado del Bot (Online/Offline)
app.get("/bot/status", requireAuth, requireAdmin, async (req, res) => {
  try {
    const response = await callBot("get", "/status");
    res.json(response.data);
  } catch (error) {
    res.json({ status: "offline" });
  }
});

// Uso de memoria del proceso
app.get("/bot/memory", requireAuth, requireAdmin, async (req, res) => {
  try {
    const response = await callBot("get", "/memory");
    res.json(response.data);
  } catch (err) {
    res.json({ memory: [] });
  }
});

// Obtener código QR de vinculación
app.get("/bot/qr", requireAuth, requireAdmin, async (req, res) => {
  try {
    const response = await callBot("get", "/qr");
    res.json(response.data);
  } catch (error) {
    res.json({ status: "error", message: "No se pudo obtener el QR" });
  }
});

// Reiniciar el proceso del Bot
app.post("/bot/restart", requireAuth, requireAdmin, async (req, res) => {
  try {
    await callBot("post", "/restart");
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Cerrar sesión de WhatsApp y borrar caché
app.post("/bot/reset", requireAuth, requireAdmin, async (req, res) => {
  try {
    await callBot("post", "/reset-session");
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

/* --- ARRANQUE DEL SERVIDOR --- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`-----------------------------------------------`);
  console.log(` Panel Redimidos corriendo en: http://localhost:${PORT}`);
  console.log(`-----------------------------------------------`);
});
