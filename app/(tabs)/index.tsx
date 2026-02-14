import { Link } from "expo-router";
import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();

    // Floating animation loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
      ])
    ).start();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, isLargeScreen && styles.containerLarge]}>
        
        {/* Decorative gradient blobs */}
        <View style={styles.gradientBlob1} />
        <View style={styles.gradientBlob2} />

        {/* Header Section */}
        <Animated.View
          style={[
            styles.header,
            isLargeScreen && styles.headerLarge,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim },
                { translateY: floatAnim },
              ],
            },
          ]}
        >
          {/* Emoji Icon */}
          <View style={styles.emojiContainer}>
            <Text style={styles.emoji}>💰</Text>
            <View style={styles.emojiGlow} />
          </View>

          <Text style={[styles.appName, isLargeScreen && styles.appNameLarge]}>
            Expense Tracker
          </Text>

          <View style={styles.taglineContainer}>
            <View style={styles.accentBar} />
            <Text style={[styles.tagline, isLargeScreen && styles.taglineLarge]}>
              Your money, your rules. Track expenses like a pro with real-time
              insights across all your devices.
            </Text>
          </View>

          {/* Feature Pills */}
          <View style={styles.featurePills}>
            <View style={styles.pill}>
              <Text style={styles.pillEmoji}>🔒</Text>
              <Text style={styles.pillText}>Secure</Text>
            </View>
            <View style={styles.pill}>
              <Text style={styles.pillEmoji}>📊</Text>
              <Text style={styles.pillText}>Analytics</Text>
            </View>
            <View style={styles.pill}>
              <Text style={styles.pillEmoji}>⚡</Text>
              <Text style={styles.pillText}>Fast</Text>
            </View>
          </View>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View
          style={[
            styles.actions,
            isLargeScreen && styles.actionsLarge,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          <Link href="/login" asChild>
            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.8}
            >
              <View style={styles.buttonContent}>
                <Text style={styles.primaryButtonText}>Sign In</Text>
                <Text style={styles.buttonEmoji}>→</Text>
              </View>
              <View style={styles.buttonShine} />
            </TouchableOpacity>
          </Link>

          <Link href="/signup" asChild>
            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.8}
            >
              <View style={styles.buttonContent}>
                <Text style={styles.secondaryButtonText}>Create Account</Text>
                <Text style={styles.secondaryButtonEmoji}>✨</Text>
              </View>
            </TouchableOpacity>
          </Link>

          {/* Quick Access */}
          <TouchableOpacity style={styles.guestButton} activeOpacity={0.7}>
            <Text style={styles.guestButtonText}>
              Continue as Guest
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Footer */}
        <Animated.View
          style={[
            styles.footerContainer,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <View style={styles.footerBadges}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>🌐 Web</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>📱 iOS</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>🤖 Android</Text>
            </View>
          </View>
          <Text style={styles.footerText}>
            Built with 💜 for modern expense tracking
          </Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

// Modern Gen Z Color Palette
const PRIMARY_COLOR = "#8B5CF6"; // Purple
const PRIMARY_LIGHT = "#A78BFA";
const SECONDARY_COLOR = "#EC4899"; // Pink
const ACCENT_COLOR = "#10B981"; // Green
const BACKGROUND_COLOR = "#0A0E1A"; // Deep dark blue
const CARD_COLOR = "#1A1F35";
const TEXT_PRIMARY = "#F9FAFB";
const TEXT_SECONDARY = "#D1D5DB";
const TEXT_MUTED = "#6B7280";
const GRADIENT_1 = "#8B5CF6";
const GRADIENT_2 = "#EC4899";

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },

  container: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
    backgroundColor: BACKGROUND_COLOR,
    position: "relative",
    overflow: "hidden",
    gap: 30,
  },

  containerLarge: {
    justifyContent: "center",
    gap: 48,
    paddingHorizontal: 80,
  },

  // Decorative gradient blobs
  gradientBlob1: {
    position: "absolute",
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: GRADIENT_1,
    opacity: 0.15,
    ...Platform.select({
      web: {
        filter: "blur(80px)",
      },
    }),
  },

  gradientBlob2: {
    position: "absolute",
    bottom: -50,
    left: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: GRADIENT_2,
    opacity: 0.1,
    ...Platform.select({
      web: {
        filter: "blur(70px)",
      },
    }),
  },

  header: {
    alignItems: "center",
    maxWidth: 600,
    gap: 20,
  },

  headerLarge: {
    gap: 0,
  },

  emojiContainer: {
    position: "relative",
    marginBottom: 0,
  },

  emoji: {
    fontSize: 64,
    textAlign: "center",
    lineHeight: 64,
    ...Platform.select({
      web: {
        marginBottom: -15,
      },
    }),
  },

  emojiGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: PRIMARY_COLOR,
    opacity: 0.3,
    borderRadius: 50,
    ...Platform.select({
      web: {
        filter: "blur(30px)",
      },
    }),
  },

  appName: {
    fontSize: 40,
    fontWeight: "800",
    color: TEXT_PRIMARY,
    letterSpacing: -0.5,
    textAlign: "center",
    ...Platform.select({
      web: {
        background: `linear-gradient(135deg, ${PRIMARY_LIGHT} 0%, ${SECONDARY_COLOR} 100%)`,
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
      },
    }),
  },

  appNameLarge: {
    fontSize: 56,
  },

  taglineContainer: {
    position: "relative",
    paddingLeft: 16,
  },

  accentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 2,
  },

  tagline: {
    fontSize: 16,
    color: TEXT_SECONDARY,
    textAlign: "left",
    lineHeight: 26,
    maxWidth: 500,
  },

  taglineLarge: {
    fontSize: 18,
    lineHeight: 30,
  },

  featurePills: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: CARD_COLOR,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.3)",
  },

  pillEmoji: {
    fontSize: 14,
  },

  pillText: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: "600",
  },

  actions: {
    width: "100%",
    maxWidth: 420,
    gap: 14,
  },

  actionsLarge: {
    width: 450,
  },

  primaryButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: PRIMARY_COLOR,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: `0 8px 24px rgba(139, 92, 246, 0.4)`,
        transition: "all 0.3s ease",
        cursor: "pointer",
      },
    }),
  },

  buttonShine: {
    position: "absolute",
    top: 0,
    left: -100,
    width: 100,
    height: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    ...Platform.select({
      web: {
        transform: "skewX(-20deg)",
      },
    }),
  },

  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  primaryButtonText: {
    color: TEXT_PRIMARY,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  buttonEmoji: {
    fontSize: 18,
    color: TEXT_PRIMARY,
  },

  secondaryButton: {
    backgroundColor: "transparent",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: PRIMARY_COLOR,
    ...Platform.select({
      web: {
        transition: "all 0.3s ease",
        cursor: "pointer",
      },
    }),
  },

  secondaryButtonText: {
    color: PRIMARY_COLOR,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  secondaryButtonEmoji: {
    fontSize: 16,
  },

  guestButton: {
    paddingVertical: 14,
    alignItems: "center",
    ...Platform.select({
      web: {
        transition: "opacity 0.3s ease",
        cursor: "pointer",
      },
    }),
  },

  guestButtonText: {
    color: TEXT_MUTED,
    fontSize: 15,
    fontWeight: "600",
    textDecorationLine: "underline",
  },

  footerContainer: {
    alignItems: "center",
    gap: 16,
  },

  footerBadges: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "center",
  },

  badge: {
    backgroundColor: CARD_COLOR,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.2)",
  },

  badgeText: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: "600",
  },

  footerText: {
    color: TEXT_MUTED,
    fontSize: 13,
    letterSpacing: 0.3,
    textAlign: "center",
  },
});