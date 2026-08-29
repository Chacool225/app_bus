const express = require("express");
const router = express.Router();
const trajetController = require("../controllers/trajetController");

// GET /api/trajets - Tous les trajets
router.get("/", trajetController.getAllTrajets);

// GET /api/trajets/:id/voyages - Voyages d'un trajet
router.get("/:id/voyages", trajetController.getVoyagesByTrajet);

// GET /api/trajets/voyages/:id/sieges - Sièges d'un voyage
router.get("/voyages/:id/sieges", trajetController.getSiegesByVoyage);

// POST /api/trajets/reserver - Réserver
router.post("/reserver", trajetController.reserverTrajet);

module.exports = router;