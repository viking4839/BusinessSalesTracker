import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors, Typography, BorderRadius, SPACING} from '../styles/Theme';

const Button = ({
    title,
    onPress,
    variant = 'primary',
    size = 'medium',
    loading = false,
    disabled = false,
    style,
    ...props
}) => {
    return (
        <TouchableOpacity
            style={[
                styles.button,
                styles[variant],
                styles[size],
                (disabled || loading) && styles.disabled,
                style
            ]}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.7}
            {...props}
        >
            {loading ? (
                <ActivityIndicator
                    color={variant === 'outline' ? Colors.primary : Colors.surface}
                    size="small"
                />
            ) : (
                <Text style={[
                    styles.text,
                    styles[`${variant}Text`],
                    styles[`${size}Text`]
                ]}>
                    {title}
                </Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    primary: {
        backgroundColor: Colors.primary,
    },
    secondary: {
        backgroundColor: Colors.secondary,
    },
    outline: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: Colors.border,
    },
    disabled: {
        opacity: 0.5,
    },
    small: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        minHeight: 32,
    },
    medium: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        minHeight: 44,
    },
    large: {
        paddingVertical: 14,
        paddingHorizontal: 20,
        minHeight: 48,
    },
    text: {
        fontWeight: '600',
        textAlign: 'center',
    },
    primaryText: {
        color: Colors.surface,
        fontSize: 15,
    },
    secondaryText: {
        color: Colors.surface,
        fontSize: 15,
    },
    outlineText: {
        color: Colors.text,
        fontSize: 15,
    },
    smallText: {
        fontSize: 13,
    },
    mediumText: {
        fontSize: 15,
    },
    largeText: {
        fontSize: 16,
    },
});

export default Button;