import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, BorderRadius } from '../styles/Theme';
import Button from '../components/Button';

const EditProfileScreen = ({ navigation }) => {
    const [name, setName] = useState('');

    useEffect(() => {
        (async () => {
            const p = await AsyncStorage.getItem('profile');
            if (p) setName(JSON.parse(p).name || '');
        })();
    }, []);

    const save = async () => {
        await AsyncStorage.setItem('profile', JSON.stringify({ name }));
        Alert.alert('Saved', 'Profile updated', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>Your Name</Text>
            <TextInput
                style={styles.input}
                placeholder="e.g., Jane Doe"
                placeholderTextColor={Colors.textSecondary}
                value={name}
                onChangeText={setName}
            />
            <Button title="Save" onPress={save} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: Spacing.lg, backgroundColor: Colors.background },
    label: { ...Typography.caption, color: Colors.textSecondary, marginBottom: 6 },
    input: {
        borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.md,
        color: Colors.text, marginBottom: Spacing.lg, backgroundColor: Colors.surface,
    },
});

export default EditProfileScreen;