const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/nuevo', (req, res) => {
    res.render('nuevo_mensaje');
});

router.post('/guardar', (req, res) => {

    const { texto, fecha, hora } = req.body;

    db.run(
        "INSERT INTO mensajes (texto, fecha, hora, estado) VALUES (?, ?, ?, ?)",
        [texto, fecha, hora, "pendiente"]
    );

    res.redirect('/');
});

module.exports = router;
