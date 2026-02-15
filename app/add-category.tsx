import { auth, db } from "@/firebaseConfig";
import { useRouter } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    updateDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";

interface Category {
    id: string;
    name: string;
    symbol: string;
    userId: string;
    createdAt: number;
}

/* =========================
   🎨 THEME (Matches Tracker)
========================= */

const PRIMARY = "#8B5CF6";
const BACKGROUND = "#0A0E1A";
const CARD = "#12172A";
const BORDER = "#1F2937";
const TEXT = "#F8FAFC";
const MUTED = "#94A3B8";
const DANGER = "#EF4444";

const CATEGORY_SYMBOLS = [
    "🍔", "🚗", "🏠", "🎬", "💊", "📚", "✈️", "🎮", "⚽", "🎵",
    "🛍️", "💄", "🌱", "⚡", "📱", "🎓", "🏋️", "🍕", "☕", "🎨",
    "🔧", "🌟", "🎁", "🚀",
];

export default function AddCategoryScreen() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === "web" && width >= 768;

    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState("");
    const [adding, setAdding] = useState(false);

    /* =========================
       🔐 AUTH
    ========================= */

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (!currentUser) {
                router.replace("/login");
            } else {
                setUser(currentUser);
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    /* =========================
       📂 FETCH CATEGORIES
    ========================= */

    useEffect(() => {
        if (!user) return;

        const unsubscribe = onSnapshot(
            collection(db, `users/${user.uid}/categories`),
            (snapshot) => {
                const list: Category[] = [];
                snapshot.forEach((doc) => {
                    list.push({
                        id: doc.id,
                        ...(doc.data() as Omit<Category, "id">),
                    });
                });
                setCategories(list.sort((a, b) => b.createdAt - a.createdAt));
            }
        );

        return () => unsubscribe();
    }, [user]);

    const getRandomSymbol = () =>
        CATEGORY_SYMBOLS[Math.floor(Math.random() * CATEGORY_SYMBOLS.length)];

    /* =========================
       ➕ ADD CATEGORY
    ========================= */

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) {
            Alert.alert("Error", "Please enter a category name");
            return;
        }

        if (!user) return;

        setAdding(true);
        try {
            await addDoc(collection(db, `users/${user.uid}/categories`), {
                name: newCategoryName.trim(),
                symbol: getRandomSymbol(),
                userId: user.uid,
                createdAt: Date.now(),
            });
            setNewCategoryName("");
        } catch (error) {
            Alert.alert("Error", "Failed to add category");
        } finally {
            setAdding(false);
        }
    };

    const handleEditCategory = async (id: string) => {
        if (!editingName.trim() || !user) return;

        setAdding(true);
        try {
            await updateDoc(doc(db, `users/${user.uid}/categories`, id), {
                name: editingName.trim(),
            });
            setEditingId(null);
            setEditingName("");
        } finally {
            setAdding(false);
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (!user) return;

        Alert.alert("Delete Category", "Are you sure?", [
            { text: "Cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    await deleteDoc(doc(db, `users/${user.uid}/categories`, id));
                },
            },
        ]);
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <ActivityIndicator size="large" color={PRIMARY} />
            </SafeAreaView>
        );
    }

    /* =========================
       📱 RENDER
    ========================= */

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
                <ScrollView contentContainerStyle={styles.container}>

                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()}>
                            <Text style={styles.backButton}>← Back</Text>
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Manage Categories</Text>
                        <View style={{ width: 60 }} />
                    </View>

                    {/* Add Category Card */}
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Add New Category</Text>

                        <View style={styles.inputRow}>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter category name"
                                placeholderTextColor={MUTED}
                                value={newCategoryName}
                                onChangeText={setNewCategoryName}
                            />
                            <TouchableOpacity
                                style={styles.primaryButton}
                                onPress={handleAddCategory}
                                disabled={adding}
                            >
                                {adding ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Text style={styles.primaryButtonText}>Add</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Category List */}
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>
                            Your Categories ({categories.length})
                        </Text>

                        {categories.length === 0 ? (
                            <Text style={styles.emptyText}>
                                No categories yet. Create your first one.
                            </Text>
                        ) : (
                            categories.map((category) => (
                                <View key={category.id} style={styles.categoryRow}>

                                    <View style={styles.symbolCircle}>
                                        <Text style={styles.symbol}>{category.symbol}</Text>
                                    </View>

                                    {editingId === category.id ? (
                                        <TextInput
                                            style={[styles.input, { flex: 1 }]}
                                            value={editingName}
                                            onChangeText={setEditingName}
                                            placeholderTextColor={MUTED}
                                        />
                                    ) : (
                                        <Text style={styles.categoryName}>
                                            {category.name}
                                        </Text>
                                    )}

                                    {editingId === category.id ? (
                                        <>
                                            <TouchableOpacity
                                                style={styles.smallPrimary}
                                                onPress={() => handleEditCategory(category.id)}
                                            >
                                                <Text style={styles.smallPrimaryText}>Save</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.smallOutline}
                                                onPress={() => setEditingId(null)}
                                            >
                                                <Text style={styles.smallOutlineText}>Cancel</Text>
                                            </TouchableOpacity>
                                        </>
                                    ) : (
                                        <>
                                            <TouchableOpacity
                                                style={styles.smallOutline}
                                                onPress={() => {
                                                    setEditingId(category.id);
                                                    setEditingName(category.name);
                                                }}
                                            >
                                                <Text style={styles.smallOutlineText}>Edit</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.smallDanger}
                                                onPress={() => handleDeleteCategory(category.id)}
                                            >
                                                <Text style={styles.smallDangerText}>Delete</Text>
                                            </TouchableOpacity>
                                        </>
                                    )}
                                </View>
                            ))
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

