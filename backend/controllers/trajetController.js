const db = require("../config/db");

/**
 * 1️⃣ Afficher tous les trajets actifs
 */
exports.getAllTrajets = (req, res) => {
    const sql = `
        SELECT 
            t.id,
            vd.nom AS ville_depart,
            va.nom AS ville_arrivee,
            t.distance_km,
            t.duree_estimee_minutes,
            t.prix_base
        FROM trajets t
        JOIN villes vd ON t.ville_depart_id = vd.id
        JOIN villes va ON t.ville_arrivee_id = va.id
        WHERE t.statut = 'actif'
    `;

    db.query(sql, (err, result) => {
        if (err) {
            console.error("Erreur getAllTrajets:", err);
            return res.status(500).json({ 
                message: "Erreur lors de la récupération des trajets",
                error: err 
            });
        }
        res.json(result);
    });
};

/**
 * 2️⃣ Voir voyages d'un trajet (avec filtre date)
 */
exports.getVoyagesByTrajet = (req, res) => {
    const trajetId = req.params.id;

    const sql = `
        SELECT 
            v.id,
            v.heure_depart,
            v.heure_arrivee,
            v.prix,
            v.places_disponibles,
            b.numero_bus,
            b.type,
            b.id as bus_id
        FROM voyages v
        JOIN bus b ON v.bus_id = b.id
        WHERE v.trajet_id = ?
        AND v.statut = 'programme'
        AND v.heure_depart > NOW()
        ORDER BY v.heure_depart ASC
    `;

    db.query(sql, [trajetId], (err, result) => {
        if (err) {
            console.error("Erreur getVoyagesByTrajet:", err);
            return res.status(500).json({ 
                message: "Erreur lors de la récupération des voyages",
                error: err 
            });
        }
        res.json(result);
    });
};

/**
 * 3️⃣ Voir tous les sièges d'un voyage (pas seulement disponibles)
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
            console.error("Erreur getSiegesByVoyage:", err);
            return res.status(500).json({ 
                message: "Erreur lors de la récupération des sièges",
                error: err 
            });
        }
        res.json(result);
    });
};

/**
 * 4️⃣ Voir uniquement les sièges disponibles d'un voyage
 */
exports.getSiegesDisponibles = (req, res) => {
    const voyageId = req.params.id;

    const sql = `
        SELECT 
            vs.id,
            s.id as siege_id,
            s.numero_siege,
            s.type_siege,
            vs.statut
        FROM voyage_sieges vs
        JOIN sieges s ON vs.siege_id = s.id
        WHERE vs.voyage_id = ?
        AND vs.statut = 'disponible'
        ORDER BY s.numero_siege ASC
    `;

    db.query(sql, [voyageId], (err, result) => {
        if (err) {
            console.error("Erreur getSiegesDisponibles:", err);
            return res.status(500).json({ 
                message: "Erreur lors de la récupération des sièges disponibles",
                error: err 
            });
        }
        res.json(result);
    });
};

/**
 * 5️⃣ Réserver un siège (CORRIGÉ avec prise en compte du mode de paiement)
 */
