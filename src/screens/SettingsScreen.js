import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Modal, Linking
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, BorderRadius } from '../styles/Theme';
import Card from '../components/Card';
import {
  ArrowLeft, Bell, Building2, Wallet, Clock,
  Trash2, Info, BookOpen, HelpCircle, Shield
} from 'lucide-react-native';
import TransactionStorage from '../utils/TransactionStorage';
import ProfitReportStorage from '../utils/ProfitReportStorage';
import CreditStorage from '../utils/CreditStorage';
import { DeviceEventEmitter } from 'react-native';

const SettingsScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState(true);
  const [profile, setProfile] = useState({ name: 'Track Biz User', initials: 'TB' });
  const [showAbout, setShowAbout] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showRateApp, setShowRateApp] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const s = await AsyncStorage.getItem('settings');
        if (s) {
          const parsed = JSON.parse(s);
          setNotifications(!!parsed.notifications);
        }
        const p = await AsyncStorage.getItem('profile');
        if (p) {
          const prof = JSON.parse(p);
          setProfile({
            name: prof.name || 'Track Biz User',
            initials: (prof.name || 'T B').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
          });
        }
      } catch { }
    })();
  }, []);

  const saveSettings = async (next) => {
    try {
      const payload = {
        notifications: next?.notifications ?? notifications,
      };
      await AsyncStorage.setItem('settings', JSON.stringify(payload));
    } catch { }
  };

  const handleClearData = async () => {
    Alert.alert(
      'Clear All Data',
      'Delete stored transactions and profit margin stats? This does not delete SMS on your phone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            const txOk = await TransactionStorage.clearTransactions?.();
            const profitOk = await ProfitReportStorage.clearReports?.();
            if (txOk && profitOk) {
              DeviceEventEmitter.emit('transactions:cleared');
              DeviceEventEmitter.emit('profit:cleared');
              Alert.alert('Done', 'Stored data cleared');
            } else {
              Alert.alert('Error', 'Failed to clear data');
            }
          }
        }
      ]
    );
  };

  const SettingItem = ({ Icon, title, subtitle, onPress, showArrow = true, rightComponent }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.settingLeft}>
        <Icon size={20} color={Colors.primary} style={{ marginRight: Spacing.md }} />
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {rightComponent || (showArrow && <Text style={styles.settingArrow}>›</Text>)}
    </TouchableOpacity>
  );

  const SettingToggle = ({ Icon, title, subtitle, value, onValueChange }) => (
    <View style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <Icon size={20} color={Colors.primary} style={{ marginRight: Spacing.md }} />
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={(v) => { onValueChange(v); saveSettings({ notifications: v }); }}
        trackColor={{ false: '#d1d5db', true: Colors.primary + '60' }}
        thumbColor={value ? Colors.primary : '#f3f4f6'}
      />
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Settings</Text>
      </View>

      {/* Profile */}
      <Card variant="elevated">
        <View style={styles.profileSection}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{profile.initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile.name}</Text>
            <Text style={styles.profileEmail}>Business Account</Text>
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* General - Only Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>General</Text>
        <Card variant="elevated">
          <SettingToggle
            Icon={Bell}
            title="Notifications"
            subtitle="Get alerts for new transactions"
            value={notifications}
            onValueChange={(v) => { setNotifications(v); saveSettings({ notifications: v }); }}
          />
        </Card>
      </View>

      {/* Business - Streamlined */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Business</Text>
        <Card variant="elevated">
          <SettingItem
            Icon={Building2}
            title="Business Profile"
            subtitle="Name, type, and business information"
            onPress={() => navigation.navigate('BusinessProfile')}
          />
          <SettingItem
            Icon={Wallet}
            title="Currency"
            subtitle="Kenyan Shilling (KSh)"
            onPress={() => navigation.navigate('CurrencySettings')}
          />
          <SettingItem
            Icon={Clock}
            title="Business Hours"
            subtitle="Set your opening and closing times"
            onPress={() => navigation.navigate('BusinessHours')}
          />
        </Card>
      </View>

      {/* Data & About - Streamlined */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data & About</Text>
        <Card variant="elevated">
          <SettingItem
            Icon={Trash2}
            title="Clear Data"
            subtitle="Delete all transactions"
            onPress={handleClearData}
          />
          <SettingItem
            Icon={Info}
            title="About Track Biz"
            subtitle="Version 1.0.0"
            onPress={() => setShowAbout(true)}
          />
          <SettingItem
            Icon={BookOpen}
            title="Help & Support"
            subtitle="Get help using Track Biz"
            onPress={() => setShowHelp(true)}
          />
          <SettingItem
            Icon={Shield}
            title="Privacy Policy"
            subtitle="Read our privacy policy"
            onPress={() => navigation.navigate('PrivacyPolicy')}
          />
          <SettingItem
            Icon={HelpCircle}
            title="Rate App"
            subtitle="Share your feedback"
            onPress={() => setShowRateApp(true)}
          />
        </Card>
      </View>

      {/* Modals */}
      <Modal visible={showAbout} transparent animationType="fade" onRequestClose={() => setShowAbout(false)}>
        <View style={{
          flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)'
        }}>
          <View style={{
            backgroundColor: Colors.surface, borderRadius: 16, padding: 24, minWidth: 260, alignItems: 'center'
          }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8 }}>About Track Biz</Text>
            <Text style={{ marginBottom: 12 }}>Version 1.0.0</Text>
            <Text style={{ color: Colors.textSecondary, marginBottom: 16 }}>Track Biz helps you manage your business sales and credits easily.</Text>
            <TouchableOpacity onPress={() => setShowAbout(false)}>
              <Text style={{ color: Colors.primary, fontWeight: 'bold' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showHelp} transparent animationType="fade" onRequestClose={() => setShowHelp(false)}>
        <View style={{
          flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)'
        }}>
          <View style={{
            backgroundColor: Colors.surface, borderRadius: 16, padding: 24, minWidth: 260, alignItems: 'center'
          }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8 }}>Help & Support</Text>
            <Text style={{ marginBottom: 12 }}>Email: support@trackbiz.com</Text>
            <Text style={{ marginBottom: 16 }}>Phone: +254 XXX XXX XXX</Text>
            <TouchableOpacity onPress={() => setShowHelp(false)}>
              <Text style={{ color: Colors.primary, fontWeight: 'bold' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showRateApp} transparent animationType="fade" onRequestClose={() => setShowRateApp(false)}>
        <View style={{
          flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)'
        }}>
          <View style={{
            backgroundColor: Colors.surface, borderRadius: 16, padding: 24, minWidth: 260, alignItems: 'center'
          }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8 }}>Rate Track Biz</Text>
            <Text style={{ marginBottom: 12 }}>We appreciate your feedback! Please rate us on the app store.</Text>
            <TouchableOpacity
              style={{
                backgroundColor: Colors.primary,
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 8,
                marginBottom: 12,
              }}
              onPress={() => {
                setShowRateApp(false);
                Linking.openURL('https://play.google.com/store/apps/details?id=com.trackbiz');
              }}
            >
              <Text style={{ color: Colors.surface, fontWeight: 'bold' }}>Rate on Play Store</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowRateApp(false)}>
              <Text style={{ color: Colors.primary, fontWeight: 'bold' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  profileSection: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg },
  profileAvatar: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md,
  },
  profileAvatarText: { ...Typography.heading, color: Colors.surface, fontSize: 24 },
  profileInfo: { flex: 1 },
  profileName: { ...Typography.subheading, color: Colors.text, marginBottom: 4 },
  profileEmail: { ...Typography.caption, color: Colors.textSecondary },
  editButton: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.primary },
  editButtonText: { ...Typography.body, color: Colors.primary, fontWeight: '600' },
  section: { padding: Spacing.md },
  sectionTitle: { ...Typography.subheading, color: Colors.text, marginBottom: Spacing.sm, marginLeft: Spacing.xs },
  settingItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  settingText: { flex: 1 },
  settingTitle: { ...Typography.body, color: Colors.text, fontWeight: '500', marginBottom: 2 },
  settingSubtitle: { ...Typography.caption, color: Colors.textSecondary },
  settingArrow: { ...Typography.heading, fontSize: 24, color: Colors.textSecondary },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginRight: Spacing.md
  },
  screenTitle: {
    ...Typography.subheading,
    fontWeight: '700',
    color: Colors.text
  },
});

export default SettingsScreen;