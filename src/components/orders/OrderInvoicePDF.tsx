import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Settings } from "@/hooks/useSettings";
import type { Order, OrderItem } from "@/hooks/useOrders";
import { formatCurrency, formatDate } from "@/lib/format";

type OrderWithItems = Order & { order_items?: OrderItem[] };

interface GenerateOrderInvoiceParams {
  order: OrderWithItems;
  settings: Settings;
  invoiceNumber?: string;
}

export async function generateOrderInvoicePDF({ order, settings, invoiceNumber }: GenerateOrderInvoiceParams): Promise<jsPDF> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  let yPos = 20;

  // Add logo if available
  if (settings.shop_logo_url) {
    try {
      const response = await fetch(settings.shop_logo_url);
      const blob = await response.blob();
      const reader = new FileReader();
      const logoDataUrl = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      doc.addImage(logoDataUrl, 'PNG', 14, yPos, 40, 20);
      yPos += 25;
    } catch (e) {
      console.warn("Could not load logo:", e);
    }
  }

  // Company header
  doc.setFontSize(10);
  doc.setTextColor(100);
  
  const companyInfo = [
    settings.shop_name,
    settings.legal_name !== settings.shop_name ? settings.legal_name : null,
    settings.shop_address,
    `${settings.shop_postal_code || ''} ${settings.shop_city || ''}`.trim(),
    settings.shop_country,
    settings.shop_phone ? `Tél : ${settings.shop_phone}` : null,
    settings.shop_email ? `Email : ${settings.shop_email}` : null,
    settings.siret ? `SIRET : ${settings.siret}` : null,
    settings.vat_number ? `TVA : ${settings.vat_number}` : null,
  ].filter(Boolean);

  companyInfo.forEach((line, i) => {
    if (line) {
      doc.text(line, 14, yPos + i * 5);
    }
  });

  // Customer info (right side)
  const customerInfo = [
    order.customer_name || order.customer_email,
    order.shipping_first_name && order.shipping_last_name 
      ? `${order.shipping_first_name} ${order.shipping_last_name}` 
      : null,
    order.shipping_address,
    order.shipping_address_line_2,
    `${order.shipping_postal_code || ''} ${order.shipping_city || ''}`.trim(),
    order.shipping_country,
  ].filter(Boolean) as string[];

  doc.setFontSize(10);
  customerInfo.forEach((line, i) => {
    doc.text(line, pageWidth - 14, yPos + i * 5, { align: 'right' });
  });

  yPos += Math.max(companyInfo.length * 5, customerInfo.length * 5) + 15;

  // Invoice title
  doc.setFontSize(18);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("FACTURE / INVOICE", 14, yPos);
  
  yPos += 10;

  // Invoice details
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60);
  
  const invoiceDetails = [
    `Facture N° : ${invoiceNumber || order.order_number}`,
    `Commande N° : ${order.order_number}`,
    `Date : ${formatDate(order.created_at)}`,
  ];

  invoiceDetails.forEach((line, i) => {
    doc.text(line, 14, yPos + i * 5);
  });

  yPos += 20;

  // Items table
  const tableData = (order.order_items || []).map(item => [
    item.sku || '—',
    `${item.artist_name ? `${item.artist_name} - ` : ''}${item.title}`,
    item.quantity.toString(),
    formatCurrency(item.unit_price),
    formatCurrency(item.total_price),
  ]);

  // Add shipping if applicable
  if (order.shipping_amount && order.shipping_amount > 0) {
    tableData.push([
      '',
      'Frais de port / Shipping',
      '1',
      formatCurrency(order.shipping_amount),
      formatCurrency(order.shipping_amount),
    ]);
  }

  autoTable(doc, {
    startY: yPos,
    head: [['Réf.', 'Description', 'Qté', 'Prix unit. HT', 'Total HT']],
    body: tableData,
    theme: 'grid',
    headStyles: { 
      fillColor: [60, 60, 60],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [40, 40, 40],
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  // Get the final Y position after the table
  yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Totals section
  const vatRate = settings.vat_rate || 20;
  const subtotalHT = order.subtotal;
  const tvaAmount = order.tax_amount || (subtotalHT * vatRate / 100);
  const totalTTC = order.total;

  doc.setFontSize(10);
  
  // Draw totals box
  const boxWidth = 80;
  const boxX = pageWidth - 14 - boxWidth;
  
  doc.setDrawColor(200);
  doc.setFillColor(248, 248, 248);
  doc.rect(boxX, yPos, boxWidth, 35, 'FD');

  doc.setTextColor(60);
  doc.text('Total HT :', boxX + 5, yPos + 8);
  doc.text(formatCurrency(subtotalHT), boxX + boxWidth - 5, yPos + 8, { align: 'right' });

  doc.text(`TVA (${vatRate}%) :`, boxX + 5, yPos + 16);
  doc.text(formatCurrency(tvaAmount), boxX + boxWidth - 5, yPos + 16, { align: 'right' });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text('Total TTC :', boxX + 5, yPos + 28);
  doc.text(formatCurrency(totalTTC), boxX + boxWidth - 5, yPos + 28, { align: 'right' });

  // Payment info if paid
  if (order.payment_status === 'paid' && order.paid_at) {
    yPos += 45;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 128, 0);
    doc.text(`Payé le ${formatDate(order.paid_at)}${order.payment_method ? ` - ${order.payment_method}` : ''}`, 14, yPos);
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.setFont("helvetica", "normal");
  
  const footerText = [
    `${settings.shop_name}${settings.siret ? ` - SIRET : ${settings.siret}` : ''}`,
    settings.vat_number ? `TVA Intracommunautaire : ${settings.vat_number}` : '',
  ].filter(Boolean).join(' - ');
  
  doc.text(footerText, pageWidth / 2, footerY, { align: 'center' });

  return doc;
}

export function downloadOrderInvoice(doc: jsPDF, orderNumber: string): void {
  doc.save(`Facture-${orderNumber}.pdf`);
}

export function previewOrderInvoice(doc: jsPDF): string {
  return doc.output('datauristring');
}
