export type DashboardTagSeverity =
  | 'success'
  | 'info'
  | 'warn'
  | 'danger'
  | 'secondary'
  | 'contrast';

export interface DashboardDateRange {
  start: string;
  end: string;
}

export interface MeteredEntry {
  id: number;
  accountId: number;
  accountName: string;
  address: string;
  group: string;
  prevReading: number;
  currentReading: number;
  remarks: string;
  readingDate: number;
  rate: number;
  addition: number;
  pressureFactor: number;
  conversion: number;
  pairedEntries: ReadonlyArray<Record<string, unknown>>;
  qty: number;
  variance: number;
  total: number;
}

export interface SalesEntry {
  salesDate: number | null;
  invoice: string | null;
  accountName: string;
  contactPerson: string | null;
  contactNumber: string | null;
  total: number;
  discount: number;
  actualCollected: number;
  name: string | null;
  invoiceStart: string | null;
  invoiceEnd: string | null;
  paymentType: number;
  bank: string | null;
  checkNumber: string | null;
  referenceNumber: string | null;
  paymentTypeString: string | null;
  accountAddress: string | null;
  balance: number;
  collected: number;
  grandTotal: number;
}

export interface SalesGroup {
  branchId: number;
  branchName: string;
  sales: ReadonlyArray<SalesEntry>;
}

export interface DashboardApiResponse {
  start: number;
  end: number;
  metered: ReadonlyArray<MeteredEntry>;
  sales: ReadonlyArray<SalesEntry>;
  salesGroups: ReadonlyArray<SalesGroup>;
}

export interface DashboardSummaryCardView {
  label: string;
  value: string;
  helperText: string;
  icon: string;
  tagLabel: string;
  severity: DashboardTagSeverity;
  accentClass: string;
}

export interface DashboardTrendPoint {
  label: string;
  total: number;
  quantity: number;
}

export interface DashboardDistributionPoint {
  label: string;
  value: number;
  valueLabel: string;
  shareLabel: string;
}

export interface DashboardBranchSalesDetailView {
  id: string;
  accountName: string;
  total: number;
  totalLabel: string;
  collected: number;
  collectedLabel: string;
  balance: number;
  balanceLabel: string;
  discount: number;
  discountLabel: string;
}

export interface DashboardBranchSalesRowView {
  branchId: number;
  branchName: string;
  totalSales: number;
  totalSalesLabel: string;
  collected: number;
  collectedLabel: string;
  balance: number;
  balanceLabel: string;
  collectionRate: number;
  collectionRateLabel: string;
  collectionRateSeverity: DashboardTagSeverity;
  detailCount: number;
  detailCountLabel: string;
  isExpandable: boolean;
  details: ReadonlyArray<DashboardBranchSalesDetailView>;
}

export interface DashboardVolumeSalesRowView {
  id: number;
  accountName: string;
  address: string;
  groupLabel: string;
  readingDate: number;
  readingDateLabel: string;
  quantity: number;
  quantityLabel: string;
  rate: number;
  rateLabel: string;
  total: number;
  totalLabel: string;
  variance: number;
  varianceLabel: string;
  varianceSeverity: DashboardTagSeverity;
  isTopQuantityAccount: boolean;
  rowClass: string;
}

export type DashboardCollectionStatus = 'Paid' | 'Partial' | 'Unpaid';

export interface DashboardCollectionRowView {
  accountName: string;
  total: number;
  totalLabel: string;
  collected: number;
  collectedLabel: string;
  balance: number;
  balanceLabel: string;
  discount: number;
  discountLabel: string;
  statusLabel: DashboardCollectionStatus;
  statusSeverity: DashboardTagSeverity;
  rowClass: string;
}

export interface DashboardVarianceRowView {
  id: number;
  accountName: string;
  quantity: number;
  quantityLabel: string;
  total: number;
  totalLabel: string;
  variance: number;
  varianceLabel: string;
  varianceSeverity: DashboardTagSeverity;
  isHighVariance: boolean;
  rowClass: string;
}

export interface DashboardNotice {
  title: string;
  detail: string;
  severity: DashboardTagSeverity;
}

export interface DashboardTotals {
  grossSales: number;
  collected: number;
  outstanding: number;
  totalVolume: number;
  collectionRate: number;
  meteredAccounts: number;
  salesAccounts: number;
  branchCount: number;
  highVarianceCount: number;
}

export interface DashboardOverview {
  periodLabel: string;
  sourceLabel: string;
  sourceSeverity: DashboardTagSeverity;
  notice: DashboardNotice | null;
  summaryCards: ReadonlyArray<DashboardSummaryCardView>;
  trendPoints: ReadonlyArray<DashboardTrendPoint>;
  branchDistribution: ReadonlyArray<DashboardDistributionPoint>;
  branchSalesRows: ReadonlyArray<DashboardBranchSalesRowView>;
  volumeSalesRows: ReadonlyArray<DashboardVolumeSalesRowView>;
  collectionRows: ReadonlyArray<DashboardCollectionRowView>;
  varianceRows: ReadonlyArray<DashboardVarianceRowView>;
  totals: DashboardTotals;
}