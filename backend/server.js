const express = require("express");
const cors = require("cors");
const path = require('path');
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes existantes
const userRoutes = require("./routes/userRoutes");
const trajetRoutes = require("./routes/trajetRoutes");
const reservationRoutes = require("./routes/reservationRoutes");

// Nouvelle route pour le profil
const userProfilRoutes = require("./routes/userProfilRoutes");

// Utilisation des routes
app.use("/api/users", userRoutes);
app.use("/api/auth", userRoutes); 
app.use("/api/trajets", trajetRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/profil", userProfilRoutes);

// NOUVELLE ROUTE pour les notifications
const notificationRoutes = require("./routes/notificationRoutes");
app.use("/api/notifications", notificationRoutes);

app.get("/", (req, res) => {
    res.send("API App Bus fonctionne 🚍");
});

// Gestion des erreurs 404
app.use((req, res) => {
    res.status(404).json({ message: "Route non trouvée" });
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: "Erreur serveur", error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});