const { Client, MessageMedia } = require("whatsapp-web.js")
const express = require("express")
const qrcode = require("qrcode")
const fs = require("fs")
const sqlite3 = require("sqlite3").verbose()

/* DATABASE */

const db = new sqlite3.Database("/root/panel/bot.db")
db.exec("PRAGMA journal_mode=WAL;")

/* EXPRESS */

const app = express()

/* SEGURIDAD API */

const API_KEY = "redimidos_bot_2026";

app.use((req,res,next)=>{

const key = req.headers["x-api-key"];

if(key !== API_KEY){
return res.status(403).json({ error: "No autorizado" });
}

next();

});

/* ESTADO BOT */

let botStatus = "starting"
let qrCodeBase64 = null
let lastReady = null

let logs = []

/* COLA */

let colaMensajes = []
let procesandoCola = false

/* CACHE CHATS */

let chatCache = {}

/* LOGS */

function addLog(msg){

 const line = new Date().toISOString()+" "+msg

 console.log(line)

 logs.push(line)

 if(logs.length > 200){
  logs.shift()
 }

}

/* CLIENTE WHATSAPP */

const client = new Client({

 takeoverOnConflict:true,
 takeoverTimeoutMs:0,

 puppeteer:{

  headless:true,

  userDataDir:"/root/bot-whatsapp/chrome-session",

  protocolTimeout:300000,

  args:[

   "--no-sandbox",
   "--disable-setuid-sandbox",
   "--disable-dev-shm-usage",
   "--disable-gpu",
   "--no-zygote",
   "--disable-extensions",
   "--disable-background-networking",
   "--disable-sync",
   "--disable-translate",
   "--metrics-recording-only",
   "--mute-audio",
   "--no-first-run",
   "--disable-features=site-per-process",

"--disable-renderer-backgrounding",
 "--disable-background-timer-throttling",
 "--disable-breakpad"
  ]

 }

})

/* EVENTOS */

client.on("qr", async qr=>{

 addLog("QR recibido")

 botStatus="waiting_qr"

 qrCodeBase64 = await qrcode.toDataURL(qr)

})

client.on("authenticated",()=>{

 addLog("Autenticado")

 botStatus="authenticated"

})

client.on("ready", async ()=>{

 addLog("WHATSAPP LISTO")

 qrCodeBase64 = null
 lastReady = new Date()

 addLog("Esperando carga completa de chats...")

 try{

  // esperar hasta que WhatsApp tenga chats cargados
  await client.pupPage.waitForFunction(
   'window.Store && window.Store.Chat && window.Store.Chat.models.length > 0',
   {timeout: 0}
  )

  const chats = await client.getChats()

  addLog("Chats cargados correctamente: " + chats.length)

  const grupos = chats.filter(c => c.isGroup)

  addLog("Grupos detectados: " + grupos.length)

 }catch(e){

  addLog("Error esperando carga de chats: " + e.message)

 }

 await recuperarCola()

 botStatus="ready"

 addLog("Cliente listo para enviar")

})

client.on("disconnected",(reason)=>{

 addLog("Desconectado "+reason)

 process.exit(1)

})

client.initialize()

/* RECUPERAR COLA */

async function recuperarCola(){

 addLog("Recuperando mensajes pendientes")

 db.all(

  `SELECT * FROM mensajes
   WHERE estado='pendiente'
   OR estado='en_cola'`,

  [],

  (err,rows)=>{

   if(err){

    addLog("Error DB "+err.message)

    return

   }

   if(!rows || rows.length===0){

    addLog("No hay mensajes pendientes")

    return

   }

   rows.forEach(msg=>{

    msg.retries = 0

    if(!colaMensajes.find(m=>m.id===msg.id)){

     colaMensajes.push(msg)

     addLog("Mensaje recuperado "+msg.id)

    }

   })

  }

 )

}

/* WORKER */

async function worker(){

 if(botStatus !== "ready") return

 const fecha = new Date().toISOString().slice(0,10)
 const hora = new Date().toTimeString().slice(0,5)

 db.get(

  `SELECT * FROM mensajes
   WHERE estado='pendiente'
   AND (fecha < ? OR (fecha = ? AND hora <= ?))
   ORDER BY fecha ASC, hora ASC
   LIMIT 1`,

  [fecha,fecha,hora],

  (err,msg)=>{

   if(err){

    addLog("Error DB "+err.message)

    return

   }

   if(!msg) return

   db.run(

    `UPDATE mensajes SET estado='en_cola' WHERE id=?`,

    [msg.id],

    (err)=>{

     if(err){

      addLog("Error update "+err.message)

      return

     }

     msg.retries = 0

     if(!colaMensajes.find(m=>m.id===msg.id)){

      colaMensajes.push(msg)

      addLog("Mensaje agregado cola "+msg.id)

     }

    }

   )

  }

 )

}

/* OBTENER CHAT CON CACHE */

//async function obtenerChat(chatId){

 //if(chatCache[chatId]){

  //return chatCache[chatId]

 //}

 //try{

  //const chat = await client.getChatById(chatId)

  //if(chat){

   //chatCache[chatId] = chat

   //return chat

  //}

 //}catch(e){

  //addLog("Error chat "+chatId+" "+e.message)

 //}

 //return null

//}

async function obtenerChat(chatId){

 try{

  if(chatCache[chatId]){
   return chatCache[chatId]
  }

  const chats = await client.getChats()

  const chat = chats.find(c => c.id._serialized === chatId)

  if(chat){
   chatCache[chatId] = chat
   return chat
  }

 }catch(e){

  addLog("Error buscando chat "+chatId+" "+e.message)

 }

 return null
}

