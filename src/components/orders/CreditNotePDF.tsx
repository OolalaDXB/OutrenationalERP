import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Settings } from "@/hooks/useSettings";
import type { Order, OrderItem } from "@/hooks/useOrders";
import { formatCurrency, formatDate } from "@/lib/format";

type OrderWithItems = Order & { order_items?: OrderItem[] };

interface GenerateCreditNoteParams {
  order: OrderWithItems;
  settings: Settings;
  creditNoteNumber: string;
  originalInvoiceNumber?: string;
}

export async function generateCreditNotePDF({ 
  order, 
  settings, 
  creditNoteNumber,
  originalInvoiceNumber 
}: GenerateCreditNoteParams): Promise<jsPDF> {
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
    settings.legal_name || settings.shop_name,
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

  // Credit Note title with red accent
  doc.setFontSize(18);
  doc.setTextColor(180, 50, 50); // Red color for credit note
  doc.setFont("helvetica", "bold");
  doc.text("AVOIR / CREDIT NOTE", 14, yPos);
  
  yPos += 10;

  // Credit note details
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60);
  
  const creditNoteDetails = [
    `Avoir N° : ${creditNoteNumber}`,
    `Commande N° : ${order.order_number}`,
    originalInvoiceNumber ? `Facture originale N° : ${originalInvoiceNumber}` : null,
    `Date d'émission : ${formatDate(new Date().toISOString())}`,
    `Date de remboursement : ${order.refunded_at ? formatDate(order.refunded_at) : formatDate(new Date().toISOString())}`,
  ].filter(Boolean) as string[];

  creditNoteDetails.forEach((line, i) => {
    doc.text(line, 14, yPos + i * 5);
  });

  yPos += creditNoteDetails.length * 5 + 10;

  // Reason for credit note
  if (order.refund_reason) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(80);
    doc.text(`Motif : ${order.refund_reason}`, 14, yPos);
    yPos += 10;
  }

  yPos += 5;

  // Items table - showing refunded items (negative amounts)
  const tableData = (order.order_items || [])
    .filter(item => item.status !== 'cancelled')
    .map(item => [
      item.sku || '—',
      `${item.artist_name ? `${item.artist_name} - ` : ''}${item.title}`,
      item.quantity.toString(),
      formatCurrency(item.unit_price),
      `-${formatCurrency(item.total_price)}`, // Negative for credit
    ]);

  // Add shipping refund if applicable
  if (order.shipping_amount && order.shipping_amount > 0) {
    tableData.push([
      '',
      'Frais de port / Shipping',
      '1',
      formatCurrency(order.shipping_amount),
      `-${formatCurrency(order.shipping_amount)}`,
    ]);
  }

  autoTable(doc, {
    startY: yPos,
    head: [['Réf.', 'Description', 'Qté', 'Prix unit. HT', 'Crédit HT']],
    body: tableData,
    theme: 'grid',
    headStyles: { 
      fillColor: [140, 50, 50], // Dark red header
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
      4: { cellWidth: 30, halign: 'right', textColor: [180, 50, 50] }, // Red for credit amounts
    },
    margin: { left: 14, right: 14 },
  });

  // Get the final Y position after the table
  yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Totals section (negative amounts)
  const vatRate = settings.vat_rate || 20;
  const subtotalHT = order.subtotal;
  const tvaAmount = order.tax_amount || (subtotalHT * vatRate / 100);
  const totalTTC = order.total;

  doc.setFontSize(10);
  
  // Draw totals box with red accent
  const boxWidth = 80;
  const boxX = pageWidth - 14 - boxWidth;
  
  doc.setDrawColor(180, 50, 50);
  doc.setFillColor(255, 245, 245);
  doc.rect(boxX, yPos, boxWidth, 35, 'FD');

  doc.setTextColor(60);
  doc.text('Total HT :', boxX + 5, yPos + 8);
  doc.setTextColor(180, 50, 50);
  doc.text(`-${formatCurrency(subtotalHT)}`, boxX + boxWidth - 5, yPos + 8, { align: 'right' });

  doc.setTextColor(60);
  doc.text(`TVA (${vatRate}%) :`, boxX + 5, yPos + 16);
  doc.setTextColor(180, 50, 50);
  doc.text(`-${formatCurrency(tvaAmount)}`, boxX + boxWidth - 5, yPos + 16, { align: 'right' });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(180, 50, 50);
  doc.text('Total TTC à créditer :', boxX + 5, yPos + 28);
  doc.text(`-${formatCurrency(totalTTC)}`, boxX + boxWidth - 5, yPos + 28, { align: 'right' });

  yPos += 50;

  // Refund method info
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0);
  doc.text("Ce montant sera remboursé selon le mode de paiement original.", 14, yPos);
  
  if (order.payment_method) {
    yPos += 6;
    doc.setTextColor(60);
    doc.text(`Mode de paiement original : ${order.payment_method}`, 14, yPos);
  }

  yPos += 15;

  // Legal mentions
  if (settings.legal_mentions) {
    doc.setFontSize(8);
    doc.setTextColor(100);
    const splitLegal = doc.splitTextToSize(settings.legal_mentions, pageWidth - 28);
    doc.text(splitLegal, 14, yPos);
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.setFont("helvetica", "normal");
  
  const footerText = [
    settings.legal_name || settings.shop_name,
    settings.siret ? `SIRET : ${settings.siret}` : null,
    settings.vat_number ? `TVA : ${settings.vat_number}` : null,
  ].filter(Boolean).join(' - ');
  
  doc.text(footerText, pageWidth / 2, footerY, { align: 'center' });

  return doc;
}

export function downloadCreditNote(doc: jsPDF, creditNoteNumber: string): void {
  doc.save(`Avoir-${creditNoteNumber}.pdf`);
}

export function previewCreditNote(doc: jsPDF): string {
  return doc.output('datauristring');
}
