const db = require("../config/db");

/**
 * Récupérer toutes les notifications d'un utilisateur
 */
exports.getUserNotifications = (req, res) => {
    const userId = req.params.userId;

    // Vérifier que l'utilisateur demandé est bien celui connecté
    if (parseInt(userId) !== req.userId) {
        return res.status(403).json({ message: "Accès non autorisé" });
    }

    const sql = `
        SELECT 
            id,
            titre,
            message,
            type_notification,
            lu,
            date_creation
        FROM notifications 
        WHERE utilisateur_id = ?
        ORDER BY date_creation DESC
    `;

    db.query(sql, [userId], (err, result) => {
        if (err) {
            console.error("Erreur getUserNotifications:", err);
            return res.status(500).json({ 
                message: "Erreur lors de la récupération des notifications",
                error: err 
            });
        }

        res.json(result);
    });
};

/**
 * Récupérer les notifications non lues d'un utilisateur
 */
exports.getUnreadNotifications = (req, res) => {
    const userId = req.params.userId;

    // Vérifier que l'utilisateur demandé est bien celui connecté
    if (parseInt(userId) !== req.userId) {
        return res.status(403).json({ message: "Accès non autorisé" });
    }

    const sql = `
        SELECT 
            id,
            titre,
            message,
            type_notification,
            date_creation
        FROM notifications 
        WHERE utilisateur_id = ? AND lu = 0
        ORDER BY date_creation DESC
    `;

    db.query(sql, [userId], (err, result) => {
        if (err) {
            console.error("Erreur getUnreadNotifications:", err);
            return res.status(500).json({ 
                message: "Erreur lors de la récupération des notifications non lues",
                error: err 
            });
        }

        res.json(result);
    });
};

/**
 * Récupérer le nombre de notifications non lues
 */
exports.getUnreadCount = (req, res) => {
    const userId = req.params.userId;

    // Vérifier que l'utilisateur demandé est bien celui connecté
    if (parseInt(userId) !== req.userId) {
        return res.status(403).json({ message: "Accès non autorisé" });
    }

    const sql = `
        SELECT COUNT(*) as count
        FROM notifications 
        WHERE utilisateur_id = ? AND lu = 0
    `;

    db.query(sql, [userId], (err, result) => {
        if (err) {
            console.error("Erreur getUnreadCount:", err);
            return res.status(500).json({ 
                message: "Erreur lors du comptage des notifications",
                error: err 
            });
        }

        res.json({ count: result[0].count });
    });
};

/**
 * Marquer une notification comme lue
 */
exports.markAsRead = (req, res) => {
    const notificationId = req.params.id;
    const userId = req.userId;

    // Vérifier que la notification appartient bien à l'utilisateur
    const checkSql = "SELECT utilisateur_id FROM notifications WHERE id = ?";
    db.query(checkSql, [notificationId], (err, result) => {
        if (err) {
            console.error("Erreur vérification notification:", err);
            return res.status(500).json({ message: "Erreur serveur" });
        }

        if (result.length === 0) {
            return res.status(404).json({ message: "Notification non trouvée" });
        }

        if (result[0].utilisateur_id !== userId) {
            return res.status(403).json({ message: "Accès non autorisé" });
        }

        // Marquer comme lue
        const updateSql = "UPDATE notifications SET lu = 1 WHERE id = ?";
        db.query(updateSql, [notificationId], (err) => {
            if (err) {
                console.error("Erreur markAsRead:", err);
                return res.status(500).json({ 
                    message: "Erreur lors du marquage de la notification",
                    error: err 
                });
            }

            res.json({ 
                success: true,
                message: "Notification marquée comme lue" 
            });
        });
    });
};

/**
 * Marquer toutes les notifications d'un utilisateur comme lues
 */
exports.markAllAsRead = (req, res) => {
    const userId = req.params.userId;

    // Vérifier que l'utilisateur demandé est bien celui connecté
    if (parseInt(userId) !== req.userId) {
        return res.status(403).json({ message: "Accès non autorisé" });
    }

    const sql = "UPDATE notifications SET lu = 1 WHERE utilisateur_id = ? AND lu = 0";
    
    db.query(sql, [userId], (err, result) => {
        if (err) {
            console.error("Erreur markAllAsRead:", err);
            return res.status(500).json({ 
                message: "Erreur lors du marquage de toutes les notifications",
                error: err 
            });
        }

        res.json({ 
            success: true,
            message: "Toutes les notifications ont été marquées comme lues",
            affectedRows: result.affectedRows
        });
    });
};

