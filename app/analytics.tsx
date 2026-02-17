import { auth, db } from "@/firebaseConfig";
import { collection, onSnapshot } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
    Animated,
    Easing,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View
} from "react-native";
import { PieChart } from "react-native-chart-kit";



// ─── Types ────────────────────────────────────────────────────────────────────
interface Category {
    id: string;
    name: string;
    symbol: string;
}

interface Expense {
    id: string;
    amount: string;
    category: string;
    timestamp: number;
}

interface CategoryTotal {
    name: string;
    symbol: string;
    total: number;
    color: string;
    percent: string;
    count: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const COLORS = [
    "#8B5CF6", // violet
    "#F472B6", // pink
    "#10B981", // emerald
    "#F59E0B", // amber
    "#3B82F6", // blue
    "#EF4444", // red
    "#06B6D4", // cyan
    "#A78BFA", // light violet
    "#34D399", // light emerald
    "#FBBF24", // yellow
];

const TIME_FILTERS = [
    { label: "7D", value: 7 },
    { label: "30D", value: 30 },
    { label: "90D", value: 90 },
    { label: "All", value: 0 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function filterByDays(expenses: Expense[], days: number): Expense[] {
    if (days === 0) return expenses;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return expenses.filter((e) => e.timestamp >= cutoff);
}

function useCountUp(target: number, duration = 900) {
    const [value, setValue] = useState(0);
    useEffect(() => {
        let start: number | null = null;
        let raf: number;
        const step = (ts: number) => {
            if (!start) start = ts;
            const prog = Math.min((ts - start) / duration, 1);
            const ease = 1 - Math.pow(1 - prog, 3);
            setValue(parseFloat((ease * target).toFixed(2)));
            if (prog < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [target]);
    return value;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Pill-shaped time filter button */
function FilterPill({
    label,
    active,
    onPress,
}: {
    label: string;
    active: boolean;
    onPress: () => void;
}) {
    const scale = useRef(new Animated.Value(1)).current;
    const handlePress = () => {
        Animated.sequence([
            Animated.timing(scale, { toValue: 0.92, duration: 80, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
            Animated.timing(scale, { toValue: 1, duration: 160, useNativeDriver: true, easing: Easing.out(Easing.back(2)) }),
        ]).start();
        onPress();
    };
    return (
        <Pressable onPress={handlePress}>
            <Animated.View style={[styles.filterPill, active && styles.filterPillActive, { transform: [{ scale }] }]}>
                <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>{label}</Text>
            </Animated.View>
        </Pressable>
    );
}

/** Category filter chip */
function CategoryChip({
    label,
    symbol,
    color,
    active,
    onPress,
}: {
    label: string;
    symbol: string;
    color: string;
    active: boolean;
    onPress: () => void;
}) {
    const opacity = useRef(new Animated.Value(active ? 1 : 0.5)).current;
    useEffect(() => {
        Animated.timing(opacity, { toValue: active ? 1 : 0.5, duration: 200, useNativeDriver: true }).start();
    }, [active]);
    return (
        <Pressable onPress={onPress}>
            <Animated.View
                style={[
                    styles.chip,
                    { borderColor: color, opacity },
                    active && { backgroundColor: color + "28" },
                ]}
            >
                <View style={[styles.chipDot, { backgroundColor: color }]} />
                <Text style={styles.chipText}>
                    {symbol} {label}
                </Text>
            </Animated.View>
        </Pressable>
    );
}

/** Animated stat card */
function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
    const fade = useRef(new Animated.Value(0)).current;
    const slide = useRef(new Animated.Value(10)).current;
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(slide, { toValue: 0, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
        ]).start();
    }, []);
    return (
        <Animated.View style={[styles.statCard, { opacity: fade, transform: [{ translateY: slide }] }]}>
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={styles.statValue}>{value}</Text>
            {sub && <Text style={styles.statSub}>{sub}</Text>}
        </Animated.View>
    );
}

/** Progress bar for category row */
function ProgressBar({ percent, color }: { percent: number; color: string }) {
    const width = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(width, {
            toValue: percent,
            duration: 800,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
        }).start();
    }, [percent]);
    return (
        <View style={styles.progressTrack}>
            <Animated.View
                style={[
                    styles.progressFill,
                    {
                        backgroundColor: color,
                        width: width.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] }),
                    },
                ]}
            />
        </View>
    );
}

/** Row for each category breakdown */
function CategoryRow({
    cat,
    index,
    currency,
}: {
    cat: CategoryTotal;
    index: number;
    currency: "USD" | "INR";
}) {
    const fade = useRef(new Animated.Value(0)).current;
    const slide = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fade, {
                toValue: 1,
                duration: 500,
                delay: index * 80,
                useNativeDriver: true,
            }),
            Animated.timing(slide, {
                toValue: 0,
                duration: 500,
                delay: index * 80,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <Animated.View style={[styles.categoryCard, { opacity: fade, transform: [{ translateY: slide }] }]}>
            {/* Accent bar */}
            <View style={[styles.categoryAccent, { backgroundColor: cat.color }]} />

            <View style={styles.categoryCardInner}>
                {/* Top row */}
                <View style={styles.categoryTop}>
                    <View style={styles.categoryLeft}>
                        <View style={[styles.categoryIconBg, { backgroundColor: cat.color + "22" }]}>
                            <Text style={styles.categoryIcon}>{cat.symbol}</Text>
                        </View>
                        <View>
                            <Text style={styles.categoryName}>{cat.name}</Text>
                            <Text style={styles.categoryCount}>{cat.count} transactions</Text>
                        </View>
                    </View>
                    <View style={styles.categoryRight}>
                        <Text style={styles.categoryAmount}>{formatCurrency(cat.total, currency)}</Text>
                        <View style={[styles.percentBadge, { backgroundColor: cat.color + "28" }]}>
                            <Text style={[styles.percentText, { color: cat.color }]}>{cat.percent}%</Text>
                        </View>
                    </View>
                </View>

                {/* Progress bar */}
                <ProgressBar percent={parseFloat(cat.percent)} color={cat.color} />
            </View>
        </Animated.View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
interface AnalyticsScreenProps {
    currency: "USD" | "INR";
}

const EXCHANGE_RATE = 83; // 1 USD = 83 INR

function formatCurrency(value: number, currency: "USD" | "INR") {
    if (currency === "USD") {
        return `$${(value / EXCHANGE_RATE).toFixed(2)}`;
    }
    return `₹${value.toFixed(2)}`;
}


export default function AnalyticsScreen({ currency }: AnalyticsScreenProps) {
    const { width } = useWindowDimensions();
    const isWide = width >= 768;

    const [categories, setCategories] = useState<Category[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeDays, setTimeDays] = useState(30);
    const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set());

    const headerFade = useRef(new Animated.Value(0)).current;




    useEffect(() => {
        Animated.timing(headerFade, { toValue: 1, duration: 700, useNativeDriver: true }).start();
    }, []);

    // Fetch categories
    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;
        const unsub = onSnapshot(collection(db, `users/${user.uid}/categories`), (snap) => {
            const list: Category[] = [];
            snap.forEach((doc) => list.push({ id: doc.id, ...(doc.data() as Omit<Category, "id">) }));
            setCategories(list);
            setActiveCategories(new Set(list.map((c) => c.name)));
        });
        return () => unsub();
    }, []);

