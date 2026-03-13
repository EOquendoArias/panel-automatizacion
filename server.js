const express = require("express");
const session = require("express-session");
const passport = require("passport");
require("./auth/google");

const path = require("path");
const expressLayouts = require("express-ejs-layouts");
const axios = require("axios");

/* RUTAS */

const authRoutes = require("./routes/auth.routes");
const mensajesRoutes = require("./routes/mensajes.routes");
const usuariosRoutes = require("./routes/usuarios.routes");

/* APP */

const app = express();

/* IMPORTANTE PARA NGINX + HTTPS */
app.set("trust proxy", 1);

app.use(express.static("public"));
app.use("/uploads",express.static("uploads"));

/* CONFIGURACIÓN */

app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));

app.use(expressLayouts);
app.set("layout","layouts/main");

/* MIDDLEWARES */

app.use(express.urlencoded({ extended:true }));

app.use(express.static("public"));
app.use("/uploads",express.static("uploads"));

/* SESIONES */

app.use(
session({
secret: process.env.SESSION_SECRET || "panel_redimidos_seguro",
resave:false,
saveUninitialized:false,
cookie:{
secure:true,
sameSite:"lax",
maxAge: 1000 * 60 * 60 * 8
}
})
);

/* PASSPORT */

app.use(passport.initialize());
app.use(passport.session());

/* PASAR USUARIO A TODAS LAS VISTAS */

app.use((req,res,next)=>{

res.locals.user = req.user;

res.locals.active = "";

next();

});

/* RUTAS */

app.use("/",authRoutes);
app.use("/",mensajesRoutes);
app.use("/",usuariosRoutes);

/* eventos */

app.get("/bot/logs", async (req,res)=>{

try{

const response = await axios.get("http://localhost:3001/logs")

res.json(response.data)

}catch(err){

res.json({logs:[]})

}

})

/* API BOT WHATSAPP */

app.get("/bot/status", async (req,res)=>{

try{

const response = await axios.get("http://localhost:3001/status");

res.json(response.data);

}catch(error){

res.json({
status:"offline"
});

}

});

app.get("/bot/memory", async (req,res)=>{

try{

const response = await axios.get("http://localhost:3001/memory")

res.json(response.data)

}catch(err){

res.json({memory:[]})

}

})



app.get("/bot", (req,res)=>{

res.render("bot");

});

app.get("/bot/qr", async (req,res)=>{

try{

const response = await axios.get("http://localhost:3001/qr");

res.json(response.data);

}catch(error){

res.json({
status:"error"
});

}

});

/* REINICIAR BOT */

app.post("/bot/restart", async (req,res)=>{

try{

await axios.post("http://localhost:3001/restart")

res.json({success:true})

}catch(err){

res.json({success:false})

}

})

/* RESET SESION */

app.post("/bot/reset", async (req,res)=>{

try{

await axios.post("http://localhost:3001/reset-session")

res.json({success:true})

}catch(err){

res.json({success:false})

}

})


/* SERVIDOR */

const PORT = 3000;

app.listen(PORT,()=>{

console.log("Servidor corriendo en puerto "+PORT);

});
