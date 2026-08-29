const db = require("../config/db");
const bcrypt = require("bcryptjs");
const fs = require('fs');
const path = require('path');

// Configuration pour l'upload de fichiers
const uploadDir = path.join(__dirname, '../uploads/avatars');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Récupérer le profil complet d'un utilisateur avec statistiques
 */
exports.getUserProfile = (req, res) => {
    const userId = req.params.id;

    // Vérifier que l'utilisateur demandé est bien celui connecté
    if (parseInt(userId) !== req.userId) {
        return res.status(403).json({ message: "Accès non autorisé" });
    }

    const sql = `
        SELECT 
            u.id,
            u.nom,
            u.email,
            u.telephone,
            u.avatar,
            u.date_creation,
            u.role,
            (SELECT COUNT(*) FROM reservations WHERE utilisateur_id = u.id) as reservations_total,
            (SELECT COUNT(*) FROM reservations WHERE utilisateur_id = u.id AND statut = 'confirme') as reservations_confirmees,
            (SELECT COUNT(*) FROM reservations WHERE utilisateur_id = u.id AND statut = 'annule') as reservations_annulees,
            (SELECT COUNT(*) FROM reservations WHERE utilisateur_id = u.id AND statut = 'termine') as reservations_terminees,
            (SELECT COUNT(*) FROM reservations WHERE utilisateur_id = u.id AND statut = 'en_attente') as reservations_en_attente
        FROM utilisateurs u
        WHERE u.id = ?
    `;

    db.query(sql, [userId], (err, result) => {
        if (err) {
            console.error("Erreur getUserProfile:", err);
            return res.status(500).json({ message: "Erreur serveur" });
        }

        if (result.length === 0) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }

        const user = result[0];
        
        // Formater les statistiques
        const statistiques = {
            reservations_total: user.reservations_total || 0,
            reservations_confirmees: user.reservations_confirmees || 0,
            reservations_annulees: user.reservations_annulees || 0,
            reservations_terminees: user.reservations_terminees || 0,
            reservations_en_attente: user.reservations_en_attente || 0
        };

        res.json({
            id: user.id,
            nom: user.nom,
            email: user.email,
            telephone: user.telephone,
            avatar: user.avatar,
            date_creation: user.date_creation,
            role: user.role,
            statistiques
        });
    });
};

/**
 * Mettre à jour le profil d'un utilisateur
 */