/* PROCESAR COLA */

/*async function procesarCola(){

 if(procesandoCola) return

 if(colaMensajes.length===0) return

 if(botStatus!=="ready") return

 procesandoCola=true

 const msg = colaMensajes.shift()

 try{

  addLog("Procesando mensaje "+msg.id)

let enviado = false

  const grupos = msg.grupos.split(",")

  for(const grupo of grupos){

   const chatId = grupo.trim()

   addLog("Preparando envio "+chatId)

   const chat = await obtenerChat(chatId)

   if(!chat){

    addLog("Grupo no encontrado "+chatId)

    continue

   }

   await new Promise(r=>setTimeout(r,4000))

   let filePath = msg.archivo
    ? "/root/panel/uploads/"+msg.archivo
    : null

   if(filePath && fs.existsSync(filePath)){

    const media = MessageMedia.fromFilePath(filePath)

    await enviarConTimeout(

     chat.sendMessage(media,{
      caption:msg.texto||""
     })

    )

   }else{

    await enviarConTimeout(

     chat.sendMessage(msg.texto||"")

    )

   }

   addLog("Mensaje enviado a "+chatId)

   await new Promise(r=>setTimeout(r,10000))

  }

  db.run(

   `UPDATE mensajes SET estado='enviado' WHERE id=?`,

   [msg.id]

  )

  addLog("Mensaje completado "+msg.id)

 }catch(e){

  addLog("Error envio "+e.message)

  msg.retries = (msg.retries||0)+1

  if(msg.retries < 3){

   addLog("Reintentando "+msg.id)

   setTimeout(()=>{

    colaMensajes.push(msg)

   },30000)

  }else{

   db.run(

    `UPDATE mensajes SET estado='error' WHERE id=?`,

    [msg.id]

   )

   addLog("Mensaje descartado "+msg.id)

  }

 }finally{

  procesandoCola=false

 }

}*/

async function procesarCola(){

 if(procesandoCola) return
 if(colaMensajes.length===0) return
 if(botStatus!=="ready") return

 procesandoCola = true

 const msg = colaMensajes.shift()

 try{

  addLog("Procesando mensaje "+msg.id)

  let enviado = false

  const grupos = msg.grupos.split(",")

  for(const grupo of grupos){

   const chatId = grupo.trim()

   addLog("Preparando envio "+chatId)

//TEST VERIFICAR EL ESTADO DEL CLIENTE

const estado = await client.getState()
addLog("Estado cliente: " + estado)

//TEST
   const chat = await obtenerChat(chatId)

   if(!chat){

    addLog("Grupo no encontrado "+chatId)
    continue

   }

   await new Promise(r=>setTimeout(r,4000))

   let filePath = msg.archivo
    ? "/root/panel/uploads/"+msg.archivo
    : null

   if(filePath && fs.existsSync(filePath)){

    const media = MessageMedia.fromFilePath(filePath)

    await enviarConTimeout(
     chat.sendMessage(media,{
      caption:msg.texto || ""
     })
    )

   }else{

    await enviarConTimeout(
     chat.sendMessage(msg.texto || "")
    )

   }

   enviado = true

   addLog("Mensaje enviado a "+chatId)

   await new Promise(r=>setTimeout(r,10000))

  }

  if(enviado){

   db.run(
    `UPDATE mensajes SET estado='enviado' WHERE id=?`,
    [msg.id]
   )

   addLog("Mensaje completado "+msg.id)

  }else{

   throw new Error("No se pudo enviar a ningún grupo")

  }

 }catch(e){

  addLog("Error envio "+e.message)

  msg.retries = (msg.retries || 0) + 1

  if(msg.retries < 3){

   addLog("Reintentando "+msg.id)

   setTimeout(()=>{
    colaMensajes.push(msg)
   },30000)

  }else{

   db.run(
    `UPDATE mensajes SET estado='error' WHERE id=?`,
    [msg.id]
   )

   addLog("Mensaje descartado "+msg.id)

  }

 }finally{

  procesandoCola = false

 }

}

/* TIMEOUT ENVIO */

async function enviarConTimeout(promise,tiempo=180000){

 return Promise.race([

  promise,

  new Promise((_,reject)=>

   setTimeout(()=>reject(new Error("Timeout enviando mensaje")),tiempo)

  )

 ])

}

/* WATCHDOG */

async function watchdog(){

 if(botStatus!=="ready") return

 try{

  if(!client.pupPage){

   addLog("Watchdog: pagina perdida")

   process.exit(1)

  }

 }catch(e){

  addLog("Watchdog error "+e.message)

 }

}

/* INTERVALOS */

setInterval(worker,20000)
setInterval(procesarCola,12000)
setInterval(watchdog,180000)

//test de DOM

setInterval(async ()=>{

 try{

  const title = await client.pupPage.evaluate(()=>document.title)

  addLog("DOM activo: " + title)

 }catch(e){

  addLog("DOM congelado: " + e.message)

 }

},60000)

//TEST DETECATR CONGELAMIENTO
/* API STATUS */

app.get("/status",(req,res)=>{

 res.json({

  status:botStatus,
  cola:colaMensajes.length,
  lastReady:lastReady

 })

})

/* API QR */

app.get("/qr",(req,res)=>{

 if(!qrCodeBase64){

  return res.json({status:"no_qr"})

 }

 res.json({qr:qrCodeBase64})

})

/* API LOGS */

app.get("/logs",(req,res)=>{

 res.json({logs:logs})

})

/* START API */

app.listen(3001,"0.0.0.0",()=>{

 console.log("API BOT escuchando en puerto 3001")

})
