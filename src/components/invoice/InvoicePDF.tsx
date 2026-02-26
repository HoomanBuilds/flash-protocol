import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';

// Register fonts (using standard fonts for now to avoid loading issues)
// In production, we would register custom fonts here

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    paddingBottom: 20,
  },
  logo: {
    width: 40,
    height: 40,
    backgroundColor: '#000', // Placeholder for logo
  },
  companyDetails: {
    textAlign: 'right',
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  companyText: {
    fontSize: 10,
    color: '#666',
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#111',
    letterSpacing: 2,
  },
  metaGrid: {
    flexDirection: 'row',
    marginBottom: 40,
  },
  metaColumn: {
    flexDirection: 'column',
    width: '33%',
  },
  label: {
    fontSize: 8,
    color: '#888',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 10,
    color: '#111',
    marginBottom: 12,
  },
  table: {
    width: '100%',
    marginBottom: 40,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#000',
    backgroundColor: '#F9FAFB',
    padding: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#EEE',
    padding: 12,
  },
  colDesc: { width: '50%' },
  colQty: { width: '15%', textAlign: 'center' },
  colPrice: { width: '35%', textAlign: 'right' },
  
  headerText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#111',
    textTransform: 'uppercase',
  },
  cellText: {
    fontSize: 10,
    color: '#333',
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '40%',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderColor: '#EEE',
    paddingTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 8,
    color: '#999',
  },
  statusWatermark: {
    position: 'absolute',
    top: 200,
    left: '25%',
    transform: 'rotate(-45deg)',
    fontSize: 80,
    color: 'rgba(0,0,0,0.05)',
    fontWeight: 'bold',
    zIndex: -1,
  }
});

interface InvoicePDFProps {
  transaction: any; // Using any for now, better to define strict type
  merchant: any;
  paymentLink: any;
}

export const InvoicePDF = ({ transaction, merchant, paymentLink }: InvoicePDFProps) => {
  const date = new Date(transaction.created_at).toLocaleDateString();
  const amount = transaction.from_amount || transaction.amount;
  const symbol = transaction.from_token_symbol || transaction.currency || 'USD';
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={{ fontSize: 24, fontWeight: 'bold' }}>RECEIPT</Text>
            <Text style={{ fontSize: 10, color: '#666', marginTop: 8 }}>#{transaction.id.slice(0, 8).toUpperCase()}</Text>
          </View>
          <View style={styles.companyDetails}>
            <Text style={styles.companyName}>{merchant.business_name || 'Merchant'}</Text>
            <Text style={styles.companyText}>{merchant.email}</Text>
            <Text style={styles.companyText}>{merchant.wallet_address?.slice(0, 8)}...{merchant.wallet_address?.slice(-6)}</Text>
          </View>
        </View>

        {/* Metadata Grid */}
        <View style={styles.metaGrid}>
          <View style={styles.metaColumn}>
            <Text style={styles.label}>Billed To</Text>
            <Text style={styles.value}>{transaction.customer_wallet || 'Guest User'}</Text>
            <Text style={styles.value}>{transaction.customer_email || ''}</Text>
          </View>
          <View style={styles.metaColumn}>
            <Text style={styles.label}>Date Issued</Text>
            <Text style={styles.value}>{date}</Text>
            <Text style={styles.label}>Payment Method</Text>
            <Text style={styles.value}>{transaction.from_chain_id ? `Crypto (Chain ID: ${transaction.from_chain_id})` : 'Crypto'}</Text>
          </View>
          <View style={styles.metaColumn}>
            <Text style={styles.label}>Status</Text>
            <Text style={{ ...styles.value, color: transaction.status === 'completed' ? '#10B981' : '#F59E0B' }}>
              {transaction.status?.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Line Items */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={styles.colDesc}><Text style={styles.headerText}>Description</Text></View>
            <View style={styles.colQty}><Text style={styles.headerText}>Qty</Text></View>
            <View style={styles.colPrice}><Text style={styles.headerText}>Amount</Text></View>
          </View>
          <View style={styles.tableRow}>
            <View style={styles.colDesc}>
              <Text style={styles.cellText}>{paymentLink.title || 'Payment'}</Text>
              <Text style={{ fontSize: 8, color: '#666', marginTop: 4 }}>{paymentLink.description}</Text>
            </View>
            <View style={styles.colQty}><Text style={styles.cellText}>1</Text></View>
            <View style={styles.colPrice}><Text style={styles.cellText}>{amount} {symbol}</Text></View>
          </View>
        </View>

        {/* Total */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Paid</Text>
            <Text style={styles.totalValue}>{amount} {symbol}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Transaction Hash: {transaction.source_tx_hash || transaction.dest_tx_hash || 'Pending'}</Text>
          <Text style={styles.footerText}>Powered by Payment Gateway</Text>
        </View>

        {/* Watermark for status */}
        <Text style={styles.statusWatermark}>{transaction.status?.toUpperCase()}</Text>
      </Page>
    </Document>
  );
};
