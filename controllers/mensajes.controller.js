const db = require("../database");
//---------//
const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");
const path = require("path");

//-------//
/* DASHBOARD */

exports.dashboard = (req,res)=>{

const enviadosSQL = "SELECT COUNT(*) as total FROM mensajes WHERE estado='enviado'";
const pendientesSQL = "SELECT COUNT(*) as total FROM mensajes WHERE estado='pendiente'";
const hoySQL = "SELECT COUNT(*) as total FROM mensajes WHERE fecha=date('now')";

db.get(enviadosSQL,(err,enviados)=>{
db.get(pendientesSQL,(err,pendientes)=>{
db.get(hoySQL,(err,hoy)=>{

res.render("pages/dashboard",{
user:req.user,
active:"dashboard",
enviados: enviados.total,
pendientes: pendientes.total,
hoy: hoy.total
});

});
});
});

};



/* PROGRAMADOS */

exports.programados = (req,res)=>{

db.all(
`SELECT * FROM mensajes 
WHERE estado != 'enviado'
ORDER BY fecha, hora`,
(err,rows)=>{

res.render("pages/programados",{
user:req.user,
mensajes:rows
});

});

};



/* HISTORIAL */

exports.historial = (req,res)=>{

db.all(
"SELECT * FROM mensajes WHERE estado='enviado' ORDER BY fecha DESC",
[],
(err,rows)=>{

res.render("pages/historial",{
user:req.user,
active:"historial",
mensajes:rows
});

});

};


/* NUEVO MENSAJE (Versión con Memoria de Fecha) */
exports.nuevoMensaje = (req, res) => {
    // 1. Detectamos si viene una fecha en la URL (ej: ?fecha=2026-03-28)
    const fechaPrevia = req.query.fecha || ""; 

    db.all("SELECT * FROM grupos ORDER BY nombre", (err, grupos) => {
        if (err) {
            console.error("Error al cargar grupos:", err);
            return res.status(500).send("Error interno");
        }

        res.render("pages/nuevo_mensaje", {
            user: req.user,
            active: "nuevo",
            error: null,
            grupos: grupos,
            fechaPrevia: fechaPrevia // <--- Le pasamos la fecha a la vista
        });
    });
};

/* GUARDAR MENSAJE (Versión Maestra: HTML Puro + Seguridad de Grupos) */
exports.guardarMensaje = (req, res) => {
    // 1. Recibimos los datos del formulario (Texto llega como HTML desde Quill)
    let { texto, fecha, hora, grupos, plataforma } = req.body;
    const archivo = req.file ? req.file.filename : null;

    // 2. Identificamos al autor
    const autor = (req.user && req.user.nombre) ? req.user.nombre : "Líder Redimidos";

    // 3. Procesamos las plataformas (Convertimos array a texto "whatsapp,facebook")
    const elecciones = Array.isArray(plataforma) ? plataforma : (plataforma ? [plataforma] : []);
    const plataformasString = elecciones.join(',');

    // 4. Estado inicial para el bot
    let estadoInicial = elecciones.length > 0 ? "pendiente" : "enviado";

    // 5. --- AQUÍ YA NO TRADUCIMOS --- 
    // Guardamos 'texto' tal cual viene (con sus <p>, <b>, etc.) 
    // para que al editarlo se vea perfecto en el panel.

    // 6. Arreglo de Grupos (Tu lógica de seguridad para evitar [object Object])
    if (typeof grupos === 'object' && grupos !== null) {
        grupos = Array.isArray(grupos) ? grupos.join(',') : (grupos.id || grupos.value || JSON.stringify(grupos));
    } else if (!grupos) {
        grupos = ""; // Evitamos nulos si no seleccionó nada
    }

    // 7. Guardamos en la base de datos (SQL Reparado y Completo)
    const sql = `INSERT INTO mensajes (texto, archivo, grupos, fecha, hora, estado, usuario, plataforma) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    // Pasamos los 8 parámetros en el orden exacto del SQL
    db.run(sql, [texto, archivo, grupos, fecha, hora, estadoInicial, autor, plataformasString], function(err) {
        if (err) {
            console.error("❌ Error al guardar en DB:", err.message);
            return res.status(500).send("Error en la base de datos");
        }
        
        console.log(`🚀 Mensaje #${this.lastID} guardado en HTML. Listo para programar.`);
        res.redirect("/programados");
    });
};


    // -------------------------------------------------

/* EDITAR MENSAJE */

exports.editarMensaje = (req,res)=>{

const id = req.params.id;

db.get(
"SELECT * FROM mensajes WHERE id=?",
[id],
(err,row)=>{

res.render("pages/editar_mensaje",{
user:req.user,
mensaje:row
});

});

};



/* ACTUALIZAR MENSAJE */

