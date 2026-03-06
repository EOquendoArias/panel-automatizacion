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
"SELECT * FROM mensajes ORDER BY fecha ASC",
[],
(err,rows)=>{

res.render("pages/programados",{
user:req.user,
active:"programados",
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

res.render("pages/nuevo_mensaje",{
user:req.user,
active:"nuevo",
error:null
});

};



/* GUARDAR MENSAJE */

exports.guardarMensaje = (req,res)=>{

const { texto, fecha, hora, grupos } = req.body;

const archivo = req.file ? req.file.filename : null;

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