exports.reserverTrajet = (req, res) => {
    const {
        utilisateur_id,
        voyage_id,
        siege_id,
        nom_passager,
        telephone_passager,
        email_passager,
        methode_paiement  // ← AJOUT IMPORTANT
    } = req.body;

    console.log("📥 Données reçues pour réservation:", req.body);

    // Validation des champs requis
    if (!voyage_id || !siege_id || !nom_passager || !telephone_passager) {
        return res.status(400).json({ 
            message: "Tous les champs requis doivent être remplis (voyage_id, siege_id, nom_passager, telephone_passager)" 
        });
    }

    // Générer un code de réservation unique
    const codeReservation = "RES-" + Date.now() + "-" + Math.floor(Math.random() * 1000);

    db.beginTransaction(err => {
        if (err) {
            console.error("Erreur début transaction:", err);
            return res.status(500).json({ 
                message: "Erreur lors du début de la transaction",
                error: err 
            });
        }

        // 1. Vérifier que le siège est disponible
        const checkSql = `
            SELECT vs.*, v.prix 
            FROM voyage_sieges vs
            JOIN voyages v ON vs.voyage_id = v.id
            WHERE vs.voyage_id = ? AND vs.siege_id = ? AND vs.statut = 'disponible'
        `;

        db.query(checkSql, [voyage_id, siege_id], (err, result) => {
            if (err) {
                return db.rollback(() => {
                    console.error("❌ Erreur vérification siège:", err);
                    res.status(500).json({ 
                        message: "Erreur lors de la vérification du siège",
                        error: err 
                    });
                });
            }

            if (result.length === 0) {
                return db.rollback(() => {
                    console.log("❌ Siège non disponible:", voyage_id, siege_id);
                    res.status(400).json({ 
                        message: "Siège non disponible",
                        details: "Le siège est déjà réservé ou n'existe pas"
                    });
                });
            }

            const prix = result[0].prix;
            console.log("✅ Siège disponible, prix:", prix);

            // 2. Vérifier que ce siège n'est pas déjà réservé dans la table reservations
            const checkReservationSql = `
                SELECT id FROM reservations 
                WHERE voyage_id = ? AND siege_id = ? AND statut != 'annule'
            `;

            db.query(checkReservationSql, [voyage_id, siege_id], (err, existingRes) => {
                if (err) {
                    return db.rollback(() => {
                        console.error("❌ Erreur vérification réservation:", err);
                        res.status(500).json({ 
                            message: "Erreur lors de la vérification de la réservation",
                            error: err 
                        });
                    });
                }

                if (existingRes.length > 0) {
                    return db.rollback(() => {
                        console.log("❌ Réservation existante pour ce siège");
                        res.status(400).json({ 
                            message: "Ce siège est déjà réservé",
                            details: "Une réservation existe déjà pour ce siège"
                        });
                    });
                }

                // 3. Insérer la réservation
                const insertReservation = `
                    INSERT INTO reservations
                    (utilisateur_id, voyage_id, siege_id, code_reservation, prix_total,
                     nom_passager, telephone_passager, email_passager, statut, date_creation)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirme', NOW())
                `;

                db.query(insertReservation, [
                    utilisateur_id || null,
                    voyage_id,
                    siege_id,
                    codeReservation,
                    prix,
                    nom_passager,
                    telephone_passager,
                    email_passager || null
                ], (err, result) => {
                    if (err) {
                        console.error("❌ Erreur insertion réservation:", err);
                        
                        // Gérer spécifiquement l'erreur de doublon
                        if (err.code === 'ER_DUP_ENTRY') {
                            return db.rollback(() => {
                                res.status(400).json({ 
                                    message: "Ce siège vient d'être réservé par quelqu'un d'autre",
                                    details: "Veuillez choisir un autre siège"
                                });
                            });
                        }
                        
                        return db.rollback(() => {
                            res.status(500).json({ 
                                message: "Erreur lors de l'insertion de la réservation",
                                error: err 
                            });
                        });
                    }

                    const reservationId = result.insertId;
                    console.log("✅ Réservation insérée avec ID:", reservationId);

                    // 4. Mettre à jour le statut du siège dans voyage_sieges
                    const updateSiege = `
                        UPDATE voyage_sieges
                        SET statut = 'reserve', date_mise_a_jour = NOW()
                        WHERE voyage_id = ? AND siege_id = ?
                    `;

                    db.query(updateSiege, [voyage_id, siege_id], (err) => {
                        if (err) {
                            return db.rollback(() => {
                                console.error("❌ Erreur mise à jour siège:", err);
                                res.status(500).json({ 
                                    message: "Erreur lors de la mise à jour du siège",
                                    error: err 
                                });
                            });
                        }

                        console.log("✅ Siège mis à jour en 'reserve'");

                        // 5. Mettre à jour le nombre de places disponibles dans voyages
                        const updateVoyage = `
                            UPDATE voyages 
                            SET places_disponibles = places_disponibles - 1,
                                date_mise_a_jour = NOW()
                            WHERE id = ?
                        `;

                        db.query(updateVoyage, [voyage_id], (err) => {
                            if (err) {
                                return db.rollback(() => {
                                    console.error("❌ Erreur mise à jour voyage:", err);
                                    res.status(500).json({ 
                                        message: "Erreur lors de la mise à jour du voyage",
                                        error: err 
                                    });
                                });
                            }

                            console.log("✅ Places disponibles mises à jour");

                            // 6. Insérer le paiement si la méthode est fournie
                            if (methode_paiement) {
                                console.log("💰 Insertion paiement avec méthode:", methode_paiement);
                                
                                const insertPaiement = `
                                    INSERT INTO paiements
                                    (reservation_id, montant, methode_paiement, statut_paiement, date_creation)
                                    VALUES (?, ?, ?, 'en_attente', NOW())
                                `;

                                db.query(insertPaiement, [reservationId, prix, methode_paiement], (err) => {
                                    if (err) {
                                        console.error("⚠️ Erreur insertion paiement:", err);
                                        // Non bloquant, on continue mais on log l'erreur
                                    } else {
                                        console.log("✅ Paiement inséré avec méthode:", methode_paiement);
                                    }
                                });
                            } else {
                                console.log("⚠️ Aucune méthode de paiement fournie");
                            }

                            // 7. Créer un billet
                            const insertBillet = `
                                INSERT INTO billets
                                (reservation_id, numero_billet, code_qr, statut, date_emission)
                                VALUES (?, ?, ?, 'valide', NOW())
                            `;

                            const numeroBillet = "BIL-" + Date.now() + "-" + reservationId;
                            const codeQR = "QR-" + codeReservation;

                            db.query(insertBillet, [reservationId, numeroBillet, codeQR], (err) => {
                                if (err) {
                                    console.error("⚠️ Erreur création billet:", err);
                                    // On continue même si la création du billet échoue
                                } else {
                                    console.log("✅ Billet créé");
                                }

                                db.commit(err => {
                                    if (err) {
                                        return db.rollback(() => {
                                            console.error("❌ Erreur commit:", err);
                                            res.status(500).json({ 
                                                message: "Erreur lors de la finalisation de la réservation",
                                                error: err 
                                            });
                                        });
                                    }

                                    console.log("✅ Transaction commit réussie");
                                    
                                    res.status(201).json({
                                        success: true,
                                        message: "Réservation réussie ✅",
                                        code_reservation: codeReservation,
                                        reservation_id: reservationId,
                                        details: {
                                            voyage_id: voyage_id,
                                            siege_id: siege_id,
                                            nom_passager: nom_passager,
                                            prix: prix,
                                            date_reservation: new Date().toISOString(),
                                            methode_paiement: methode_paiement || null
                                        }
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
};

/**
 * 6️⃣ Vérifier la disponibilité d'un siège spécifique
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
            console.error("Erreur checkSiegeDisponibilite:", err);
            return res.status(500).json({ 
                message: "Erreur lors de la vérification",
                error: err 
            });
        }

        if (result.length === 0) {
            return res.status(404).json({ 
                message: "Siège non trouvé",
                disponible: false 
            });
        }

        res.json({
            disponible: result[0].statut === 'disponible',
            statut: result[0].statut
        });
    });
};

/**
 * 7️⃣ Annuler une réservation
 */
exports.annulerReservation = (req, res) => {
    const { code_reservation } = req.params;

    db.beginTransaction(err => {
        if (err) {
            console.error("Erreur début transaction:", err);
            return res.status(500).json({ message: "Erreur serveur" });
        }

        // Récupérer les détails de la réservation
        const getReservationSql = `
            SELECT id, voyage_id, siege_id 
            FROM reservations 
            WHERE code_reservation = ? AND statut = 'confirme'
        `;

        db.query(getReservationSql, [code_reservation], (err, result) => {
            if (err || result.length === 0) {
                return db.rollback(() => {
                    res.status(404).json({ 
                        message: "Réservation non trouvée ou déjà annulée" 
                    });
                });
            }

            const { id, voyage_id, siege_id } = result[0];

            // Mettre à jour le statut de la réservation
            const updateReservationSql = `
                UPDATE reservations 
                SET statut = 'annule', date_mise_a_jour = NOW() 
                WHERE id = ?
            `;

            db.query(updateReservationSql, [id], (err) => {
                if (err) {
                    return db.rollback(() => {
                        console.error("Erreur annulation réservation:", err);
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
                            res.status(500).json({ message: "Erreur lors de la mise à jour du siège" });
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
                                res.status(500).json({ message: "Erreur lors de la mise à jour du voyage" });
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

/**
 * 8️⃣ Récupérer les données du tableau de bord pour la page d'accueil
 */
exports.getDashboardStats = (req, res) => {
    const userId = req.userId;

    const sql = `
        SELECT 
            (SELECT COUNT(*) FROM voyages WHERE statut = 'programme' AND heure_depart > NOW()) as trajetsDisponibles,
            (SELECT COUNT(*) FROM reservations WHERE utilisateur_id = ? AND statut = 'confirme') as reservationsActives,
            (SELECT JSON_OBJECT(
                'ville_depart', vd.nom,
                'ville_arrivee', va.nom,
                'date_depart', v.heure_depart,
                'numero_bus', b.numero_bus,
                'numero_siege', s.numero_siege
            ) FROM reservations r
            JOIN voyages v ON r.voyage_id = v.id
            JOIN trajets t ON v.trajet_id = t.id
            JOIN villes vd ON t.ville_depart_id = vd.id
            JOIN villes va ON t.ville_arrivee_id = va.id
            JOIN bus b ON v.bus_id = b.id
            JOIN sieges s ON r.siege_id = s.id
            WHERE r.utilisateur_id = ? AND r.statut = 'confirme' AND v.heure_depart > NOW()
            ORDER BY v.heure_depart ASC
            LIMIT 1) as prochainVoyage
    `;

    db.query(sql, [userId, userId], (err, result) => {
        if (err) {
            console.error("Erreur getDashboardStats:", err);
            return res.status(500).json({ 
                message: "Erreur lors de la récupération des statistiques",
                error: err 
            });
        }

        // Parser le JSON du prochain voyage
        if (result[0].prochainVoyage) {
            try {
                result[0].prochainVoyage = JSON.parse(result[0].prochainVoyage);
            } catch (e) {
                result[0].prochainVoyage = null;
            }
        }

        res.json(result[0]);
    });
};

/**
 * 9️⃣ Récupérer les trajets populaires (les plus réservés)
 */
exports.getTrajetsPopulaires = (req, res) => {
    const limit = req.query.limit || 5;

    const sql = `
        SELECT 
            t.id,
            vd.nom as ville_depart,
            va.nom as ville_arrivee,
            t.prix_base,
            t.duree_estimee_minutes,
            COUNT(DISTINCT r.id) as nombre_reservations
        FROM trajets t
        JOIN villes vd ON t.ville_depart_id = vd.id
        JOIN villes va ON t.ville_arrivee_id = va.id
        LEFT JOIN voyages v ON v.trajet_id = t.id
        LEFT JOIN reservations r ON r.voyage_id = v.id
        WHERE t.statut = 'actif'
        GROUP BY t.id
        ORDER BY nombre_reservations DESC
        LIMIT ?
    `;

    db.query(sql, [parseInt(limit)], (err, result) => {
        if (err) {
            console.error("Erreur getTrajetsPopulaires:", err);
            return res.status(500).json({ 
                message: "Erreur lors de la récupération des trajets populaires",
                error: err 
            });
        }
        res.json(result);
    });
};

/**
 * 🔟 Récupérer des trajets aléatoires pour le carrousel
 */
exports.getTrajetsAleatoires = (req, res) => {
    const limit = req.query.limit || 5;

    const sql = `
        SELECT 
            t.id,
            vd.nom as ville_depart,
            va.nom as ville_arrivee,
            t.prix_base,
            t.duree_estimee_minutes,
            COUNT(DISTINCT r.id) as nombre_reservations
        FROM trajets t
        JOIN villes vd ON t.ville_depart_id = vd.id
        JOIN villes va ON t.ville_arrivee_id = va.id
        LEFT JOIN voyages v ON v.trajet_id = t.id
        LEFT JOIN reservations r ON r.voyage_id = v.id
        WHERE t.statut = 'actif'
        GROUP BY t.id
        ORDER BY RAND()
        LIMIT ?
    `;

    db.query(sql, [parseInt(limit)], (err, result) => {
        if (err) {
            console.error("Erreur getTrajetsAleatoires:", err);
            return res.status(500).json({ 
                message: "Erreur lors de la récupération des trajets aléatoires",
                error: err 
            });
        }
        res.json(result);
    });
};

/**
 * 1️⃣1️⃣ Récupérer les dernières réservations d'un utilisateur
 */
exports.getDernieresReservations = (req, res) => {
    const userId = req.params.userId;
    const limit = req.query.limit || 3;

    // Vérifier que l'utilisateur demandé est bien celui connecté
    if (parseInt(userId) !== req.userId) {
        return res.status(403).json({ message: "Accès non autorisé" });
    }

    const sql = `
        SELECT 
            r.id,
            r.code_reservation,
            r.prix_total,
            r.statut,
            v.heure_depart as date_depart,
            vd.nom as ville_depart,
            va.nom as ville_arrivee,
            b.numero_bus,
            s.numero_siege
        FROM reservations r
        JOIN voyages v ON r.voyage_id = v.id
        JOIN trajets t ON v.trajet_id = t.id
        JOIN villes vd ON t.ville_depart_id = vd.id
        JOIN villes va ON t.ville_arrivee_id = va.id
        JOIN bus b ON v.bus_id = b.id
        JOIN sieges s ON r.siege_id = s.id
        WHERE r.utilisateur_id = ?
        ORDER BY r.date_creation DESC
        LIMIT ?
    `;

    db.query(sql, [userId, parseInt(limit)], (err, result) => {
        if (err) {
            console.error("Erreur getDernieresReservations:", err);
            return res.status(500).json({ 
                message: "Erreur lors de la récupération des dernières réservations",
                error: err 
            });
        }
        res.json(result);
    });
};