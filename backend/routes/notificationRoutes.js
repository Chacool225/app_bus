const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const verifyToken = require("../middleware/auth");

// Toutes ces routes nécessitent d'être authentifié
router.use(verifyToken);

// Récupérer toutes les notifications d'un utilisateur
router.get("/user/:userId", notificationController.getUserNotifications);

// Récupérer les notifications non lues
router.get("/user/:userId/unread", notificationController.getUnreadNotifications);

// Récupérer le nombre de notifications non lues
router.get("/user/:userId/count", notificationController.getUnreadCount);

// Marquer une notification comme lue
router.put("/:id/read", notificationController.markAsRead);

// Marquer toutes les notifications comme lues
router.put("/user/:userId/read-all", notificationController.markAllAsRead);

// Supprimer une notification
router.delete("/:id", notificationController.deleteNotification);

// Supprimer toutes les notifications lues
router.delete("/user/:userId/clear-read", notificationController.clearReadNotifications);

// Créer une notification
router.post("/create", notificationController.createNotification);

module.exports = router;