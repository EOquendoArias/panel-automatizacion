
const { Client, MessageMedia } = require("whatsapp-web.js")
const express = require("express")
const qrcode = require("qrcode")
const fs = require("fs")

const sqlite3 = require("sqlite3").verbose()
const db = new sqlite3.Database("/root/panel/bot.db")

const app = express()

let botStatus = "starting"
let qrCodeBase64 = null
let lastReady = null
let logs = []


let lastState = null
let memoryHistory = []

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

 takeoverOnConflict: true,
 takeoverTimeoutMs: 0,

 puppeteer: {
  headless: true,
  userDataDir: "/root/bot-whatsapp/chrome-session",
  protocolTimeout: 1200000,

  args: [

"--no-sandbox",
 "--disable-setuid-sandbox",
 "--disable-dev-shm-usage",
 "--disable-gpu",
 "--disable-extensions",
 "--disable-background-networking",
 "--disable-background-timer-throttling",
 "--disable-renderer-backgrounding",
 "--disable-backgrounding-occluded-windows",
 "--disable-features=site-per-process",
 "--disable-blink-features=AutomationControlled"


  ]
 }
});

/* VARIABLES DEL SISTEMA */

let colaMensajes = [];
let procesandoCola = false;
let reiniciandoCliente = false;
let ultimoReinicio = Date.now();

/* EVENTOS */

client.on("qr", async (qr)=>{

addLog("QR recibido")

botStatus = "waiting_qr"

qrCodeBase64 = await qrcode.toDataURL(qr)

})

client.on("authenticated", ()=>{

addLog("Autenticado")

botStatus = "authenticated"

})

/*------*/

client.on("ready", async ()=>{

 addLog("WHATSAPP LISTO");

await recuperarCola();

 botStatus="starting";

 qrCodeBase64=null;

 lastReady = new Date();

 addLog("Esperando estabilización de WhatsApp...");

 setTimeout(()=>{

   botStatus="ready";
   addLog("Cliente completamente listo para enviar");

 },10000); // espera 10 segundos

});


/*-----*/

client.on("loading_screen",(percent,message)=>{

addLog("Cargando "+percent+" "+message)

})

client.on("auth_failure",(msg)=>{

addLog("Fallo autenticación "+msg)

botStatus = "auth_failure"

})

client.on("disconnected",(reason)=>{

addLog("Desconectado "+reason)

botStatus = "disconnected"

setTimeout(()=>{

addLog("Reiniciando cliente")
client.initialize()

},5000)

})

client.initialize()



/* WATCHDOG */

setInterval(()=>{

const mem = process.memoryUsage().rss / 1024 / 1024

memoryHistory.push({
time: Date.now(),
memory: mem
})

if(memoryHistory.length > 60){
memoryHistory.shift()
}

/* log solo si cambia estado */

if(botStatus !== lastState){

addLog("Estado cambiado a "+botStatus)

lastState = botStatus

}

/* protección memoria */

if(mem > 500){

addLog("Memoria alta reiniciando")

process.exit(1)

}

},30000)

/* WORKER MENSAJES PROGRAMADOS */

/* --- SISTEMA DE COLA PROFESIONAL --- */



/* REINICIO SEGURO */

async function whatsappReadyReal() {

 try {

  if (!client?.pupPage) return false;

  const estado = await client.getState();

  if (estado !== "CONNECTED") return false;

  if (!client.info) return false;

  return true;

 } catch (e) {

  return false;

 }

}


/*----*/

async function manejarReinicio(){

 if(reiniciandoCliente) return;

 reiniciandoCliente = true;

 addLog("Detectado fallo crítico. Reiniciando cliente...");

 try{
  await client.destroy();
 }catch(e){}

 try{
  await client.initialize();
 }catch(e){}

 setTimeout(()=>{

  reiniciandoCliente=false;
  ultimoReinicio = Date.now();

  addLog("Cliente listo nuevamente");

 },20000);

}

/* PROCESADOR DE COLA */

