import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Settings } from "@/hooks/useSettings";
import { formatCurrency, formatDate } from "@/lib/format";

interface OrderItem {
  title: string;
  artist_name?: string | null;
  sku?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface OrderData {
  id: string;
  order_number: string;
  created_at: string | null;
  customer_name?: string | null;
  customer_email: string;
  shipping_address?: string | null;
  shipping_address_line_2?: string | null;
  shipping_city?: string | null;
  shipping_postal_code?: string | null;
  shipping_country?: string | null;
  subtotal: number;
  discount_amount?: number | null;
  tax_amount?: number | null;
  shipping_amount?: number | null;
  total: number;
  payment_method?: string | null;
  order_items?: OrderItem[];
}

interface GeneratePurchaseOrderParams {
  order: OrderData;
  settings: Settings;
  vatLabel?: string;
  paymentTerms?: string;
}

export async function generateProPurchaseOrderPDF({ 
  order, 
  settings,
  vatLabel = 'TVA (20%)',
  paymentTerms = '30'
}: GeneratePurchaseOrderParams): Promise<jsPDF> {
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

  // Company header (supplier)
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

  // Title
  doc.setFontSize(18);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("BON DE COMMANDE", 14, yPos);
  
  yPos += 10;

  // Order details
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60);
  
  const orderDetails = [
    `N° de commande : ${order.order_number}`,
    `Date : ${formatDate(order.created_at)}`,
    `Mode de paiement : ${order.payment_method || '—'}`,
  ];

  orderDetails.forEach((line, i) => {
    doc.text(line, 14, yPos + i * 5);
  });

  yPos += 25;

  // Items table
  const tableData = (order.order_items || []).map(item => [
    item.sku || '—',
    `${item.artist_name ? `${item.artist_name} - ` : ''}${item.title}`,
    item.quantity.toString(),
    formatCurrency(item.unit_price),
    formatCurrency(item.total_price),
  ]);

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
  const subtotalHT = order.subtotal;
  const discountAmount = order.discount_amount || 0;
  const shippingAmount = order.shipping_amount || 0;
  const tvaAmount = order.tax_amount || 0;
  const totalTTC = order.total;

  doc.setFontSize(10);
  
  // Draw totals box
  const boxWidth = 90;
  const boxX = pageWidth - 14 - boxWidth;
  const boxHeight = discountAmount > 0 ? 50 : 45;
  
  doc.setDrawColor(200);
  doc.setFillColor(248, 248, 248);
  doc.rect(boxX, yPos, boxWidth, boxHeight, 'FD');

  let lineY = yPos + 8;
  doc.setTextColor(60);
  
  if (discountAmount > 0) {
    doc.text('Remise Pro :', boxX + 5, lineY);
    doc.text(`-${formatCurrency(discountAmount)}`, boxX + boxWidth - 5, lineY, { align: 'right' });
    lineY += 8;
  }
  
  doc.text('Sous-total HT :', boxX + 5, lineY);
  doc.text(formatCurrency(subtotalHT), boxX + boxWidth - 5, lineY, { align: 'right' });
  lineY += 8;

  doc.text(`${vatLabel} :`, boxX + 5, lineY);
  doc.text(formatCurrency(tvaAmount), boxX + boxWidth - 5, lineY, { align: 'right' });
  lineY += 8;

  if (shippingAmount > 0) {
    doc.text('Frais de port :', boxX + 5, lineY);
    doc.text(formatCurrency(shippingAmount), boxX + boxWidth - 5, lineY, { align: 'right' });
    lineY += 8;
  } else {
    doc.text('Frais de port :', boxX + 5, lineY);
    doc.setTextColor(0, 128, 0);
    doc.text('Gratuit', boxX + boxWidth - 5, lineY, { align: 'right' });
    doc.setTextColor(60);
    lineY += 8;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text('Total TTC :', boxX + 5, lineY);
  doc.text(formatCurrency(totalTTC), boxX + boxWidth - 5, lineY, { align: 'right' });

  yPos += boxHeight + 15;

  // Payment terms
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60);
  doc.text(`Conditions de paiement : ${paymentTerms} jours`, 14, yPos);
  yPos += 10;

  // Payment instructions
  if (order.payment_method === 'Virement bancaire') {
    doc.setFont("helvetica", "bold");
    doc.text("Coordonnées bancaires :", 14, yPos);
    doc.setFont("helvetica", "normal");
    yPos += 6;
    
    const bankInfo = [
      settings.bank_name ? `Banque : ${settings.bank_name}` : null,
      settings.iban ? `IBAN : ${settings.iban}` : null,
      settings.bic ? `BIC : ${settings.bic}` : null,
      `Référence : ${order.order_number}`,
    ].filter(Boolean);
    
    bankInfo.forEach(line => {
      if (line) {
        doc.text(line, 14, yPos);
        yPos += 5;
      }
    });
  } else if (order.payment_method === 'PayPal') {
    doc.setFont("helvetica", "bold");
    doc.text("Paiement PayPal :", 14, yPos);
    doc.setFont("helvetica", "normal");
    yPos += 6;
    doc.text(`Adresse : ${settings.paypal_email || settings.shop_email || '—'}`, 14, yPos);
    yPos += 5;
    doc.text(`Référence : ${order.order_number}`, 14, yPos);
  }

  // Footer
  const addFooter = () => {
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
  };

  addFooter();

  return doc;
}

export function downloadProPurchaseOrder(doc: jsPDF, orderNumber: string): void {
  doc.save(`BonDeCommande-${orderNumber}.pdf`);
}