import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { addInvoiceHistory } from "@/hooks/useInvoiceHistory";
import type { Tables } from "@/integrations/supabase/types";

type Invoice = Tables<"invoices">;
type InvoiceItem = Tables<"invoice_items">;

interface InvoiceWithItems extends Invoice {
  invoice_items: InvoiceItem[];
}

interface InvoiceEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceWithItems | null;
}

interface InvoiceLineItem {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
}

export function InvoiceEditModal({ open, onOpenChange, invoice }: InvoiceEditModalProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [type, setType] = useState<"customer" | "supplier_payout">("customer");
  const [status, setStatus] = useState<"draft" | "sent" | "paid" | "overdue" | "cancelled">("draft");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<InvoiceLineItem[]>([]);

  // Load invoice data when modal opens
  useEffect(() => {
    if (invoice && open) {
      setInvoiceNumber(invoice.invoice_number);
      setType(invoice.type);
      setStatus(invoice.status || "draft");
      setRecipientName(invoice.recipient_name);
      setRecipientEmail(invoice.recipient_email || "");
      setRecipientAddress(invoice.recipient_address || "");
      setIssueDate(invoice.issue_date?.split("T")[0] || "");
      setDueDate(invoice.due_date?.split("T")[0] || "");
      setNotes(invoice.notes || "");
      setItems(
        invoice.invoice_items.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
        }))
      );
    }
  }, [invoice, open]);

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unit_price: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof InvoiceLineItem, value: string | number) => {
    const newItems = [...items];
    if (field === "quantity" || field === "unit_price") {
      newItems[index][field] = Number(value) || 0;
    } else if (field === "description") {
      newItems[index][field] = value as string;
    }
    setItems(newItems);
  };

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const taxAmount = subtotal * 0.2; // 20% TVA
  const total = subtotal + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!invoice) return;

    if (!invoiceNumber.trim()) {
      toast.error("Le numéro de facture est requis");
      return;
    }
    if (!recipientName.trim()) {
      toast.error("Le nom du destinataire est requis");
      return;
    }
    if (items.some((item) => !item.description.trim())) {
      toast.error("Toutes les lignes doivent avoir une description");
      return;
    }

    setIsSubmitting(true);

    try {
      // Update invoice
      const { error: invoiceError } = await supabase
        .from("invoices")
        .update({
          invoice_number: invoiceNumber.trim(),
          type,
          status,
          recipient_name: recipientName.trim(),
          recipient_email: recipientEmail.trim() || null,
          recipient_address: recipientAddress.trim() || null,
          issue_date: issueDate,
          due_date: dueDate || null,
          notes: notes.trim() || null,
          subtotal,
          tax_amount: taxAmount,
          total,
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoice.id);

      if (invoiceError) throw invoiceError;

      // Delete existing items
      const { error: deleteError } = await supabase
        .from("invoice_items")
        .delete()
        .eq("invoice_id", invoice.id);

      if (deleteError) throw deleteError;

      // Create new invoice items
      const invoiceItems = items.map((item) => ({
        invoice_id: invoice.id,
        description: item.description.trim(),
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price,
      }));

      const { error: itemsError } = await supabase
        .from("invoice_items")
        .insert(invoiceItems as any);

      if (itemsError) throw itemsError;

      // Record history
      const changes: Record<string, { old: unknown; new: unknown }> = {};
      if (invoice.invoice_number !== invoiceNumber.trim()) {
        changes.invoice_number = { old: invoice.invoice_number, new: invoiceNumber.trim() };
      }
      if (invoice.status !== status) {
        changes.status = { old: invoice.status, new: status };
      }
      if (invoice.recipient_name !== recipientName.trim()) {
        changes.recipient_name = { old: invoice.recipient_name, new: recipientName.trim() };
      }
      if (invoice.total !== total) {
        changes.total = { old: invoice.total, new: total };
      }
      
      await addInvoiceHistory(
        invoice.id,
        Object.keys(changes).includes("status") ? "status_changed" : "updated",
        Object.keys(changes).length > 0 ? changes : undefined
      );

      toast.success("Facture modifiée avec succès");
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-history", invoice.id] });
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating invoice:", error);
      toast.error("Erreur lors de la modification de la facture");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier la facture {invoice.invoice_number}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="editInvoiceNumber">Numéro de facture *</Label>
              <Input
                id="editInvoiceNumber"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="FC-2024-001"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editType">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as "customer" | "supplier_payout")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Facture client</SelectItem>
                  <SelectItem value="supplier_payout">Reversement fournisseur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editStatus">Statut</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="sent">Envoyée</SelectItem>
                  <SelectItem value="paid">Payée</SelectItem>
                  <SelectItem value="overdue">En retard</SelectItem>
                  <SelectItem value="cancelled">Annulée</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Recipient */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground">Destinataire</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editRecipientName">Nom *</Label>
                <Input
                  id="editRecipientName"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Nom du client ou fournisseur"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editRecipientEmail">Email</Label>
                <Input
                  id="editRecipientEmail"
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="email@exemple.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editRecipientAddress">Adresse</Label>
              <Textarea
                id="editRecipientAddress"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="Adresse complète"
                rows={2}
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="editIssueDate">Date d'émission</Label>
              <Input
                id="editIssueDate"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDueDate">Date d'échéance</Label>
              <Input
                id="editDueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm text-muted-foreground">Lignes de facture</h3>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-1" />
                Ajouter
              </Button>
            </div>

            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateItem(index, "description", e.target.value)}
                    />
                  </div>
                  <div className="w-20">
                    <Input
                      type="number"
                      min="1"
                      placeholder="Qté"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", e.target.value)}
                    />
                  </div>
                  <div className="w-28">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Prix unit."
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, "unit_price", e.target.value)}
                    />
                  </div>
                  <div className="w-24 text-right text-sm font-medium pt-2">
                    {(item.quantity * item.unit_price).toFixed(2)} €
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t pt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sous-total</span>
                <span>{subtotal.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">TVA (20%)</span>
                <span>{taxAmount.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between font-semibold text-base pt-1 border-t">
                <span>Total</span>
                <span>{total.toFixed(2)} €</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="editNotes">Notes</Label>
            <Textarea
              id="editNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes visibles sur la facture"
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Enregistrement..." : "Enregistrer les modifications"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
