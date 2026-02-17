import { auth, db } from "@/firebaseConfig";
import { useRouter } from "expo-router";
import { onAuthStateChanged, signOut, User } from "firebase/auth";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from "react-native";

export default function TrackerScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Other");
  const [description, setDescription] = useState("");
  const [slideAnim] = useState(new Animated.Value(0));
  const [showMenu, setShowMenu] = useState(false);
  const [floatingAnim] = useState(new Animated.Value(0));
  const [floatingBobAnim] = useState(new Animated.Value(0));
  const [currency, setCurrency] = useState<"USD" | "INR">("INR");
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false);

  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false);
  const [desktopMenuAnim] = useState(new Animated.Value(0));

  type TimeFilter =
    | "today"
    | "week"
    | "month"
    | "3months"
    | "6months"
    | "year";

  const [timeFilter, setTimeFilter] = useState<TimeFilter>("today");


  const [timeDropdownOpen, setTimeDropdownOpen] = useState(false);

  const timeOptions: { label: string; value: TimeFilter }[] = [
    { label: "Today", value: "today" },
    { label: "Last 7 Days", value: "week" },
    { label: "1 Month", value: "month" },
    { label: "3 Months", value: "3months" },
    { label: "6 Months", value: "6months" },
    { label: "1 Year", value: "year" },
  ];

  const selectedLabel =
    timeOptions.find((opt) => opt.value === timeFilter)?.label || "Today";

  // Categories state
  interface Category {
    id: string;
    name: string;
    symbol: string;
    userId: string;
    createdAt: number;
  }
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Expenses state
  interface Expense {
    id: string;
    amount: string;
    category: string;
    description: string;
    userId: string;
    timestamp: number;
  }
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [addingExpense, setAddingExpense] = useState(false);

  // Edit/Delete state
  const [showEditExpense, setShowEditExpense] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [updatingExpense, setUpdatingExpense] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [slideEditAnim] = useState(new Animated.Value(0));
  const filterButtonRef = useRef<View | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [monthlyBudget, setMonthlyBudget] = useState<number>(0);
  const [budgetInput, setBudgetInput] = useState("");
  const [savingBudget, setSavingBudget] = useState(false);

  const EXCHANGE_RATE = 83

  const formatAmount = (amount: string) => {
    const value = parseFloat(amount) || 0;

    if (currency === "USD") {
      return (value / EXCHANGE_RATE).toFixed(2);
    }

    return value.toFixed(2);
  };

  // Determine if should show floating button (mobile or small web)
  const isMobileWeb = Platform.OS === "web" && width < 768;
  const showFloatingButton =
    Platform.OS === "ios" || Platform.OS === "android" || isMobileWeb;

  const getStartDate = () => {
    const now = new Date();
    const start = new Date();

    switch (timeFilter) {
      case "today":
        start.setHours(0, 0, 0, 0);
        break;
      case "week":
        start.setDate(now.getDate() - 7);
        break;
      case "month":
        start.setMonth(now.getMonth() - 1);
        break;
      case "3months":
        start.setMonth(now.getMonth() - 3);
        break;
      case "6months":
        start.setMonth(now.getMonth() - 6);
        break;
      case "year":
        start.setFullYear(now.getFullYear() - 1);
        break;
    }

    return start.getTime();
  };

  const totalSpent = expenses
    .filter((expense) => expense.timestamp >= getStartDate())
    .reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

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

  // Fetch user categories from Firebase
  useEffect(() => {
    if (!user) return;

    setLoadingCategories(true);
    const unsubscribe = onSnapshot(
      collection(db, `users/${user.uid}/categories`),
      (snapshot) => {
        const categoryList: Category[] = [];
        snapshot.forEach((doc) => {
          categoryList.push({
            id: doc.id,
            ...(doc.data() as Omit<Category, "id">),
          });
        });
        setCategories(categoryList.sort((a, b) => b.createdAt - a.createdAt));
        setLoadingCategories(false);
      },
      (error) => {
        console.error("Error fetching categories:", error);
        setLoadingCategories(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Fetch user expenses from Firebase
  useEffect(() => {
    if (!user) return;

    setLoadingExpenses(true);
    const expenseQuery = query(
      collection(db, `users/${user.uid}/expenses`),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(
      expenseQuery,
      (snapshot) => {
        const expenseList: Expense[] = [];
        snapshot.forEach((doc) => {
          expenseList.push({
            id: doc.id,
            ...(doc.data() as Omit<Expense, "id">),
          });
        });
        setExpenses(expenseList);
        setLoadingExpenses(false);
      },
      (error) => {
        console.error("Error fetching expenses:", error);
        setLoadingExpenses(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Fetch monthly budget
  useEffect(() => {
    if (!user) return;

    const fetchBudget = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));

        if (userDoc.exists()) {
          const data = userDoc.data();

          if (data.monthlyBudget) {
            setMonthlyBudget(data.monthlyBudget);
          }
        }
      } catch (error) {
        console.log("Error fetching budget:", error);
      }
    };

    fetchBudget();
  }, [user]);


  useEffect(() => {
    // Start continuous floating animation for mobile menu button
    if (Platform.OS === "ios" || Platform.OS === "android" || isMobileWeb) {
      const floatingAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(floatingBobAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(floatingBobAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      floatingAnimation.start();
      return () => floatingAnimation.stop();
    }
  }, [floatingBobAnim, isMobileWeb]);

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

  const openAddExpense = () => {
    setShowAddExpense(true);
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeAddExpense = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowAddExpense(false);
      setAmount("");
      setCategory("Other");
      setDescription("");
    });
  };

  const handleAddExpense = async () => {
    if (!amount || !category) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (!user) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    setAddingExpense(true);
    try {
      await addDoc(collection(db, `users/${user.uid}/expenses`), {
        amount,
        category,
        description,
        userId: user.uid,
        timestamp: Date.now(),
      });
      closeAddExpense();
      Alert.alert("Success", "Expense added successfully!");
    } catch (error) {
      console.error("Error adding expense:", error);
      Alert.alert("Error", "Failed to add expense");
    } finally {
      setAddingExpense(false);
    }
  };

  const openEditExpense = (expense: Expense) => {
    setEditingExpenseId(expense.id);
    setEditAmount(expense.amount);
    setEditCategory(expense.category);
    setEditDescription(expense.description);
    setShowEditExpense(true);
    Animated.timing(slideEditAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeEditExpense = () => {
    Animated.timing(slideEditAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowEditExpense(false);
      setEditingExpenseId(null);
      setEditAmount("");
      setEditCategory("");
      setEditDescription("");
    });
  };

  const handleUpdateExpense = async () => {
    if (!editAmount || !editCategory) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (!user || !editingExpenseId) {
      Alert.alert("Error", "Invalid operation");
      return;
    }

    setUpdatingExpense(true);
    try {
      const expenseRef = doc(db, `users/${user.uid}/expenses`, editingExpenseId);
      await updateDoc(expenseRef, {
        amount: editAmount,
        category: editCategory,
        description: editDescription,
      });
      closeEditExpense();
      Alert.alert("Success", "Expense updated successfully!");
    } catch (error) {
      console.error("Error updating expense:", error);
      Alert.alert("Error", "Failed to update expense");
    } finally {
      setUpdatingExpense(false);
    }
  };

  const deleteExpense = async (expenseId: string) => {
    if (!user) return;

    setDeletingExpenseId(expenseId);

    try {
      const expenseRef = doc(
        db,
        `users/${user.uid}/expenses`,
        expenseId
      );

      await deleteDoc(expenseRef);

      if (Platform.OS === "web") {
        window.alert("Expense deleted successfully!");
      } else {
        Alert.alert("Success", "Expense deleted successfully!");
      }

    } catch (error) {
      console.error("Error deleting expense:", error);

      if (Platform.OS === "web") {
        window.alert("Failed to delete expense");
      } else {
        Alert.alert("Error", "Failed to delete expense");
      }

    } finally {
      setDeletingExpenseId(null);
    }
  };

  const handleDeleteExpense = (expenseId: string) => {
    // console.log("Attempting to delete expense with ID:", expenseId);

    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        "Are you sure you want to delete this expense?"
      );

      if (!confirmed) return;

      deleteExpense(expenseId);

    } else {
      Alert.alert(
        "Delete Expense?",
        "Are you sure you want to delete this expense?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => deleteExpense(expenseId),
          },
        ]
      );
    }
  };

  const handleSaveBudget = async () => {
    if (!budgetInput || !user) return;

    try {
      setSavingBudget(true);

      const value = parseFloat(budgetInput);

      await setDoc(
        doc(db, "users", user.uid),
        {
          monthlyBudget: value,
          updatedAt: Date.now(),
        },
        { merge: true }
      );

      setMonthlyBudget(value);
      setBudgetModalVisible(false);
      setBudgetInput("");

      Alert.alert("Success", "Budget saved successfully!");
    } catch (error) {
      console.log("Error saving budget:", error);
      Alert.alert("Error", "Failed to save budget");
    } finally {
      setSavingBudget(false);
    }
  };




  const toggleMenu = () => {
    if (Platform.OS === "web" && !isMobileWeb) {
      // Desktop menu toggle
      if (!desktopMenuOpen) {
        setDesktopMenuOpen(true);
        Animated.timing(desktopMenuAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } else {
        Animated.timing(desktopMenuAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setDesktopMenuOpen(false));
      }
      return; // prevent floating menu code from running
    }

    // Existing floating menu toggle
    if (!showMenu) {
      setShowMenu(true);
      Animated.spring(floatingAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }).start();
    } else {
      Animated.spring(floatingAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }).start(() => setShowMenu(false));
    }
  };


  const handleMenuItem = (action: string) => {
    console.log("Menu action:", action);
    if (action === "addExpense") {
      openAddExpense();
    } else if (action === "category") {
      router.push("/add-category");
    } else if (action === "analytics") {
      router.push("/analytics");
    } else if (action === "budget") {
      // TODO: Navigate to budget
    } else if (action === "profile") {
      // TODO: Navigate to profile
    } else if (action === "settings") {
      // TODO: Navigate to settings
    } else if (action === "reports") {
      // TODO: Navigate to reports
    }
    toggleMenu();
  };

  const getCurrencySymbol = () => {
    return currency === "USD" ? "$" : "₹";
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
      });
    }
  };

  const getCategorySymbol = (categoryName: string) => {
    const cat = categories.find((c) => c.name === categoryName);
    return cat ? cat.symbol : "📁";
  };

  const handleCurrencyChange = (newCurrency: "USD" | "INR") => {
    setCurrency(newCurrency);
    setShowCurrencyMenu(false);
  };


  const getStartOfMonth = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  };

  const monthlyTotal = expenses
    .filter((expense) => expense.timestamp >= getStartOfMonth())
    .reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

  const budgetLeft = monthlyBudget - monthlyTotal;

  const formattedBudgetLeft =
    currency === "USD"
      ? (budgetLeft / EXCHANGE_RATE).toFixed(2)
      : budgetLeft.toFixed(2);

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
            {Platform.OS === "web" && !isMobileWeb && (
              <TouchableOpacity
                style={styles.headerMenuButton}
                onPress={toggleMenu}
              >
                <Text style={styles.menuIcon}>☰</Text>
              </TouchableOpacity>
            )}
            <View style={styles.headerContent}>
              <Text style={styles.greeting}>
                Welcome, {user?.email?.split("@")[0]}! 👋
              </Text>
              <Text style={styles.subgreeting}>
                Let's track your expenses
              </Text>
            </View>
            <View style={styles.headerRightSection}>
              <View style={styles.currencyChanger}>
                <TouchableOpacity
                  style={styles.currencyButton}
                  onPress={() => setShowCurrencyMenu(!showCurrencyMenu)}
                >
                  <Text style={styles.currencyText}>{currency}</Text>
                </TouchableOpacity>
                {showCurrencyMenu && (
                  <View style={styles.currencyDropdown}>
                    <TouchableOpacity
                      style={[
                        styles.currencyOption,
                        currency === "USD" && styles.currencyOptionActive,
                      ]}
                      onPress={() => handleCurrencyChange("USD")}
                    >
                      <Text
                        style={[
                          styles.currencyOptionText,
                          currency === "USD" && styles.currencyOptionTextActive,
                        ]}
                      >
                        $ USD
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.currencyOption,
                        currency === "INR" && styles.currencyOptionActive,
                      ]}
                      onPress={() => handleCurrencyChange("INR")}
                    >
                      <Text
                        style={[
                          styles.currencyOptionText,
                          currency === "INR" && styles.currencyOptionTextActive,
                        ]}
                      >
                        ₹ INR
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
                disabled={loggingOut}
              >
                {loggingOut ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : Platform.OS === "ios" || Platform.OS === "android" ? (
                  <Text style={styles.logoutIcon}>🚪</Text>
                ) : (
                  <Text style={styles.logoutButtonText}>Logout</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats Section */}
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, styles.statCard1]}>
              <Text style={styles.statLabel}>Total Expenses</Text>
              <Text style={styles.statValue}>
                {getCurrencySymbol()}
                {formatAmount(monthlyTotal.toString())}
              </Text>
              <Text style={styles.statDetail}>This Month</Text>

            </View>

            <View style={[styles.statCard, styles.statCard2]}>
              <Text style={styles.statLabel}>Budget Left</Text>

              <Text
                style={[
                  styles.statValue,
                  budgetLeft < 0 && { color: "#EF4444" }, // red if over budget
                ]}
              >
                {getCurrencySymbol()}
                {formattedBudgetLeft}
              </Text>

              <Text style={styles.statDetail}>
                {budgetLeft < 0 ? "Over Budget" : "Available"}
              </Text>
            </View>

          </View>

          {/* Quick Actions */}
          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>

            <TouchableOpacity style={styles.actionButton} onPress={openAddExpense}>
              <Text style={styles.actionIcon}>➕</Text>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Add Expense</Text>
                <Text style={styles.actionDesc}>Record a new expense</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push("/analytics")}
            >
              <Text style={styles.actionIcon}>📊</Text>

              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>View Analytics</Text>
                <Text style={styles.actionDesc}>See spending breakdown</Text>
              </View>
            </TouchableOpacity>


            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setBudgetModalVisible(true)}
            >
              <Text style={styles.actionIcon}>💰</Text>

              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>
                  {monthlyBudget > 0 ? "Edit Budget" : "Set Budget"}
                </Text>

                <Text style={styles.actionDesc}>
                  {monthlyBudget > 0
                    ? `Current: ${getCurrencySymbol()}${monthlyBudget.toFixed(2)}`
                    : "Manage your monthly budget"}
                </Text>
              </View>
            </TouchableOpacity>

          </View>

          {/* Recent Activity / Expenses */}
          <View style={styles.activitySection}>
            <View style={styles.expensesHeader}>
              <Text style={styles.sectionTitle}>
                Expenses {expenses.length > 0 && `(${expenses.length})`}
              </Text>

              <View style={styles.totalContainer}>
                <View style={styles.totalBox}>
                  <Text style={styles.totalLabel}>Total Spent :</Text>
                  <Text style={styles.totalAmount}>
                    {getCurrencySymbol()}{formatAmount(totalSpent.toString())}
                  </Text>
                </View>
                <View style={styles.timeFilterContainer}>
                  <TouchableOpacity
                    ref={filterButtonRef}
                    style={[
                      styles.timeFilterButton,
                      timeDropdownOpen && styles.timeFilterButtonActive,
                    ]}
                    onPress={() => {
                      if (!timeDropdownOpen) {
                        filterButtonRef.current?.measureInWindow((x, y, width, height) => {
                          setDropdownPosition({
                            top: y + height + 6,
                            right: 20,
                          });
                        });
                      }
                      setTimeDropdownOpen(!timeDropdownOpen);
                    }}
                  >

                    <Text style={styles.timeFilterText}>{selectedLabel}</Text>
                    <Text style={styles.timeFilterArrow}>
                      {timeDropdownOpen ? "▲" : "▼"}
                    </Text>
                  </TouchableOpacity>
                </View>


              </View>
            </View>


            {loadingExpenses ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color="#8B5CF6" />
              </View>
            ) : expenses.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📝</Text>
                <Text style={styles.emptyText}>No expenses yet</Text>
                <Text style={styles.emptySubtext}>
                  Start tracking your expenses to see them here
                </Text>
              </View>
            ) : Platform.OS === "web" && !isMobileWeb ? (
              // Desktop Table View
              <View style={styles.expensesTable}>
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.tableHeader, { flex: 0.12 }]}>Symbol</Text>
                  <Text style={[styles.tableHeader, { flex: 0.18 }]}>Category</Text>
                  <Text style={[styles.tableHeader, { flex: 0.12 }]}>Amount</Text>
                  <Text style={[styles.tableHeader, { flex: 0.25 }]}>Description</Text>
                  <Text style={[styles.tableHeader, { flex: 0.18 }]}>Date</Text>
                  <Text style={[styles.tableHeader, { flex: 0.15 }]}>Actions</Text>
                </View>
                {expenses.map((expense, index) => (
                  <View
                    key={expense.id}
                    style={[
                      styles.tableRow,
                      index % 2 === 0 && styles.tableRowAlt,
                    ]}
                  >
                    <Text style={[styles.tableCell, { flex: 0.12, fontSize: 18 }]}>
                      {getCategorySymbol(expense.category)}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 0.18 }]}>
                      {expense.category}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 0.12, fontWeight: "700", color: "#10B981" }]}>
                      {getCurrencySymbol()}{formatAmount(expense.amount)}
                    </Text>
                    <Text
                      style={[styles.tableCell, { flex: 0.25 }]}
                      numberOfLines={1}
                    >
                      {expense.description || "-"}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 0.18, fontSize: 12, color: MUTED }]}>
                      {formatDate(expense.timestamp)}
                    </Text>
                    <View style={[styles.tableCellActions, { flex: 0.15 }]}>
                      <TouchableOpacity
                        style={[styles.actionIconButton, styles.editIconButton]}
                        onPress={() => openEditExpense(expense)}
                      >
                        <Text style={styles.actionIcon}>✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionIconButton, styles.deleteIconButton]}
                        onPress={() => handleDeleteExpense(expense.id)}
                        disabled={deletingExpenseId === expense.id}
                      >
                        <Text style={styles.actionIcon}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              // Mobile Card View
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginHorizontal: -20, paddingHorizontal: 20 }}
                contentContainerStyle={{ paddingRight: 20 }}
              >
                <View style={{ flexDirection: "row", gap: 12 }}>
                  {expenses.map((expense) => (
                    <View
                      key={expense.id}
                      style={[
                        styles.expenseCard,
                        { minWidth: width - 50 },
                      ]}
                    >
                      <View style={styles.expenseCardHeader}>
                        <Text style={styles.expenseCardSymbol}>
                          {getCategorySymbol(expense.category)}
                        </Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.expenseCardCategory}>
                            {expense.category}
                          </Text>
                          <Text style={styles.expenseCardDate}>
                            {formatDate(expense.timestamp)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.expenseCardBody}>
                        <Text style={styles.expenseCardAmount}>
                          {getCurrencySymbol()}{formatAmount(expense.amount)}
                        </Text>
                        {expense.description && (
                          <Text style={styles.expenseCardDescription}>
                            {expense.description}
                          </Text>
                        )}
                      </View>
                      <View style={styles.expenseCardActions}>
                        <TouchableOpacity
                          style={[styles.expenseCardActionBtn, styles.editBtn]}
                          onPress={() => openEditExpense(expense)}
                        >
                          <Text style={styles.expenseCardActionBtnText}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.expenseCardActionBtn, styles.deleteBtn]}
                          onPress={() => handleDeleteExpense(expense.id)}
                          disabled={deletingExpenseId === expense.id}
                        >
                          <Text style={styles.expenseCardActionBtnText}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Time Filter Dropdown Modal */}
      <Modal
        transparent
        visible={timeDropdownOpen}
        animationType="fade"
        onRequestClose={() => setTimeDropdownOpen(false)}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={() => setTimeDropdownOpen(false)}
        >
          <View
            style={{
              position: "absolute",
              top: dropdownPosition.top,
              right: dropdownPosition.right,
              backgroundColor: CARD,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: BORDER,
              minWidth: 180,
            }}
          >
            {timeOptions.map((option, index) => {
              const isActive = option.value === timeFilter;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.timeFilterOption,
                    isActive && styles.timeFilterOptionActive,
                    index === timeOptions.length - 1 && { borderBottomWidth: 0 },
                  ]}
                  onPress={() => {
                    setTimeFilter(option.value);
                    setTimeDropdownOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.timeFilterOptionText,
                      isActive && styles.timeFilterOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>


      {/* Desktop Left Slide Menu */}
      {Platform.OS === "web" && !isMobileWeb && desktopMenuOpen && (
        <>
          <TouchableOpacity
            style={styles.desktopMenuOverlay}
            onPress={toggleMenu}
          />
          <Animated.View
            style={[
              styles.desktopMenu,
              {
                transform: [
                  {
                    translateX: desktopMenuAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-250, 0], // slide from left
                    }),
                  },
                ],
              },
            ]}
          >
            {[
              { icon: "➕", label: "Add Expense", action: "addExpense" },
              { icon: "🏷️", label: "Add Category", action: "category" },
              { icon: "📊", label: "Analytics", action: "analytics" },
              { icon: "💰", label: "Budget", action: "budget" },
              { icon: "👤", label: "Profile", action: "profile" },
              { icon: "⚙️", label: "Settings", action: "settings" },
              { icon: "📈", label: "Reports", action: "reports" },
            ].map((item) => (
              <TouchableOpacity
                key={item.action}
                style={styles.desktopMenuItem}
                onPress={() => {
                  handleMenuItem(item.action);
                  toggleMenu();
                }}
              >
                <Text style={styles.desktopMenuIcon}>{item.icon}</Text>
                <Text style={styles.desktopMenuText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
        </>
      )}


      {/* Add Expense Modal */}
      <Modal
        visible={showAddExpense}
        transparent={true}
        animationType={Platform.OS === "web" ? "fade" : "none"}
        onRequestClose={closeAddExpense}
      >
        {Platform.OS === "ios" || Platform.OS === "android" ? (
          // Mobile Bottom Sheet
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={closeAddExpense}
            />
            <Animated.View
              style={[
                styles.bottomSheet,
                {
                  transform: [
                    {
                      translateY: slideAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [500, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.bottomSheetHandle}>
                <View style={styles.handle} />
              </View>
              <Text style={styles.modalTitle}>Add Expense</Text>

              <KeyboardAvoidingView behavior="padding">
                <View style={styles.formContainer}>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Amount</Text>
                    <View style={styles.inputWrapper}>
                      <Text style={styles.currencySymbol}>{getCurrencySymbol()}</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="0.00"
                        placeholderTextColor={MUTED}
                        keyboardType="decimal-pad"
                        value={amount}
                        onChangeText={setAmount}
                        editable={!addingExpense}
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Category</Text>
                    <View style={styles.categoryContainer}>
                      {categories.length > 0 ? (
                        categories.map((cat) => (
                          <TouchableOpacity
                            key={cat.id}
                            style={[
                              styles.categoryBadge,
                              category === cat.name && styles.categoryBadgeActive,
                            ]}
                            onPress={() => !addingExpense && setCategory(cat.name)}
                            disabled={addingExpense}
                          >
                            <Text style={styles.categoryBadgeSymbol}>{cat.symbol}</Text>
                            <Text
                              style={[
                                styles.categoryText,
                                category === cat.name &&
                                styles.categoryTextActive,
                              ]}
                            >
                              {cat.name}
                            </Text>
                          </TouchableOpacity>
                        ))
                      ) : (
                        <TouchableOpacity
                          style={styles.addCategoryPrompt}
                          onPress={() => router.push("/add-category")}
                        >
                          <Text style={styles.addCategoryPromptText}>+ Add Categories</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Description (optional)</Text>
                    <TextInput
                      style={[styles.input, styles.descriptionInput]}
                      placeholder="Add a note..."
                      placeholderTextColor={MUTED}
                      value={description}
                      onChangeText={setDescription}
                      multiline
                      editable={!addingExpense}
                    />
                  </View>

                  <View style={styles.buttonGroup}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={closeAddExpense}
                      disabled={addingExpense}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.submitButton, addingExpense && styles.buttonDisabled]}
                      onPress={handleAddExpense}
                      disabled={addingExpense}
                    >
                      {addingExpense ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={styles.submitButtonText}>Add Expense</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </Animated.View>
          </View>
        ) : (
          // Desktop Modal
          <View style={styles.desktopModalOverlay}>
            <View style={styles.desktopModal}>
              <View style={styles.desktopModalHeader}>
                <Text style={styles.modalTitle}>Add Expense</Text>
                <TouchableOpacity onPress={closeAddExpense}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              <KeyboardAvoidingView behavior="padding">
                <View style={styles.formContainer}>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Amount</Text>
                    <View style={styles.inputWrapper}>
                      <Text style={styles.currencySymbol}>{getCurrencySymbol()}</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="0.00"
                        placeholderTextColor={MUTED}
                        keyboardType="decimal-pad"
                        value={amount}
                        onChangeText={setAmount}
                        editable={!addingExpense}
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Category</Text>
                    <View style={styles.categoryContainer}>
                      {categories.length > 0 ? (
                        categories.map((cat) => (
                          <TouchableOpacity
                            key={cat.id}
                            style={[
                              styles.categoryBadge,
                              category === cat.name && styles.categoryBadgeActive,
                            ]}
                            onPress={() => !addingExpense && setCategory(cat.name)}
                            disabled={addingExpense}
                          >
                            <Text style={styles.categoryBadgeSymbol}>{cat.symbol}</Text>
                            <Text
                              style={[
                                styles.categoryText,
                                category === cat.name &&
                                styles.categoryTextActive,
                              ]}
                            >
                              {cat.name}
                            </Text>
                          </TouchableOpacity>
                        ))
                      ) : (
                        <TouchableOpacity
                          style={styles.addCategoryPrompt}
                          onPress={() => router.push("/add-category")}
                        >
                          <Text style={styles.addCategoryPromptText}>+ Add Categories</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Description (optional)</Text>
                    <TextInput
                      style={[styles.input, styles.descriptionInput]}
                      placeholder="Add a note..."
                      placeholderTextColor={MUTED}
                      value={description}
                      onChangeText={setDescription}
                      multiline
                      editable={!addingExpense}
                    />
                  </View>

                  <View style={styles.buttonGroup}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={closeAddExpense}
                      disabled={addingExpense}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.submitButton, addingExpense && styles.buttonDisabled]}
                      onPress={handleAddExpense}
                      disabled={addingExpense}
                    >
                      {addingExpense ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={styles.submitButtonText}>Add Expense</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </View>
          </View>
        )}
      </Modal>

      {/* Edit Expense Modal */}
      <Modal
        visible={showEditExpense}
        transparent={true}
        animationType={Platform.OS === "web" ? "fade" : "none"}
        onRequestClose={closeEditExpense}
      >
        {Platform.OS === "ios" || Platform.OS === "android" ? (
          // Mobile Bottom Sheet
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={closeEditExpense}
            />
            <Animated.View
              style={[
                styles.bottomSheet,
                {
                  transform: [
                    {
                      translateY: slideEditAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [500, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.bottomSheetHandle}>
                <View style={styles.handle} />
              </View>
              <Text style={styles.modalTitle}>Edit Expense</Text>

              <KeyboardAvoidingView behavior="padding">
                <View style={styles.formContainer}>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Amount</Text>
                    <View style={styles.inputWrapper}>
                      <Text style={styles.currencySymbol}>{getCurrencySymbol()}</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="0.00"
                        placeholderTextColor={MUTED}
                        keyboardType="decimal-pad"
                        value={editAmount}
                        onChangeText={setEditAmount}
                        editable={!updatingExpense}
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Category</Text>
                    <View style={styles.categoryContainer}>
                      {categories.length > 0 ? (
                        categories.map((cat) => (
                          <TouchableOpacity
                            key={cat.id}
                            style={[
                              styles.categoryBadge,
                              editCategory === cat.name && styles.categoryBadgeActive,
                            ]}
                            onPress={() => !updatingExpense && setEditCategory(cat.name)}
                            disabled={updatingExpense}
                          >
                            <Text style={styles.categoryBadgeSymbol}>{cat.symbol}</Text>
                            <Text
                              style={[
                                styles.categoryText,
                                editCategory === cat.name &&
                                styles.categoryTextActive,
                              ]}
                            >
                              {cat.name}
                            </Text>
                          </TouchableOpacity>
                        ))
                      ) : (
                        <TouchableOpacity
                          style={styles.addCategoryPrompt}
                          onPress={() => router.push("/add-category")}
                        >
                          <Text style={styles.addCategoryPromptText}>+ Add Categories</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Description (optional)</Text>
                    <TextInput
                      style={[styles.input, styles.descriptionInput]}
                      placeholder="Add a note..."
                      placeholderTextColor={MUTED}
                      value={editDescription}
                      onChangeText={setEditDescription}
                      multiline
                      editable={!updatingExpense}
                    />
                  </View>

                  <View style={styles.buttonGroup}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={closeEditExpense}
                      disabled={updatingExpense}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.submitButton, updatingExpense && styles.buttonDisabled]}
                      onPress={handleUpdateExpense}
                      disabled={updatingExpense}
                    >
                      {updatingExpense ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={styles.submitButtonText}>Update Expense</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </Animated.View>
          </View>
        ) : (
          // Desktop Modal
          <View style={styles.desktopModalOverlay}>
            <View style={styles.desktopModal}>
              <View style={styles.desktopModalHeader}>
                <Text style={styles.modalTitle}>Edit Expense</Text>
                <TouchableOpacity onPress={closeEditExpense}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              <KeyboardAvoidingView behavior="padding">
                <View style={styles.formContainer}>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Amount</Text>
                    <View style={styles.inputWrapper}>
                      <Text style={styles.currencySymbol}>{getCurrencySymbol()}</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="0.00"
                        placeholderTextColor={MUTED}
                        keyboardType="decimal-pad"
                        value={editAmount}
                        onChangeText={setEditAmount}
                        editable={!updatingExpense}
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Category</Text>
                    <View style={styles.categoryContainer}>
                      {categories.length > 0 ? (
                        categories.map((cat) => (
                          <TouchableOpacity
                            key={cat.id}
                            style={[
                              styles.categoryBadge,
                              editCategory === cat.name && styles.categoryBadgeActive,
                            ]}
                            onPress={() => !updatingExpense && setEditCategory(cat.name)}
                            disabled={updatingExpense}
                          >
                            <Text style={styles.categoryBadgeSymbol}>{cat.symbol}</Text>
                            <Text
                              style={[
                                styles.categoryText,
                                editCategory === cat.name &&
                                styles.categoryTextActive,
                              ]}
                            >
                              {cat.name}
                            </Text>
                          </TouchableOpacity>
                        ))
                      ) : (
                        <TouchableOpacity
                          style={styles.addCategoryPrompt}
                          onPress={() => router.push("/add-category")}
                        >
                          <Text style={styles.addCategoryPromptText}>+ Add Categories</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Description (optional)</Text>
                    <TextInput
                      style={[styles.input, styles.descriptionInput]}
                      placeholder="Add a note..."
                      placeholderTextColor={MUTED}
                      value={editDescription}
                      onChangeText={setEditDescription}
                      multiline
                      editable={!updatingExpense}
                    />
                  </View>

                  <View style={styles.buttonGroup}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={closeEditExpense}
                      disabled={updatingExpense}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.submitButton, updatingExpense && styles.buttonDisabled]}
                      onPress={handleUpdateExpense}
                      disabled={updatingExpense}
                    >
                      {updatingExpense ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={styles.submitButtonText}>Update Expense</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </View>
          </View>
        )}
      </Modal>

      <Modal
        visible={budgetModalVisible}
        transparent={true}
        animationType={Platform.OS === "web" ? "fade" : "none"}
        onRequestClose={() => setBudgetModalVisible(false)}
      >
        {Platform.OS === "ios" || Platform.OS === "android" ? (
          // ✅ Mobile Bottom Sheet
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => setBudgetModalVisible(false)}
            />

            <Animated.View style={styles.bottomSheet}>
              <View style={styles.bottomSheetHandle}>
                <View style={styles.handle} />
              </View>

              <Text style={styles.modalTitle}>Set Monthly Budget</Text>

              <KeyboardAvoidingView behavior="padding">
                <View style={styles.formContainer}>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Budget Amount</Text>

                    <View style={styles.inputWrapper}>
                      <Text style={styles.currencySymbol}>
                        {getCurrencySymbol()}
                      </Text>

                      <TextInput
                        style={styles.input}
                        placeholder="0.00"
                        placeholderTextColor={MUTED}
                        keyboardType="decimal-pad"
                        value={budgetInput}
                        onChangeText={setBudgetInput}
                        editable={!savingBudget}
                      />
                    </View>
                  </View>

                  <View style={styles.buttonGroup}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => setBudgetModalVisible(false)}
                      disabled={savingBudget}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.submitButton,
                        savingBudget && styles.buttonDisabled,
                      ]}
                      onPress={handleSaveBudget}
                      disabled={savingBudget}
                    >
                      {savingBudget ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={styles.submitButtonText}>Save Budget</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </Animated.View>
          </View>
        ) : (
          // ✅ Desktop Modal
          <View style={styles.desktopModalOverlay}>
            <View style={styles.desktopModal}>
              <View style={styles.desktopModalHeader}>
                <Text style={styles.modalTitle}>Set Monthly Budget</Text>
                <TouchableOpacity
                  onPress={() => setBudgetModalVisible(false)}
                >
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              <KeyboardAvoidingView behavior="padding">
                <View style={styles.formContainer}>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Budget Amount</Text>

                    <View style={styles.inputWrapper}>
                      <Text style={styles.currencySymbol}>
                        {getCurrencySymbol()}
                      </Text>

                      <TextInput
                        style={styles.input}
                        placeholder="0.00"
                        placeholderTextColor={MUTED}
                        keyboardType="decimal-pad"
                        value={budgetInput}
                        onChangeText={setBudgetInput}
                        editable={!savingBudget}
                      />
                    </View>
                  </View>

                  <View style={styles.buttonGroup}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => setBudgetModalVisible(false)}
                      disabled={savingBudget}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.submitButton,
                        savingBudget && styles.buttonDisabled,
                      ]}
                      onPress={handleSaveBudget}
                      disabled={savingBudget}
                    >
                      {savingBudget ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={styles.submitButtonText}>Save Budget</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </View>
          </View>
        )}
      </Modal>



      {/* Floating Action Button for Mobile & Small Web */}
      {showFloatingButton && (
        <>
          {/* Floating Button */}
          <Animated.View
            style={[
              styles.floatingButton,
              {
                transform: [
                  {
                    translateY: floatingBobAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -8], // subtle floating
                    }),
                  },
                  {
                    rotate: floatingAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", "45deg"], // rotate when menu opens
                    }),
                  },
                  {
                    scale: floatingAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.1], // small pop
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.floatingButtonContent}
              activeOpacity={0.8}
              onPress={toggleMenu}
            >
              <Text style={styles.floatingButtonIcon}>➕</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Floating Menu Items */}
          {showMenu && (
            <View style={styles.floatingMenuWrapper}>
              {[
                { icon: "👤", label: "Profile", action: "profile" },
                { icon: "🏷️", label: "Add Category", action: "category" },
                { icon: "⚙️", label: "Settings", action: "settings" },
                { icon: "📈", label: "Reports", action: "reports" },
              ].map((item, index) => (
                <Animated.View
                  key={item.action}
                  style={[
                    styles.floatingMenuItem,
                    {
                      opacity: floatingAnim,
                      transform: [
                        {
                          translateY: floatingAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [60 + index * 60, 0], // slide up
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.floatingMenuButton}
                    onPress={() => handleMenuItem(item.action)}
                  >
                    <Text style={styles.floatingMenuIcon}>{item.icon}</Text>
                    <Text style={styles.floatingMenuText}>{item.label}</Text>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          )}
        </>
      )}

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
    gap: 12,
  },

  mobileLogoContainer: {
    paddingRight: 8,
  },

  mobileLogo: {
    fontSize: 32,
    fontWeight: "800",
  },

  headerContent: {
    flex: 1,
    justifyContent: "center",
  },

  greeting: {
    fontSize: 24,        // slightly smaller on mobile
    fontWeight: "800",
    color: TEXT,
    marginBottom: 4,
    flexShrink: 1,
  },

  subgreeting: {
    fontSize: 14,
    color: MUTED,
  },

  logoutButton: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 36,
  },

  logoutButtonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 13,
  },

  logoutIcon: {
    fontSize: 20,
    fontWeight: "800",
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
    fontSize: 20,
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

  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "transparent",
  },

  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },

  bottomSheet: {
    backgroundColor: CARD,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 30,
    maxHeight: "80%",
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },

  bottomSheetHandle: {
    alignItems: "center",
    paddingVertical: 12,
  },

  handle: {
    width: 40,
    height: 4,
    backgroundColor: BORDER,
    borderRadius: 2,
  },

  desktopModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },

  desktopModal: {
    backgroundColor: CARD,
    borderRadius: 16,
    width: "90%",
    maxWidth: 500,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
  },

  desktopModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  closeButton: {
    fontSize: 24,
    color: TEXT,
    fontWeight: "600",
    padding: 4,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: TEXT,
    marginBottom: 20,
  },

  formContainer: {
    paddingBottom: 20,
  },

  formGroup: {
    marginBottom: 20,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: TEXT,
    marginBottom: 8,
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BACKGROUND,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
  },

  currencySymbol: {
    fontSize: 18,
    fontWeight: "700",
    color: PRIMARY,
    marginRight: 4,
  },

  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    color: TEXT,
    fontSize: 16,
  },

  descriptionInput: {
    backgroundColor: BACKGROUND,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 80,
    textAlignVertical: "top",
  },

  categoryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: BACKGROUND,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  categoryBadgeActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },

  categoryBadgeSymbol: {
    fontSize: 16,
    fontWeight: "600",
  },

  categoryText: {
    fontSize: 13,
    fontWeight: "600",
    color: MUTED,
  },

  categoryTextActive: {
    color: "#FFF",
  },

  addCategoryPrompt: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: PRIMARY,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
  },

  addCategoryPromptText: {
    fontSize: 13,
    fontWeight: "600",
    color: PRIMARY,
  },

  buttonGroup: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },

  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
  },

  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: MUTED,
  },

  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: PRIMARY,
    alignItems: "center",
  },

  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },

  // Floating Menu Styles
  headerMenuButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },

  menuIcon: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFF",
  },

  floatingMenuContainer: {
    position: "absolute",
    bottom: 100,
    left: 20,
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
    zIndex: 997,
  },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  menuItem_last: {
    borderBottomWidth: 0,
  },

  menuItemIcon: {
    fontSize: 20,
    marginRight: 12,
  },

  menuItemText: {
    fontSize: 14,
    fontWeight: "600",
    color: TEXT,
  },

  floatingButton: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FF6B35",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
    zIndex: 1000,
  },

  floatingButtonContent: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },

  floatingButtonIcon: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFF",
  },

  floatingMenuWrapper: {
    position: "absolute",
    bottom: 100,
    right: 20,
    alignItems: "flex-end",
    zIndex: 999,
  },

  floatingMenuItem: {
    marginBottom: 12,
  },

  floatingMenuButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },

  floatingMenuIcon: {
    fontSize: 20,
    marginRight: 10,
  },

  floatingMenuText: {
    fontSize: 14,
    fontWeight: "600",
    color: TEXT,
  },

  // Currency Changer Styles
  headerRightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  currencyChanger: {
    position: "relative",
  },

  currencyButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 50,
  },

  currencyText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFF",
  },

  currencyDropdown: {
    position: "absolute",
    top: 40,
    right: 0,
    backgroundColor: CARD,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 1001,
    minWidth: 100,
  },

  currencyOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  currencyOptionActive: {
    backgroundColor: "rgba(139, 92, 246, 0.2)",
  },

  currencyOptionText: {
    fontSize: 13,
    fontWeight: "600",
    color: MUTED,
  },

  currencyOptionTextActive: {
    color: PRIMARY,
    fontWeight: "700",
  },

  desktopMenu: {
    position: "fixed",
    top: 0,
    left: 0,
    width: 250,
    height: "100%",
    backgroundColor: CARD,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    paddingTop: 60,
    paddingHorizontal: 16,
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  desktopMenuOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.3)",
    zIndex: 999,
  },

  desktopMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  desktopMenuIcon: {
    fontSize: 20,
    marginRight: 12,
  },

  desktopMenuText: {
    fontSize: 16,
    fontWeight: "600",
    color: TEXT,
  },

  // Expenses Table Styles
  expensesTable: {
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "visible",
    // zIndex: -1,
  },

  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: PRIMARY,
  },

  tableHeader: {
    fontSize: 13,
    fontWeight: "700",
    color: PRIMARY,
  },

  tableRow: {
    flexDirection: "row",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    alignItems: "center",
  },

  tableRowAlt: {
    backgroundColor: "rgba(139, 92, 246, 0.03)",
  },

  tableCell: {
    fontSize: 14,
    color: TEXT,
  },

  // Mobile Expense Card Styles
  expenseCard: {
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: PRIMARY,
  },

  expenseCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  expenseCardSymbol: {
    fontSize: 32,
    marginRight: 12,
  },

  expenseCardCategory: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT,
    marginBottom: 4,
  },

  expenseCardDate: {
    fontSize: 12,
    color: MUTED,
  },

  expenseCardBody: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 12,
  },

  expenseCardAmount: {
    fontSize: 20,
    fontWeight: "800",
    color: "#10B981",
    marginBottom: 8,
  },

  expenseCardDescription: {
    fontSize: 13,
    color: MUTED,
    fontStyle: "italic",
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  // Action Button Styles
  tableCellActions: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },

  actionIconButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },

  editIconButton: {
    backgroundColor: "rgba(59, 130, 246, 0.2)",
  },

  deleteIconButton: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
  },

  expenseCardActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },

  expenseCardActionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
  },

  editBtn: {
    backgroundColor: "rgba(59, 130, 246, 0.2)",
  },

  deleteBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
  },

  expenseCardActionBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: TEXT,
  },

  expensesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 16,
  },

  totalContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
  },

  totalBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",

  },


  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: TEXT,
  },

  totalAmount: {
    fontSize: 22,
    fontWeight: "700",
    color: "#10B981",
  },
  timeFilterContainer: {
    position: "relative",
    minWidth: 160,
    // zIndex: 9999,
    // elevation: 50,
  },


  timeFilterButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  timeFilterButtonActive: {
    borderColor: PRIMARY,
    shadowColor: PRIMARY,
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },

  timeFilterText: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "600",
  },

  timeFilterArrow: {
    color: PRIMARY,
    fontSize: 16,
    fontWeight: "800",
  },

  timeFilterDropdown: {
    position: "absolute",
    top: 55,
    right: 0,
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 50,     // Android
    zIndex: 9999,      // iOS
    minWidth: 180,
  },


  timeFilterOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  timeFilterOptionActive: {
    backgroundColor: "rgba(139, 92, 246, 0.15)",
  },

  timeFilterOptionText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: "600",
  },

  timeFilterOptionTextActive: {
    color: PRIMARY,
    fontWeight: "700",
  },

  setBudgetButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: "#8B5CF6",
    borderRadius: 12,
    alignSelf: "flex-start",
  },

  setBudgetButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },

  modalContainer: {
    width: "90%",
    maxWidth: 400,
    backgroundColor: "#1F2937",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#374151",
  },


  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },

  saveButton: {
    backgroundColor: "#8B5CF6",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },

  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
  },

});

