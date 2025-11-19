import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
} from 'react-native';
import { Plus } from 'lucide-react-native';
import AddInventoryItemDialog from '../components/AddInventoryItemDialog';
import InventoryStorage from '../utils/InventoryStorage';
import { Colors, Spacing, BorderRadius } from '../styles/Theme';

const InventoryScreen = ({ navigation }) => {
    const [inventory, setInventory] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [refreshing, setRefreshing] = useState(false);
    const [showAddDialog, setShowAddDialog] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const items = await InventoryStorage.loadInventory();
        setInventory(items || []);
        const cats = await InventoryStorage.loadCategories();
        setCategories(['All', ...(cats || [])]);
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadData().finally(() => setRefreshing(false));
    }, []);

    const filteredInventory = selectedCategory === 'All'
        ? inventory
        : inventory.filter(i => i.category === selectedCategory);

    const handleItemAdded = () => {
        loadData();
    };

    const handleDeleteItem = async (item) => {
        // simple long‑press delete (optional)
        await InventoryStorage.deleteItem(item.id);
        loadData();
    };

    const renderItem = ({ item }) => {
        return (
            <TouchableOpacity
                style={styles.gridCard}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('EditInventoryItem', { item })}
                onLongPress={() => handleDeleteItem(item)}
            >
                <Text numberOfLines={2} style={styles.gridName}>{item.name}</Text>

                <View style={styles.gridRow}>
                    <Text style={styles.gridLabel}>Qty</Text>
                    <Text style={styles.gridValue}>{item.quantity}</Text>
                </View>
                <View style={styles.gridRow}>
                    <Text style={styles.gridLabel}>Price</Text>
                    <Text style={styles.gridValue}>Ksh {item.unitPrice}</Text>
                </View>

                <View style={styles.gridFooter}>
                    <Text style={styles.gridCategory}>{item.category}</Text>
                    {item.expiryDate && (
                        <Text style={styles.gridExpiry}>
                            {new Date(item.expiryDate).toLocaleDateString()}
                        </Text>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const renderEmpty = () => (
        <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No items</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header / Add button */}
            <View style={styles.header}>
                <Text style={styles.title}>Inventory</Text>
                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => setShowAddDialog(true)}
                >
                    <Plus size={20} color={Colors.surface} />
                </TouchableOpacity>
            </View>

            {/* Category chips (larger) */}
            <View style={styles.filterContainer}>
                <FlatList
                    horizontal
                    data={categories}
                    keyExtractor={(c) => c}
                    showsHorizontalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[
                                styles.filterChipLarge,
                                selectedCategory === item && styles.filterChipLargeActive,
                            ]}
                            onPress={() => setSelectedCategory(item)}
                        >
                            <Text
                                style={[
                                    styles.filterTextLarge,
                                    selectedCategory === item && styles.filterTextLargeActive,
                                ]}
                            >
                                {item}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            {/* Grid list */}
            <FlatList
                data={filteredInventory}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                numColumns={2}
                columnWrapperStyle={styles.columnWrapper}
                contentContainerStyle={styles.gridContainer}
                ListEmptyComponent={renderEmpty}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[Colors.primary]}
                    />
                }
            />

            <AddInventoryItemDialog
                visible={showAddDialog}
                onClose={() => setShowAddDialog(false)}
                onItemAdded={handleItemAdded}
            />
        </View>
    );
};

// Styles
const CARD_MIN_HEIGHT = 118;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.sm,
        justifyContent: 'space-between',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.text,
    },
    addBtn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: BorderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterContainer: {
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.xs,
    },
    filterChipLarge: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: 26,
        backgroundColor: Colors.surface,
        marginRight: Spacing.xs,
        borderWidth: 1,
        borderColor: Colors.border,
        minHeight: 42,
        justifyContent: 'center',
    },
    filterChipLargeActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    filterTextLarge: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        letterSpacing: 0.3,
    },
    filterTextLargeActive: {
        color: Colors.surface,
    },
    gridContainer: {
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.lg,
    },
    columnWrapper: {
        justifyContent: 'space-between',
        marginBottom: Spacing.sm,
    },
    gridCard: {
        flexBasis: '48%',
        backgroundColor: '#d9f7d9ff',
        borderRadius: BorderRadius.md,
        padding: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
        minHeight: CARD_MIN_HEIGHT,
    },
    gridName: {
        fontSize: 20.5,
        fontWeight: '700',
        color: Colors.text,
        lineHeight: 17,
        marginBottom: 4,
    },
    gridRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 2,
    },
    gridLabel: {
        fontSize: 13,
        color: Colors.textSecondary,
        fontWeight: '500',
    },
    gridValue: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
    gridFooter: {
        marginTop: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    gridCategory: {
        fontSize: 10.5,
        fontWeight: '600',
        color: Colors.primary,
    },
    gridExpiry: {
        fontSize: 10,
        color: Colors.textSecondary,
    },
    emptyBox: {
        paddingTop: Spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
});

export default InventoryScreen;