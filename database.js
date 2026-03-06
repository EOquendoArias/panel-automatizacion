const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./bot.db");

// crear tablas
db.serialize(() => {

    db.run(`
        CREATE TABLE IF NOT EXISTS mensajes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            texto TEXT,
            archivo TEXT,
            grupos TEXT,
            fecha TEXT,
            hora TEXT,
            estado TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE,
            nombre TEXT
        )
    `);

});

module.exports = db;
