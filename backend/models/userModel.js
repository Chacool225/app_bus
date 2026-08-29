const db = require("../config/db");

const createUser = (data, callback) => {
    const sql = `
        INSERT INTO utilisateurs 
        (nom, email, telephone, mot_de_passe, role) 
        VALUES (?, ?, ?, ?, 'utilisateur')
    `;
    db.query(sql, [data.nom, data.email, data.telephone, data.mot_de_passe], callback);
};

const findUserByEmail = (email, callback) => {
    const sql = "SELECT * FROM utilisateurs WHERE email = ?";
    db.query(sql, [email], callback);
};

module.exports = {
    createUser,
    findUserByEmail
};