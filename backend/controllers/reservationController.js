const db = require("../config/db");

/**
 * Récupérer toutes les réservations d'un utilisateur
 */
exports.getUserReservations = (req, res) => {
    const userId = req.params.userId;

    const sql = `
        SELECT 
            r.id,
            r.code_reservation,
            r.prix_total,
            r.statut,
            r.nom_passager,
            r.telephone_passager,
            r.email_passager,
            r.date_creation,
            v.id as voyage_id,
            v.heure_depart as date_depart,
            v.heure_arrivee,
            v.prix,
            t.id as trajet_id,
            vd.nom as ville_depart,
            va.nom as ville_arrivee,
            b.id as bus_id,
            b.numero_bus,
            b.type as type_bus,
            s.id as siege_id,
            s.numero_siege,
            s.type_siege
        FROM reservations r
        JOIN voyages v ON r.voyage_id = v.id
        JOIN trajets t ON v.trajet_id = t.id
        JOIN villes vd ON t.ville_depart_id = vd.id
        JOIN villes va ON t.ville_arrivee_id = va.id
        JOIN bus b ON v.bus_id = b.id
        JOIN sieges s ON r.siege_id = s.id
        WHERE r.utilisateur_id = ?
        ORDER BY r.date_creation DESC
    `;

    db.query(sql, [userId], (err, result) => {
        if (err) {
            console.error("Erreur getUserReservations:", err);
            return res.status(500).json({ 
                message: "Erreur lors de la récupération des réservations",
                error: err 
            });
        }
        res.json(result);
    });
};

/**
 * Récupérer les détails d'une réservation spécifique
 */
exports.getReservationDetails = (req, res) => {
    const reservationId = req.params.id;

    const sql = `
        SELECT 
            r.id,
            r.code_reservation,
            r.prix_total,
            r.statut,
            r.nom_passager,
            r.telephone_passager,
            r.email_passager,
            r.date_creation,
            v.id as voyage_id,
            v.heure_depart as date_depart,
            v.heure_arrivee,
            v.prix,
            t.id as trajet_id,
            vd.nom as ville_depart,
            va.nom as ville_arrivee,
            b.id as bus_id,
            b.numero_bus,
            b.type as type_bus,
            s.id as siege_id,
            s.numero_siege,
            s.type_siege,
            billets.id as billet_id,
            billets.numero_billet,
            billets.code_qr
        FROM reservations r
        JOIN voyages v ON r.voyage_id = v.id
        JOIN trajets t ON v.trajet_id = t.id
        JOIN villes vd ON t.ville_depart_id = vd.id
        JOIN villes va ON t.ville_arrivee_id = va.id
        JOIN bus b ON v.bus_id = b.id
        JOIN sieges s ON r.siege_id = s.id
        LEFT JOIN billets ON r.id = billets.reservation_id
        WHERE r.id = ?
    `;

    db.query(sql, [reservationId], (err, result) => {
        if (err) {
            console.error("Erreur getReservationDetails:", err);
            return res.status(500).json({ 
                message: "Erreur lors de la récupération des détails",
                error: err 
            });
        }

        if (result.length === 0) {
            return res.status(404).json({ message: "Réservation non trouvée" });
        }

        res.json(result[0]);
    });
};

/**
 * Annuler une réservation
 */
exports.cancelReservation = (req, res) => {
    const reservationId = req.params.id;

    db.beginTransaction(err => {
        if (err) {
            console.error("Erreur début transaction:", err);
            return res.status(500).json({ message: "Erreur serveur" });
        }

        // Récupérer les détails de la réservation
        const getReservationSql = `
            SELECT voyage_id, siege_id 
            FROM reservations 
            WHERE id = ? AND statut = 'confirme'
        `;

        db.query(getReservationSql, [reservationId], (err, result) => {
            if (err || result.length === 0) {
                return db.rollback(() => {
                    res.status(404).json({ 
                        message: "Réservation non trouvée ou déjà annulée" 
                    });
                });
            }

            const { voyage_id, siege_id } = result[0];

            // Mettre à jour le statut de la réservation
            const updateReservationSql = `
                UPDATE reservations 
                SET statut = 'annule', date_mise_a_jour = NOW() 
                WHERE id = ?
            `;

            db.query(updateReservationSql, [reservationId], (err) => {
                if (err) {
                    return db.rollback(() => {
                        console.error("Erreur annulation:", err);
                        res.status(500).json({ message: "Erreur lors de l'annulation" });
                    });
                }

                // Remettre le siège disponible
                const updateSiegeSql = `
                    UPDATE voyage_sieges 
                    SET statut = 'disponible', date_mise_a_jour = NOW() 
                    WHERE voyage_id = ? AND siege_id = ?
                `;

                db.query(updateSiegeSql, [voyage_id, siege_id], (err) => {
                    if (err) {
                        return db.rollback(() => {
                            console.error("Erreur mise à jour siège:", err);
                            res.status(500).json({ message: "Erreur lors de la mise à jour" });
                        });
                    }

                    // Remettre à jour les places disponibles
                    const updateVoyageSql = `
                        UPDATE voyages 
                        SET places_disponibles = places_disponibles + 1,
                            date_mise_a_jour = NOW()
                        WHERE id = ?
                    `;

                    db.query(updateVoyageSql, [voyage_id], (err) => {
                        if (err) {
                            return db.rollback(() => {
                                console.error("Erreur mise à jour voyage:", err);
                                res.status(500).json({ message: "Erreur lors de la mise à jour" });
                            });
                        }

                        db.commit(err => {
                            if (err) {
                                return db.rollback(() => {
                                    console.error("Erreur commit:", err);
                                    res.status(500).json({ message: "Erreur lors de la finalisation" });
                                });
                            }

                            res.json({
                                success: true,
                                message: "Réservation annulée avec succès"
                            });
                        });
                    });
                });
            });
        });
    });
};