const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const db = require("../config/db");

exports.register = (req, res) => {
    const { nom, email, telephone, mot_de_passe } = req.body;

    if (!nom || !email || !telephone || !mot_de_passe) {
        return res.status(400).json({ message: "Tous les champs sont requis" });
    }

    User.findUserByEmail(email, async (err, result) => {
        if (err) {
            return res.status(500).json({ message: "Erreur serveur" });
        }
        
        if (result.length > 0) {
            return res.status(400).json({ message: "Email déjà utilisé" });
        }

        const hashedPassword = await bcrypt.hash(mot_de_passe, 10);

        User.createUser({
            nom,
            email,
            telephone,
            mot_de_passe: hashedPassword
        }, (err, result) => {
            if (err) {
                return res.status(500).json(err);
            }

            res.status(201).json({
                message: "Utilisateur créé avec succès ✅",
                role: "utilisateur"
            });
        });
    });
};

exports.login = (req, res) => {
    const { email, mot_de_passe } = req.body;

    if (!email || !mot_de_passe) {
        return res.status(400).json({ message: "Email et mot de passe requis" });
    }

    User.findUserByEmail(email, async (err, result) => {
        if (err) {
            return res.status(500).json({ message: "Erreur serveur" });
        }

        if (result.length === 0) {
            return res.status(400).json({ message: "Email incorrect" });
        }

        const user = result[0];

        const validPassword = await bcrypt.compare(mot_de_passe, user.mot_de_passe);

        if (!validPassword) {
            return res.status(400).json({ message: "Mot de passe incorrect" });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role, email: user.email },
            "SECRET_KEY",
            { expiresIn: "24h" }
        );

        res.json({
            message: "Connexion réussie ✅",
            token,
            user: {
                id: user.id,
                nom: user.nom,
                email: user.email,
                telephone: user.telephone,
                role: user.role
            }
        });
    });
};

/**
 * Récupérer l'utilisateur connecté
 */
exports.getMe = (req, res) => {
    const userId = req.userId; // Récupéré du token par le middleware

    if (!userId) {
        return res.status(401).json({ message: "Non autorisé" });
    }

    const sql = "SELECT id, nom, email, telephone, role FROM utilisateurs WHERE id = ?";

    db.query(sql, [userId], (err, result) => {
        if (err) {
            console.error("Erreur getMe:", err);
            return res.status(500).json({ message: "Erreur serveur" });
        }

        if (result.length === 0) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }

        res.json(result[0]);
    });
};