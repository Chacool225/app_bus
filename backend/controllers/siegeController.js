const db = require("../config/db");

/**
 * Récupérer tous les sièges d'un voyage
 */
exports.getSiegesByVoyage = (req, res) => {
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
            console.error("Erreur SQL:", err);
            return res.status(500).json({ 
                message: "Erreur lors de la récupération des sièges",
                error: err 
            });
        }
        res.json(result);
    });
};

/**
 * Vérifier la disponibilité d'un siège spécifique
 */
exports.checkSiegeDisponibilite = (req, res) => {
    const { voyage_id, siege_id } = req.params;

    const sql = `
        SELECT statut 
        FROM voyage_sieges 
        WHERE voyage_id = ? AND siege_id = ?
    `;

    db.query(sql, [voyage_id, siege_id], (err, result) => {
        if (err) {
            return res.status(500).json({ 
                message: "Erreur lors de la vérification",
                error: err 
            });
        }

        if (result.length === 0) {
            return res.status(404).json({ message: "Siège non trouvé" });
        }

        res.json({
            disponible: result[0].statut === 'disponible',
            statut: result[0].statut
        });
    });
};