# Arquitectura del Sistema

Este documento describe la arquitectura técnica del sistema de automatización de mensajes.

El sistema permite programar y enviar contenido automáticamente a WhatsApp y Facebook desde un panel web.

---

# Componentes del Sistema

El sistema está compuesto por cuatro módulos principales:

1. Panel Web
2. Base de Datos
3. Scheduler de Mensajes
4. Bots de Envío

---

# 1. Panel Web

El panel web permite administrar el sistema.

Funciones:

- programar mensajes
- subir imagen o video
- elegir grupos
- elegir plataforma
- ver historial
- gestionar usuarios

Tecnologías utilizadas:

Node.js  
Express  
EJS  
SQLite  

Rutas principales:
/login
/dashboard
/programados
/nuevo-mensaje
/historial
/usuarios

Autenticación:

Google OAuth utilizando Passport.js.

---

# 2. Base de Datos

Se utiliza SQLite para almacenar la información del sistema.

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
Estados posibles del mensaje:

pendiente  
enviado  
error  
3. Scheduler de Mensajes

El scheduler será responsable de ejecutar los envíos automáticos.

Funcionamiento:

cada minuto
↓
buscar mensajes pendientes
↓
comparar fecha y hora
↓
si coincide
↓
ejecutar envío
↓
marcar como enviado

Este componente se ejecutará como un proceso Node.js independiente.

Ejemplo:

scheduler.js
El proceso será administrado por:
PM2
4. Bots de Envío

Los bots serán responsables de enviar los mensajes a cada plataforma.

Plataformas planificadas:

WhatsApp

Se utilizará un bot conectado a WhatsApp Web o API.

Funciones:

enviar texto

enviar imagen

enviar video

enviar a grupos

Facebook

Se utilizará la API de Facebook Graph.

Funciones:

publicar contenido

enviar a páginas

enviar a grupos

Flujo completo del sistema

El flujo general del sistema será:


Usuario crea mensaje
↓
mensaje se guarda en base de datos
↓
scheduler revisa cada minuto
↓
si la fecha coincide
↓
bot envía el mensaje
↓
mensaje se marca como enviado

Estructura actual del proyecto

panel
│
├── server.js
├── database.js
├── bot.db
│
├── auth
├── routes
├── controllers
│
├── uploads
├── public
│
├── views
│
└── docs
└── arquitectura.md

Infraestructura

Servidor:

Ubuntu 24.04
VPS DigitalOcean

Servicios:

Nginx
Node.js
PM2

Dominio:


panel.redimidosdelasnaciones.com

Mejoras futuras

Mejoras planificadas:

sistema de workers

colas de mensajes

sistema de logs

panel de monitoreo

soporte para múltiples bots

API pública

Autor

Proyecto desarrollado por:

Edison Oquendo
