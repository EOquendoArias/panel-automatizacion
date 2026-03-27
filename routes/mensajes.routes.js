const express = require("express");
const router = express.Router();

const mensajesController = require("../controllers/mensajes.controller");


const multer = require("multer");

const storage = multer.diskStorage({

destination: function (req, file, cb) {
cb(null, "uploads/");
},

filename: function (req, file, cb) {
cb(null, Date.now() + "-" + file.originalname);
}

});

const upload = multer({

storage: storage,

limits:{
fileSize: 50 * 1024 * 1024
}

});

function ensureAuth(req,res,next){

if(req.user){
return next();
}

res.redirect("/login");

}


/* DASHBOARD */

router.get("/", ensureAuth, mensajesController.dashboard);

/* MENSAJES PROGRAMADOS */

router.get("/programados", ensureAuth, mensajesController.programados);

/* HISTORIAL */

router.get("/historial", ensureAuth, mensajesController.historial);

/* NUEVO MENSAJE */

router.get("/nuevo_mensaje", ensureAuth, mensajesController.nuevoMensaje);

/* GUARDAR MENSAJE */

router.post(
"/guardar_mensaje",
ensureAuth,
(req,res,next)=>{

upload.single("archivo")(req,res,function(err){

if(err){

return res.render("pages/nuevo_mensaje",{
user:req.user,
error:"⚠ El archivo supera el tamaño permitido"
});

}

next();

});

},
mensajesController.guardarMensaje
);

/* EDITAR MENSAJE */

router.get("/mensajes/editar/:id", ensureAuth, mensajesController.editarMensaje);

/* ACTUALIZAR MENSAJE */

router.post("/mensajes/actualizar/:id", ensureAuth, mensajesController.actualizarMensaje);

/* ELIMINAR MENSAJE */

router.get("/mensajes/eliminar/:id", ensureAuth, mensajesController.eliminarMensaje);

/* DUPLICAR MENSAJE */

router.get("/mensajes/duplicar/:id", ensureAuth, mensajesController.duplicarMensaje);

module.exports = router;

/* REINTENTAR */

router.get( "/mensajes/reintentar/:id", ensureAuth, mensajesController.reintentarMensaje);

/* NUEVO USUARIO */

router.get("/usuarios/nuevo", ensureAuth, mensajesController.nuevoUsuario);

/* CREAR USUARIO */

router.post("/usuarios/crear", ensureAuth, mensajesController.crearUsuario);

/* CAMBIAR ROL */

router.post("/usuarios/cambiar-rol/:id", ensureAuth, mensajesController.cambiarRol);

/* CALENDARIO */
router.get('/calendario', mensajesController.verCalendario);
