// components/Navbar.js
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { useRouter, usePathname } from "expo-router";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  // Fonction pour vérifier si une route est active
  const isActive = (route) => {
    return pathname === route;
  };

  // Navigation uniquement si on n'est pas déjà sur la route
  const handleNavigation = (route) => {
    if (!isActive(route)) {
      router.push(route);
    }
  };

  return (
    <View style={styles.container}>
      {/* Accueil */}
      <TouchableOpacity
        style={styles.item}
        onPress={() => handleNavigation("/Accueil")}
        activeOpacity={0.7}
      >
        <Image
          source={require("../images/icons/home.png")}
          style={[
            styles.icon,
            isActive("/Accueil") && styles.activeIcon
          ]}
        />
        <Text style={[styles.label, isActive("/Accueil") && styles.activeLabel]}>
          Accueil
        </Text>
        {isActive("/Accueil") && <View style={styles.activeDot} />}
      </TouchableOpacity>

      {/* Trajets */}
      <TouchableOpacity
        style={styles.item}
        onPress={() => handleNavigation("/Trajets")}
        activeOpacity={0.7}
      >
        <Image
          source={require("../images/icons/trajet.png")}
          style={[
            styles.icon,
            isActive("/Trajets") && styles.activeIcon
          ]}
        />
        <Text style={[styles.label, isActive("/Trajets") && styles.activeLabel]}>
          Trajets
        </Text>
        {isActive("/Trajets") && <View style={styles.activeDot} />}
      </TouchableOpacity>

      {/* Réservations */}
      <TouchableOpacity
        style={styles.item}
        onPress={() => handleNavigation("/Reservations")}
        activeOpacity={0.7}
      >
        <Image
          source={require("../images/icons/reservation.png")}
          style={[
            styles.icon,
            isActive("/Reservations") && styles.activeIcon
          ]}
        />
        <Text style={[styles.label, isActive("/Reservations") && styles.activeLabel]}>
          Réservations
        </Text>
        {isActive("/Reservations") && <View style={styles.activeDot} />}
      </TouchableOpacity>

      {/* Compte */}
      <TouchableOpacity
        style={styles.item}
        onPress={() => handleNavigation("/Compte")}
        activeOpacity={0.7}
      >
        <Image
          source={require("../images/icons/user.png")}
          style={[
            styles.icon,
            isActive("/Compte") && styles.activeIcon
          ]}
        />
        <Text style={[styles.label, isActive("/Compte") && styles.activeLabel]}>
          Compte
        </Text>
        {isActive("/Compte") && <View style={styles.activeDot} />}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: "#f0f0f0",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  item: {
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    position: "relative",
  },
  icon: {
    width: 26,
    height: 26,
    marginBottom: 3,
    resizeMode: "contain",
  },
  activeIcon: {
    // Vous pouvez ajouter un style pour l'icône active si nécessaire
    // Par exemple: tintColor: "#1E90FF"
  },
  label: {
    fontSize: 11,
    color: "#888",
    fontWeight: "500",
  },
  activeLabel: {
    color: "#1E90FF",
    fontWeight: "600",
  },
  activeDot: {
    position: "absolute",
    bottom: -4,
    width: 20,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#1E90FF",
    alignSelf: "center",
  },
});