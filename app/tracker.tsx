import { auth } from "@/firebaseConfig";
import { useRouter } from "expo-router";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

export default function TrackerScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setLoading(false);
      } else {
        // No user logged in, redirect to login
        router.replace("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut(auth);
      router.replace("/login");
    } catch (error) {
      console.error("Logout error:", error);
      setLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>
                Welcome, {user?.email?.split("@")[0]}! 👋
              </Text>
              <Text style={styles.subgreeting}>
                Let's track your expenses
              </Text>
            </View>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.logoutButtonText}>Logout</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Stats Section */}
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, styles.statCard1]}>
              <Text style={styles.statLabel}>Total Expenses</Text>
              <Text style={styles.statValue}>$0.00</Text>
              <Text style={styles.statDetail}>This month</Text>
            </View>

            <View style={[styles.statCard, styles.statCard2]}>
              <Text style={styles.statLabel}>Budget Left</Text>
              <Text style={styles.statValue}>$0,000</Text>
              <Text style={styles.statDetail}>Available</Text>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>

            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionIcon}>➕</Text>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Add Expense</Text>
                <Text style={styles.actionDesc}>Record a new expense</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionIcon}>📊</Text>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>View Analytics</Text>
                <Text style={styles.actionDesc}>See spending breakdown</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionIcon}>💰</Text>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Set Budget</Text>
                <Text style={styles.actionDesc}>Manage your budget</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Recent Activity */}
          <View style={styles.activitySection}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📝</Text>
              <Text style={styles.emptyText}>No expenses yet</Text>
              <Text style={styles.emptySubtext}>
                Start tracking your expenses to see them here
              </Text>
            </View>
          </View>
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
const CARD2 = "#1A2F3F";

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 40,
  },

  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    color: MUTED,
    marginTop: 12,
    fontSize: 14,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  greeting: {
    fontSize: 28,
    fontWeight: "800",
    color: TEXT,
    marginBottom: 4,
  },

  subgreeting: {
    fontSize: 14,
    color: MUTED,
  },

  logoutButton: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },

  logoutButtonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 13,
  },

  statsContainer: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 30,
  },

  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },

  statCard1: {
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    borderColor: PRIMARY,
  },

  statCard2: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderColor: "#10B981",
  },

  statLabel: {
    fontSize: 12,
    color: MUTED,
    marginBottom: 8,
    fontWeight: "600",
  },

  statValue: {
    fontSize: 28,
    fontWeight: "800",
    color: TEXT,
    marginBottom: 4,
  },

  statDetail: {
    fontSize: 12,
    color: MUTED,
  },

  actionsSection: {
    marginBottom: 30,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: TEXT,
    marginBottom: 16,
  },

  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },

  actionIcon: {
    fontSize: 32,
    marginRight: 16,
  },

  actionContent: {
    flex: 1,
  },

  actionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT,
    marginBottom: 4,
  },

  actionDesc: {
    fontSize: 13,
    color: MUTED,
  },

  activitySection: {
    marginBottom: 20,
  },

  emptyState: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 40,
    alignItems: "center",
  },

  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },

  emptyText: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT,
    marginBottom: 6,
  },

  emptySubtext: {
    fontSize: 13,
    color: MUTED,
    textAlign: "center",
  },
});
