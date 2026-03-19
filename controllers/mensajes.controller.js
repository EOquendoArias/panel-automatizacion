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



/* NUEVO MENSAJE */

exports.nuevoMensaje = (req,res)=>{

db.all("SELECT * FROM grupos ORDER BY nombre",(err,grupos)=>{

res.render("pages/nuevo_mensaje",{
user:req.user,
active:"nuevo",
error:null,
grupos:grupos
});

});

};

/* GUARDAR MENSAJE */
exports.guardarMensaje = (req, res) => {
    // 1. Extraemos los datos del formulario
    let { texto, fecha, hora, grupos, plataforma } = req.body;
    const archivo = req.file ? req.file.filename : null;

    // 2. CAPTURAMOS EL NOMBRE DEL LÍDER (De tu tabla 'usuarios')
    // Usamos 'req.user.nombre' porque vimos que así se llama en tu schema
    const autor = (req.user && req.user.nombre) ? req.user.nombre : "Líder Redimidos";

    // 3. Convertimos 'plataforma' en una lista para manejarla fácil
    const elecciones = Array.isArray(plataforma) ? plataforma : (plataforma ? [plataforma] : []);

    const enviarAWhatsapp = elecciones.includes('whatsapp');
    const enviarAFacebook = elecciones.includes('facebook');

    // 4. Lógica de estado inicial
    let estadoInicial = enviarAWhatsapp ? "pendiente" : "enviado";

    // --- CORRECCIÓN [object Object] ---
    if (typeof grupos === 'object' && grupos !== null) {
        grupos = Array.isArray(grupos) ? grupos.join(',') : (grupos.id || grupos.value || JSON.stringify(grupos));
    }

    // Limpieza de formato HTML para WhatsApp
    if (texto) {
        texto = texto
            .replace(/<b>(.*?)<\/b>/g, '*$1*')
            .replace(/<em>(.*?)<\/em>/g, '_$1_')
            .replace(/<i>(.*?)<\/i>/g, '_$1_')
            .replace(/<s>(.*?)<\/s>/g, '~$1~')
            .replace(/<p>/g, '')
            .replace(/<\/p>/g, "\n")
            .replace(/<br>/g, "\n")
            .replace(/<[^>]+>/g, '');
    }

    // 5. SQL ACTUALIZADO (Añadimos la columna 'usuario' y un '?' extra)
    const sql = `INSERT INTO mensajes (texto, archivo, grupos, fecha, hora, estado, usuario) VALUES (?,?,?,?,?,?,?)`;

    // 6. Ejecutamos incluyendo el 'autor' al final del arreglo
    db.run(sql, [texto, archivo, grupos, fecha, hora, estadoInicial, autor], function(err) {
        if (err) {
            console.error("❌ Error DB:", err.message);
            return res.status(500).send("Error al guardar");
        }

        // 7. SOLO publicar en Facebook si el checkbox estaba marcado
        if (enviarAFacebook) {
            publicarEnFacebook(texto, archivo);
        }

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

exports.actualizarMensaje = (req,res)=>{

const id = req.params.id;
const { texto, fecha, hora, grupos } = req.body;

db.run(
"UPDATE mensajes SET texto=?, fecha=?, hora=?, grupos=? WHERE id=?",
[texto,fecha,hora,grupos,id],
(err)=>{

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

/* publicar en Facebook */

async function publicarEnFacebook(mensaje, nombreArchivo) {
    const pageId = process.env.FB_PAGE_ID;
    const token = process.env.FB_PAGE_TOKEN;
    
    // Si hay archivo usamos /photos, si no /feed
    const endpoint = nombreArchivo ? `/${pageId}/photos` : `/${pageId}/feed`;
    const url = `https://graph.facebook.com/v21.0${endpoint}`;

    try {
        const form = new FormData();
        form.append('access_token', token);
        
        if (nombreArchivo) {
            // Buscamos la imagen en la carpeta uploads
            const rutaImagen = path.join(__dirname, '../uploads', nombreArchivo);
            if (fs.existsSync(rutaImagen)) {
                form.append('source', fs.createReadStream(rutaImagen));
                form.append('caption', mensaje);
            } else {
                console.error("❌ Archivo no encontrado en:", rutaImagen);
                form.append('message', mensaje);
            }
        } else {
            form.append('message', mensaje);
        }

        await axios.post(url, form, { headers: form.getHeaders() });
        console.log("✅ Publicado en Facebook con éxito");
    } catch (error) {
        console.error("❌ Error Facebook API:", error.response ? error.response.data : error.message);
    }
}
