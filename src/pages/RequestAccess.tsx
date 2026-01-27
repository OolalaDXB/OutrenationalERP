import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Disc3, CheckCircle2, ArrowLeft } from "lucide-react";

export function RequestAccess() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [form, setForm] = useState({
    company_name: "",
    contact_name: "",
    contact_email: "",
    role: "",
    country: "",
    estimated_products: "",
    estimated_orders_month: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!form.company_name.trim() || !form.contact_email.trim() || !form.role) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.contact_email)) {
      toast.error("Veuillez entrer une adresse email valide");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("tenant_requests" as any)
        .insert({
          company_name: form.company_name.trim(),
          contact_name: form.contact_name.trim() || null,
          contact_email: form.contact_email.trim().toLowerCase(),
          role: form.role || null,
          country: form.country.trim() || null,
          estimated_products: form.estimated_products || null,
          estimated_orders_month: form.estimated_orders_month || null,
          message: form.message.trim() || null,
        } as any);

      if (error) throw error;

      setSubmitted(true);
      toast.success("Demande envoyée !");
    } catch (err) {
      console.error("Error submitting request:", err);
      toast.error("Erreur lors de l'envoi. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] dark:bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              Demande reçue !
            </h1>
            <p className="text-muted-foreground">
              Merci pour votre intérêt. Nous examinons votre demande et vous 
              contacterons sous 24-48h.
            </p>
          </div>

          <Button onClick={() => navigate("/")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-background py-8 px-4">
      <div className="max-w-lg mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md">
              <Disc3 className="w-6 h-6 text-white" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              Demander un accès
            </h1>
            <p className="text-muted-foreground text-sm">
              Remplissez ce formulaire pour rejoindre SILLON, l'ERP des 
              distributeurs vinyle.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 bg-card p-6 rounded-xl border shadow-sm">
          {/* Company */}
          <div className="space-y-2">
            <Label htmlFor="company_name">Nom de l'entreprise *</Label>
            <Input
              id="company_name"
              value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              placeholder="Vinyl Paradise SARL"
              required
            />
          </div>

          {/* Contact Name */}
          <div className="space-y-2">
            <Label htmlFor="contact_name">Votre nom</Label>
            <Input
              id="contact_name"
              value={form.contact_name}
              onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
              placeholder="Jean Dupont"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="contact_email">Email professionnel *</Label>
            <Input
              id="contact_email"
              type="email"
              value={form.contact_email}
              onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
              placeholder="jean@vinylparadise.com"
              required
            />
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label>Type d'activité *</Label>
            <Select
              value={form.role}
              onValueChange={(v) => setForm({ ...form, role: v })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="distributor">Distributeur</SelectItem>
                <SelectItem value="label">Label</SelectItem>
                <SelectItem value="record_shop">Disquaire</SelectItem>
                <SelectItem value="other">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Country */}
          <div className="space-y-2">
            <Label htmlFor="country">Pays</Label>
            <Input
              id="country"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              placeholder="France"
            />
          </div>

          {/* Estimated Products */}
          <div className="space-y-2">
            <Label>Nombre de références (estimé)</Label>
            <Select
              value={form.estimated_products}
              onValueChange={(v) => setForm({ ...form, estimated_products: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="< 100">Moins de 100</SelectItem>
                <SelectItem value="100-500">100 à 500</SelectItem>
                <SelectItem value="500-1000">500 à 1 000</SelectItem>
                <SelectItem value="1000+">Plus de 1 000</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Estimated Orders */}
          <div className="space-y-2">
            <Label>Commandes / mois (estimé)</Label>
            <Select
              value={form.estimated_orders_month}
              onValueChange={(v) => setForm({ ...form, estimated_orders_month: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="< 50">Moins de 50</SelectItem>
                <SelectItem value="50-200">50 à 200</SelectItem>
                <SelectItem value="200-500">200 à 500</SelectItem>
                <SelectItem value="500+">Plus de 500</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message (optionnel)</Label>
            <Textarea
              id="message"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Parlez-nous de votre activité, vos besoins..."
              rows={3}
            />
          </div>

          {/* Submit */}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Envoi en cours..." : "Envoyer ma demande"}
          </Button>
        </form>

        {/* Footer */}
        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Déjà un compte ?{" "}
            <a href="/login" className="text-primary underline hover:no-underline">
              Se connecter
            </a>
          </p>
          
          <p className="text-xs text-muted-foreground">
            © 2026 Sillon. Powered by Oolala.
          </p>
        </div>
      </div>
    </div>
  );
}
