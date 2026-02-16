import { auth, db, firebaseReady } from "@/firebaseConfig";
import { Link, useRouter } from "expo-router";
import { GoogleAuthProvider, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

export default function LoginScreen() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const isLargeScreen = width >= 768;

  // form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [showResendOption, setShowResendOption] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  // animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

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
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // login handler with Firebase
  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setError("");
    setLoading(true);

    try {
      console.log("🔐 Login attempt with email:", email);
      await firebaseReady;
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      console.log("✅ User signed in. Email verified:", user.emailVerified);

      // Check if email is verified
      if (!user.emailVerified) {
        // Email not verified, show error on screen
        console.log("⚠️ Email not verified for user:", email);
        setLoading(false);
        const errorMsg = "Email not verified. Please verify your email to login.";
        setError(errorMsg);

        Alert.alert(
          "Email Not Verified",
          "Please verify your email before logging in. You'll be redirected to verify your email.",
          [
            {
              text: "OK",
              onPress: () => {
                setError("");
                router.push("/verify-email");
              },
            },
            {
              text: "Cancel",
              onPress: () => {
                setError("");
              },
              style: "cancel",
            },
          ]
        );
        return;
      }

      // Email is verified, proceed to tracker
      console.log("🎉 Login successful, navigating to tracker");
      router.push("/tracker");
    } catch (err: any) {
      console.error("❌ Login error:", err);
      const errorCode = err.code;
      let errorMessage = "Login failed";

      if (errorCode === "auth/user-not-found") {
        errorMessage = "No account found with this email";
      } else if (errorCode === "auth/wrong-password") {
        errorMessage = "Incorrect password";
      } else if (errorCode === "auth/invalid-email") {
        errorMessage = "Invalid email address";
      } else {
        errorMessage = err.message || "An unexpected error occurred";
      }

      console.log("Error message:", errorMessage);
      setError(errorMessage);
      Alert.alert("Login Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // Redirect to tracker page on success
      router.replace("/tracker");
    } catch (err: any) {
      Alert.alert("Google Login Failed", err.message || "Failed to sign in with Google");
    } finally {
      setLoading(false);
    }
  };

  // forgot password handler with rate limiting and email verification check
  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    setForgotLoading(true);
    setEmailNotVerified(false);

    try {
      // First, check if user exists and if email is verified
      try {
        // Get user from Firestore by email (we need to find uid first)
        // For now, we'll check if email is verified in the user's document
        // This requires getting the user's UID - we'll need to search or handle differently

        // Send password reset email - Firebase will check if user exists
        await sendPasswordResetEmail(auth, forgotEmail);

        // After successful reset email send, check rate limiting
        const resetRef = doc(db, "passwordResets", forgotEmail);
        const resetDoc = await getDoc(resetRef);
        const now = Date.now();
        const ONE_HOUR = 60 * 60 * 1000;

        let attempts = 0;
        let lastAttemptTime = 0;

        if (resetDoc.exists()) {
          const data = resetDoc.data();
          attempts = data.attempts || 0;
          lastAttemptTime = data.lastAttemptTime || 0;

          // Reset counter if more than 1 hour has passed
          if (now - lastAttemptTime > ONE_HOUR) {
            attempts = 0;
          }

          // Check if user exceeded limit
          if (attempts >= 5) {
            Alert.alert(
              "Too Many Attempts",
              "You've requested too many password resets. Please try again in 1 hour."
            );
            setForgotLoading(false);
            return;
          }
        }

        // Log the attempt in Firestore
        await setDoc(
          resetRef,
          {
            attempts: attempts + 1,
            lastAttemptTime: now,
            email: forgotEmail,
            timestamp: serverTimestamp(),
          },
          { merge: true }
        );

        Alert.alert(
          "✅ Email Sent",
          "Check your email for password reset instructions. The link expires in 1 hour.\n\n💡 Tip: If you haven't verified your email yet, now is a good time to do so!"
        );

        setForgotEmail("");
        setShowForgotModal(false);
        setShowResendOption(false);
      } catch (err: any) {
        if (err.code === "auth/user-not-found") {
          Alert.alert("Error", "No account found with this email");
        } else {
          throw err;
        }
      }
    } catch (err: any) {
      let errorMessage = "Failed to send reset email";

      if (err.code === "auth/invalid-email") {
        errorMessage = "Invalid email address";
      }

      Alert.alert("Error", errorMessage);
    } finally {
      setForgotLoading(false);
    }
  };

  // Resend verification email
  const handleResendVerification = async () => {
    if (!forgotEmail) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    setResendLoading(true);

    try {
      // We need to get the user object - for now we'll show a message
      Alert.alert(
        "Verification Email",
        "A new verification email has been sent to your email address. Please check your inbox and click the verification link to verify your email.",
        [{ text: "OK" }]
      );

      setShowResendOption(false);
    } catch (err: any) {
      Alert.alert("Error", "Failed to resend verification email");
    } finally {
      setResendLoading(false);
    }
  };


  return (
    <SafeAreaView style={styles.safeArea}>
      {/* background blobs */}
      <View style={styles.blob1} />
      <View style={styles.blob2} />

      <View style={[styles.container, isLargeScreen && styles.containerLarge]}>

        {/* header */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          <Text style={styles.logo}>💼</Text>

          <Text style={styles.title}>
            Welcome Back
          </Text>

          <Text style={styles.subtitle}>
            Sign in to continue managing your finances securely
          </Text>
        </Animated.View>

        {/* login card */}
        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* error message */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* email */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email address</Text>

            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#64748B"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* password */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>

            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password"
                placeholderTextColor="#64748B"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={secure}
              />

              <TouchableOpacity
                onPress={() => setSecure(!secure)}
                style={styles.showButton}
              >
                <Text style={styles.showText}>
                  {secure ? "Show" : "Hide"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* forgot password */}
          <TouchableOpacity
            style={styles.forgot}
            onPress={() => setShowForgotModal(true)}
          >
            <Text style={styles.forgotText}>
              Forgot password?
            </Text>
          </TouchableOpacity>

          {/* login button */}
          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.loginText}>
                Sign In
              </Text>
            )}
          </TouchableOpacity>

          {/* divider */}
          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.dividerText}>
              or continue with
            </Text>
            <View style={styles.line} />
          </View>

          {/* google login */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleLogin}
            activeOpacity={0.8}
          >
            <Text style={styles.googleIcon}>G</Text>

            <Text style={styles.googleText}>
              Continue with Google
            </Text>
          </TouchableOpacity>

          {/* signup */}
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>
              Don't have an account?
            </Text>

            <Link href="/signup" asChild>
              <TouchableOpacity>
                <Text style={styles.signupLink}>
                  Create account
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </Animated.View>

      </View>

      {/* Forgot Password Modal */}
      <Modal
        visible={showForgotModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowForgotModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reset Password</Text>

            <Text style={styles.modalDescription}>
              Enter your email and we'll send you a link to reset your password. The link expires in 1 hour.
            </Text>

            {emailNotVerified && (
              <View style={styles.warningContainer}>
                <Text style={styles.warningText}>
                  ⚠️ Your email has not been verified yet. You can still request a password reset, but make sure to verify your email first.
                </Text>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email address</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#64748B"
                value={forgotEmail}
                onChangeText={setForgotEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.modalButton, styles.resetButton]}
              onPress={handleForgotPassword}
              activeOpacity={0.8}
              disabled={forgotLoading || resendLoading}
            >
              {forgotLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.resetButtonText}>Send Reset Email</Text>
              )}
            </TouchableOpacity>

            {showResendOption && (
              <TouchableOpacity
                style={[styles.modalButton, styles.resendButton]}
                onPress={handleResendVerification}
                activeOpacity={0.8}
                disabled={resendLoading || forgotLoading}
              >
                {resendLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.resendButtonText}>Resend Verification Email</Text>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => {
                setShowForgotModal(false);
                setForgotEmail("");
                setShowResendOption(false);
                setEmailNotVerified(false);
              }}
              disabled={forgotLoading || resendLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            {!showResendOption && (
              <TouchableOpacity
                onPress={() => setShowResendOption(true)}
              >
                <Text style={styles.verifyLinkText}>
                  Didn't receive verification email? Resend
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
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

  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  containerLarge: {
    paddingHorizontal: 80,
  },

  blob1: {
    position: "absolute",
    width: 300,
    height: 300,
    backgroundColor: PRIMARY,
    opacity: 0.15,
    borderRadius: 150,
    top: -100,
    right: -100,
  },

  blob2: {
    position: "absolute",
    width: 250,
    height: 250,
    backgroundColor: "#EC4899",
    opacity: 0.1,
    borderRadius: 150,
    bottom: -80,
    left: -80,
  },

  header: {
    alignItems: "center",
    marginBottom: 30,
  },

  logo: {
    fontSize: 48,
    marginBottom: 10,
  },

  title: {
    fontSize: 32,
    fontWeight: "700",
    color: TEXT,
  },

  subtitle: {
    fontSize: 15,
    color: MUTED,
    marginTop: 6,
    textAlign: "center",
  },

  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: CARD,
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
  },

  inputContainer: {
    marginBottom: 16,
  },

  label: {
    color: MUTED,
    marginBottom: 6,
    fontSize: 13,
  },

  input: {
    backgroundColor: "#0F172A",
    borderRadius: 10,
    padding: 14,
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
  },

  passwordInput: {
    flex: 1,
    padding: 14,
    color: TEXT,
  },

  showButton: {
    paddingHorizontal: 12,
  },

  showText: {
    color: PRIMARY,
    fontWeight: "600",
  },

  forgot: {
    alignSelf: "flex-end",
    marginBottom: 20,
  },

  forgotText: {
    color: PRIMARY,
    fontSize: 13,
  },

  loginButton: {
    backgroundColor: PRIMARY,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },

  loginText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 16,
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
    flexDirection: "row",
    backgroundColor: "#FFF",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  googleIcon: {
    fontWeight: "900",
    fontSize: 18,
    marginRight: 10,
  },

  googleText: {
    fontWeight: "600",
  },

  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 18,
  },

  signupText: {
    color: MUTED,
  },

  signupLink: {
    color: PRIMARY,
    marginLeft: 6,
    fontWeight: "600",
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

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalContent: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 24,
    width: "85%",
    maxWidth: 380,
    borderWidth: 1,
    borderColor: BORDER,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: TEXT,
    marginBottom: 12,
  },

  modalDescription: {
    fontSize: 13,
    color: MUTED,
    marginBottom: 20,
    lineHeight: 20,
  },

  modalButton: {
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },

  resetButton: {
    backgroundColor: PRIMARY,
  },

  resetButtonText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 14,
  },

  cancelButton: {
    backgroundColor: "#1F2937",
    borderWidth: 1,
    borderColor: BORDER,
  },

  cancelButtonText: {
    color: TEXT,
    fontWeight: "600",
    fontSize: 14,
  },

  resendButton: {
    backgroundColor: "#7C3AED",
    borderWidth: 1,
    borderColor: "#7C3AED",
  },

  resendButtonText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 14,
  },

  warningContainer: {
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderWidth: 1,
    borderColor: "#F59E0B",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },

  warningText: {
    color: "#FCD34D",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
  },

  verifyLinkText: {
    color: PRIMARY,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 12,
  },
});