    // Fetch expenses
    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;
        const unsub = onSnapshot(collection(db, `users/${user.uid}/expenses`), (snap) => {
            const list: Expense[] = [];
            snap.forEach((doc) => list.push({ id: doc.id, ...(doc.data() as Omit<Expense, "id">) }));
            setExpenses(list);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    // Toggle category filter
    const toggleCategory = (name: string) => {
        setActiveCategories((prev) => {
            const next = new Set(prev);
            if (next.has(name)) {
                if (next.size === 1) return prev; // keep at least one
                next.delete(name);
            } else {
                next.add(name);
            }
            return next;
        });
    };

    // Derived data
    const filteredExpenses = filterByDays(expenses, timeDays);

    const categoryTotals: CategoryTotal[] = categories
        .map((cat, i) => {
            const catExpenses = filteredExpenses.filter((e) => e.category === cat.name);
            const total = catExpenses.reduce((s, e) => s + parseFloat(e.amount), 0);
            return { name: cat.name, symbol: cat.symbol, total, color: COLORS[i % COLORS.length], percent: "0", count: catExpenses.length };
        })
        .filter((c) => c.total > 0);

    const totalSpent = categoryTotals.reduce((s, c) => s + c.total, 0);
    const avgPerDay = timeDays > 0 ? totalSpent / timeDays : 0;
    const txCount = filteredExpenses.length;

    const categoryTotalsWithPercent: CategoryTotal[] = categoryTotals.map((c) => ({
        ...c,
        percent: totalSpent > 0 ? ((c.total / totalSpent) * 100).toFixed(1) : "0",
    }));

    const visibleTotals = categoryTotalsWithPercent.filter((c) => activeCategories.has(c.name));
    const visibleTotal = visibleTotals.reduce((s, c) => s + c.total, 0);

    const chartData = visibleTotals.map((cat) => ({
        name: `${cat.symbol}`,
        population: cat.total,
        color: cat.color,
        legendFontColor: "#94A3B8",
        legendFontSize: 13,
    }));

    const animatedTotal = useCountUp(visibleTotal, 900);

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading Analytics...</Text>
                    <Text style={styles.loadingSubtext}>Crunching your numbers 📊</Text>
                </View>
            </SafeAreaView>
        );
    }

