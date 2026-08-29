const mysql = require("mysql2");

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "bus_reservation"
});

db.connect((err) => {
    if (err) {
        console.log("Erreur connexion DB :", err);
    } else {
        console.log("Connecté à MySQL ✅");
    }
});

module.exports = db;