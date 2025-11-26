import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '../styles/Theme';
import { ArrowLeft } from 'lucide-react-native';

const PrivacyPolicy = ({ navigation }) => (
    <ScrollView style={{ flex: 1 }}>
        <View style={{
            backgroundColor: Colors.primary,
            paddingVertical: 24,
            paddingHorizontal: 20,
            borderBottomLeftRadius: 16,
            borderBottomRightRadius: 16,
            marginBottom: 20,
            flexDirection: 'row',
            alignItems: 'center',
        }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
                <ArrowLeft size={24} color={Colors.surface} />
            </TouchableOpacity>
            <Text style={{
                fontSize: 24,
                fontWeight: 'bold',
                color: Colors.surface,
            }}>
                Privacy Policy
            </Text>
        </View>
        <View style={{ paddingHorizontal: 20 }}>
            <Text>
                Your privacy is important to us. Track Biz does not share your data with third parties. All business data is stored securely on your device.
            </Text>
        </View>
    </ScrollView>
);

export default PrivacyPolicy;