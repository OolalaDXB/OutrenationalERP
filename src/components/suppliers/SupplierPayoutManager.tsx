import { useState, useMemo } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  X, Building2, Check, Clock, Euro, Calendar, CreditCard, 
  FileText, Loader2, AlertCircle, CheckCircle2, Trash2, Eye, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";
import { StatusBadge, supplierTypeVariant, supplierTypeLabel } from "@/components/ui/status-badge";
import { 
  useSupplierPayouts, 
  useCreateSupplierPayout, 
  useMarkPayoutAsPaid,
  useDeleteSupplierPayout,
  type SupplierPayoutInsert 
} from "@/hooks/useSupplierPayouts";
import { generateSupplierPayoutInvoicePDF } from "./SupplierPayoutInvoicePDF";

interface SupplierPayoutManagerProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: { id: string; name: string; type: string; commission_rate?: number; email?: string }[];
  // Pre-fill data when creating from sales report
  prefillData?: {
    supplier_id: string;
    gross_sales: number;
    commission_amount: number;
    payout_amount: number;
    period_start: string;
    period_end: string;
  };
}

type ViewMode = "list" | "create" | "validate";

export function SupplierPayoutManager({ isOpen, onClose, suppliers, prefillData }: SupplierPayoutManagerProps) {
  const { toast } = useToast();
  const { data: payouts = [], isLoading } = useSupplierPayouts();
  const createPayout = useCreateSupplierPayout();
  const markAsPaid = useMarkPayoutAsPaid();
  const deletePayout = useDeleteSupplierPayout();

  const [viewMode, setViewMode] = useState<ViewMode>(prefillData ? "create" : "list");
  const [selectedPayout, setSelectedPayout] = useState<any>(null);
  const [paymentReference, setPaymentReference] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "paid">("all");
  const [filterSupplier, setFilterSupplier] = useState<string>("all");

  // Form state for creating new payout
  const [formData, setFormData] = useState({
    supplier_id: prefillData?.supplier_id || "",
    gross_sales: prefillData?.gross_sales || 0,
    commission_amount: prefillData?.commission_amount || 0,
    payout_amount: prefillData?.payout_amount || 0,
    period_start: prefillData?.period_start || format(new Date(), "yyyy-MM-dd"),
    period_end: prefillData?.period_end || format(new Date(), "yyyy-MM-dd"),
  });

  // Reset form when prefillData changes
  useMemo(() => {
    if (prefillData) {
      setFormData({
        supplier_id: prefillData.supplier_id,
        gross_sales: prefillData.gross_sales,
        commission_amount: prefillData.commission_amount,
        payout_amount: prefillData.payout_amount,
        period_start: prefillData.period_start,
        period_end: prefillData.period_end,
      });
      setViewMode("create");
    }
  }, [prefillData]);

  const filteredPayouts = useMemo(() => {
    return payouts.filter(p => {
      if (filterStatus !== "all" && p.status !== filterStatus) return false;
      if (filterSupplier !== "all" && p.supplier_id !== filterSupplier) return false;
      return true;
    });
  }, [payouts, filterStatus, filterSupplier]);

  const totals = useMemo(() => ({
    pending: payouts.filter(p => p.status === "pending").reduce((sum, p) => sum + p.payout_amount, 0),
    paid: payouts.filter(p => p.status === "paid").reduce((sum, p) => sum + p.payout_amount, 0),
  }), [payouts]);

  const handleCreatePayout = async () => {
    if (!formData.supplier_id) {
      toast({ title: "Erreur", description: "Sélectionnez un fournisseur", variant: "destructive" });
      return;
    }

    try {
      await createPayout.mutateAsync({
        supplier_id: formData.supplier_id,
        gross_sales: formData.gross_sales,
        commission_amount: formData.commission_amount,
        payout_amount: formData.payout_amount,
        period_start: formData.period_start,
        period_end: formData.period_end,
        status: "pending",
      });
      toast({ title: "Succès", description: "Reversement créé avec succès" });
      setViewMode("list");
      resetForm();
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de créer le reversement", variant: "destructive" });
    }
  };

  const handleMarkAsPaid = async () => {
    if (!selectedPayout) return;

    try {
      await markAsPaid.mutateAsync({
        id: selectedPayout.id,
        payment_reference: paymentReference,
      });
      
      // Generate invoice PDF automatically
      const supplier = selectedPayout.suppliers;
      if (supplier) {
        const invoiceNumber = `REV-${format(new Date(), "yyyyMMdd")}-${selectedPayout.id.slice(0, 8).toUpperCase()}`;
        generateSupplierPayoutInvoicePDF(
          {
            ...selectedPayout,
            paid_at: new Date().toISOString(),
            payment_reference: paymentReference,
          },
          {
            name: supplier.name,
            type: supplier.type,
            email: supplier.email,
            iban: supplier.iban,
            bic: supplier.bic,
            bank_name: supplier.bank_name,
          },
          invoiceNumber
        );
        toast({ title: "Succès", description: "Reversement validé et facture PDF générée" });
      } else {
        toast({ title: "Succès", description: "Reversement marqué comme payé" });
      }
      
      setViewMode("list");
      setSelectedPayout(null);
      setPaymentReference("");
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de valider le paiement", variant: "destructive" });
    }
  };

  // Function to regenerate PDF for any payout
  const handleDownloadPDF = (payout: any) => {
    const supplier = payout.suppliers;
    if (!supplier) {
      toast({ title: "Erreur", description: "Informations fournisseur manquantes", variant: "destructive" });
      return;
    }
    
    const invoiceNumber = `REV-${format(new Date(payout.created_at), "yyyyMMdd")}-${payout.id.slice(0, 8).toUpperCase()}`;
    generateSupplierPayoutInvoicePDF(
      payout,
      {
        name: supplier.name,
        type: supplier.type,
        email: supplier.email,
        iban: supplier.iban,
        bic: supplier.bic,
        bank_name: supplier.bank_name,
      },
      invoiceNumber
    );
    toast({ title: "PDF téléchargé", description: `Facture ${invoiceNumber}` });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce reversement ?")) return;
    try {
      await deletePayout.mutateAsync(id);
      toast({ title: "Succès", description: "Reversement supprimé" });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData({
      supplier_id: "",
      gross_sales: 0,
      commission_amount: 0,
      payout_amount: 0,
      period_start: format(new Date(), "yyyy-MM-dd"),
      period_end: format(new Date(), "yyyy-MM-dd"),
    });
  };

  const selectedSupplier = useMemo(() => {
    return suppliers.find(s => s.id === formData.supplier_id);
  }, [suppliers, formData.supplier_id]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl shadow-lg w-full max-w-5xl mx-4 animate-fade-in max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                {viewMode === "list" && "Gestion des reversements"}
                {viewMode === "create" && "Nouveau reversement"}
                {viewMode === "validate" && "Valider le paiement"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {viewMode === "list" && `${payouts.length} reversement(s) • ${formatCurrency(totals.pending)} en attente`}
                {viewMode === "create" && "Créer un nouveau reversement fournisseur"}
                {viewMode === "validate" && selectedPayout?.suppliers?.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {viewMode !== "list" && (
              <Button variant="ghost" size="sm" onClick={() => { setViewMode("list"); setSelectedPayout(null); }}>
                Retour
              </Button>
            )}
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {viewMode === "list" && (
            <div className="p-6 space-y-6">
              {/* KPIs */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-warning/10 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-warning-foreground mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">En attente</span>
                  </div>
                  <div className="text-2xl font-bold">{formatCurrency(totals.pending)}</div>
                  <div className="text-xs text-muted-foreground">{payouts.filter(p => p.status === "pending").length} reversement(s)</div>
                </div>
                <div className="bg-success/10 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-success mb-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Payé</span>
                  </div>
                  <div className="text-2xl font-bold">{formatCurrency(totals.paid)}</div>
                  <div className="text-xs text-muted-foreground">{payouts.filter(p => p.status === "paid").length} reversement(s)</div>
                </div>
                <div className="bg-primary/10 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-primary mb-1">
                    <Euro className="w-4 h-4" />
                    <span className="text-sm font-medium">Total</span>
                  </div>
                  <div className="text-2xl font-bold">{formatCurrency(totals.pending + totals.paid)}</div>
                  <div className="text-xs text-muted-foreground">{payouts.length} reversement(s)</div>
                </div>
              </div>

              {/* Filters & Actions */}
              <div className="flex items-center justify-between">
                <div className="flex gap-3">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="px-3 py-2 rounded-lg border border-border bg-card text-sm"
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="pending">En attente</option>
                    <option value="paid">Payé</option>
                  </select>
                  <select
                    value={filterSupplier}
                    onChange={(e) => setFilterSupplier(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-border bg-card text-sm"
                  >
                    <option value="all">Tous les fournisseurs</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <Button onClick={() => { resetForm(); setViewMode("create"); }}>
                  Nouveau reversement
                </Button>
              </div>

              {/* Payouts Table */}
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : filteredPayouts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun reversement</p>
                </div>
              ) : (
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/50">
                        <th className="text-left py-3 px-4 font-medium">Fournisseur</th>
                        <th className="text-left py-3 px-4 font-medium">Période</th>
                        <th className="text-right py-3 px-4 font-medium">CA brut</th>
                        <th className="text-right py-3 px-4 font-medium">Commission</th>
                        <th className="text-right py-3 px-4 font-medium">À reverser</th>
                        <th className="text-center py-3 px-4 font-medium">Statut</th>
                        <th className="text-right py-3 px-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPayouts.map((payout: any) => (
                        <tr key={payout.id} className="border-b border-border/50 hover:bg-secondary/30">
                          <td className="py-3 px-4">
                            <div className="font-medium">{payout.suppliers?.name || "—"}</div>
                            <div className="text-xs text-muted-foreground">
                              {payout.suppliers?.type && supplierTypeLabel[payout.suppliers.type]}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {format(new Date(payout.period_start), "d MMM", { locale: fr })} - {format(new Date(payout.period_end), "d MMM yyyy", { locale: fr })}
                          </td>
                          <td className="py-3 px-4 text-right">{formatCurrency(payout.gross_sales)}</td>
                          <td className="py-3 px-4 text-right text-muted-foreground">{formatCurrency(payout.commission_amount)}</td>
                          <td className="py-3 px-4 text-right font-medium">{formatCurrency(payout.payout_amount)}</td>
                          <td className="py-3 px-4 text-center">
                            {payout.status === "paid" ? (
                              <StatusBadge variant="success">Payé</StatusBadge>
                            ) : (
                              <StatusBadge variant="warning">En attente</StatusBadge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {payout.status === "pending" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => { setSelectedPayout(payout); setViewMode("validate"); }}
                                  className="text-success hover:text-success"
                                  title="Valider le paiement"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadPDF(payout)}
                                title="Télécharger la facture PDF"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              {payout.status === "paid" && payout.payment_reference && (
                                <span className="text-xs text-muted-foreground mr-2" title="Référence paiement">
                                  {payout.payment_reference}
                                </span>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(payout.id)}
                                className="text-destructive hover:text-destructive"
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {viewMode === "create" && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Supplier */}
                <div className="col-span-2">
                  <Label className="text-sm font-medium text-muted-foreground">Fournisseur *</Label>
                  <select
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                    className="w-full mt-1.5 px-3 py-2 rounded-lg border border-border bg-card text-sm"
                  >
                    <option value="">Sélectionner un fournisseur</option>
                    {suppliers.filter(s => s.type === "consignment" || s.type === "depot_vente").map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({supplierTypeLabel[s.type]})</option>
                    ))}
                  </select>
                </div>

                {/* Period */}
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Début de période</Label>
                  <Input
                    type="date"
                    value={formData.period_start}
                    onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Fin de période</Label>
                  <Input
                    type="date"
                    value={formData.period_end}
                    onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                    className="mt-1.5"
                  />
                </div>

                {/* Amounts */}
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">CA brut (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.gross_sales}
                    onChange={(e) => {
                      const gross = Number(e.target.value);
                      const commission = selectedSupplier?.commission_rate ? gross * selectedSupplier.commission_rate : 0;
                      setFormData({ 
                        ...formData, 
                        gross_sales: gross,
                        commission_amount: commission,
                        payout_amount: gross - commission
                      });
                    }}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Commission ON (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.commission_amount}
                    onChange={(e) => {
                      const commission = Number(e.target.value);
                      setFormData({ 
                        ...formData, 
                        commission_amount: commission,
                        payout_amount: formData.gross_sales - commission
                      });
                    }}
                    className="mt-1.5"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-sm font-medium text-muted-foreground">Montant à reverser (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.payout_amount}
                    onChange={(e) => setFormData({ ...formData, payout_amount: Number(e.target.value) })}
                    className="mt-1.5 text-lg font-semibold"
                  />
                </div>
              </div>

              {/* Summary */}
              {selectedSupplier && formData.payout_amount > 0 && (
                <div className="bg-info/10 rounded-lg p-4 border border-info/20">
                  <h4 className="font-medium mb-2">Récapitulatif</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Fournisseur:</span>
                      <span className="ml-2 font-medium">{selectedSupplier.name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Période:</span>
                      <span className="ml-2">{format(new Date(formData.period_start), "d MMM", { locale: fr })} - {format(new Date(formData.period_end), "d MMM yyyy", { locale: fr })}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Commission:</span>
                      <span className="ml-2">{selectedSupplier.commission_rate ? (selectedSupplier.commission_rate * 100).toFixed(0) : 0}%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Montant à reverser:</span>
                      <span className="ml-2 font-semibold text-info">{formatCurrency(formData.payout_amount)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setViewMode("list")}>Annuler</Button>
                <Button onClick={handleCreatePayout} disabled={createPayout.isPending}>
                  {createPayout.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Créer le reversement
                </Button>
              </div>
            </div>
          )}

          {viewMode === "validate" && selectedPayout && (
            <div className="p-6 space-y-6">
              {/* Payout details */}
              <div className="bg-secondary/30 rounded-lg p-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-muted-foreground">Fournisseur</div>
                    <div className="text-lg font-semibold">{selectedPayout.suppliers?.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Période</div>
                    <div className="font-medium">
                      {format(new Date(selectedPayout.period_start), "d MMM", { locale: fr })} - {format(new Date(selectedPayout.period_end), "d MMM yyyy", { locale: fr })}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">CA brut</div>
                    <div className="font-medium">{formatCurrency(selectedPayout.gross_sales)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Commission ON</div>
                    <div className="font-medium">{formatCurrency(selectedPayout.commission_amount)}</div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="text-sm text-muted-foreground">Montant à reverser</div>
                  <div className="text-2xl font-bold text-info">{formatCurrency(selectedPayout.payout_amount)}</div>
                </div>
              </div>

              {/* Bank details */}
              {selectedPayout.suppliers?.iban && (
                <div className="bg-card border border-border rounded-lg p-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Coordonnées bancaires
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {selectedPayout.suppliers.bank_name && (
                      <div>
                        <span className="text-muted-foreground">Banque:</span>
                        <span className="ml-2">{selectedPayout.suppliers.bank_name}</span>
                      </div>
                    )}
                    <div className="col-span-2">
                      <span className="text-muted-foreground">IBAN:</span>
                      <span className="ml-2 font-mono">{selectedPayout.suppliers.iban}</span>
                    </div>
                    {selectedPayout.suppliers.bic && (
                      <div>
                        <span className="text-muted-foreground">BIC:</span>
                        <span className="ml-2 font-mono">{selectedPayout.suppliers.bic}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Payment reference */}
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Référence de paiement (optionnel)</Label>
                <Input
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Ex: VIR-2024-001, CB-123456"
                  className="mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Numéro de virement, référence de transaction...
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => { setViewMode("list"); setSelectedPayout(null); }}>
                  Annuler
                </Button>
                <Button onClick={handleMarkAsPaid} disabled={markAsPaid.isPending} className="bg-success hover:bg-success/90">
                  {markAsPaid.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirmer le paiement
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
