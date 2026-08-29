import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Image,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Linking
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import API from "../services/api";

const { width, height } = Dimensions.get('window');

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [mot_de_passe, setMotDePasse] = useState("");
  const [message, setMessage] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Animation d'entrée
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Animation de rotation pour le switch
  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const saveUserData = async (token, user) => {
    try {
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));
    } catch (error) {
      console.log("Erreur sauvegarde:", error);
    }
  };

  const handleRegister = async () => {
    if (!nom || !email || !telephone || !mot_de_passe) {
      Alert.alert("Erreur", "Tous les champs sont requis");
      return;
    }

    setLoading(true);
    try {
      const res = await API.post("/users/register", {
        nom,
        email,
        telephone,
        mot_de_passe,
      });

      setMessage("✅ Inscription réussie !\nVous pouvez maintenant vous connecter.");
      setShowModal(true);

      setNom("");
      setEmail("");
      setTelephone("");
      setMotDePasse("");

      setTimeout(() => {
        setShowModal(false);
        setIsLogin(true);
      }, 3000);

    } catch (err) {
      Alert.alert(
        "Erreur", 
        err.response?.data?.message || "Erreur lors de l'inscription"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !mot_de_passe) {
      Alert.alert("Erreur", "Email et mot de passe requis");
      return;
    }

    setLoading(true);
    try {
      const res = await API.post("/users/login", {
        email,
        mot_de_passe,
      });

      await saveUserData(res.data.token, res.data.user);

      setMessage(`✅ Connexion réussie !\nBienvenue ${res.data.user.nom}`);
      setShowModal(true);

      setTimeout(() => {
        setShowModal(false);
        router.replace("/Accueil");
      }, 2000);

    } catch (err) {
      Alert.alert(
        "Erreur", 
        err.response?.data?.message || "Email ou mot de passe incorrect"
      );
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour la connexion avec Facebook
  const handleFacebookLogin = () => {
    Alert.alert(
      "Connexion Facebook",
      "Cette fonctionnalité sera bientôt disponible !",
      [{ text: "OK" }]
    );
  };

  // Fonction pour la connexion avec Google
  const handleGoogleLogin = () => {
    Alert.alert(
      "Connexion Google",
      "Cette fonctionnalité sera bientôt disponible !",
      [{ text: "OK" }]
    );
  };

  // Fonction pour appeler le service client
  const handleCallSupport = () => {
    Alert.alert(
      "📞 Service Client",
      "Voulez-vous appeler le service client ?",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Appeler", 
          onPress: () => {
            Linking.openURL('tel:+2250787819633');
          }
        }
      ]
    );
  };

  const closeModal = () => {
    setShowModal(false);
    if (isLogin) {
      router.replace("/Accueil");
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="light-content" backgroundColor="#1E90FF" />
      
      {/* Background gradient animé */}
      <LinearGradient
        colors={['#1E90FF', '#1874CD', '#104E8B']}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Vagues décoratives */}
        <View style={styles.waveContainer}>
          <View style={[styles.wave, styles.wave1]} />
          <View style={[styles.wave, styles.wave2]} />
          <View style={[styles.wave, styles.wave3]} />
        </View>

        {/* Cercles décoratifs */}
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <View style={styles.circle3} />
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim }
              ]
            }
          ]}
        >
          {/* Logo et nom de l'application */}
          <View style={styles.brandContainer}>
            <Animated.View style={[styles.logoContainer, { transform: [{ rotate }] }]}>
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                style={styles.logoGradient}
              >
                <Image 
                  source={require("../images/logo.jpg")} 
                  style={styles.logo}
                />
              </LinearGradient>
            </Animated.View>
            
            <Text style={styles.appName}>TRANSPORT IVOIRE</Text>
            <Text style={styles.slogan}>Voyagez en toute sérénité en Côte d'Ivoire</Text>
          </View>

          <Text style={styles.welcomeText}>
            {isLogin ? "Bon retour parmi nous !" : "Rejoignez l'aventure"}
          </Text>
          <Text style={styles.subtitle}>
            {isLogin 
              ? "Connectez-vous pour accéder à votre espace" 
              : "Créez votre compte en quelques secondes"}
          </Text>

          {/* Switch Connexion/Inscription avec design moderne */}
          <View style={styles.switchContainer}>
            <TouchableOpacity 
              onPress={() => {
                Animated.spring(rotateAnim, {
                  toValue: 1,
                  tension: 100,
                  friction: 5,
                  useNativeDriver: true,
                }).start(() => rotateAnim.setValue(0));
                setIsLogin(true);
              }}
              style={[styles.switchButton, isLogin && styles.activeSwitch]}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={isLogin ? ['#1E90FF', '#1874CD'] : ['transparent', 'transparent']}
                style={styles.switchGradient}
              >
                <Ionicons 
                  name="log-in" 
                  size={20} 
                  color={isLogin ? "#fff" : "#666"} 
                  style={styles.switchIcon}
                />
                <Text style={isLogin ? styles.activeText : styles.inactiveText}>
                  Connexion
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => {
                Animated.spring(rotateAnim, {
                  toValue: 1,
                  tension: 100,
                  friction: 5,
                  useNativeDriver: true,
                }).start(() => rotateAnim.setValue(0));
                setIsLogin(false);
              }}
              style={[styles.switchButton, !isLogin && styles.activeSwitch]}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={!isLogin ? ['#1E90FF', '#1874CD'] : ['transparent', 'transparent']}
                style={styles.switchGradient}
              >
                <Ionicons 
                  name="person-add" 
                  size={20} 
                  color={!isLogin ? "#fff" : "#666"} 
                  style={styles.switchIcon}
                />
                <Text style={!isLogin ? styles.activeText : styles.inactiveText}>
                  Inscription
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Formulaire avec design moderne */}
          <View style={styles.formContainer}>
            {!isLogin && (
              <>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person" size={20} color="#1E90FF" style={styles.inputIcon} />
                  <TextInput
                    placeholder="Nom complet"
                    placeholderTextColor="#999"
                    style={styles.input}
                    value={nom}
                    onChangeText={setNom}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Ionicons name="call" size={20} color="#1E90FF" style={styles.inputIcon} />
                  <TextInput
                    placeholder="Téléphone (ex: 0787819633)"
                    placeholderTextColor="#999"
                    style={styles.input}
                    value={telephone}
                    onChangeText={setTelephone}
                    keyboardType="phone-pad"
                  />
                </View>
              </>
            )}

            <View style={styles.inputWrapper}>
              <Ionicons name="mail" size={20} color="#1E90FF" style={styles.inputIcon} />
              <TextInput
                placeholder="Email"
                placeholderTextColor="#999"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed" size={20} color="#1E90FF" style={styles.inputIcon} />
              <TextInput
                placeholder="Mot de passe"
                placeholderTextColor="#999"
                secureTextEntry={!showPassword}
                style={styles.input}
                value={mot_de_passe}
                onChangeText={setMotDePasse}
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons 
                  name={showPassword ? "eye-off" : "eye"} 
                  size={20} 
                  color="#999" 
                />
              </TouchableOpacity>
            </View>

            {isLogin && (
              <TouchableOpacity style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>Mot de passe oublié ?</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={isLogin ? handleLogin : handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#1E90FF', '#1874CD']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.buttonText}> Chargement...</Text>
                  </View>
                ) : (
                  <View style={styles.buttonContent}>
                    <Text style={styles.buttonText}>
                      {isLogin ? "Se connecter" : "S'inscrire"}
                    </Text>
                    <Ionicons 
                      name={isLogin ? "arrow-forward" : "checkmark"} 
                      size={20} 
                      color="#fff" 
                    />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Séparateur */}
            <View style={styles.separator}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>ou</Text>
              <View style={styles.separatorLine} />
            </View>

            {/* Boutons sociaux */}
            <View style={styles.socialContainer}>
              <TouchableOpacity 
                style={[styles.socialButton, styles.facebookButton]} 
                onPress={handleFacebookLogin}
              >
                <Ionicons name="logo-facebook" size={24} color="#fff" />
                <Text style={styles.socialButtonText}>Facebook</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.socialButton, styles.googleButton]} 
                onPress={handleGoogleLogin}
              >
                <Ionicons name="logo-google" size={24} color="#fff" />
                <Text style={styles.socialButtonText}>Google</Text>
              </TouchableOpacity>
            </View>

            {/* Bouton d'appel */}
            <TouchableOpacity 
              style={styles.callButton}
              onPress={handleCallSupport}
            >
              <Ionicons name="call" size={20} color="#fff" />
              <Text style={styles.callButtonText}>Service client 24/7</Text>
            </TouchableOpacity>
          </View>

          {/* Footer avec lien vers les CGU */}
          <Text style={styles.footerText}>
            En continuant, vous acceptez nos{" "}
            <Text style={styles.footerLink}>Conditions d'utilisation</Text> et notre{" "}
            <Text style={styles.footerLink}>Politique de confidentialité</Text>
          </Text>
        </Animated.View>
      </ScrollView>

      {/* Modal de confirmation avec design amélioré */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <Animated.View style={[styles.modalContent]}>
            <LinearGradient
              colors={['#1E90FF', '#1874CD']}
              style={styles.modalGradient}
            >
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={closeModal}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>

              <View style={styles.modalIconContainer}>
                <Ionicons name="checkmark-circle" size={60} color="#fff" />
              </View>

              <Text style={styles.modalTitle}>Félicitations !</Text>
              <Text style={styles.modalText}>{message}</Text>

              <View style={styles.modalProgress}>
                <View style={styles.modalProgressBar} />
              </View>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1E90FF",
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  waveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  wave: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  wave1: {
    transform: [{ skewY: '-3deg' }],
    top: -30,
  },
  wave2: {
    transform: [{ skewY: '2deg' }],
    top: -20,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  wave3: {
    transform: [{ skewY: '-1deg' }],
    top: -10,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  circle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  circle2: {
    position: 'absolute',
    bottom: 50,
    left: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  circle3: {
    position: 'absolute',
    top: 100,
    left: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  content: {
    paddingHorizontal: 20,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  logoGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  logo: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: '#fff',
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 1,
  },
  slogan: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 5,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 20,
  },
  switchContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 30,
    padding: 5,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  switchButton: {
    flex: 1,
    borderRadius: 25,
    overflow: 'hidden',
  },
  switchGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  switchIcon: {
    marginRight: 8,
  },
  activeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  inactiveText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 15,
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    padding: 10,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 15,
  },
  forgotPasswordText: {
    color: '#1E90FF',
    fontSize: 14,
    fontWeight: '500',
  },
  button: {
    borderRadius: 15,
    overflow: 'hidden',
    marginTop: 5,
    marginBottom: 15,
  },
  buttonGradient: {
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 15,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  separatorText: {
    marginHorizontal: 10,
    color: '#999',
    fontSize: 14,
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 15,
    marginHorizontal: 5,
  },
  facebookButton: {
    backgroundColor: '#4267B2',
  },
  googleButton: {
    backgroundColor: '#DB4437',
  },
  socialButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 15,
  },
  callButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  footerText: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 20,
    lineHeight: 18,
  },
  footerLink: {
    color: '#fff',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  
  // Styles du modal amélioré
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20,
  },
  modalGradient: {
    padding: 30,
    alignItems: 'center',
    position: 'relative',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 15,
    padding: 5,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  modalText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  modalProgress: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  modalProgressBar: {
    width: '30%',
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
    position: 'absolute',
    left: 0,
  },
});