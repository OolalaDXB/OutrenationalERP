import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Settings } from "@/hooks/useSettings";
import type { Order, OrderItem } from "@/hooks/useOrders";
import { formatDate } from "@/lib/format";

type OrderWithItems = Order & { order_items?: OrderItem[] };

interface GenerateShippingSlipParams {
  order: OrderWithItems;
  settings: Settings;
}

export async function generateShippingSlipPDF({ order, settings }: GenerateShippingSlipParams): Promise<jsPDF> {
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

  // Company info (left side - sender)
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.setFont("helvetica", "normal");
  
  doc.text("EXPÉDITEUR / SENDER", 14, yPos);
  yPos += 5;
  
  const senderInfo = [
    settings.shop_name,
    settings.shop_address,
    `${settings.shop_postal_code || ''} ${settings.shop_city || ''}`.trim(),
    settings.shop_country,
    settings.shop_phone ? `Tél : ${settings.shop_phone}` : null,
  ].filter(Boolean);

  senderInfo.forEach((line, i) => {
    if (line) {
      doc.text(line, 14, yPos + i * 5);
    }
  });

  // Recipient box (right side)
  const boxWidth = 85;
  const boxX = pageWidth - 14 - boxWidth;
  const boxY = yPos - 5;
  
  // Calculate dynamic box height based on content
  const recipientAddress = [
    order.shipping_address,
    order.shipping_address_line_2,
    `${order.shipping_postal_code || ''} ${order.shipping_city || ''}`.trim(),
    order.shipping_country,
  ].filter(Boolean) as string[];
  
  const hasPhone = !!order.shipping_phone;
  const contentHeight = 24 + (recipientAddress.length * 5) + (hasPhone ? 8 : 0);
  const boxHeight = Math.max(50, contentHeight + 6);

  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.rect(boxX, boxY, boxWidth, boxHeight);

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("DESTINATAIRE / RECIPIENT", boxX + 5, boxY + 8);

  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  
  const recipientName = order.shipping_first_name && order.shipping_last_name
    ? `${order.shipping_first_name} ${order.shipping_last_name}`
    : order.customer_name || order.customer_email;
  
  doc.text(recipientName, boxX + 5, boxY + 16);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  recipientAddress.forEach((line, i) => {
    doc.text(line, boxX + 5, boxY + 24 + i * 5);
  });

  if (order.shipping_phone) {
    doc.setFontSize(9);
    doc.text(`Tél : ${order.shipping_phone}`, boxX + 5, boxY + 24 + recipientAddress.length * 5 + 4);
  }

  yPos += Math.max(senderInfo.length * 5, boxHeight) + 15;

  // Title
  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("BORDEREAU D'EXPÉDITION", pageWidth / 2, yPos, { align: 'center' });
  doc.setFontSize(12);
  doc.text("PACKING SLIP", pageWidth / 2, yPos + 7, { align: 'center' });
  
  yPos += 18;

  // Order details
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60);

  const orderDetails = [
    `Commande N° : ${order.order_number}`,
    `Date : ${formatDate(order.created_at)}`,
    order.shipping_method ? `Mode d'expédition : ${order.shipping_method}` : null,
    order.tracking_number ? `N° de suivi : ${order.tracking_number}` : null,
  ].filter(Boolean) as string[];

  orderDetails.forEach((line, i) => {
    doc.text(line, 14, yPos + i * 6);
  });

  yPos += orderDetails.length * 6 + 10;

  // Items table
  const tableData = (order.order_items || []).map(item => [
    item.sku || '—',
    `${item.artist_name ? `${item.artist_name} - ` : ''}${item.title}`,
    item.format || '—',
    item.quantity.toString(),
    '☐', // Checkbox for verification
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Réf.', 'Description', 'Format', 'Qté', '✓']],
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
      2: { cellWidth: 25 },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 12, halign: 'center' },
    },
    margin: { left: 14, right: 14 },
  });

  // Get the final Y position after the table
  yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Total items count
  const totalItems = (order.order_items || []).reduce((sum, item) => sum + item.quantity, 0);
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text(`TOTAL : ${totalItems} article(s)`, 14, yPos);

  // Customer notes if any
  if (order.customer_notes) {
    yPos += 15;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Notes client :", 14, yPos);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60);
    
    const splitNotes = doc.splitTextToSize(order.customer_notes, pageWidth - 28);
    doc.text(splitNotes, 14, yPos + 6);
  }

  // Signature area
  yPos = doc.internal.pageSize.getHeight() - 60;
  
  doc.setDrawColor(200);
  doc.setFillColor(248, 248, 248);
  doc.rect(14, yPos, pageWidth - 28, 40, 'FD');

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.setFont("helvetica", "normal");
  doc.text("Préparé par / Packed by:", 20, yPos + 10);
  doc.line(20, yPos + 20, 90, yPos + 20);
  
  doc.text("Date:", 110, yPos + 10);
  doc.line(110, yPos + 20, 160, yPos + 20);

  doc.text("Signature:", 20, yPos + 30);
  doc.line(20, yPos + 35, 90, yPos + 35);

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 12;
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(`${settings.shop_name} - ${settings.shop_email || ''}`, pageWidth / 2, footerY, { align: 'center' });

  return doc;
}

export function downloadShippingSlip(doc: jsPDF, orderNumber: string): void {
  doc.save(`Bordereau-${orderNumber}.pdf`);
}

export function previewShippingSlip(doc: jsPDF): string {
  return doc.output('datauristring');
}