    const chartWidth = isWide ? Math.min(width * 0.5, 560) : width - 32;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={[styles.scroll, isWide && styles.scrollWide]}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Header ── */}
                <Animated.View style={[styles.header, { opacity: headerFade }]}>
                    <View>
                        <Text style={styles.eyebrow}>DASHBOARD</Text>
                        <Text style={styles.title}>Analytics</Text>
                        <Text style={styles.subtitle}>Track where your money flows</Text>
                    </View>
                    <View style={styles.glowOrb} />
                </Animated.View>

                {/* ── Time Filters ── */}
                <View style={styles.filterRow}>
                    {TIME_FILTERS.map((f) => (
                        <FilterPill
                            key={f.value}
                            label={f.label}
                            active={timeDays === f.value}
                            onPress={() => setTimeDays(f.value)}
                        />
                    ))}
                </View>

                {/* ── Stat Cards ── */}
                <View style={[styles.statsRow, isWide && styles.statsRowWide]}>
                    <StatCard
                        label="Total Spent"
                        value={formatCurrency(totalSpent, currency)}
                        sub={timeDays === 0 ? "All time" : `Last ${timeDays} days`}
                    />
                    <StatCard
                        label="Avg / Day"
                        value={formatCurrency(avgPerDay, currency)}
                        sub="Daily average"
                    />

                    <StatCard label="Transactions" value={`${txCount}`} sub="Total count" />

                </View>

                {/* ── Main Layout (wide = side-by-side) ── */}
                <View style={[styles.mainLayout, isWide && styles.mainLayoutWide]}>
                    {/* ── Chart Section ── */}
                    <View style={[styles.chartSection, isWide && styles.chartSectionWide]}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Spending Breakdown</Text>
                            <View style={styles.totalBadge}>
                                <Text style={styles.totalBadgeText}>{formatCurrency(animatedTotal, currency)}</Text>
                            </View>
                        </View>

                        {chartData.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyEmoji}>😅</Text>
                                <Text style={styles.emptyText}>No spending data yet</Text>
                                <Text style={styles.emptySubText}>Start adding expenses to see insights</Text>
                            </View>
                        ) : (
                            <>
                                <PieChart
                                    data={chartData}
                                    width={chartWidth}
                                    height={220}
                                    chartConfig={{
                                        backgroundColor: "transparent",
                                        backgroundGradientFrom: "#0F172A",
                                        backgroundGradientTo: "#0F172A",
                                        color: (opacity = 1) => `rgba(255,255,255,${opacity})`,
                                        labelColor: (opacity = 1) => `rgba(148,163,184,${opacity})`,
                                    }}
                                    accessor="population"
                                    backgroundColor="transparent"
                                    paddingLeft="15"
                                    absolute
                                    hasLegend={false}
                                />
                                {/* Custom legend */}
                                <View style={styles.legend}>
                                    {visibleTotals.map((cat) => (
                                        <View key={cat.name} style={styles.legendItem}>
                                            <View style={[styles.legendDot, { backgroundColor: cat.color }]} />
                                            <Text style={styles.legendLabel}>
                                                {cat.symbol} {cat.name} ({formatCurrency(cat.total, currency)})
                                            </Text>

                                            <Text style={[styles.legendPercent, { color: cat.color }]}>
                                                {cat.percent}%
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </>
                        )}
                    </View>

                    {/* ── Category Filter + List ── */}
                    <View style={[styles.listSection, isWide && styles.listSectionWide]}>
                        {/* Category Filter Chips */}
                        {categoryTotals.length > 0 && (
                            <View>
                                <Text style={styles.sectionTitle}>Filter by Category</Text>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.chipRow}
                                >
                                    {categoryTotalsWithPercent.map((cat, i) => (
                                        <CategoryChip
                                            key={cat.name}
                                            label={cat.name}
                                            symbol={cat.symbol}
                                            color={cat.color}
                                            active={activeCategories.has(cat.name)}
                                            onPress={() => toggleCategory(cat.name)}
                                        />
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        {/* Category breakdown rows */}
                        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Category Details</Text>
                        {visibleTotals.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>Select a category above</Text>
                            </View>
                        ) : (
                            visibleTotals
                                .sort((a, b) => b.total - a.total)
                                .map((cat, i) => <CategoryRow key={cat.name} cat={cat} index={i} currency={currency} />)
                        )}
                    </View>
                </View>

                {/* ── Top Spender Highlight ── */}
                {visibleTotals.length > 0 && (
                    <View style={styles.highlightCard}>
                        <View style={styles.highlightLeft}>
                            <Text style={styles.highlightEyebrow}>🔥 TOP CATEGORY</Text>
                            <Text style={styles.highlightName}>
                                {visibleTotals.sort((a, b) => b.total - a.total)[0].symbol}{" "}
                                {visibleTotals.sort((a, b) => b.total - a.total)[0].name}
                            </Text>
                            <Text style={styles.highlightSub}>
                                {visibleTotals.sort((a, b) => b.total - a.total)[0].percent}% of total spend
                            </Text>
                        </View>
                        <Text style={styles.highlightAmount}>
                            {formatCurrency(visibleTotals.sort((a, b) => b.total - a.total)[0].total, currency)}
                        </Text>
                        <View
                            style={[
                                styles.highlightGlow,
                                { backgroundColor: visibleTotals.sort((a, b) => b.total - a.total)[0].color + "22" },
                            ]}
                        />
                    </View>
                )}

                <View style={{ height: 32 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0B0F1A",
    },
    scroll: {
        padding: 16,
    },
    scrollWide: {
        paddingHorizontal: 32,
        maxWidth: 1200,
        alignSelf: "center",
        width: "100%",
    },

    // Loading
    loadingContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    loadingText: {
        color: "#E2E8F0",
        fontSize: 20,
        fontWeight: "700",
    },
    loadingSubtext: {
        color: "#64748B",
        fontSize: 14,
    },

    // Header
    header: {
        marginBottom: 24,
        position: "relative",
        overflow: "hidden",
    },
    eyebrow: {
        fontSize: 11,
        fontWeight: "800",
        color: "#8B5CF6",
        letterSpacing: 3,
        marginBottom: 4,
    },
    title: {
        fontSize: 36,
        fontWeight: "900",
        color: "#F1F5F9",
        letterSpacing: -1,
        lineHeight: 40,
    },
    subtitle: {
        fontSize: 14,
        color: "#64748B",
        marginTop: 4,
        fontWeight: "500",
    },
    glowOrb: {
        position: "absolute",
        right: -60,
        top: -40,
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: "#8B5CF6",
        opacity: 0.07,
    },

    // Time filters
    filterRow: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 20,
    },
    filterPill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 100,
        backgroundColor: "#1E293B",
        borderWidth: 1,
        borderColor: "#334155",
    },
    filterPillActive: {
        backgroundColor: "#8B5CF6",
        borderColor: "#8B5CF6",
    },
    filterPillText: {
        color: "#64748B",
        fontWeight: "700",
        fontSize: 13,
    },
    filterPillTextActive: {
        color: "#FFF",
    },

    // Stat cards
    statsRow: {
        flexDirection: "column",
        gap: 10,
        marginBottom: 24,
    },
    statsRowWide: {
        flexDirection: "row",
    },
    statCard: {
        flex: 1,
        backgroundColor: "#131929",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "#1E293B",
    },
    statLabel: {
        fontSize: 11,
        fontWeight: "700",
        color: "#475569",
        letterSpacing: 1.5,
        textTransform: "uppercase",
        marginBottom: 6,
    },
    statValue: {
        fontSize: 26,
        fontWeight: "900",
        color: "#F1F5F9",
        letterSpacing: -0.5,
    },
    statSub: {
        fontSize: 12,
        color: "#475569",
        marginTop: 4,
    },

    // Main layout
    mainLayout: {
        flexDirection: "column",
        gap: 24,
    },
    mainLayoutWide: {
        flexDirection: "row",
        alignItems: "flex-start",
    },

    // Chart
    chartSection: {
        backgroundColor: "#131929",
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: "#1E293B",
    },
    chartSectionWide: {
        flex: 1,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: "800",
        color: "#CBD5E1",
        letterSpacing: 0.2,
        marginBottom: 12,
    },
    totalBadge: {
        backgroundColor: "#1E293B",
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 100,
    },
    totalBadgeText: {
        color: "#8B5CF6",
        fontWeight: "700",
        fontSize: 13,
    },

    // Legend
    legend: {
        marginTop: 12,
        gap: 8,
    },
    legendItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    legendLabel: {
        flex: 1,
        fontSize: 13,
        color: "#94A3B8",
        fontWeight: "500",
    },
    legendPercent: {
        fontSize: 13,
        fontWeight: "700",
    },

    // List section
    listSection: {
        flex: 1,
    },
    listSectionWide: {
        flex: 1.2,
    },

    // Category chips
    chipRow: {
        flexDirection: "row",
        gap: 8,
        paddingBottom: 4,
    },
    chip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 100,
        borderWidth: 1.5,
        backgroundColor: "transparent",
    },
    chipDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    chipText: {
        fontSize: 12,
        color: "#CBD5E1",
        fontWeight: "600",
    },

    // Category cards
    categoryCard: {
        flexDirection: "row",
        backgroundColor: "#131929",
        borderRadius: 16,
        marginBottom: 10,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#1E293B",
    },
    categoryAccent: {
        width: 4,
    },
    categoryCardInner: {
        flex: 1,
        padding: 14,
        gap: 10,
    },
    categoryTop: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    categoryLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    categoryIconBg: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    categoryIcon: {
        fontSize: 20,
    },
    categoryName: {
        fontSize: 15,
        fontWeight: "700",
        color: "#E2E8F0",
    },
    categoryCount: {
        fontSize: 11,
        color: "#475569",
        fontWeight: "500",
        marginTop: 1,
    },
    categoryRight: {
        alignItems: "flex-end",
        gap: 4,
    },
    categoryAmount: {
        fontSize: 17,
        fontWeight: "800",
        color: "#F1F5F9",
        letterSpacing: -0.3,
    },
    percentBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 100,
    },
    percentText: {
        fontSize: 11,
        fontWeight: "700",
    },

    // Progress bar
    progressTrack: {
        height: 4,
        backgroundColor: "#1E293B",
        borderRadius: 2,
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        borderRadius: 2,
    },

    // Highlight card
    highlightCard: {
        marginTop: 24,
        backgroundColor: "#131929",
        borderRadius: 20,
        padding: 20,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderWidth: 1,
        borderColor: "#1E293B",
        overflow: "hidden",
        position: "relative",
    },
    highlightLeft: {
        gap: 4,
    },
    highlightEyebrow: {
        fontSize: 10,
        fontWeight: "800",
        color: "#F59E0B",
        letterSpacing: 1.5,
    },
    highlightName: {
        fontSize: 20,
        fontWeight: "900",
        color: "#F1F5F9",
    },
    highlightSub: {
        fontSize: 13,
        color: "#64748B",
        fontWeight: "500",
    },
    highlightAmount: {
        fontSize: 28,
        fontWeight: "900",
        color: "#F1F5F9",
        letterSpacing: -1,
    },
    highlightGlow: {
        position: "absolute",
        right: -40,
        top: -40,
        width: 200,
        height: 200,
        borderRadius: 100,
    },

    // Empty state
    emptyState: {
        alignItems: "center",
        paddingVertical: 40,
        gap: 8,
    },
    emptyEmoji: {
        fontSize: 40,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#475569",
    },
    emptySubText: {
        fontSize: 13,
        color: "#334155",
        textAlign: "center",
    },
});