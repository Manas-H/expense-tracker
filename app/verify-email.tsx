import { auth, db } from "@/firebaseConfig";
import { useRouter } from "expo-router";
import { sendEmailVerification, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Easing,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(true);
  const [userEmail, setUserEmail] = useState("");
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

  // Check if user is authenticated and email exists
  useEffect(() => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      // No user logged in, redirect to login
      router.replace("/login");
      return;
    }

    setUserEmail(currentUser.email || "");
    setCheckingEmail(false);
  }, []);

  // Check email verification status every 3 seconds
  useEffect(() => {
    if (!checkingEmail) {
      const interval = setInterval(async () => {
        try {
          const currentUser = auth.currentUser;
          if (currentUser) {
            // Reload user to get latest emailVerified status
            await currentUser.reload();

            if (currentUser.emailVerified) {
              // Email is verified, update Firestore and navigate to tracker
              const userRef = doc(db, "users", currentUser.uid);
              const userDoc = await getDoc(userRef);

              if (userDoc.exists()) {
                // User document exists, proceed to tracker
                Alert.alert("Success", "Email verified! You can now use all features.", [
                  {
                    text: "Continue",
                    onPress: () => router.replace("/tracker"),
                  },
                ]);
              } else {
                // User document doesn't exist (shouldn't happen)
                router.replace("/tracker");
              }
            }
          }
        } catch (err: any) {
          console.error("Error checking email verification:", err);
        }
      }, 3000); // Check every 3 seconds

      return () => clearInterval(interval);
    }
  }, [checkingEmail]);

  const handleResendEmail = async () => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      Alert.alert("Error", "User not found");
      return;
    }

    setResendLoading(true);

    try {
      await sendEmailVerification(currentUser);
      Alert.alert(
        "Email Sent",
        "A new verification email has been sent to " + currentUser.email
      );
    } catch (err: any) {
      Alert.alert("Error", "Failed to resend verification email");
    } finally {
      setResendLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      router.replace("/login");
    } catch (err: any) {
      Alert.alert("Error", "Failed to logout");
    } finally {
      setLoading(false);
    }
  };

  if (checkingEmail) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Background blobs */}
      <View style={styles.blob1} />
      <View style={styles.blob2} />

      <View style={styles.container}>
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          <Text style={styles.logo}>📧</Text>

          <Text style={styles.title}>Verify Your Email</Text>

          <Text style={styles.subtitle}>
            We've sent a verification link to {userEmail || "your email"}
          </Text>
        </Animated.View>

        {/* Card */}
        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.contentContainer}>
            <Text style={styles.mainText}>Click the link in your email to verify your account.</Text>

            <View style={styles.stepsContainer}>
              <View style={styles.step}>
                <Text style={styles.stepNumber}>1</Text>
                <Text style={styles.stepText}>Check your inbox</Text>
              </View>

              <View style={styles.step}>
                <Text style={styles.stepNumber}>2</Text>
                <Text style={styles.stepText}>Click the verification link</Text>
              </View>

              <View style={styles.step}>
                <Text style={styles.stepNumber}>3</Text>
                <Text style={styles.stepText}>Come back here - it updates automatically</Text>
              </View>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                💡 Tip: If you don't see the email, check your spam folder
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.resendButton}
            onPress={handleResendEmail}
            activeOpacity={0.8}
            disabled={resendLoading}
          >
            {resendLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.resendText}>Resend Verification Email</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={PRIMARY} />
            ) : (
              <Text style={styles.logoutText}>Change Email / Logout</Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.waitingText}>Checking email verification status...</Text>
      </View>
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

  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    color: MUTED,
    fontSize: 14,
    marginTop: 12,
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
    fontSize: 28,
    fontWeight: "700",
    color: TEXT,
  },

  subtitle: {
    fontSize: 13,
    color: MUTED,
    marginTop: 8,
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

  contentContainer: {
    marginBottom: 20,
  },

  mainText: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center",
  },

  stepsContainer: {
    marginBottom: 20,
  },

  step: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PRIMARY,
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    textAlignVertical: "center",
    marginRight: 12,
  },

  stepText: {
    color: TEXT,
    fontSize: 13,
    flex: 1,
  },

  infoBox: {
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    borderWidth: 1,
    borderColor: PRIMARY,
    borderRadius: 10,
    padding: 12,
  },

  infoText: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },

  resendButton: {
    backgroundColor: PRIMARY,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },

  resendText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 14,
  },

  logoutButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  logoutText: {
    color: PRIMARY,
    fontWeight: "600",
    fontSize: 14,
  },

  waitingText: {
    color: MUTED,
    fontSize: 12,
    marginTop: 20,
    textAlign: "center",
    fontStyle: "italic",
  },
});
