const express = require("express");
const router = express.Router();
const db = require("../database");

// 1. Verifica si el usuario inició sesión
function ensureAuth(req,res,next){

if(req.isAuthenticated()){
return next();
}

res.redirect("/login");

}

// 2. Verifica si el usuario tiene rol de administrador

function isAdmin(req, res, next) {
    if (req.user && req.user.rol === "admin") {
        return next();
    }
    res.send("No tienes permiso para entrar aquí");
}

// 3. Ruta protegida: primero logueado, luego admin

router.get("/usuarios", ensureAuth, isAdmin, (req, res) => {
    db.all("SELECT * FROM usuarios", [], (err, rows) => {
        if (err) {
            return res.send("Error al obtener usuarios");
        }

        res.render("pages/usuarios", {
            user: req.user,
            usuarios: rows,
            active: 'usuarios' // Esto activará el color azul en el menú
        });
    });
});

module.exports = router;
