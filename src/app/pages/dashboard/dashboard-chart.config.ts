import { ChartData, ChartOptions } from 'chart.js';

import {
  DashboardBranchSalesRowView,
  DashboardCollectionRowView,
  DashboardDistributionPoint,
  DashboardTrendPoint,
  DashboardVarianceRowView
} from '../../models/dashboard.model';

const AXIS_TICK_COLOR = '#64748b';
const GRID_COLOR = 'rgba(148, 163, 184, 0.18)';
const SURFACE_BORDER_COLOR = '#ffffff';

const DISTRIBUTION_COLORS = [
  '#0f766e',
  '#0369a1',
  '#f59e0b',
  '#e11d48',
  '#8b5cf6',
  '#334155',
  '#14b8a6',
  '#f97316',
  '#06b6d4',
  '#84cc16'
];

const DISTRIBUTION_HOVER_COLORS = [
  '#115e59',
  '#075985',
  '#d97706',
  '#be123c',
  '#7c3aed',
  '#1e293b',
  '#0f766e',
  '#ea580c',
  '#0891b2',
  '#65a30d'
];

const buildPalette = (length: number, palette: ReadonlyArray<string>): ReadonlyArray<string> => {
  return Array.from({ length }, (_, index) => palette[index % palette.length]);
};

const buildCartesianOptions = <TType extends 'line' | 'bar'>(
  stacked = false
): ChartOptions<TType> => {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          usePointStyle: true,
          boxWidth: 10
        }
      }
    },
    scales: {
      x: {
        stacked,
        grid: {
          display: false
        },
        ticks: {
          color: AXIS_TICK_COLOR
        }
      },
      y: {
        stacked,
        beginAtZero: true,
        ticks: {
          color: AXIS_TICK_COLOR
        },
        grid: {
          color: GRID_COLOR
        }
      }
    }
  } as unknown as ChartOptions<TType>;
};

const buildDoughnutOptions = (): ChartOptions<'doughnut'> => {
  return {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: {
        position: 'right',
        labels: {
          usePointStyle: true,
          boxWidth: 10,
          color: AXIS_TICK_COLOR
        }
      }
    }
  };
};

export const createSalesTrendChartData = (
  trendPoints: ReadonlyArray<DashboardTrendPoint>
): ChartData<'line'> => {
  return {
    labels: trendPoints.map((point) => point.label),
    datasets: [
      {
        label: 'Sales Total',
        data: trendPoints.map((point) => point.total),
        borderColor: '#0f766e',
        backgroundColor: 'rgba(15, 118, 110, 0.16)',
        pointBackgroundColor: '#0f766e',
        pointBorderColor: '#ffffff',
        pointHoverRadius: 6,
        pointRadius: 4,
        tension: 0.34,
        fill: true
      }
    ]
  };
};

export const salesTrendChartOptions = buildCartesianOptions<'line'>();

export const createVolumeTrendChartData = (
  trendPoints: ReadonlyArray<DashboardTrendPoint>
): ChartData<'line'> => {
  return {
    labels: trendPoints.map((point) => point.label),
    datasets: [
      {
        label: 'Volume Quantity',
        data: trendPoints.map((point) => point.quantity),
        borderColor: '#0369a1',
        backgroundColor: 'rgba(3, 105, 161, 0.16)',
        pointBackgroundColor: '#0369a1',
        pointBorderColor: SURFACE_BORDER_COLOR,
        pointHoverRadius: 6,
        pointRadius: 4,
        tension: 0.34,
        fill: true
      }
    ]
  };
};

export const volumeTrendChartOptions = buildCartesianOptions<'line'>();

export const createBranchPerformanceChartData = (
  rows: ReadonlyArray<DashboardBranchSalesRowView>
): ChartData<'bar'> => {
  return {
    labels: rows.map((row) => row.branchName),
    datasets: [
      {
        label: 'Total Sales',
        data: rows.map((row) => row.totalSales),
        backgroundColor: '#0f766e',
        borderRadius: 10,
        maxBarThickness: 24
      },
      {
        label: 'Collected',
        data: rows.map((row) => row.collected),
        backgroundColor: '#38bdf8',
        borderRadius: 10,
        maxBarThickness: 24
      }
    ]
  };
};

export const branchPerformanceChartOptions = buildCartesianOptions<'bar'>();

export const createBranchDistributionChartData = (
  distribution: ReadonlyArray<DashboardDistributionPoint>
): ChartData<'doughnut'> => {
  return {
    labels: distribution.map((item) => item.label),
    datasets: [
      {
        data: distribution.map((item) => item.value),
        backgroundColor: buildPalette(distribution.length, DISTRIBUTION_COLORS),
        hoverBackgroundColor: buildPalette(distribution.length, DISTRIBUTION_HOVER_COLORS),
        borderColor: SURFACE_BORDER_COLOR,
        borderWidth: 2
      }
    ]
  };
};

export const branchDistributionChartOptions: ChartOptions<'doughnut'> = {
  ...buildDoughnutOptions(),
  plugins: {
    legend: {
      display: false
    }
  }
};

export const createCollectionStatusChartData = (
  rows: ReadonlyArray<DashboardCollectionRowView>
): ChartData<'doughnut'> => {
  const paidTotal = rows
    .filter((row) => row.statusLabel === 'Paid')
    .reduce((sum, row) => sum + row.total, 0);
  const partialTotal = rows
    .filter((row) => row.statusLabel === 'Partial')
    .reduce((sum, row) => sum + row.total, 0);
  const unpaidTotal = rows
    .filter((row) => row.statusLabel === 'Unpaid')
    .reduce((sum, row) => sum + row.total, 0);

  return {
    labels: ['Paid', 'Partial', 'Unpaid'],
    datasets: [
      {
        label: 'Collection exposure',
        data: [paidTotal, partialTotal, unpaidTotal],
        backgroundColor: ['#0f766e', '#f59e0b', '#e11d48'],
        hoverBackgroundColor: ['#115e59', '#d97706', '#be123c'],
        borderColor: SURFACE_BORDER_COLOR,
        borderWidth: 2
      }
    ]
  };
};

export const collectionStatusChartOptions = buildDoughnutOptions();

export const createVarianceChartData = (
  rows: ReadonlyArray<DashboardVarianceRowView>
): ChartData<'bar'> => {
  const topRows = [...rows].slice(0, 8);

  return {
    labels: topRows.map((row) => row.accountName),
    datasets: [
      {
        label: 'Variance',
        data: topRows.map((row) => row.variance),
        backgroundColor: topRows.map((row) =>
          row.variance >= 0 ? 'rgba(225, 29, 72, 0.75)' : 'rgba(3, 105, 161, 0.75)'
        ),
        borderColor: topRows.map((row) => (row.variance >= 0 ? '#be123c' : '#075985')),
        borderWidth: 1,
        borderRadius: 10,
        maxBarThickness: 26
      }
    ]
  };
};

export const varianceChartOptions = buildCartesianOptions<'bar'>();