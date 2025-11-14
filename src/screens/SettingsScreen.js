import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Linking
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, BorderRadius } from '../styles/Theme';
import Card from '../components/Card';
import {
  Bell, Bot, Volume2, Ban, Building2, Wallet, Clock, Target,
  Upload, Cloud, Trash2, Info, BookOpen, HelpCircle, Shield
} from 'lucide-react-native';
import PdfExportService from '../services/PdfExportService';

const SettingsScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState(true);
  const [autoTracking, setAutoTracking] = useState(true);
  const [personalFilter, setPersonalFilter] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [profile, setProfile] = useState({ name: 'Track Biz User', initials: 'TB' });

  useEffect(() => {
    (async () => {
      try {
        const s = await AsyncStorage.getItem('settings');
        if (s) {
          const parsed = JSON.parse(s);
          setNotifications(!!parsed.notifications);
          setAutoTracking(!!parsed.autoTracking);
          setPersonalFilter(!!parsed.personalFilter);
          setSoundEnabled(!!parsed.soundEnabled);
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
        autoTracking: next?.autoTracking ?? autoTracking,
        personalFilter: next?.personalFilter ?? personalFilter,
        soundEnabled: next?.soundEnabled ?? soundEnabled,
      };
      await AsyncStorage.setItem('settings', JSON.stringify(payload));
    } catch { }
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all transactions and reset your statistics. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                'transactions', 'dailyTotals', 'salesTarget',
                'businessProfile', 'businessHours'
              ]);
              Alert.alert('Success', 'All data has been cleared');
            } catch (e) {
              Alert.alert('Error', 'Failed to clear data');
            }
          }
        }
      ]
    );
  };

  const handleExportData = async () => {
    Alert.alert(
      'Export Transactions',
      'Generate a PDF report of all your transactions?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: async () => {
            try {
              const filePath = await PdfExportService.exportTransactionsToPDF();
              if (filePath) {
                Alert.alert(
                  'Export Successful!',
                  `PDF saved to:\n${filePath}`,
                  [
                    { text: 'OK' },
                    {
                      text: 'Open',
                      onPress: () => {
                        // Open the PDF with default viewer
                        Linking.openURL(`file://${filePath}`).catch(err =>
                          console.error('Could not open PDF', err)
                        );
                      }
                    }
                  ]
                );
              }
            } catch (error) {
              console.error('Export error:', error);
              Alert.alert('Error', 'Failed to export PDF');
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
        onValueChange={(v) => { onValueChange(v); saveSettings(); }}
        trackColor={{ false: '#d1d5db', true: Colors.primary + '60' }}
        thumbColor={value ? Colors.primary : '#f3f4f6'}
      />
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
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

      {/* General */}
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
          <SettingToggle
            Icon={Bot}
            title="Auto Tracking"
            subtitle="Automatically monitor SMS"
            value={autoTracking}
            onValueChange={(v) => { setAutoTracking(v); saveSettings({ autoTracking: v }); }}
          />
          <SettingToggle
            Icon={Volume2}
            title="Sound"
            subtitle="Play sound on new transactions"
            value={soundEnabled}
            onValueChange={(v) => { setSoundEnabled(v); saveSettings({ soundEnabled: v }); }}
          />
          <SettingToggle
            Icon={Ban}
            title="Filter Personal"
            subtitle="Hide personal transactions"
            value={personalFilter}
            onValueChange={(v) => { setPersonalFilter(v); saveSettings({ personalFilter: v }); }}
          />
        </Card>
      </View>

      {/* Business */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Business</Text>
        <Card variant="elevated">
          <SettingItem
            Icon={Building2}
            title="Business Profile"
            subtitle="Type, peak hours, notes"
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
          <SettingItem
            Icon={Target}
            title="Sales Target"
            subtitle="Set optional monthly goal"
            onPress={() => navigation.navigate('SalesTarget')}
          />
        </Card>
      </View>

      {/* Data & About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data & About</Text>
        <Card variant="elevated">
          <SettingItem
            Icon={Upload}
            title="Export Data"
            subtitle="Download your transactions as PDF"
            onPress={handleExportData}
          />
          <SettingItem Icon={Cloud} title="Backup & Sync" subtitle="Cloud backup settings" onPress={() => Alert.alert('Backup', 'Coming soon')} />
          <SettingItem Icon={Trash2} title="Clear Data" subtitle="Delete all transactions" onPress={handleClearData} />
          <SettingItem Icon={Info} title="About Track Biz" subtitle="Version 1.0.0" onPress={() => Alert.alert('About', 'Track Biz — Smart Business Tracking')} />
          <SettingItem Icon={BookOpen} title="Help & Support" subtitle="Get help using Track Biz" onPress={() => Alert.alert('Help', 'Help center coming soon!')} />
          <SettingItem Icon={Shield} title="Privacy Policy" subtitle="Read our privacy policy" onPress={() => Alert.alert('Privacy', 'Coming soon')} />
          <SettingItem Icon={HelpCircle} title="Rate App" subtitle="Share your feedback" onPress={() => Alert.alert('Rate App', 'Thanks for your support!')} />
        </Card>
      </View>

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
});

export default SettingsScreen;