/* =========================
   🎨 STYLES
========================= */

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: BACKGROUND,
    },

    container: {
        padding: 20,
        paddingBottom: 40,
    },

    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 30,
    },

    backButton: {
        color: PRIMARY,
        fontWeight: "600",
    },

    headerTitle: {
        fontSize: 22,
        fontWeight: "800",
        color: TEXT,
    },

    card: {
        backgroundColor: CARD,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: BORDER,
        padding: 20,
        marginBottom: 24,
    },

    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: TEXT,
        marginBottom: 16,
    },

    inputRow: {
        flexDirection: "row",
        gap: 12,
    },

    input: {
        flex: 1,
        backgroundColor: BACKGROUND,
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 14,
        color: TEXT,
    },

    primaryButton: {
        backgroundColor: PRIMARY,
        paddingHorizontal: 20,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
    },

    primaryButtonText: {
        color: "#FFF",
        fontWeight: "600",
    },

    emptyText: {
        color: MUTED,
        textAlign: "center",
        paddingVertical: 20,
    },

    categoryRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 14,
        gap: 10,
    },

    symbolCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(139,92,246,0.1)",
        justifyContent: "center",
        alignItems: "center",
    },

    symbol: {
        fontSize: 20,
    },

    categoryName: {
        flex: 1,
        fontSize: 15,
        color: TEXT,
        fontWeight: "600",
    },

    smallPrimary: {
        backgroundColor: PRIMARY,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
    },

    smallPrimaryText: {
        color: "#FFF",
        fontSize: 12,
        fontWeight: "600",
    },

    smallOutline: {
        borderWidth: 1,
        borderColor: BORDER,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
    },

    smallOutlineText: {
        color: TEXT,
        fontSize: 12,
        fontWeight: "600",
    },

    smallDanger: {
        borderWidth: 1,
        borderColor: DANGER,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
    },

    smallDangerText: {
        color: DANGER,
        fontSize: 12,
        fontWeight: "600",
    },
});
