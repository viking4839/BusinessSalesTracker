import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Colors, Typography, Spacing } from '../styles/Theme';

const AppHeader = ({ title = 'Track Biz' }) => {
    return (
        <View style={styles.header}>
            {/* Logo and Brand */}
            <View style={styles.logoContainer}>
                <View style={styles.logo}>
                    <Text style={styles.logoIcon}>📊</Text>
                </View>
                <View style={styles.brandText}>
                    <Text style={styles.brandName}>TRACK BIZ</Text>
                    <Text style={styles.brandTagline}>Smart Business Tracking</Text>
                </View>
            </View>

            {/* Status Indicator */}
            <View style={styles.statusContainer}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Live</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        ...Platform.select({
            android: {
                elevation: 4,
            },
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 3,
            },
        }),
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logo: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.sm,
    },
    logoIcon: {
        fontSize: 20,
        color: Colors.surface,
    },
    brandText: {
        flexDirection: 'column',
    },
    brandName: {
        ...Typography.subheading,
        fontWeight: 'bold',
        color: Colors.primary,
        fontSize: 18,
        letterSpacing: 1,
    },
    brandTagline: {
        ...Typography.small,
        color: Colors.textSecondary,
        fontSize: 10,
        marginTop: -2,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#10B98120',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#10B981',
        marginRight: 4,
    },
    statusText: {
        ...Typography.small,
        color: '#059669',
        fontWeight: '600',
        fontSize: 10,
    },
});

export default AppHeader;