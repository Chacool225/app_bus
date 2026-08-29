const express = require("express");
const router = express.Router();
const reservationController = require("../controllers/reservationController");
const verifyToken = require("../middleware/auth");

// Toutes les routes sont protégées par le token
router.use(verifyToken);

// GET /api/reservations/user/:userId - Réservations d'un utilisateur
router.get("/user/:userId", reservationController.getUserReservations);

// GET /api/reservations/:id - Détails d'une réservation
router.get("/:id", reservationController.getReservationDetails);

// PUT /api/reservations/:id/cancel - Annuler une réservation
router.put("/:id/cancel", reservationController.cancelReservation);

module.exports = router;