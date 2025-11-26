import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';

const RateApp = () => (
  <View style={{ flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
      Rate Track Biz
    </Text>
    <Text style={{ marginBottom: 20 }}>
      We appreciate your feedback! Please rate us on the app store.
    </Text>
    <TouchableOpacity
      style={{
        backgroundColor: '#2563eb',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
      }}
      onPress={() => Linking.openURL('https://play.google.com/store/apps/details?id=com.trackbiz')}
    >
      <Text style={{ color: '#fff', fontWeight: 'bold' }}>Rate on Play Store</Text>
    </TouchableOpacity>
  </View>
);

export default RateApp;