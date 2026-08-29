const express = require("express");
const router = express.Router();
const multer = require('multer');
const path = require('path');
const userProfilController = require("../controllers/userProfilController");
const verifyToken = require("../middleware/auth");

// Configuration de multer pour l'upload d'avatar
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads/avatars'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'avatar-' + uniqueSuffix + ext);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Seules les images sont autorisées'));
    }
};

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: fileFilter
});

// Toutes ces routes nécessitent d'être authentifié
router.use(verifyToken);

// Récupérer le profil complet avec statistiques
router.get("/profile/:id", userProfilController.getUserProfile);

// Mettre à jour le profil
router.put("/update/:id", userProfilController.updateUserProfile);

// Supprimer le compte
router.delete("/delete/:id", userProfilController.deleteUserAccount);

// Routes pour l'avatar
router.post("/avatar/:id", upload.single('avatar'), userProfilController.uploadAvatar);
router.delete("/avatar/:id", userProfilController.deleteAvatar);
module.exports = router;