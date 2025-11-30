import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
    TextInput,
    Animated,
    StatusBar,
} from 'react-native';
import { Plus, Search, X, Package, TrendingDown, Calendar, AlertTriangle } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import AddInventoryItemDialog from '../components/AddInventoryItemDialog';
import InventoryStorage from '../utils/InventoryStorage';
import NotificationService from '../services/NotificationService';
import { Colors, Spacing, BorderRadius } from '../styles/Theme';

const InventoryScreen = ({ navigation, route }) => {
    const [inventory, setInventory] = useState([]);
    const [categories, setCategories] = useState(['All']);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [refreshing, setRefreshing] = useState(false);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [searchExpanded, setSearchExpanded] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchWidth] = useState(new Animated.Value(40));

    useFocusEffect(
        useCallback(() => {
            console.log('📦 InventoryScreen focused - reloading data');
            loadAll();
        }, [])
    );

    const loadAll = async () => {
        try {
            const items = await InventoryStorage.loadInventory();
            setInventory(items);

            const catList = await InventoryStorage.loadCategories();
            if (catList && catList.length) {
                setCategories(['All', ...catList]);
            }

            // Check for low stock and expiry alerts
            await NotificationService.checkInventoryAlerts();
        } catch (e) {
            console.error('❌ Inventory load error', e);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadAll().finally(() => setRefreshing(false));
    }, []);

    const toggleSearch = () => {
        if (searchExpanded) {
            Animated.timing(searchWidth, {
                toValue: 40,
                duration: 300,
                useNativeDriver: false,
            }).start(() => {
                setSearchExpanded(false);
                setSearchQuery('');
            });
        } else {
            setSearchExpanded(true);
            Animated.timing(searchWidth, {
                toValue: 250,
                duration: 300,
                useNativeDriver: false,
            }).start();
        }
    };

    const filteredInventory = inventory.filter(item => {
        const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
        const matchesSearch = !searchQuery ||
            item.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const handleItemAdded = () => {
        loadAll();
    };

    const handleDeleteItem = async (item) => {
        await InventoryStorage.deleteItem(item.id);
        loadAll();
    };

    // Helper functions for item status
    const isLowStock = (item) => {
        return item.quantity <= (item.lowStockThreshold || 5);
    };

    const isExpiringSoon = (item) => {
        if (!item.expiryDate) return false;
        const daysUntilExpiry = Math.ceil((new Date(item.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
        return daysUntilExpiry <= 7 && daysUntilExpiry >= 0;
    };

    const isExpired = (item) => {
        if (!item.expiryDate) return false;
        return new Date(item.expiryDate) < new Date();
    };

    const getStockStatus = (item) => {
        if (isExpired(item)) return 'expired';
        if (isExpiringSoon(item)) return 'expiring';
        if (isLowStock(item)) return 'low';
        return 'good';
    };

    const renderAddCard = () => (
        <TouchableOpacity
            style={[styles.gridCard, styles.addCard]}
            activeOpacity={0.85}
            onPress={() => setShowAddDialog(true)}
        >
            <View style={styles.addCardContent}>
                <View style={styles.addIconCircle}>
                    <Plus size={28} color={Colors.primary} strokeWidth={2.5} />
                </View>
                <Text style={styles.addCardText}>Add Item</Text>
                <Text style={styles.addCardSubtext}>Track new stock</Text>
            </View>
        </TouchableOpacity>
    );

    const renderGridItem = ({ item, index }) => {
        if (index === 0) {
            return renderAddCard();
        }

        const actualItem = filteredInventory[index - 1];
        const status = getStockStatus(actualItem);

        // Determine card color based on status
        let cardColor = '#FFFFFF'; // Default white
        let borderColor = Colors.border;

        if (status === 'expired') {
            cardColor = '#FEE2E2'; // Light red
            borderColor = '#FCA5A5';
        } else if (status === 'expiring') {
            cardColor = '#FEF3C7'; // Light yellow
            borderColor = '#FCD34D';
        } else if (status === 'low') {
            cardColor = '#FFEDD5'; // Light orange
            borderColor = '#FDBA74';
        }

        return (
            <TouchableOpacity
                style={[styles.gridCard, { backgroundColor: cardColor, borderColor }]}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('EditInventoryItem', { item: actualItem })}
                onLongPress={() => handleDeleteItem(actualItem)}
            >
                {/* Status Badge */}
                {status !== 'good' && (
                    <View style={[
                        styles.statusBadge,
                        status === 'expired' && styles.expiredBadge,
                        status === 'expiring' && styles.expiringBadge,
                        status === 'low' && styles.lowBadge,
                    ]}>
                        {status === 'low' && <TrendingDown size={10} color="#FFFFFF" />}
                        {(status === 'expiring' || status === 'expired') && <Calendar size={10} color="#FFFFFF" />}
                    </View>
                )}

                {/* Item Icon */}
      

                {/* Item Name */}
                <Text numberOfLines={2} style={styles.gridName}>{actualItem.name}</Text>

                {/* Quantity with visual indicator */}
                <View style={styles.quantitySection}>
                    <View style={styles.quantityBar}>
                        <View
                            style={[
                                styles.quantityFill,
                                {
                                    width: `${Math.min((actualItem.quantity / (actualItem.lowStockThreshold * 3)) * 100, 100)}%`,
                                    backgroundColor: status === 'low' ? '#F97316' : Colors.success
                                }
                            ]}
                        />
                    </View>
                    <View style={styles.quantityRow}>
                        <Text style={styles.quantityLabel}>Stock:</Text>
                        <Text style={[
                            styles.quantityValue,
                            status === 'low' && { color: '#F97316' }
                        ]}>
                            {actualItem.quantity} units
                        </Text>
                    </View>
                </View>

                {/* Price */}
                <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Price:</Text>
                    <Text style={styles.priceValue}>Ksh {actualItem.unitPrice.toLocaleString()}</Text>
                </View>

                {/* Footer with category and expiry */}
                <View style={styles.gridFooter}>
                    <View style={styles.categoryBadge}>
                        <Text style={styles.categoryText}>{actualItem.category}</Text>
                    </View>
                    {actualItem.expiryDate && (
                        <Text style={[
                            styles.gridExpiry,
                            (status === 'expiring' || status === 'expired') && { color: '#DC2626', fontWeight: '600' }
                        ]}>
                            {new Date(actualItem.expiryDate).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short'
                            })}
                        </Text>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            {renderAddCard()}
            <Text style={styles.emptyText}>No inventory items yet</Text>
            <Text style={styles.emptySubtext}>Add your first item to start tracking stock</Text>
        </View>
    );

    // Summary stats
    const totalItems = inventory.length;
    const lowStockCount = inventory.filter(item => isLowStock(item)).length;
    const expiringCount = inventory.filter(item => isExpiringSoon(item) || isExpired(item)).length;

    const gridData = [{ id: '__add_card__' }, ...filteredInventory];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={styles.title}>Inventory</Text>
                    <Text style={styles.subtitle}>{totalItems} items in stock</Text>
                </View>

                <Animated.View style={[styles.searchContainer, { width: searchWidth }]}>
                    {searchExpanded ? (
                        <>
                            <Search size={18} color={Colors.textSecondary} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search items..."
                                placeholderTextColor={Colors.textLight}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoFocus
                            />
                            <TouchableOpacity onPress={toggleSearch}>
                                <X size={18} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        </>
                    ) : (
                        <TouchableOpacity style={styles.searchBtn} onPress={toggleSearch}>
                            <Search size={20} color={Colors.primary} />
                        </TouchableOpacity>
                    )}
                </Animated.View>
            </View>

            {/* Alert Badges (if any issues) */}
            {(lowStockCount > 0 || expiringCount > 0) && (
                <View style={styles.alertsContainer}>
                    {lowStockCount > 0 && (
                        <View style={styles.alertBadge}>
                            <TrendingDown size={14} color="#F97316" />
                            <Text style={styles.alertText}>{lowStockCount} low stock</Text>
                        </View>
                    )}
                    {expiringCount > 0 && (
                        <View style={[styles.alertBadge, { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' }]}>
                            <AlertTriangle size={14} color="#F59E0B" />
                            <Text style={[styles.alertText, { color: '#F59E0B' }]}>{expiringCount} expiring</Text>
                        </View>
                    )}
                </View>
            )}

            {/* Category chips */}
            <View style={styles.filterContainer}>
                <FlatList
                    horizontal
                    data={categories}
                    keyExtractor={(c) => c}
                    showsHorizontalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[
                                styles.filterChip,
                                selectedCategory === item && styles.filterChipActive,
                            ]}
                            onPress={() => setSelectedCategory(item)}
                        >
                            <Text
                                style={[
                                    styles.filterText,
                                    selectedCategory === item && styles.filterTextActive,
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
                data={gridData}
                keyExtractor={(item, idx) => item.id || idx.toString()}
                renderItem={renderGridItem}
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
        paddingBottom: Spacing.md,
        justifyContent: 'space-between',
        backgroundColor: Colors.primary,
    },
    headerLeft: {
        flex: 1,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.surface,
    },
    subtitle: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 2,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.sm,
        gap: Spacing.xs,
        height: 40,
        overflow: 'hidden',
    },
    searchBtn: {
        width: 25,
        height: 40,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: Colors.text,
        padding: 0,
    },
    alertsContainer: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        gap: Spacing.xs,
        backgroundColor: Colors.background,
    },
    alertBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#FFEDD5',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#FDBA74',
    },
    alertText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#F97316',
    },
    filterContainer: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        backgroundColor: Colors.background,
    },
    filterChip: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: 20,
        backgroundColor: Colors.surface,
        marginRight: Spacing.xs,
        borderWidth: 1,
        borderColor: Colors.border,
        minHeight: 36,
        justifyContent: 'center',
    },
    filterChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    filterText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.text,
    },
    filterTextActive: {
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
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        borderWidth: 1.5,
        borderColor: Colors.border,
        minHeight: 180,
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    addCard: {
        backgroundColor: Colors.surface,
        borderStyle: 'dashed',
        borderWidth: 2,
        borderColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addCardContent: {
        alignItems: 'center',
        gap: Spacing.xs,
    },
    addIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    addCardText: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.primary,
    },
    addCardSubtext: {
        fontSize: 11,
        color: Colors.textSecondary,
    },
    statusBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    lowBadge: {
        backgroundColor: '#F97316',
    },
    expiringBadge: {
        backgroundColor: '#F59E0B',
    },
    expiredBadge: {
        backgroundColor: '#DC2626',
    },
  /*   itemIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: Colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    }, */
    gridName: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
        lineHeight: 20,
        marginBottom: Spacing.sm,
        minHeight: 40,
    },
    quantitySection: {
        marginBottom: Spacing.sm,
    },
    quantityBar: {
        height: 4,
        backgroundColor: '#E5E7EB',
        borderRadius: 2,
        marginBottom: 4,
        overflow: 'hidden',
    },
    quantityFill: {
        height: '100%',
        borderRadius: 2,
    },
    quantityRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    quantityLabel: {
        fontSize: 11,
        color: Colors.textSecondary,
        fontWeight: '500',
    },
    quantityValue: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.text,
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    priceLabel: {
        fontSize: 11,
        color: Colors.textSecondary,
        fontWeight: '500',
    },
    priceValue: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.primary,
    },
    gridFooter: {
        marginTop: 'auto',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: Spacing.xs,
        borderTopWidth: 1,
        borderTopColor: Colors.borderLight,
    },
    categoryBadge: {
        backgroundColor: Colors.primary + '15',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    categoryText: {
        fontSize: 10,
        fontWeight: '700',
        color: Colors.primary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    gridExpiry: {
        fontSize: 10,
        color: Colors.textSecondary,
        fontWeight: '500',
    },
    emptyContainer: {
        paddingTop: Spacing.xl,
        alignItems: 'center',
        gap: Spacing.md,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
        marginTop: Spacing.md,
    },
    emptySubtext: {
        fontSize: 13,
        color: Colors.textSecondary,
        textAlign: 'center',
    },
});

export default InventoryScreen;