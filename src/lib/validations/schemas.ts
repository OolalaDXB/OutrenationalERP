import { z } from "zod";

// Messages d'erreur en français
const messages = {
  required: "Ce champ est requis",
  email: "Email invalide",
  positiveNumber: "Le prix doit être un nombre positif",
  nonNegativeNumber: "La valeur doit être positive ou nulle",
  minItems: "Ajoutez au moins un article",
  invalidFormat: "Format invalide",
};

// ==================== PRODUCT SCHEMA ====================
export const productSchema = z.object({
  title: z.string().min(1, messages.required).max(255, "Maximum 255 caractères"),
  artist_name: z.string().optional(),
  sku: z.string().optional(),
  supplier_id: z.string().min(1, "Sélectionnez un fournisseur"),
  label_id: z.string().optional(),
  catalog_number: z.string().optional(),
  format: z.enum(["lp", "2lp", "3lp", "cd", "boxset", "7inch", "10inch", "12inch", "cassette"]),
  selling_price: z.number().min(0, messages.positiveNumber),
  purchase_price: z.number().nullable().optional(),
  marketplace_fees: z.number().min(0, messages.nonNegativeNumber).optional(),
  import_fees: z.number().min(0, messages.nonNegativeNumber).optional(),
  shipping_cost: z.number().min(0, messages.nonNegativeNumber).optional(),
  exchange_rate: z.number().positive("Le taux doit être positif").optional(),
  currency: z.string().optional(),
  description: z.string().optional(),
  stock: z.number().int("Le stock doit être un entier").min(0, messages.nonNegativeNumber),
  stock_threshold: z.number().int().min(0, messages.nonNegativeNumber).optional(),
  location: z.string().optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
  condition_media: z.enum(["M", "NM", "VG+", "VG", "G+", "G", "F", "P"]).optional(),
  condition_sleeve: z.enum(["M", "NM", "VG+", "VG", "G+", "G", "F", "P"]).optional(),
  year_released: z.number().int().min(1900).max(new Date().getFullYear()).nullable().optional(),
  image_url: z.string().url().nullable().optional(),
  image_urls: z.array(z.string().url()).nullable().optional(),
});

export type ProductFormValues = z.infer<typeof productSchema>;

// ==================== ORDER SCHEMA ====================
export const orderItemSchema = z.object({
  product_id: z.string().min(1, "Sélectionnez un produit"),
  title: z.string().min(1, messages.required),
  quantity: z.number().int().min(1, "Quantité minimum: 1"),
  unit_price: z.number().min(0, messages.positiveNumber),
});

export const orderSchema = z.object({
  customer_id: z.string().optional(),
  customer_email: z.string().email(messages.email),
  customer_name: z.string().optional(),
  shipping_address: z.string().optional(),
  shipping_city: z.string().optional(),
  shipping_postal_code: z.string().optional(),
  shipping_country: z.string().optional(),
  shipping_method: z.string().optional(),
  shipping_amount: z.number().min(0, messages.nonNegativeNumber).optional(),
  payment_method: z.string().optional(),
  payment_status: z.enum(["pending", "paid"]).optional(),
  discount_amount: z.number().min(0, messages.nonNegativeNumber).optional(),
  internal_notes: z.string().optional(),
  source: z.string().optional(),
  items: z.array(orderItemSchema).min(1, messages.minItems),
});

export type OrderFormValues = z.infer<typeof orderSchema>;
export type OrderItemFormValues = z.infer<typeof orderItemSchema>;

// ==================== CUSTOMER SCHEMA ====================
export const customerSchema = z.object({
  email: z.string().min(1, messages.required).email(messages.email),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  companyName: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  customerType: z.enum(["particulier", "professionnel"]),
  vatNumber: z.string().optional(),
  website: z.string().url("URL invalide").optional().or(z.literal("")),
}).refine(
  (data) => {
    // Pour un particulier: prénom OU nom requis
    if (data.customerType === "particulier") {
      return (data.firstName && data.firstName.trim().length > 0) || 
             (data.lastName && data.lastName.trim().length > 0);
    }
    // Pour un professionnel: nom entreprise requis
    return data.companyName && data.companyName.trim().length > 0;
  },
  {
    message: "Prénom/nom requis pour un particulier, nom d'entreprise pour un professionnel",
    path: ["firstName"], // L'erreur sera affichée sur le champ firstName
  }
);

export type CustomerFormValues = z.infer<typeof customerSchema>;

// ==================== SUPPLIER SCHEMA ====================
export const supplierSchema = z.object({
  name: z.string().min(1, messages.required).max(255, "Maximum 255 caractères"),
  email: z.string().email(messages.email).optional().or(z.literal("")),
  type: z.enum(["purchase", "own", "depot_vente", "consignment"]),
  commission_rate: z.number().min(0).max(1).optional(),
  country: z.string().optional(),
  contact_name: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postal_code: z.string().optional(),
  state: z.string().optional(),
  vat_number: z.string().optional(),
  website: z.string().url("URL invalide").optional().or(z.literal("")),
});

export type SupplierFormValues = z.infer<typeof supplierSchema>;
