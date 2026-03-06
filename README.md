# Panel de Automatización de Mensajes

Sistema web para programar y enviar mensajes automáticamente a WhatsApp y Facebook.

## Objetivo

Permitir programar contenido (texto, imagen o video) y enviarlo automáticamente a grupos o canales en el horario definido.

---

# Arquitectura

Servidor:

Ubuntu 24.04  
VPS DigitalOcean

Stack:

Node.js  
Express  
SQLite  
Nginx (Reverse Proxy)  
PM2  
Passport.js  
Google OAuth

---

# Dominio

panel.redimidosdelasnaciones.com

---

# Estructura del Proyecto
panel
│
├── server.js
├── database.js
├── bot.db
│
├── auth
│ └── google.js
│
├── routes
│ ├── auth.routes.js
│ ├── mensajes.routes.js
│ └── usuarios.routes.js
│
├── controllers
│ └── mensajes.controller.js
│
├── uploads
│
├── public
│ └── favicon.png
│
└── views
├── layouts
│ └── main.ejs
│
├── partials
│ └── sidebar.ejs
│
└── pages
├── dashboard.ejs
├── programados.ejs
├── nuevo_mensaje.ejs
├── historial.ejs
├── usuarios.ejs
└── login.ejs

---

# Base de Datos

SQLite

Archivo:
bot.db

Tabla principal:

```sql
CREATE TABLE mensajes (
id INTEGER PRIMARY KEY AUTOINCREMENT,
texto TEXT,
archivo TEXT,
grupos TEXT,
fecha TEXT,
hora TEXT,
estado TEXT
);

Funcionalidades

Actualmente el panel permite:

Dashboard

Métricas del sistema:

mensajes enviados

mensajes pendientes

mensajes programados hoy

Nuevo mensaje

Permite programar:

texto

imagen

video

grupos

fecha

hora

Incluye:

preview de imagen

preview de video

Programados

Lista de mensajes programados con acciones:

editar

duplicar

eliminar

Historial

Mensajes enviados.

Usuarios

Gestión básica de usuarios.

Roles planeados:

admin
editor
viewer

Autenticación

Sistema de login usando:

Google OAuth
Passport.js

Flujo:


/login
→ /auth/google
→ Google
→ /auth/google/callback
→ /

Sesiones

Se utiliza:

express-session

Configuración:

app.set("trust proxy",1)

app.use(
session({
secret:"panel_redimidos_seguro",
resave:false,
saveUninitialized:false,
cookie:{
secure:true,
sameSite:"lax",
maxAge:1000*60*60*8
}
})
)
Nginx

Configurado como reverse proxy hacia:

localhost:3000
Configuración importante:

client_max_body_size 60M;
Permite subir archivos de video.

Próximas funciones

Scheduler automático

Envío WhatsApp

Envío Facebook

Sistema de workers
Autor

Proyecto desarrollado por:

Edison Oquendo
