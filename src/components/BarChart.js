import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Colors, Typography, Spacing } from '../styles/Theme';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 80; // More padding
const CHART_HEIGHT = 180; // Reduced height
const BAR_SPACING = 8;

const BarChart = ({ data, maxValue, period }) => {
  const barWidth = (CHART_WIDTH / data.length) - BAR_SPACING;
  const safeMaxValue = maxValue > 0 ? maxValue : 100;

  return (
    <View style={styles.container}>
      {/* Chart area */}
      <View style={styles.chartArea}>
        {/* Y-axis labels */}
        <View style={styles.yAxis}>
          <Text style={styles.yLabel}>{Math.round(safeMaxValue)}</Text>
          <Text style={styles.yLabel}>{Math.round(safeMaxValue * 0.5)}</Text>
          <Text style={styles.yLabel}>0</Text>
        </View>

        {/* Bars container */}
        <View style={styles.barsContainer}>
          {/* Horizontal grid lines */}
          <View style={styles.gridLines}>
            <View style={styles.gridLine} />
            <View style={styles.gridLine} />
            <View style={styles.gridLine} />
          </View>

          {/* Bars */}
          <View style={styles.bars}>
            {data.map((item, index) => {
              const barHeight = (item.value / safeMaxValue) * CHART_HEIGHT;
              return (
                <View key={index} style={styles.barWrapper}>
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max(barHeight, 2), // Minimum 2px height
                          width: barWidth,
                          backgroundColor: Colors.primary,
                        },
                      ]}
                    />
                  </View>
                  {/* X-axis label */}
                  <Text style={styles.xLabel} numberOfLines={1}>
                    {item.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  yAxis: {
    height: CHART_HEIGHT,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 8,
    paddingBottom: 4,
    width: 40,
  },
  yLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  barsContainer: {
    flex: 1,
    height: CHART_HEIGHT,
    position: 'relative',
  },
  gridLines: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  gridLine: {
    height: 1,
    backgroundColor: Colors.borderLight,
    opacity: 0.5,
  },
  bars: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-end',
    height: '100%',
    paddingBottom: 4,
  },
  barWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  barContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
  },
  bar: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 2,
  },
  xLabel: {
    fontSize: 9,
    color: Colors.textSecondary,
    marginTop: 6,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default BarChart;