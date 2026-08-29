const express = require("express");
const router = express.Router();
const trajetController = require("../controllers/trajetController");
const verifyToken = require("../middleware/auth");

// Routes publiques
router.get("/", trajetController.getAllTrajets);
router.get("/populaires", trajetController.getTrajetsPopulaires);
router.get("/aleatoires", trajetController.getTrajetsAleatoires);
router.get("/:id/voyages", trajetController.getVoyagesByTrajet);
router.get("/voyages/:id/sieges", trajetController.getSiegesByVoyage);
router.get("/check/:voyage_id/:siege_id", trajetController.checkSiegeDisponibilite);

// Routes protégées (nécessitent un token)
router.get("/dashboard/stats", verifyToken, trajetController.getDashboardStats);
router.get("/user/:userId/dernieres-reservations", verifyToken, trajetController.getDernieresReservations);
router.post("/reserver", verifyToken, trajetController.reserverTrajet);
router.put("/annuler/:code_reservation", verifyToken, trajetController.annulerReservation);

module.exports = router;