exports.updateUserProfile = async (req, res) => {
    const userId = req.params.id;
    const { nom, email, telephone, mot_de_passe_actuel, nouveau_mot_de_passe } = req.body;

    // Vérifier que l'utilisateur demandé est bien celui connecté
    if (parseInt(userId) !== req.userId) {
        return res.status(403).json({ message: "Accès non autorisé" });
    }

    // Validation des champs requis
    if (!nom || !email || !telephone) {
        return res.status(400).json({ message: "Nom, email et téléphone sont requis" });
    }

    // Vérifier si l'utilisateur existe
    const checkUserSql = "SELECT * FROM utilisateurs WHERE id = ?";
    db.query(checkUserSql, [userId], async (err, result) => {
        if (err) {
            console.error("Erreur vérification utilisateur:", err);
            return res.status(500).json({ message: "Erreur serveur" });
        }

        if (result.length === 0) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }

        const user = result[0];

        // Vérifier si l'email est déjà utilisé par un autre utilisateur
        if (email !== user.email) {
            const checkEmailSql = "SELECT id FROM utilisateurs WHERE email = ? AND id != ?";
            db.query(checkEmailSql, [email, userId], (err, emailResult) => {
                if (err) {
                    console.error("Erreur vérification email:", err);
                    return res.status(500).json({ message: "Erreur serveur" });
                }

                if (emailResult.length > 0) {
                    return res.status(400).json({ message: "Cet email est déjà utilisé" });
                }
            });
        }

        // Vérifier si le téléphone est déjà utilisé par un autre utilisateur
        if (telephone !== user.telephone) {
            const checkPhoneSql = "SELECT id FROM utilisateurs WHERE telephone = ? AND id != ?";
            db.query(checkPhoneSql, [telephone, userId], (err, phoneResult) => {
                if (err) {
                    console.error("Erreur vérification téléphone:", err);
                    return res.status(500).json({ message: "Erreur serveur" });
                }

                if (phoneResult.length > 0) {
                    return res.status(400).json({ message: "Ce téléphone est déjà utilisé" });
                }
            });
        }

        // Si nouveau mot de passe, vérifier l'ancien
        let hashedPassword = user.mot_de_passe;
        if (nouveau_mot_de_passe) {
            if (!mot_de_passe_actuel) {
                return res.status(400).json({ message: "Mot de passe actuel requis" });
            }

            // Vérifier l'ancien mot de passe
            const validPassword = await bcrypt.compare(mot_de_passe_actuel, user.mot_de_passe);
            if (!validPassword) {
                return res.status(400).json({ message: "Mot de passe actuel incorrect" });
            }

            // Hasher le nouveau mot de passe
            hashedPassword = await bcrypt.hash(nouveau_mot_de_passe, 10);
        }

        // Mettre à jour l'utilisateur
        const updateSql = `
            UPDATE utilisateurs 
            SET nom = ?, email = ?, telephone = ?, mot_de_passe = ?, date_mise_a_jour = NOW()
            WHERE id = ?
        `;

        db.query(updateSql, [nom, email, telephone, hashedPassword, userId], (err) => {
            if (err) {
                console.error("Erreur mise à jour utilisateur:", err);
                return res.status(500).json({ message: "Erreur lors de la mise à jour" });
            }

            res.json({
                success: true,
                message: "Profil mis à jour avec succès",
                user: { 
                    id: userId, 
                    nom, 
                    email, 
                    telephone 
                }
            });
        });
    });
};

/**
 * Supprimer un compte utilisateur et toutes ses données associées
 */