/**
 * Supprimer une notification
 */
exports.deleteNotification = (req, res) => {
    const notificationId = req.params.id;
    const userId = req.userId;

    // Vérifier que la notification appartient bien à l'utilisateur
    const checkSql = "SELECT utilisateur_id FROM notifications WHERE id = ?";
    db.query(checkSql, [notificationId], (err, result) => {
        if (err) {
            console.error("Erreur vérification notification:", err);
            return res.status(500).json({ message: "Erreur serveur" });
        }

        if (result.length === 0) {
            return res.status(404).json({ message: "Notification non trouvée" });
        }

        if (result[0].utilisateur_id !== userId) {
            return res.status(403).json({ message: "Accès non autorisé" });
        }

        // Supprimer la notification
        const deleteSql = "DELETE FROM notifications WHERE id = ?";
        db.query(deleteSql, [notificationId], (err) => {
            if (err) {
                console.error("Erreur deleteNotification:", err);
                return res.status(500).json({ 
                    message: "Erreur lors de la suppression de la notification",
                    error: err 
                });
            }

            res.json({ 
                success: true,
                message: "Notification supprimée avec succès" 
            });
        });
    });
};

/**
 * Supprimer toutes les notifications lues d'un utilisateur
 */
exports.clearReadNotifications = (req, res) => {
    const userId = req.params.userId;

    // Vérifier que l'utilisateur demandé est bien celui connecté
    if (parseInt(userId) !== req.userId) {
        return res.status(403).json({ message: "Accès non autorisé" });
    }

    const sql = "DELETE FROM notifications WHERE utilisateur_id = ? AND lu = 1";
    
    db.query(sql, [userId], (err, result) => {
        if (err) {
            console.error("Erreur clearReadNotifications:", err);
            return res.status(500).json({ 
                message: "Erreur lors de la suppression des notifications lues",
                error: err 
            });
        }

        res.json({ 
            success: true,
            message: "Notifications lues supprimées avec succès",
            affectedRows: result.affectedRows
        });
    });
};

/**
 * Créer une notification (fonction utilitaire pour les autres contrôleurs)
 */
exports.createNotificationUtil = (utilisateur_id, titre, message, type_notification = 'info') => {
    return new Promise((resolve, reject) => {
        const sql = `
            INSERT INTO notifications 
            (utilisateur_id, titre, message, type_notification, lu, date_creation) 
            VALUES (?, ?, ?, ?, 0, NOW())
        `;

        db.query(sql, [utilisateur_id, titre, message, type_notification], (err, result) => {
            if (err) {
                console.error("Erreur createNotificationUtil:", err);
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
};

/**
 * Créer une notification (route API)
 */
exports.createNotification = (req, res) => {
    const { utilisateur_id, titre, message, type_notification } = req.body;

    console.log("📥 Tentative de création de notification:", req.body);

    // Validation des champs requis
    if (!utilisateur_id || !titre || !message) {
        return res.status(400).json({ 
            message: "Tous les champs sont requis (utilisateur_id, titre, message)" 
        });
    }

    // Vérifier que l'utilisateur qui crée la notification est bien celui connecté
    if (parseInt(utilisateur_id) !== req.userId) {
        console.log("❌ Accès non autorisé - utilisateur_id:", utilisateur_id, "req.userId:", req.userId);
        return res.status(403).json({ message: "Accès non autorisé" });
    }

    const sql = `
        INSERT INTO notifications 
        (utilisateur_id, titre, message, type_notification, lu, date_creation) 
        VALUES (?, ?, ?, ?, 0, NOW())
    `;

    const type = type_notification || 'info';

    db.query(sql, [utilisateur_id, titre, message, type], (err, result) => {
        if (err) {
            console.error("❌ Erreur createNotification:", err);
            return res.status(500).json({ 
                message: "Erreur lors de la création de la notification",
                error: err 
            });
        }

        console.log("✅ Notification créée avec succès, ID:", result.insertId);

        res.status(201).json({
            success: true,
            message: "Notification créée avec succès",
            notification_id: result.insertId
        });
    });
};