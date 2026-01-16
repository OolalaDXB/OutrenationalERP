import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency } from "@/lib/format";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface SupplierInfo {
  name: string;
  type: string;
  email?: string | null;
  iban?: string | null;
  bic?: string | null;
  bank_name?: string | null;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
  vat_number?: string | null;
}

interface PayoutData {
  id: string;
  gross_sales: number;
  commission_amount: number;
  payout_amount: number;
  period_start: string;
  period_end: string;
  paid_at?: string | null;
  payment_reference?: string | null;
}

export function generateSupplierPayoutInvoicePDF(
  payout: PayoutData, 
  supplier: SupplierInfo,
  invoiceNumber: string
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header - Dark banner
  doc.setFillColor(20, 20, 20);
  doc.rect(0, 0, pageWidth, 40, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("OUTRE-NATIONAL", 15, 25);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Facture de reversement", pageWidth - 15, 18, { align: "right" });
  doc.text(invoiceNumber, pageWidth - 15, 26, { align: "right" });
  doc.setFontSize(8);
  doc.text(format(new Date(), "dd/MM/yyyy", { locale: fr }), pageWidth - 15, 34, { align: "right" });

  // Reset text color
  doc.setTextColor(0, 0, 0);
  
  let y = 55;

  // Invoice meta info
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Période concernée:", 15, y);
  doc.setFont("helvetica", "normal");
  doc.text(
    `${format(new Date(payout.period_start), "d MMMM yyyy", { locale: fr })} - ${format(new Date(payout.period_end), "d MMMM yyyy", { locale: fr })}`, 
    60, y
  );
  
  y += 8;
  if (payout.paid_at) {
    doc.setFont("helvetica", "bold");
    doc.text("Date de paiement:", 15, y);
    doc.setFont("helvetica", "normal");
    doc.text(format(new Date(payout.paid_at), "d MMMM yyyy", { locale: fr }), 60, y);
    y += 8;
  }
  
  if (payout.payment_reference) {
    doc.setFont("helvetica", "bold");
    doc.text("Référence paiement:", 15, y);
    doc.setFont("helvetica", "normal");
    doc.text(payout.payment_reference, 60, y);
    y += 8;
  }

  // Supplier info box
  y += 15;
  doc.setFillColor(245, 245, 245);
  doc.rect(15, y - 5, pageWidth - 30, 55, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Bénéficiaire", 20, y + 5);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  
  let supplierY = y + 15;
  doc.setFont("helvetica", "bold");
  doc.text(supplier.name, 20, supplierY);
  doc.setFont("helvetica", "normal");
  supplierY += 6;
  
  if (supplier.email) {
    doc.text(supplier.email, 20, supplierY);
    supplierY += 6;
  }
  
  if (supplier.address) {
    doc.text(supplier.address, 20, supplierY);
    supplierY += 5;
  }
  
  if (supplier.postal_code || supplier.city) {
    doc.text(`${supplier.postal_code || ""} ${supplier.city || ""}`.trim(), 20, supplierY);
    supplierY += 5;
  }
  
  if (supplier.country) {
    doc.text(supplier.country, 20, supplierY);
    supplierY += 5;
  }
  
  if (supplier.vat_number) {
    doc.text(`N° TVA: ${supplier.vat_number}`, 20, supplierY);
  }

  // Bank details on the right
  if (supplier.iban || supplier.bic) {
    doc.setFont("helvetica", "bold");
    doc.text("Coordonnées bancaires", 120, y + 5);
    doc.setFont("helvetica", "normal");
    
    let bankY = y + 15;
    if (supplier.bank_name) {
      doc.text(`Banque: ${supplier.bank_name}`, 120, bankY);
      bankY += 6;
    }
    if (supplier.iban) {
      doc.text(`IBAN: ${supplier.iban}`, 120, bankY);
      bankY += 6;
    }
    if (supplier.bic) {
      doc.text(`BIC: ${supplier.bic}`, 120, bankY);
    }
  }

  // Amounts table
  y += 70;
  
  const tableData = [
    ["Chiffre d'affaires brut sur la période", formatCurrency(payout.gross_sales)],
    ["Commission Outre-National", `-${formatCurrency(payout.commission_amount)}`],
    ["Montant net à reverser", formatCurrency(payout.payout_amount)]
  ];

  autoTable(doc, {
    startY: y,
    head: [["Description", "Montant"]],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: [20, 20, 20],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 10
    },
    bodyStyles: {
      fontSize: 10
    },
    columnStyles: {
      0: { cellWidth: 130 },
      1: { cellWidth: 40, halign: "right" }
    },
    margin: { left: 15, right: 15 },
    didParseCell: (data) => {
      // Make the last row (payout amount) bold
      if (data.row.index === 2 && data.section === "body") {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [230, 240, 255];
      }
      // Commission in red
      if (data.row.index === 1 && data.column.index === 1 && data.section === "body") {
        data.cell.styles.textColor = [180, 0, 0];
      }
    }
  });

  // Summary box
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  
  doc.setFillColor(20, 20, 20);
  doc.rect(pageWidth - 90, finalY, 75, 20, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Total à reverser:", pageWidth - 85, finalY + 8);
  doc.setFontSize(14);
  doc.text(formatCurrency(payout.payout_amount), pageWidth - 20, finalY + 14, { align: "right" });
  
  // Status badge
  doc.setTextColor(0, 0, 0);
  if (payout.paid_at) {
    doc.setFillColor(34, 197, 94);
    doc.roundedRect(15, finalY, 50, 12, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("PAYÉ", 40, finalY + 8, { align: "center" });
  } else {
    doc.setFillColor(234, 179, 8);
    doc.roundedRect(15, finalY, 60, 12, 3, 3, "F");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("EN ATTENTE", 45, finalY + 8, { align: "center" });
  }

  // Footer
  doc.setTextColor(128, 128, 128);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const footerY = doc.internal.pageSize.getHeight() - 25;
  doc.text("Outre-National • Distribution de vinyles", pageWidth / 2, footerY, { align: "center" });
  doc.text("Ce document atteste du versement des sommes dues au fournisseur.", pageWidth / 2, footerY + 5, { align: "center" });
  doc.text("Conservez ce document pour votre comptabilité.", pageWidth / 2, footerY + 10, { align: "center" });

  // Save the PDF
  const fileName = `reversement-${supplier.name.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(payout.period_start), "yyyyMMdd")}-${format(new Date(payout.period_end), "yyyyMMdd")}.pdf`;
  doc.save(fileName);
}
