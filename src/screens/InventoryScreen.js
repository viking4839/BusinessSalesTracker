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
import { Plus, Search, X } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import AddInventoryItemDialog from '../components/AddInventoryItemDialog';
import InventoryStorage from '../utils/InventoryStorage';
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
            console.log('📍 InventoryScreen focused - reloading data');
            loadAll();
        }, [])
    );

    const loadAll = async () => {
        try {
            console.log('🔄 Loading inventory from storage...');
            const items = await InventoryStorage.loadInventory();
            console.log('✅ Loaded items:', items.length, items);
            setInventory(items || []);

            const catList = await InventoryStorage.loadCategories();
            if (catList && catList.length) {
                setCategories(['All', ...catList]);
            }
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

    const renderAddCard = () => (
        <TouchableOpacity
            style={[styles.gridCard, styles.addCard]}
            activeOpacity={0.85}
            onPress={() => setShowAddDialog(true)}
        >
            <View style={styles.addCardContent}>
                <View style={styles.addIconCircle}>
                    <Plus size={32} color={Colors.primary} strokeWidth={2.5} />
                </View>
                <Text style={styles.addCardText}>Add Stock</Text>
            </View>
        </TouchableOpacity>
    );

    const renderGridItem = ({ item, index }) => {
        if (index === 0) {
            return renderAddCard();
        }

        const actualItem = filteredInventory[index - 1];
        
        return (
            <TouchableOpacity
                style={styles.gridCard}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('EditInventoryItem', { item: actualItem })}
                onLongPress={() => handleDeleteItem(actualItem)}
            >
                <Text numberOfLines={2} style={styles.gridName}>{actualItem.name}</Text>

                <View style={styles.gridRow}>
                    <Text style={styles.gridLabel}>Qty</Text>
                    <Text style={styles.gridValue}>{actualItem.quantity}</Text>
                </View>
                <View style={styles.gridRow}>
                    <Text style={styles.gridLabel}>Price</Text>
                    <Text style={styles.gridValue}>Ksh {actualItem.unitPrice}</Text>
                </View>

                <View style={styles.gridFooter}>
                    <Text style={styles.gridCategory}>{actualItem.category}</Text>
                    {actualItem.expiryDate && (
                        <Text style={styles.gridExpiry}>
                            {new Date(actualItem.expiryDate).toLocaleDateString()}
                        </Text>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            {renderAddCard()}
            <Text style={styles.emptyText}>No items yet</Text>
            <Text style={styles.emptySubtext}>Tap "Add Stock" to get started</Text>
        </View>
    );

    const gridData = [{ id: '__add_card__' }, ...filteredInventory];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

            {/* Themed Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Inventory</Text>
                
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
        paddingBottom: Spacing.md,
        justifyContent: 'space-between',
        backgroundColor: Colors.primary,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: Colors.surface,
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
    filterContainer: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        backgroundColor: Colors.background,
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
    },
    addCardText: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.primary,
        marginTop: Spacing.xs,
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
    emptyContainer: {
        paddingTop: Spacing.xl,
        alignItems: 'center',
        gap: Spacing.md,
    },
    emptyText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
        marginTop: Spacing.md,
    },
    emptySubtext: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
});

export default InventoryScreen;