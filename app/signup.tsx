import { auth, db } from "@/firebaseConfig";
import { validateEmail } from "@/utils/emailValidation";
import { Link, useRouter } from "expo-router";
import { createUserWithEmailAndPassword, GoogleAuthProvider, sendEmailVerification, signInWithPopup } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

export default function SignupScreen() {
  const { width, height } = useWindowDimensions();
  const router = useRouter();

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  // form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [secure1, setSecure1] = useState(true);
  const [secure2, setSecure2] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [successEmail, setSuccessEmail] = useState("");

  // animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Auto-redirect after success
  useEffect(() => {
    if (showSuccess) {
      console.log("⏱️ Success shown, redirecting in 2 seconds...");
      const timer = setTimeout(() => {
        console.log("🚀 Auto-navigating to verify-email page...");
        router.push("/verify-email");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  const handleSignup = async () => {
    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    // Validate email format and check for disposable emails
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      setError(emailValidation.error || "Invalid email");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setError("");
    setLoading(true);

    try {
      console.log("📝 Starting signup process with email:", email);
      
      // Create user account
      console.log("🔐 Creating user account...");
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log("✅ User account created:", user.uid);

      // Send email verification
      console.log("📧 Sending verification email...");
      try {
        await sendEmailVerification(user);
        console.log("✅ Verification email sent");
      } catch (emailErr: any) {
        console.error("⚠️ Failed to send verification email:", emailErr);
        // Don't stop the signup process if email fails
      }

      // Store user data in Firestore with email verification status
      console.log("💾 Storing user data in Firestore...");
      try {
        await setDoc(doc(db, "users", user.uid), {
          name,
          email,
          emailVerified: false,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
        });
        console.log("✅ User data stored in Firestore");
      } catch (firestoreErr: any) {
        console.error("⚠️ Firestore error (non-critical):", firestoreErr);
        console.log("⚠️ User account created but Firestore save failed. This is okay - proceeding anyway.");
      }

      // Alert user to verify email
      console.log("🎉 Signup successful, showing success screen...");
      setSuccessEmail(email);
      setShowSuccess(true);
      
      // Clear form inputs
      setTimeout(() => {
        setName("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setError("");
      }, 100);
      
      return; // Exit after showing success screen
    } catch (err: any) {
      console.error("❌ Signup error:", err);
      const errorCode = err.code;
      let errorMessage = "Signup failed";
      
      if (errorCode === "auth/email-already-in-use") {
        errorMessage = "This email is already registered";
      } else if (errorCode === "auth/invalid-email") {
        errorMessage = "Invalid email address";
      } else if (errorCode === "auth/weak-password") {
        errorMessage = "Password is too weak";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      console.log("Error to display:", errorMessage);
      setError(errorMessage);
      Alert.alert("Signup Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // Redirect to tracker page on success
      router.replace("/tracker");
    } catch (err: any) {
      Alert.alert("Google Signup Failed", err.message || "Failed to sign up with Google");
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = () => {
    if (!password) return "";

    if (password.length < 6) return "Weak";
    if (password.length < 10) return "Medium";
    return "Strong";
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Success Screen */}
      {showSuccess && (
        <View style={styles.successOverlay}>
          <Animated.View 
            style={[
              styles.successContainer,
              { 
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }]
              }
            ]}
          >
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.successTitle}>Account Created Successfully!</Text>
            <Text style={styles.successMessage}>
              A verification email has been sent to:
            </Text>
            <Text style={styles.successEmail}>{successEmail}</Text>
            <Text style={styles.successSubtext}>
              Please click the link in the email to verify your account.
            </Text>
            <Text style={styles.redirectText}>
              Redirecting to verification page in 2 seconds...
            </Text>
          </Animated.View>
        </View>
      )}

      {/* Background blobs */}
      <View style={styles.blob1} />
      <View style={styles.blob2} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          { minHeight: height },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.root,
            isDesktop && styles.rootDesktop,
          ]}
        >

          {/* LEFT SIDE BRANDING (Desktop only) */}
          {isDesktop && (
            <Animated.View
              style={[
                styles.brandContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <Text style={styles.brandLogo}>✨</Text>

              <Text style={styles.brandTitle}>
                FinanceFlow
              </Text>

              <Text style={styles.brandSubtitle}>
                Track expenses, manage budgets, and grow your wealth with modern tools.
              </Text>
            </Animated.View>
          )}

          {/* RIGHT SIDE CARD */}
          <Animated.View
            style={[
              styles.cardContainer,
              {
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim },
                  { scale: scaleAnim },
                ],
              },
            ]}
          >

            {/* Header (mobile/tablet) */}
            {!isDesktop && (
              <Animated.View
                style={[
                  styles.header,
                  {
                    opacity: fadeAnim,
                    transform: [
                      { translateY: slideAnim },
                      { scale: scaleAnim },
                    ],
                  },
                ]}
              >
                <Text style={styles.logo}>✨</Text>

                <Text style={styles.title}>
                  Create Account
                </Text>

                <Text style={styles.subtitle}>
                  Start tracking your finances securely
                </Text>
              </Animated.View>
            )}

            {/* Card */}
            <View style={styles.nah}>

              {/* error message */}
              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Name */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Full name</Text>

                <TextInput
                  style={styles.input}
                  placeholder="John Doe"
                  placeholderTextColor="#64748B"
                  value={name}
                  onChangeText={setName}
                />
              </View>

              {/* Email */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>

                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor="#64748B"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                />
              </View>

              {/* Password */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>

                <View style={styles.passwordWrapper}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Create password"
                    placeholderTextColor="#64748B"
                    secureTextEntry={secure1}
                    value={password}
                    onChangeText={setPassword}
                  />

                  <TouchableOpacity
                    onPress={() => setSecure1(!secure1)}
                  >
                    <Text style={styles.showText}>
                      {secure1 ? "Show" : "Hide"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {password.length > 0 && (
                  <Text style={styles.strength}>
                    Strength: {getPasswordStrength()}
                  </Text>
                )}
              </View>

              {/* Confirm */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  Confirm password
                </Text>

                <View style={styles.passwordWrapper}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Confirm password"
                    placeholderTextColor="#64748B"
                    secureTextEntry={secure2}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />

                  <TouchableOpacity
                    onPress={() => setSecure2(!secure2)}
                  >
                    <Text style={styles.showText}>
                      {secure2 ? "Show" : "Hide"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Button */}
              <TouchableOpacity
                style={styles.signupButton}
                onPress={handleSignup}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.signupText}>
                    Create Account
                  </Text>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.line} />
                <Text style={styles.dividerText}>
                  or continue with
                </Text>
                <View style={styles.line} />
              </View>

              {/* Google */}
              <TouchableOpacity 
                style={styles.googleButton}
                onPress={handleGoogleSignup}
                disabled={loading}
              >
                <Text style={styles.googleText}>
                  {loading ? "Signing up..." : "Sign up with Google"}
                </Text>
              </TouchableOpacity>

              {/* Login */}
              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>
                  Already have account?
                </Text>

                <Link href="/login" asChild>
                  <TouchableOpacity>
                    <Text style={styles.loginLink}>
                      Sign In
                    </Text>
                  </TouchableOpacity>
                </Link>
              </View>

            </View>
          </Animated.View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const PRIMARY = "#8B5CF6";
const BACKGROUND = "#0A0E1A";
const CARD = "#12172A";
const BORDER = "#1F2937";
const TEXT = "#F8FAFC";
const MUTED = "#94A3B8";

const styles = StyleSheet.create({

  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },

  root: {
    width: "100%",
    maxWidth: 1200,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  rootDesktop: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  brandContainer: {
    flex: 1,
    paddingRight: 60,
  },

  brandLogo: {
    fontSize: 60,
    marginBottom: 20,
  },

  brandTitle: {
    fontSize: 42,
    fontWeight: "800",
    color: TEXT,
  },

  brandSubtitle: {
    color: MUTED,
    fontSize: 16,
    marginTop: 12,
    maxWidth: 400,
  },

  cardContainer: {
    flex: 1,
    alignItems: "center",
    width: "100%",
  },

  header: {
    alignItems: "center",
    marginBottom: 20,
  },

  logo: {
    fontSize: 42,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: TEXT,
    marginTop: 10,
  },

  subtitle: {
    color: MUTED,
    marginTop: 6,
  },

  nah: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: CARD,
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 20,
    paddingVertical: 28,
  },

  inputContainer: {
    marginBottom: 16,
  },

  label: {
    color: MUTED,
    marginBottom: 6,
  },

  input: {
    backgroundColor: "#0F172A",
    padding: 14,
    borderRadius: 10,
    color: TEXT,
    borderWidth: 1,
    borderColor: BORDER,
  },

  passwordWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingRight: 10,
  },

  passwordInput: {
    flex: 1,
    padding: 14,
    color: TEXT,
  },

  showText: {
    color: PRIMARY,
    fontWeight: "600",
  },

  strength: {
    color: MUTED,
    fontSize: 12,
    marginTop: 4,
  },

  signupButton: {
    backgroundColor: PRIMARY,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },

  signupText: {
    color: "#FFF",
    fontWeight: "700",
  },

  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: BORDER,
  },

  dividerText: {
    color: MUTED,
    marginHorizontal: 10,
  },

  googleButton: {
    backgroundColor: "#FFF",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  googleText: {
    fontWeight: "600",
  },

  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 18,
  },

  loginText: {
    color: MUTED,
  },

  loginLink: {
    color: PRIMARY,
    marginLeft: 6,
    fontWeight: "600",
  },

  blob1: {
    position: "absolute",
    width: 400,
    height: 400,
    backgroundColor: PRIMARY,
    opacity: 0.15,
    borderRadius: 200,
    top: -150,
    right: -150,
  },

  blob2: {
    position: "absolute",
    width: 300,
    height: 300,
    backgroundColor: "#EC4899",
    opacity: 0.12,
    borderRadius: 200,
    bottom: -120,
    left: -120,
  },

  errorContainer: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "#EF4444",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },

  errorText: {
    color: "#FCA5A5",
    fontSize: 13,
    fontWeight: "600",
  },

  successOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },

  successContainer: {
    backgroundColor: CARD,
    padding: 40,
    borderRadius: 20,
    alignItems: "center",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: PRIMARY,
  },

  successIcon: {
    fontSize: 60,
    marginBottom: 20,
  },

  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: TEXT,
    marginBottom: 16,
    textAlign: "center",
  },

  successMessage: {
    fontSize: 14,
    color: MUTED,
    marginBottom: 12,
    textAlign: "center",
  },

  successEmail: {
    fontSize: 14,
    fontWeight: "600",
    color: PRIMARY,
    marginBottom: 20,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },

  successSubtext: {
    fontSize: 13,
    color: MUTED,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },

  redirectText: {
    fontSize: 12,
    color: PRIMARY,
    fontStyle: "italic",
    textAlign: "center",
  },

});