/* ACTUALIZAR MENSAJE (Versión Pro: Mantiene HTML) */
exports.actualizarMensaje = (req, res) => {
    const id = req.params.id;
    let { texto, fecha, hora, grupos, plataforma } = req.body;

    const plataformaFinal = Array.isArray(plataforma) ? plataforma.join(',') : (plataforma || 'whatsapp');
    const gruposFinal = Array.isArray(grupos) ? grupos.join(',') : (grupos || '');

    // Actualizamos manteniendo el HTML enviado por Quill
    const sql = "UPDATE mensajes SET texto=?, fecha=?, hora=?, grupos=?, plataforma=? WHERE id=?";
    const params = [texto, fecha, hora, gruposFinal, plataformaFinal, id];

    db.run(sql, params, (err) => {
        if (err) {
            console.error("❌ Error al actualizar:", err.message);
            return res.status(500).send("Error al actualizar el mensaje");
        }
        res.redirect("/programados");
    });
};



/* ELIMINAR MENSAJE */

exports.eliminarMensaje = (req,res)=>{

const id = req.params.id;

db.run(
"DELETE FROM mensajes WHERE id=?",
[id],
(err)=>{

res.redirect("/programados");

});

};

/* DUPLICAR MENSAJE (Reenviar) */
exports.duplicarMensaje = (req, res) => {
    const id = req.params.id;

    db.get("SELECT * FROM mensajes WHERE id=?", [id], (err, row) => {
        if (err || !row) return res.redirect("/programados");

        const sql = `INSERT INTO mensajes (texto, archivo, grupos, fecha, hora, estado) VALUES (?,?,?,?,?,?)`;
        
        // Guardamos la copia
        db.run(sql, [row.texto, row.archivo, row.grupos, row.fecha, row.hora, "pendiente"], function(err) {
            if (!err) {
                // Si se guardó bien, publicamos en Facebook
                publicarEnFacebook(row.texto, row.archivo);
            }
            res.redirect("/programados");
        });
    });
};

/* REINTENTAR MENSAJE */
exports.reintentarMensaje = (req, res) => {
    const id = req.params.id;

    db.get("SELECT * FROM mensajes WHERE id=?", [id], (err, row) => {
        if (err || !row) return res.redirect("/programados");

        // Cambiamos el estado de 'error' a 'pendiente' para que el bot lo intente de nuevo
        db.run("UPDATE mensajes SET estado='pendiente' WHERE id=?", [id], function(err) {
            if (!err) {
                // Intentamos publicar en Facebook nuevamente
                publicarEnFacebook(row.texto, row.archivo);
            }
            res.redirect("/programados");
        });
    });
};





/* NUEVO USUARIO */

exports.nuevoUsuario = (req,res)=>{

res.render("pages/nuevo_usuario",{
user:req.user
});

};

/* CREAR USUARIO */

exports.crearUsuario = (req,res)=>{

const { nombre, email, rol } = req.body;

db.run(
"INSERT INTO usuarios (nombre,email,rol) VALUES (?,?,?)",
[nombre,email,rol],
(err)=>{

res.redirect("/usuarios");

}
);

};

/* CAMBIAR ROLL */

exports.cambiarRol = (req,res)=>{

const id = req.params.id;
const { rol } = req.body;

/* verificar cuantos admins hay */

db.get(
"SELECT COUNT(*) as total FROM usuarios WHERE rol='admin'",
(err,row)=>{

const totalAdmins = row.total;

/* verificar rol actual */

db.get(
"SELECT rol FROM usuarios WHERE id=?",
[id],
(err,user)=>{

/* si es el último admin no permitir cambio */

if(user.rol === "admin" && rol !== "admin" && totalAdmins <= 1){

return res.send("⚠ No puedes quitar el último administrador del sistema.");

}

/* actualizar rol */

db.run(
"UPDATE usuarios SET rol=? WHERE id=?",
[rol,id],
(err)=>{

res.redirect("/usuarios");

}
);

});

});

};

/* calendario */

exports.verCalendario = (req, res) => {
    const hoy = new Date();
    // Obtenemos mes y año de la URL, si no, usamos el actual
    let mes = parseInt(req.query.mes) || (hoy.getMonth() + 1);
    let anio = parseInt(req.query.anio) || hoy.getFullYear();

    // Ajuste para navegación (que no se pase de 12 o baje de 1)
    if (mes > 12) { mes = 1; anio++; }
    if (mes < 1) { mes = 12; anio--; }

    const mesFormateado = mes < 10 ? `0${mes}` : mes;
    const filtroFecha = `${anio}-${mesFormateado}-%`; // Busca todo lo de ese mes: 2026-03-%

    const sql = "SELECT id, texto, plataforma, fecha, hora, estado FROM mensajes WHERE fecha LIKE ? ORDER BY fecha, hora ASC";
    
    db.all(sql, [filtroFecha], (err, mensajes) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Error al cargar el calendario");
        }

        // Nombre del mes para el título
        const nombreMes = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date(anio, mes - 1));

        res.render("pages/calendario", {
            mensajes,
            mes,
            anio,
            nombreMes: nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1),
	active: 'calendario' // <--- ESTO ES LO IMPORTANTE
        });
    });
};
