#roadmap del Proyecto

Este documento define las etapas de desarrollo del sistema de automatización de mensajes.

El objetivo del sistema es permitir la programación y envío automático de contenido a múltiples plataformas desde un panel centralizado.

---

# Fase 1 — Panel Web (Base del Sistema)

Estado: ✅ Completado parcialmente

Funciones implementadas:

- login con Google OAuth
- dashboard
- crear mensajes programados
- subida de imagen
- subida de video
- preview de contenido
- lista de mensajes programados
- historial de mensajes enviados
- gestión básica de usuarios

Tecnologías utilizadas:

Node.js  
Express  
EJS  
SQLite  
Nginx  
PM2  

Pendientes en esta fase:

- mejorar diseño del login
- corregir favicon
- mostrar miniatura de video en programados
- validación de tamaño de archivos

---

# Fase 2 — Scheduler Automático

Estado: ⏳ Pendiente

Objetivo:

Crear un proceso automático que revise los mensajes programados y ejecute los envíos.

Funcionamiento esperado:

cada minuto

↓

consultar base de datos

↓

buscar mensajes con estado = pendiente

↓

comparar fecha y hora

↓

si coincide ejecutar envío

↓

marcar mensaje como enviado

Archivo planificado:


scheduler.js


Este proceso se ejecutará con:


PM2


---

# Fase 3 — Integración WhatsApp

Estado: ⏳ Pendiente

Objetivo:

Enviar mensajes programados a grupos de WhatsApp.

Funciones:

- enviar texto
- enviar imagen
- enviar video
- enviar a grupos

Tecnologías posibles:

- WhatsApp Web automation
- WhatsApp Business API
- Baileys
- WPPConnect

Archivo planificado:


whatsappBot.js


---

# Fase 4 — Integración Facebook

Estado: ⏳ Pendiente

Objetivo:

Publicar contenido automáticamente en Facebook.

Funciones:

- publicar en páginas
- publicar en grupos
- publicar con imagen
- publicar con video

Tecnología:

Facebook Graph API

Archivo planificado:


facebookBot.js


---

# Fase 5 — Sistema de Workers

Estado: 🔮 Futuro

Objetivo:

Separar procesos para mejorar estabilidad del sistema.

Procesos planeados:

- panel web
- scheduler
- bot whatsapp
- bot facebook

Cada proceso será administrado por:


PM2


---

# Fase 6 — Sistema de Logs

Estado: 🔮 Futuro

Objetivo:

Registrar actividad del sistema.

Logs a registrar:

- mensajes enviados
- errores
- estado de bots
- actividad de usuarios

Tabla planificada:


logs


---

# Fase 7 — Escalabilidad

Estado: 🔮 Futuro

Mejoras posibles:

- sistema de colas
- soporte para múltiples bots
- múltiples cuentas de WhatsApp
- múltiples páginas de Facebook
- API pública
- panel multiusuario avanzado

---

# Meta final del sistema

Construir una plataforma de difusión automática capaz de:

- programar mensajes
- enviar contenido multimedia
- publicar en múltiples plataformas
- automatizar campañas de comunicación

---

# Autor

Proyecto desarrollado por:

Edison Oquendo
