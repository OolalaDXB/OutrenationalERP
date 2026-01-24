import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Settings } from "@/hooks/useSettings";
import type { PurchaseOrderWithItems } from "@/hooks/usePurchaseOrders";
import { formatCurrency, formatDate } from "@/lib/format";

interface GeneratePurchaseOrderPDFParams {
  po: PurchaseOrderWithItems;
  settings: Settings;
}

export async function generatePurchaseOrderPDF({
  po,
  settings,
}: GeneratePurchaseOrderPDFParams): Promise<jsPDF> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const currency = po.currency || 'EUR';

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

  // Company header (buyer)
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

  // Supplier info (right side)
  const supplierInfo = [
    po.suppliers?.name,
    po.suppliers?.address,
    `${po.suppliers?.postal_code || ''} ${po.suppliers?.city || ''}`.trim(),
    po.suppliers?.country,
    po.suppliers?.email,
    po.suppliers?.phone,
  ].filter(Boolean) as string[];

  doc.setFontSize(9);
  doc.text("FOURNISSEUR :", pageWidth - 14, yPos, { align: 'right' });
  doc.setFontSize(10);
  supplierInfo.forEach((line, i) => {
    doc.text(line, pageWidth - 14, yPos + 5 + i * 5, { align: 'right' });
  });

  yPos += Math.max(companyInfo.length * 5, supplierInfo.length * 5 + 5) + 15;

  // Title
  doc.setFontSize(18);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("BON DE COMMANDE", pageWidth / 2, yPos, { align: 'center' });

  yPos += 12;

  // PO details
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60);

  const poDetails = [
    `N° Commande : ${po.po_number}`,
    `Date : ${formatDate(po.order_date || po.created_at)}`,
    po.expected_date ? `Livraison prévue : ${formatDate(po.expected_date)}` : null,
  ].filter(Boolean) as string[];

  poDetails.forEach((line, i) => {
    doc.text(line, 14, yPos + i * 5);
  });

  yPos += poDetails.length * 5 + 10;

  // Items table
  const tableData = (po.purchase_order_items || []).map((item) => [
    item.sku || '—',
    item.title,
    item.quantity_ordered.toString(),
    (item.quantity_received || 0).toString(),
    formatCurrency(item.unit_cost, currency),
    formatCurrency(item.total_cost, currency),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['SKU', 'Désignation', 'Qté Cmd', 'Qté Reçue', 'Prix unit.', 'Total']],
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
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 25, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  // Get the final Y position after the table
  yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Totals section
  const subtotal = po.purchase_order_items?.reduce((sum, item) => sum + (item.total_cost || 0), 0) || 0;
  const shippingCost = po.shipping_cost || 0;
  const total = po.total || 0;

  doc.setFontSize(10);

  // Draw totals box
  const boxWidth = 80;
  const boxX = pageWidth - 14 - boxWidth;
  const boxHeight = 35;

  doc.setDrawColor(200);
  doc.setFillColor(248, 248, 248);
  doc.rect(boxX, yPos, boxWidth, boxHeight, 'FD');

  let lineY = yPos + 8;
  doc.setTextColor(60);

  doc.text('Sous-total :', boxX + 5, lineY);
  doc.text(formatCurrency(subtotal, currency), boxX + boxWidth - 5, lineY, { align: 'right' });
  lineY += 8;

  doc.text('Frais de port :', boxX + 5, lineY);
  doc.text(formatCurrency(shippingCost, currency), boxX + boxWidth - 5, lineY, { align: 'right' });
  lineY += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text('Total :', boxX + 5, lineY);
  doc.text(formatCurrency(total, currency), boxX + boxWidth - 5, lineY, { align: 'right' });

  yPos += boxHeight + 10;

  // Notes
  if (po.notes) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(60);
    doc.text("Notes :", 14, yPos);
    doc.setFont("helvetica", "normal");
    yPos += 5;

    const splitNotes = doc.splitTextToSize(po.notes, pageWidth - 28);
    doc.text(splitNotes, 14, yPos);
    yPos += splitNotes.length * 5 + 5;
  }

  // Footer
  const addFooter = () => {
    const footerY = doc.internal.pageSize.getHeight() - 20;
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.setFont("helvetica", "normal");

    // Company info line
    const footerParts = [
      settings.legal_name || settings.shop_name,
      settings.siret ? `SIRET : ${settings.siret}` : null,
      settings.vat_number ? `TVA : ${settings.vat_number}` : null,
    ].filter(Boolean);

    doc.text(footerParts.join(' • '), pageWidth / 2, footerY, { align: 'center' });

    // Bank info line
    if (settings.iban || settings.bic) {
      const bankParts = [
        settings.bank_name,
        settings.iban ? `IBAN : ${settings.iban}` : null,
        settings.bic ? `BIC : ${settings.bic}` : null,
      ].filter(Boolean);

      doc.text(bankParts.join(' • '), pageWidth / 2, footerY + 5, { align: 'center' });
    }
  };

  addFooter();

  return doc;
}

export function downloadPurchaseOrderPDF(doc: jsPDF, poNumber: string): void {
  doc.save(`bon-commande-${poNumber}.pdf`);
}
