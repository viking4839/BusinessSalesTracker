import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../styles/Theme';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - (Spacing.lg * 2);
const CHART_HEIGHT = 180;
const BAR_WIDTH = 32;

const BarChart = ({ data, maxValue, period }) => {
    if (!data || data.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No data available</Text>
            </View>
        );
    }

    const getBarHeight = (value) => {
        if (maxValue === 0) return 0;
        return (value / maxValue) * (CHART_HEIGHT - 40);
    };

    return (
        <View style={styles.container}>
            {/* Y-axis labels */}
            <View style={styles.yAxis}>
                <Text style={styles.yAxisLabel}>{maxValue.toLocaleString()}</Text>
                <Text style={styles.yAxisLabel}>{(maxValue / 2).toLocaleString()}</Text>
                <Text style={styles.yAxisLabel}>0</Text>
            </View>

            {/* Chart area */}
            <View style={styles.chartArea}>
                {/* Grid lines */}
                <View style={styles.gridLines}>
                    <View style={styles.gridLine} />
                    <View style={styles.gridLine} />
                    <View style={styles.gridLine} />
                </View>

                {/* Bars */}
                <View style={styles.barsContainer}>
                    {data.map((item, index) => {
                        const barHeight = getBarHeight(item.value);
                        const isToday = period === 'day' && index === data.length - 1;
                        const isThisWeek = period === 'week' && index === data.length - 1;
                        const isThisMonth = period === 'month' && index === data.length - 1;
                        const isCurrent = isToday || isThisWeek || isThisMonth;

                        return (
                            <View key={index} style={styles.barWrapper}>
                                <View style={styles.barColumn}>
                                    {item.value > 0 && (
                                        <View style={styles.valueContainer}>
                                            <Text style={styles.valueText}>
                                                {item.value >= 1000
                                                    ? `${(item.value / 1000).toFixed(1)}k`
                                                    : item.value}
                                            </Text>
                                        </View>
                                    )}
                                    <View
                                        style={[
                                            styles.bar,
                                            {
                                                height: Math.max(barHeight, 2),
                                                backgroundColor: isCurrent ? Colors.primary : Colors.primaryLight,
                                            },
                                        ]}
                                    />
                                </View>
                                <Text style={[styles.label, isCurrent && styles.labelActive]}>
                                    {item.label}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        height: CHART_HEIGHT,
        marginVertical: Spacing.md,
    },
    yAxis: {
        width: 40,
        justifyContent: 'space-between',
        paddingRight: 8,
        paddingVertical: 20,
    },
    yAxisLabel: {
        fontSize: 10,
        color: Colors.textSecondary,
        textAlign: 'right',
    },
    chartArea: {
        flex: 1,
        position: 'relative',
    },
    gridLines: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 20,
        bottom: 20,
        justifyContent: 'space-between',
    },
    gridLine: {
        height: 1,
        backgroundColor: Colors.borderLight,
    },
    barsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-end',
        height: CHART_HEIGHT - 40,
        paddingTop: 20,
        paddingBottom: 20,
    },
    barWrapper: {
        alignItems: 'center',
        flex: 1,
    },
    barColumn: {
        alignItems: 'center',
        justifyContent: 'flex-end',
        flex: 1,
        width: '100%',
    },
    valueContainer: {
        marginBottom: 4,
    },
    valueText: {
        fontSize: 9,
        fontWeight: '600',
        color: Colors.text,
    },
    bar: {
        width: BAR_WIDTH,
        borderRadius: 6,
        minHeight: 2,
    },
    label: {
        fontSize: 10,
        color: Colors.textSecondary,
        marginTop: 6,
        fontWeight: '500',
    },
    labelActive: {
        color: Colors.primary,
        fontWeight: '700',
    },
    emptyContainer: {
        height: CHART_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
});

export default BarChart;