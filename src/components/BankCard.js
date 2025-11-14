import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MessageSquare, Clock } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../styles/Theme';

const BankCard = ({
  name = 'Unknown Bank',  // ✅ Add default value
  active = false,         // ✅ Add default value
  color = Colors.primary, // ✅ Add default value
  transactionCount = 0,
  lastActivity
}) => {
  // ✅ Safe access to name
  const bankInitial = name && name.length > 0 ? name.charAt(0).toUpperCase() : '?';

  return (
    <View style={[
      styles.container,
      active ? styles.containerActive : styles.containerInactive
    ]}>
      <View style={styles.header}>
        <View style={styles.leftSection}>
          <View style={[styles.bankIcon, { backgroundColor: color }]}>
            <Text style={styles.bankIconText}>{bankInitial}</Text>
          </View>
          <Text style={styles.bankName}>{name}</Text>
        </View>
        {active && (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>Active</Text>
          </View>
        )}
      </View>

      {active ? (
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <MessageSquare size={12} color={Colors.textSecondary} />
            <Text style={styles.statText}>{transactionCount} SMS</Text>
          </View>
          {lastActivity && (
            <>
              <Text style={styles.separator}>•</Text>
              <View style={styles.statItem}>
                <Clock size={12} color={Colors.textSecondary} />
                <Text style={styles.statText}>{lastActivity}</Text>
              </View>
            </>
          )}
        </View>
      ) : (
        <Text style={styles.noSmsText}>No SMS detected yet</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    minWidth: 200,
    marginRight: Spacing.md,
  },
  containerActive: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  containerInactive: {
    borderColor: Colors.border,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  bankIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bankIconText: {
    color: Colors.surface,
    fontSize: 14,
    fontWeight: 'bold',
  },
  bankName: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  activeBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activeBadgeText: {
    fontSize: 10,
    color: '#065F46',
    fontWeight: '600',
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 40,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  separator: {
    fontSize: 11,
    color: Colors.borderLight,
  },
  noSmsText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginLeft: 40,
  },
});

export default BankCard;