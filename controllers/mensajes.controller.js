const db = require("../database");


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
exports.guardarMensaje = (req,res)=>{

    let { texto, fecha, hora, grupos } = req.body;
    const archivo = req.file ? req.file.filename : null;

    // --- CORRECCIÓN PARA EVITAR EL [object Object] ---
    if (typeof grupos === 'object' && grupos !== null) {
        // Si es un array (varios grupos), los une con comas
        if (Array.isArray(grupos)) {
            grupos = grupos.join(',');
        } else {
            // Si es un objeto solo, intenta sacar el ID o lo vuelve texto
            grupos = grupos.id || grupos.value || JSON.stringify(grupos);
        }
    }
    // -------------------------------------------------

/* CONVERTIR HTML DEL EDITOR → FORMATO WHATSAPP */

texto = texto
.replace(/<strong>(.*?)<\/strong>/g,'*$1*')
.replace(/<b>(.*?)<\/b>/g,'*$1*')
.replace(/<em>(.*?)<\/em>/g,'_$1_')
.replace(/<i>(.*?)<\/i>/g,'_$1_')
.replace(/<s>(.*?)<\/s>/g,'~$1~')
.replace(/<strike>(.*?)<\/strike>/g,'~$1~')
.replace(/<p>/g,'')
.replace(/<\/p>/g,"\n")
.replace(/<br>/g,"\n")
.replace(/<[^>]+>/g,'')

const sql = `
INSERT INTO mensajes
(texto, archivo, grupos, fecha, hora, estado)
VALUES
(?,?,?,?,?,?)
`;

db.run(
sql,
[
texto,
archivo,
grupos,
fecha,
hora,
"pendiente"
],
(err)=>{

res.redirect("/programados");

}
);

};



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



/* DUPLICAR MENSAJE */

exports.duplicarMensaje = (req,res)=>{

const id = req.params.id;

db.get(
"SELECT * FROM mensajes WHERE id=?",
[id],
(err,row)=>{

const sql = `
INSERT INTO mensajes
(texto, archivo, grupos, fecha, hora, estado)
VALUES
(?,?,?,?,?,?)
`;

db.run(
sql,
[
row.texto,
row.archivo,
row.grupos,
row.fecha,
row.hora,
"pendiente"
]
);

res.redirect("/programados");

});

};

/* REINTENTAR MENSAJE */

exports.reintentarMensaje = (req,res)=>{

const id = req.params.id;

db.run(
"UPDATE mensajes SET estado='pendiente' WHERE id=?",
[id],
(err)=>{

res.redirect("/programados");

}
);

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
