const express = require("express");
const router = express.Router();
const db = require("../config/db");

// GET /api/sieges/voyage/:id
router.get("/voyage/:id", (req, res) => {
    const voyageId = req.params.id;

    const sql = `
        SELECT 
            vs.id,
            s.id as siege_id,
            s.numero_siege,
            s.type_siege,
            vs.statut,
            CASE 
                WHEN vs.statut = 'disponible' THEN false
                ELSE true
            END as est_occupe
        FROM voyage_sieges vs
        JOIN sieges s ON vs.siege_id = s.id
        WHERE vs.voyage_id = ?
        ORDER BY s.numero_siege ASC
    `;

    db.query(sql, [voyageId], (err, result) => {
        if (err) {
            console.error("Erreur:", err);
            return res.status(500).json({ message: "Erreur serveur" });
        }
        res.json(result);
    });
});

module.exports = router;