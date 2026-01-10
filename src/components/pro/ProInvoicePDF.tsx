import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency } from "@/lib/format";

interface ProCustomer {
  company_name: string | null;
  email: string;
  vat_number: string | null;
  payment_terms: number | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
}

interface OrderItem {
  title: string;
  artist_name: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  format: string | null;
  sku: string | null;
}

interface Order {
  id: string;
  order_number: string;
  created_at: string;
  subtotal: number;
  discount_amount: number | null;
  total: number;
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_postal_code: string | null;
  shipping_country: string | null;
  order_items: OrderItem[];
}

export function generateProInvoicePDF(order: Order, customer: ProCustomer) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFillColor(20, 20, 20);
  doc.rect(0, 0, pageWidth, 40, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("OUTRE-NATIONAL", 15, 25);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Facture Pro", pageWidth - 15, 20, { align: "right" });
  doc.text(order.order_number, pageWidth - 15, 28, { align: "right" });

  // Reset text color
  doc.setTextColor(0, 0, 0);
  
  let y = 55;

  // Invoice info section
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Date de commande:", 15, y);
  doc.setFont("helvetica", "normal");
  doc.text(new Date(order.created_at).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }), 60, y);
  
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text("Numéro de facture:", 15, y);
  doc.setFont("helvetica", "normal");
  doc.text(order.order_number, 60, y);

  // Customer info - left side
  y += 20;
  doc.setFillColor(245, 245, 245);
  doc.rect(15, y - 5, 85, 50, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Client", 20, y + 5);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  
  let customerY = y + 15;
  if (customer.company_name) {
    doc.setFont("helvetica", "bold");
    doc.text(customer.company_name, 20, customerY);
    doc.setFont("helvetica", "normal");
    customerY += 6;
  }
  doc.text(customer.email, 20, customerY);
  customerY += 6;
  
  if (customer.vat_number) {
    doc.text(`N° TVA: ${customer.vat_number}`, 20, customerY);
    customerY += 6;
  }
  
  if (customer.address) {
    doc.text(customer.address, 20, customerY);
    customerY += 5;
  }
  if (customer.postal_code || customer.city) {
    doc.text(`${customer.postal_code || ""} ${customer.city || ""}`.trim(), 20, customerY);
    customerY += 5;
  }
  if (customer.country) {
    doc.text(customer.country, 20, customerY);
  }

  // Shipping address - right side
  doc.setFillColor(245, 245, 245);
  doc.rect(105, y - 5, 85, 50, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Livraison", 110, y + 5);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  
  let shippingY = y + 15;
  if (order.shipping_address) {
    doc.text(order.shipping_address, 110, shippingY);
    shippingY += 6;
  }
  if (order.shipping_postal_code || order.shipping_city) {
    doc.text(`${order.shipping_postal_code || ""} ${order.shipping_city || ""}`.trim(), 110, shippingY);
    shippingY += 6;
  }
  if (order.shipping_country) {
    doc.text(order.shipping_country, 110, shippingY);
  }

  // Payment terms box
  y += 55;
  doc.setFillColor(230, 240, 255);
  doc.rect(15, y, pageWidth - 30, 12, "F");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(50, 80, 150);
  doc.text(`Conditions de paiement: ${customer.payment_terms || 30} jours`, 20, y + 8);
  doc.setTextColor(0, 0, 0);

  // Items table
  y += 20;
  
  const tableData = order.order_items.map((item) => [
    item.sku || "-",
    `${item.title}\n${item.artist_name || ""}`,
    item.format?.toUpperCase() || "-",
    item.quantity.toString(),
    formatCurrency(item.unit_price),
    formatCurrency(item.total_price)
  ]);

  autoTable(doc, {
    startY: y,
    head: [["SKU", "Produit", "Format", "Qté", "Prix unit.", "Total"]],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: [20, 20, 20],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 9
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 65 },
      2: { cellWidth: 20 },
      3: { cellWidth: 15, halign: "center" },
      4: { cellWidth: 25, halign: "right" },
      5: { cellWidth: 25, halign: "right" }
    },
    margin: { left: 15, right: 15 }
  });

  // Totals
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  const totalsX = pageWidth - 80;
  let totalsY = finalY;
  
  doc.setFontSize(10);
  
  // Subtotal
  doc.text("Sous-total HT:", totalsX, totalsY);
  doc.text(formatCurrency(order.subtotal), pageWidth - 15, totalsY, { align: "right" });
  totalsY += 8;
  
  // Discount
  if (order.discount_amount && order.discount_amount > 0) {
    doc.setTextColor(0, 128, 0);
    doc.text("Remise pro:", totalsX, totalsY);
    doc.text(`-${formatCurrency(order.discount_amount)}`, pageWidth - 15, totalsY, { align: "right" });
    doc.setTextColor(0, 0, 0);
    totalsY += 8;
  }
  
  // Total
  doc.setFillColor(20, 20, 20);
  doc.rect(totalsX - 5, totalsY - 5, pageWidth - totalsX + 5 - 10, 15, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total HT:", totalsX, totalsY + 5);
  doc.text(formatCurrency(order.total), pageWidth - 15, totalsY + 5, { align: "right" });
  
  // Footer
  doc.setTextColor(128, 128, 128);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.text("Outre-National • Distribution de vinyles", pageWidth / 2, footerY, { align: "center" });
  doc.text("Merci pour votre confiance", pageWidth / 2, footerY + 5, { align: "center" });

  // Save the PDF
  doc.save(`facture-${order.order_number}.pdf`);
}