exports.deleteUserAccount = (req, res) => {
    const userId = req.params.id;

    // Vérifier que l'utilisateur demandé est bien celui connecté
    if (parseInt(userId) !== req.userId) {
        return res.status(403).json({ message: "Accès non autorisé" });
    }

    db.beginTransaction(err => {
        if (err) {
            console.error("Erreur début transaction:", err);
            return res.status(500).json({ message: "Erreur serveur" });
        }

        // 1. Supprimer les billets liés aux réservations
        const deleteBilletsSql = `
            DELETE b FROM billets b
            INNER JOIN reservations r ON b.reservation_id = r.id
            WHERE r.utilisateur_id = ?
        `;
        
        db.query(deleteBilletsSql, [userId], (err) => {
            if (err) {
                return db.rollback(() => {
                    console.error("Erreur suppression billets:", err);
                    res.status(500).json({ message: "Erreur lors de la suppression" });
                });
            }

            // 2. Supprimer les paiements liés aux réservations
            const deletePaiementsSql = `
                DELETE p FROM paiements p
                INNER JOIN reservations r ON p.reservation_id = r.id
                WHERE r.utilisateur_id = ?
            `;

            db.query(deletePaiementsSql, [userId], (err) => {
                if (err) {
                    return db.rollback(() => {
                        console.error("Erreur suppression paiements:", err);
                        res.status(500).json({ message: "Erreur lors de la suppression" });
                    });
                }

                // 3. Supprimer les réservations
                const deleteReservationsSql = "DELETE FROM reservations WHERE utilisateur_id = ?";
                db.query(deleteReservationsSql, [userId], (err) => {
                    if (err) {
                        return db.rollback(() => {
                            console.error("Erreur suppression réservations:", err);
                            res.status(500).json({ message: "Erreur lors de la suppression" });
                        });
                    }

                    // 4. Supprimer l'avatar si existe
                    const getAvatarSql = "SELECT avatar FROM utilisateurs WHERE id = ?";
                    db.query(getAvatarSql, [userId], (err, userResult) => {
                        if (err) {
                            console.error("Erreur récupération avatar:", err);
                        }

                        if (userResult.length > 0 && userResult[0].avatar) {
                            const avatarPath = path.join(__dirname, '..', userResult[0].avatar);
                            if (fs.existsSync(avatarPath)) {
                                fs.unlinkSync(avatarPath);
                            }
                        }

                        // 5. Supprimer l'utilisateur
                        const deleteUserSql = "DELETE FROM utilisateurs WHERE id = ?";
                        db.query(deleteUserSql, [userId], (err) => {
                            if (err) {
                                return db.rollback(() => {
                                    console.error("Erreur suppression utilisateur:", err);
                                    res.status(500).json({ message: "Erreur lors de la suppression" });
                                });
                            }

                            db.commit(err => {
                                if (err) {
                                    return db.rollback(() => {
                                        console.error("Erreur commit:", err);
                                        res.status(500).json({ message: "Erreur lors de la suppression" });
                                    });
                                }

                                res.json({ 
                                    success: true,
                                    message: "Compte supprimé avec succès" 
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
 * Uploader une photo de profil
 */
exports.uploadAvatar = (req, res) => {
    const userId = req.params.id;

    // Vérifier que l'utilisateur demandé est bien celui connecté
    if (parseInt(userId) !== req.userId) {
        return res.status(403).json({ message: "Accès non autorisé" });
    }

    if (!req.file) {
        return res.status(400).json({ message: "Aucun fichier fourni" });
    }

    // Chemin relatif pour stocker en base
    const avatarPath = `/uploads/avatars/${req.file.filename}`;

    // Récupérer l'ancien avatar pour le supprimer
    const getOldAvatarSql = "SELECT avatar FROM utilisateurs WHERE id = ?";
    db.query(getOldAvatarSql, [userId], (err, result) => {
        if (err) {
            console.error("Erreur récupération ancien avatar:", err);
        }

        if (result.length > 0 && result[0].avatar) {
            const oldAvatarPath = path.join(__dirname, '..', result[0].avatar);
            if (fs.existsSync(oldAvatarPath)) {
                fs.unlinkSync(oldAvatarPath);
            }
        }

        // Mettre à jour l'avatar dans la base
        const updateSql = "UPDATE utilisateurs SET avatar = ?, date_mise_a_jour = NOW() WHERE id = ?";
        db.query(updateSql, [avatarPath, userId], (err) => {
            if (err) {
                console.error("Erreur mise à jour avatar:", err);
                return res.status(500).json({ message: "Erreur lors de l'upload" });
            }

            res.json({ 
                success: true,
                message: "Photo de profil mise à jour",
                avatar: avatarPath 
            });
        });
    });
};

/**
 * Supprimer la photo de profil
 */
exports.deleteAvatar = (req, res) => {
    const userId = req.params.id;

    // Vérifier que l'utilisateur demandé est bien celui connecté
    if (parseInt(userId) !== req.userId) {
        return res.status(403).json({ message: "Accès non autorisé" });
    }

    // Récupérer le chemin de l'avatar
    const getAvatarSql = "SELECT avatar FROM utilisateurs WHERE id = ?";
    db.query(getAvatarSql, [userId], (err, result) => {
        if (err) {
            console.error("Erreur récupération avatar:", err);
            return res.status(500).json({ message: "Erreur serveur" });
        }

        if (result.length > 0 && result[0].avatar) {
            const avatarPath = path.join(__dirname, '..', result[0].avatar);
            if (fs.existsSync(avatarPath)) {
                fs.unlinkSync(avatarPath);
            }
        }

        // Mettre à jour la base
        const updateSql = "UPDATE utilisateurs SET avatar = NULL, date_mise_a_jour = NOW() WHERE id = ?";
        db.query(updateSql, [userId], (err) => {
            if (err) {
                console.error("Erreur suppression avatar:", err);
                return res.status(500).json({ message: "Erreur lors de la suppression" });
            }

            res.json({ 
                success: true,
                message: "Photo de profil supprimée" 
            });
        });
    });
};
