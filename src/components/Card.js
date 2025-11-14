import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, Shadows, BorderRadius } from '../styles/Theme';

const Card = ({ children, style, variant = 'elevated' }) => {
    return (
        <View style={[
            styles.card,
            variant === 'elevated' && styles.elevated,
            variant === 'outlined' && styles.outlined,
            style
        ]}>
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
    },
    elevated: {
        ...Shadows.sm,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    outlined: {
        borderWidth: 1,
        borderColor: Colors.border,
    },
});

export default Card;