async function procesarCola(){

 if(procesandoCola) return;

 if(botStatus !== "ready") return;

 if(colaMensajes.length === 0) return;

 if(!client?.pupPage || client.pupPage.isClosed()){

  addLog("Navegador cerrado detectado");

  await manejarReinicio();

  return;

 }

 const domReady = await whatsappReadyReal();

 if(!domReady){

  addLog("WhatsApp Web aún cargando interfaz...");

  return;

 }

 procesandoCola = true;

 const msg = colaMensajes.shift();

 if(!msg){
  addLog("Mensaje inválido en cola, ignorando...");
  procesandoCola=false;
  return;
 }

 try{

  addLog("Entregando mensaje ID "+msg.id+" a: "+msg.grupos);

  await new Promise(r=>setTimeout(r,12000));
/*-------*/

let filePath = msg.archivo
 ? "/root/panel/uploads/" + msg.archivo
 : null;

// cargar chat primero
const chat = await client.getChatById(msg.grupos);

if(!chat){
 addLog("No se pudo cargar el chat: "+msg.grupos);
 procesandoCola=false;
 return;
}

// despertar chat
try{
 await chat.fetchMessages({limit:1});
}catch(e){
 addLog("Chat aún no listo, esperando...");
 await new Promise(r=>setTimeout(r,5000));
}

await new Promise(r=>setTimeout(r,4000));

if(filePath && fs.existsSync(filePath)){

 const media = MessageMedia.fromFilePath(filePath);

 await enviarConTimeout(
  chat.sendMessage(media,{
   caption: msg.texto || ""
  })
 );

}else{

 await enviarConTimeout(
  chat.sendMessage(msg.texto || "")
 );

}

db.run(`UPDATE mensajes SET estado='enviado' WHERE id=?`,[msg.id]);

addLog("Mensaje enviado correctamente");


/*-----*/
 }catch(e){

  addLog("Error en cola: "+e.message);

  if(
   e.message.includes("Target closed") ||
   e.message.includes("Session closed") ||
   e.message.includes("Execution context") ||
   e.message.includes("detached") ||
   e.message.includes("getChat")
  ){

   if(msg){
    colaMensajes.unshift(msg);
   }

   addLog("Reintentando envío en 10 segundos");

  await new Promise(r=>setTimeout(r,10000));

  }else{

   db.run(`UPDATE mensajes SET estado='error' WHERE id=?`,[msg.id]);

  }

 }finally{

  procesandoCola=false;

 }

}






/* BUSCADOR */


async function worker(){

 if(reiniciandoCliente || botStatus !== "ready") return;

 const fecha = new Date().toISOString().slice(0,10);
 const hora = new Date().toTimeString().slice(0,5);

 db.get(
  `SELECT * FROM mensajes
   WHERE estado='pendiente'
   AND fecha <= ?
   AND hora <= ?
   LIMIT 1`,
  [fecha,hora],
  (err,msg)=>{

   if(err){
    addLog("Error consultando DB: "+err.message);
    return;
   }

   if(!msg) return;

   addLog("Mensaje encontrado: "+msg.id);

   db.run(
    `UPDATE mensajes SET estado='en_cola' WHERE id=?`,
    [msg.id],
    (err)=>{

     if(err){
      addLog("Error actualizando estado: "+err.message);
      return;
     }

     colaMensajes.push(msg);

     addLog("Mensaje agregado a cola");
    }
   );

  }
 );

}

/*-------*/

async function watchdog(){

 const ahora = Date.now();

 const tiempo = ahora - ultimoReinicio;

 const limite = 6 * 60 * 60 * 1000;

 if(tiempo > limite){

  addLog("Watchdog: reinicio preventivo del navegador");

  await manejarReinicio();

 }

}


/* ACTIVACIÓN */

setInterval(worker,25000);

setInterval(procesarCola,7000);

setInterval(watchdog,60000);


/* RECUPERAR COLA */

async function recuperarCola(){

 addLog("Recuperando mensajes pendientes...");

 db.all(
  `SELECT * FROM mensajes 
   WHERE estado='pendiente' 
   OR estado='en_cola'`,
  [],
  (err,rows)=>{

   if(err){
    addLog("Error recuperando cola: "+err.message);
    return;
   }

   if(!rows || rows.length===0){
    addLog("No hay mensajes pendientes");
    return;
   }

   rows.forEach(msg=>{

    colaMensajes.push(msg);

    addLog("Mensaje recuperado desde DB: "+msg.id);

   });

  }
 );

}

/* enviarConTimeout */

async function enviarConTimeout(promise, tiempo=20000){

 return Promise.race([
  promise,
  new Promise((_,reject)=>
   setTimeout(()=>reject(new Error("Timeout enviando mensaje")),tiempo)
  )
 ]);

}

/* STATUS */

app.get("/status",(req,res)=>{

let whatsappState = "unknown"

try{

whatsappState = client.info ? "connected" : "not_ready"

}catch(e){

whatsappState = "error"

}

res.json({

status:botStatus,
whatsapp:whatsappState,
uptime:process.uptime(),
memory:process.memoryUsage(),
lastReady:lastReady

})

})

/* LOGS */

app.get("/logs",(req,res)=>{

res.json({
logs:logs
})

})

/* QR */

app.get("/qr",(req,res)=>{

if(!qrCodeBase64){

return res.json({status:"no_qr"})

}

res.json({qr:qrCodeBase64})

})

/* REINICIAR BOT */

app.post("/restart",(req,res)=>{

addLog("Reinicio solicitado desde panel")

res.json({success:true})

process.exit(0)

})

/* LIMPIAR SESION */

app.post("/reset-session",(req,res)=>{

addLog("Limpiando sesión WhatsApp")

try{

fs.rmSync("/root/bot-whatsapp/chrome-session",{recursive:true,force:true})

res.json({success:true})

process.exit(0)

}catch(err){

res.json({success:false,error:err.message})

}

})

/* MEMORIA */

app.get("/memory",(req,res)=>{

res.json({
memory:memoryHistory
})

})

/* SERVIDOR */

app.listen(3001,"0.0.0.0",()=>{

console.log("API BOT escuchando en puerto 3001")

})
