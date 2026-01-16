export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          changes: Json | null
          created_at: string | null
          description: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      artists: {
        Row: {
          bio: string | null
          country: string | null
          created_at: string | null
          discogs_id: string | null
          id: string
          image_url: string | null
          name: string
          products_count: number | null
          slug: string | null
          sort_name: string | null
          updated_at: string | null
        }
        Insert: {
          bio?: string | null
          country?: string | null
          created_at?: string | null
          discogs_id?: string | null
          id?: string
          image_url?: string | null
          name: string
          products_count?: number | null
          slug?: string | null
          sort_name?: string | null
          updated_at?: string | null
        }
        Update: {
          bio?: string | null
          country?: string | null
          created_at?: string | null
          discogs_id?: string | null
          id?: string
          image_url?: string | null
          name?: string
          products_count?: number | null
          slug?: string | null
          sort_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          accepts_marketing: boolean | null
          address: string | null
          address_line_2: string | null
          approved: boolean | null
          auth_user_id: string | null
          average_order_value: number | null
          city: string | null
          company_name: string | null
          country: string | null
          created_at: string | null
          credit_limit: number | null
          customer_type: string | null
          discount_rate: number | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          last_order_at: string | null
          notes: string | null
          orders_count: number | null
          payment_terms: number | null
          phone: string | null
          postal_code: string | null
          state: string | null
          tags: string[] | null
          total_spent: number | null
          updated_at: string | null
          vat_number: string | null
          website: string | null
        }
        Insert: {
          accepts_marketing?: boolean | null
          address?: string | null
          address_line_2?: string | null
          approved?: boolean | null
          auth_user_id?: string | null
          average_order_value?: number | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          credit_limit?: number | null
          customer_type?: string | null
          discount_rate?: number | null
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          last_order_at?: string | null
          notes?: string | null
          orders_count?: number | null
          payment_terms?: number | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          tags?: string[] | null
          total_spent?: number | null
          updated_at?: string | null
          vat_number?: string | null
          website?: string | null
        }
        Update: {
          accepts_marketing?: boolean | null
          address?: string | null
          address_line_2?: string | null
          approved?: boolean | null
          auth_user_id?: string | null
          average_order_value?: number | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          credit_limit?: number | null
          customer_type?: string | null
          discount_rate?: number | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          last_order_at?: string | null
          notes?: string | null
          orders_count?: number | null
          payment_terms?: number | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          tags?: string[] | null
          total_spent?: number | null
          updated_at?: string | null
          vat_number?: string | null
          website?: string | null
        }
        Relationships: []
      }
      genres: {
        Row: {
          created_at: string | null
          id: string
          name: string
          parent_id: string | null
          slug: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          parent_id?: string | null
          slug?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "genres_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_history: {
        Row: {
          action: string
          changes: Json | null
          created_at: string
          id: string
          invoice_id: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string
          id?: string
          invoice_id: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string
          id?: string
          invoice_id?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_history_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string | null
          description: string
          id: string
          invoice_id: string
          product_id: string | null
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          invoice_id: string
          product_id?: string | null
          quantity?: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          invoice_id?: string
          product_id?: string | null
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string | null
          currency: string | null
          customer_id: string | null
          due_date: string | null
          id: string
          internal_notes: string | null
          invoice_number: string
          issue_date: string
          notes: string | null
          order_id: string | null
          paid_date: string | null
          payment_method: string | null
          payment_reference: string | null
          pdf_url: string | null
          recipient_address: string | null
          recipient_email: string | null
          recipient_name: string
          status: Database["public"]["Enums"]["invoice_status"] | null
          subtotal: number
          supplier_id: string | null
          tax_amount: number | null
          total: number
          type: Database["public"]["Enums"]["invoice_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          due_date?: string | null
          id?: string
          internal_notes?: string | null
          invoice_number: string
          issue_date?: string
          notes?: string | null
          order_id?: string | null
          paid_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          pdf_url?: string | null
          recipient_address?: string | null
          recipient_email?: string | null
          recipient_name: string
          status?: Database["public"]["Enums"]["invoice_status"] | null
          subtotal: number
          supplier_id?: string | null
          tax_amount?: number | null
          total: number
          type: Database["public"]["Enums"]["invoice_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          due_date?: string | null
          id?: string
          internal_notes?: string | null
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          order_id?: string | null
          paid_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          pdf_url?: string | null
          recipient_address?: string | null
          recipient_email?: string | null
          recipient_name?: string
          status?: Database["public"]["Enums"]["invoice_status"] | null
          subtotal?: number
          supplier_id?: string | null
          tax_amount?: number | null
          total?: number
          type?: Database["public"]["Enums"]["invoice_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_supplier_sales"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      labels: {
        Row: {
          country: string | null
          created_at: string | null
          discogs_id: string | null
          id: string
          name: string
          slug: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          discogs_id?: string | null
          id?: string
          name: string
          slug?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          discogs_id?: string | null
          id?: string
          name?: string
          slug?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          artist_name: string | null
          consignment_rate: number | null
          created_at: string | null
          format: Database["public"]["Enums"]["product_format"] | null
          id: string
          image_url: string | null
          order_id: string
          product_id: string | null
          quantity: number
          sku: string | null
          supplier_id: string | null
          supplier_name: string | null
          supplier_type: Database["public"]["Enums"]["supplier_type"] | null
          title: string
          total_price: number
          unit_cost: number | null
          unit_price: number
        }
        Insert: {
          artist_name?: string | null
          consignment_rate?: number | null
          created_at?: string | null
          format?: Database["public"]["Enums"]["product_format"] | null
          id?: string
          image_url?: string | null
          order_id: string
          product_id?: string | null
          quantity?: number
          sku?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          supplier_type?: Database["public"]["Enums"]["supplier_type"] | null
          title: string
          total_price: number
          unit_cost?: number | null
          unit_price: number
        }
        Update: {
          artist_name?: string | null
          consignment_rate?: number | null
          created_at?: string | null
          format?: Database["public"]["Enums"]["product_format"] | null
          id?: string
          image_url?: string | null
          order_id?: string
          product_id?: string | null
          quantity?: number
          sku?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          supplier_type?: Database["public"]["Enums"]["supplier_type"] | null
          title?: string
          total_price?: number
          unit_cost?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_supplier_sales"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      orders: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          created_at: string | null
          currency: string | null
          customer_email: string
          customer_id: string | null
          customer_name: string | null
          customer_notes: string | null
          delivered_at: string | null
          discount_amount: number | null
          id: string
          internal_notes: string | null
          order_number: string
          paid_at: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          shipped_at: string | null
          shipping_address: string | null
          shipping_address_line_2: string | null
          shipping_amount: number | null
          shipping_city: string | null
          shipping_country: string | null
          shipping_first_name: string | null
          shipping_last_name: string | null
          shipping_method: string | null
          shipping_phone: string | null
          shipping_postal_code: string | null
          source: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          subtotal: number
          tax_amount: number | null
          total: number
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string | null
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          currency?: string | null
          customer_email: string
          customer_id?: string | null
          customer_name?: string | null
          customer_notes?: string | null
          delivered_at?: string | null
          discount_amount?: number | null
          id?: string
          internal_notes?: string | null
          order_number: string
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          shipped_at?: string | null
          shipping_address?: string | null
          shipping_address_line_2?: string | null
          shipping_amount?: number | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_first_name?: string | null
          shipping_last_name?: string | null
          shipping_method?: string | null
          shipping_phone?: string | null
          shipping_postal_code?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number
          tax_amount?: number | null
          total?: number
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string | null
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          currency?: string | null
          customer_email?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_notes?: string | null
          delivered_at?: string | null
          discount_amount?: number | null
          id?: string
          internal_notes?: string | null
          order_number?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          shipped_at?: string | null
          shipping_address?: string | null
          shipping_address_line_2?: string | null
          shipping_amount?: number | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_first_name?: string | null
          shipping_last_name?: string | null
          shipping_method?: string | null
          shipping_phone?: string | null
          shipping_postal_code?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number
          tax_amount?: number | null
          total?: number
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_genres: {
        Row: {
          genre_id: string
          product_id: string
        }
        Insert: {
          genre_id: string
          product_id: string
        }
        Update: {
          genre_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_genres_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_genres_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_genres_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          artist_id: string | null
          artist_name: string | null
          barcode: string | null
          catalog_number: string | null
          compare_at_price: number | null
          condition_media: Database["public"]["Enums"]["vinyl_condition"] | null
          condition_sleeve:
            | Database["public"]["Enums"]["vinyl_condition"]
            | null
          consignment_rate: number | null
          cost_price: number | null
          country_of_origin: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          discogs_id: string | null
          discogs_url: string | null
          exchange_rate: number | null
          featured: boolean | null
          format: Database["public"]["Enums"]["product_format"]
          id: string
          image_url: string | null
          image_urls: string[] | null
          import_fees: number | null
          label_id: string | null
          label_name: string | null
          location: string | null
          marketplace_fees: number | null
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          purchase_price: number | null
          selling_price: number
          shipping_cost: number | null
          sku: string
          status: Database["public"]["Enums"]["product_status"] | null
          stock: number | null
          stock_threshold: number | null
          supplier_id: string
          supplier_name: string | null
          supplier_type: Database["public"]["Enums"]["supplier_type"] | null
          title: string
          total_revenue: number | null
          total_sold: number | null
          updated_at: string | null
          year_released: number | null
        }
        Insert: {
          artist_id?: string | null
          artist_name?: string | null
          barcode?: string | null
          catalog_number?: string | null
          compare_at_price?: number | null
          condition_media?:
            | Database["public"]["Enums"]["vinyl_condition"]
            | null
          condition_sleeve?:
            | Database["public"]["Enums"]["vinyl_condition"]
            | null
          consignment_rate?: number | null
          cost_price?: number | null
          country_of_origin?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          discogs_id?: string | null
          discogs_url?: string | null
          exchange_rate?: number | null
          featured?: boolean | null
          format?: Database["public"]["Enums"]["product_format"]
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          import_fees?: number | null
          label_id?: string | null
          label_name?: string | null
          location?: string | null
          marketplace_fees?: number | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          purchase_price?: number | null
          selling_price: number
          shipping_cost?: number | null
          sku: string
          status?: Database["public"]["Enums"]["product_status"] | null
          stock?: number | null
          stock_threshold?: number | null
          supplier_id: string
          supplier_name?: string | null
          supplier_type?: Database["public"]["Enums"]["supplier_type"] | null
          title: string
          total_revenue?: number | null
          total_sold?: number | null
          updated_at?: string | null
          year_released?: number | null
        }
        Update: {
          artist_id?: string | null
          artist_name?: string | null
          barcode?: string | null
          catalog_number?: string | null
          compare_at_price?: number | null
          condition_media?:
            | Database["public"]["Enums"]["vinyl_condition"]
            | null
          condition_sleeve?:
            | Database["public"]["Enums"]["vinyl_condition"]
            | null
          consignment_rate?: number | null
          cost_price?: number | null
          country_of_origin?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          discogs_id?: string | null
          discogs_url?: string | null
          exchange_rate?: number | null
          featured?: boolean | null
          format?: Database["public"]["Enums"]["product_format"]
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          import_fees?: number | null
          label_id?: string | null
          label_name?: string | null
          location?: string | null
          marketplace_fees?: number | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          purchase_price?: number | null
          selling_price?: number
          shipping_cost?: number | null
          sku?: string
          status?: Database["public"]["Enums"]["product_status"] | null
          stock?: number | null
          stock_threshold?: number | null
          supplier_id?: string
          supplier_name?: string | null
          supplier_type?: Database["public"]["Enums"]["supplier_type"] | null
          title?: string
          total_revenue?: number | null
          total_sold?: number | null
          updated_at?: string | null
          year_released?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_supplier_sales"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          created_at: string | null
          id: string
          product_id: string | null
          purchase_order_id: string
          quantity_ordered: number
          quantity_received: number | null
          sku: string | null
          title: string
          total_cost: number
          unit_cost: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          purchase_order_id: string
          quantity_ordered: number
          quantity_received?: number | null
          sku?: string | null
          title: string
          total_cost: number
          unit_cost: number
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          purchase_order_id?: string
          quantity_ordered?: number
          quantity_received?: number | null
          sku?: string | null
          title?: string
          total_cost?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string | null
          currency: string | null
          expected_date: string | null
          id: string
          notes: string | null
          order_date: string | null
          po_number: string
          received_date: string | null
          shipping_cost: number | null
          status: string | null
          subtotal: number | null
          supplier_id: string
          total: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string | null
          po_number: string
          received_date?: string | null
          shipping_cost?: number | null
          status?: string | null
          subtotal?: number | null
          supplier_id: string
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string | null
          po_number?: string
          received_date?: string | null
          shipping_cost?: number | null
          status?: string | null
          subtotal?: number | null
          supplier_id?: string
          total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_supplier_sales"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string | null
          default_currency: string | null
          id: string
          invoice_next_number: number | null
          invoice_prefix: string | null
          legal_name: string | null
          primary_color: string | null
          shop_address: string | null
          shop_city: string | null
          shop_country: string | null
          shop_email: string | null
          shop_logo_url: string | null
          shop_name: string
          shop_phone: string | null
          shop_postal_code: string | null
          siret: string | null
          updated_at: string | null
          vat_number: string | null
          vat_rate: number | null
        }
        Insert: {
          created_at?: string | null
          default_currency?: string | null
          id?: string
          invoice_next_number?: number | null
          invoice_prefix?: string | null
          legal_name?: string | null
          primary_color?: string | null
          shop_address?: string | null
          shop_city?: string | null
          shop_country?: string | null
          shop_email?: string | null
          shop_logo_url?: string | null
          shop_name: string
          shop_phone?: string | null
          shop_postal_code?: string | null
          siret?: string | null
          updated_at?: string | null
          vat_number?: string | null
          vat_rate?: number | null
        }
        Update: {
          created_at?: string | null
          default_currency?: string | null
          id?: string
          invoice_next_number?: number | null
          invoice_prefix?: string | null
          legal_name?: string | null
          primary_color?: string | null
          shop_address?: string | null
          shop_city?: string | null
          shop_country?: string | null
          shop_email?: string | null
          shop_logo_url?: string | null
          shop_name?: string
          shop_phone?: string | null
          shop_postal_code?: string | null
          siret?: string | null
          updated_at?: string | null
          vat_number?: string | null
          vat_rate?: number | null
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          order_id: string | null
          product_id: string
          quantity: number
          reason: string | null
          reference: string | null
          stock_after: number
          stock_before: number
          supplier_id: string | null
          type: Database["public"]["Enums"]["stock_movement_type"]
          unit_cost: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          order_id?: string | null
          product_id: string
          quantity: number
          reason?: string | null
          reference?: string | null
          stock_after: number
          stock_before: number
          supplier_id?: string | null
          type: Database["public"]["Enums"]["stock_movement_type"]
          unit_cost?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          order_id?: string | null
          product_id?: string
          quantity?: number
          reason?: string | null
          reference?: string | null
          stock_after?: number
          stock_before?: number
          supplier_id?: string | null
          type?: Database["public"]["Enums"]["stock_movement_type"]
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_supplier_sales"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      supplier_payouts: {
        Row: {
          commission_amount: number
          created_at: string | null
          gross_sales: number
          id: string
          invoice_id: string | null
          paid_at: string | null
          payment_reference: string | null
          payout_amount: number
          period_end: string
          period_start: string
          status: string | null
          supplier_id: string
          updated_at: string | null
        }
        Insert: {
          commission_amount: number
          created_at?: string | null
          gross_sales: number
          id?: string
          invoice_id?: string | null
          paid_at?: string | null
          payment_reference?: string | null
          payout_amount: number
          period_end: string
          period_start: string
          status?: string | null
          supplier_id: string
          updated_at?: string | null
        }
        Update: {
          commission_amount?: number
          created_at?: string | null
          gross_sales?: number
          id?: string
          invoice_id?: string | null
          paid_at?: string | null
          payment_reference?: string | null
          payout_amount?: number
          period_end?: string
          period_start?: string
          status?: string | null
          supplier_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payouts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payouts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payouts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_supplier_sales"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      suppliers: {
        Row: {
          active: boolean | null
          address: string | null
          bank_name: string | null
          bic: string | null
          city: string | null
          commission_rate: number | null
          contact_name: string | null
          country: string | null
          created_at: string | null
          currency: string | null
          email: string | null
          iban: string | null
          id: string
          name: string
          notes: string | null
          payment_terms: number | null
          pending_payout: number | null
          phone: string | null
          postal_code: string | null
          products_count: number | null
          slug: string | null
          state: string | null
          total_revenue: number | null
          type: Database["public"]["Enums"]["supplier_type"]
          updated_at: string | null
          vat_number: string | null
          website: string | null
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          bank_name?: string | null
          bic?: string | null
          city?: string | null
          commission_rate?: number | null
          contact_name?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          iban?: string | null
          id?: string
          name: string
          notes?: string | null
          payment_terms?: number | null
          pending_payout?: number | null
          phone?: string | null
          postal_code?: string | null
          products_count?: number | null
          slug?: string | null
          state?: string | null
          total_revenue?: number | null
          type?: Database["public"]["Enums"]["supplier_type"]
          updated_at?: string | null
          vat_number?: string | null
          website?: string | null
        }
        Update: {
          active?: boolean | null
          address?: string | null
          bank_name?: string | null
          bic?: string | null
          city?: string | null
          commission_rate?: number | null
          contact_name?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          iban?: string | null
          id?: string
          name?: string
          notes?: string | null
          payment_terms?: number | null
          pending_payout?: number | null
          phone?: string | null
          postal_code?: string | null
          products_count?: number | null
          slug?: string | null
          state?: string | null
          total_revenue?: number | null
          type?: Database["public"]["Enums"]["supplier_type"]
          updated_at?: string | null
          vat_number?: string | null
          website?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          active: boolean | null
          auth_user_id: string
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          auth_user_id: string
          created_at?: string | null
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          auth_user_id?: string
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      vat_validations_cache: {
        Row: {
          company_address: string | null
          company_name: string | null
          country_code: string
          created_at: string
          expires_at: string
          id: string
          is_valid: boolean
          validated_at: string
          vat_number: string
        }
        Insert: {
          company_address?: string | null
          company_name?: string | null
          country_code: string
          created_at?: string
          expires_at?: string
          id?: string
          is_valid: boolean
          validated_at?: string
          vat_number: string
        }
        Update: {
          company_address?: string | null
          company_name?: string | null
          country_code?: string
          created_at?: string
          expires_at?: string
          id?: string
          is_valid?: boolean
          validated_at?: string
          vat_number?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_dashboard_kpis: {
        Row: {
          active_suppliers: number | null
          low_stock_alerts: number | null
          new_customers_30d: number | null
          orders_30d: number | null
          revenue_30d: number | null
        }
        Relationships: []
      }
      v_low_stock_products: {
        Row: {
          artist_id: string | null
          artist_name: string | null
          barcode: string | null
          catalog_number: string | null
          compare_at_price: number | null
          condition_media: Database["public"]["Enums"]["vinyl_condition"] | null
          condition_sleeve:
            | Database["public"]["Enums"]["vinyl_condition"]
            | null
          consignment_rate: number | null
          cost_price: number | null
          country_of_origin: string | null
          created_at: string | null
          description: string | null
          discogs_id: string | null
          discogs_url: string | null
          featured: boolean | null
          format: Database["public"]["Enums"]["product_format"] | null
          id: string | null
          image_url: string | null
          image_urls: string[] | null
          label_id: string | null
          label_name: string | null
          location: string | null
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          purchase_price: number | null
          selling_price: number | null
          sku: string | null
          status: Database["public"]["Enums"]["product_status"] | null
          stock: number | null
          stock_threshold: number | null
          supplier_email: string | null
          supplier_id: string | null
          supplier_name: string | null
          supplier_phone: string | null
          supplier_type: Database["public"]["Enums"]["supplier_type"] | null
          title: string | null
          total_revenue: number | null
          total_sold: number | null
          updated_at: string | null
          year_released: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_supplier_sales"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      v_supplier_sales: {
        Row: {
          commission_rate: number | null
          gross_sales: number | null
          items_sold: number | null
          orders_count: number | null
          our_margin: number | null
          supplier_due: number | null
          supplier_id: string | null
          supplier_name: string | null
          supplier_type: Database["public"]["Enums"]["supplier_type"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "staff" | "viewer"
      invoice_status: "draft" | "sent" | "paid" | "overdue" | "cancelled"
      invoice_type: "customer" | "supplier_payout"
      order_status:
        | "pending"
        | "confirmed"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded"
      payment_status: "pending" | "paid" | "partial" | "refunded" | "failed"
      product_format:
        | "lp"
        | "2lp"
        | "3lp"
        | "cd"
        | "boxset"
        | "7inch"
        | "10inch"
        | "12inch"
        | "cassette"
        | "digital"
      product_status: "draft" | "published" | "archived"
      stock_movement_type:
        | "purchase"
        | "sale"
        | "return"
        | "adjustment"
        | "loss"
        | "consignment_in"
        | "consignment_out"
      supplier_type: "consignment" | "purchase" | "own" | "depot_vente"
      vinyl_condition: "M" | "NM" | "VG+" | "VG" | "G+" | "G" | "F" | "P"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "staff", "viewer"],
      invoice_status: ["draft", "sent", "paid", "overdue", "cancelled"],
      invoice_type: ["customer", "supplier_payout"],
      order_status: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
      payment_status: ["pending", "paid", "partial", "refunded", "failed"],
      product_format: [
        "lp",
        "2lp",
        "3lp",
        "cd",
        "boxset",
        "7inch",
        "10inch",
        "12inch",
        "cassette",
        "digital",
      ],
      product_status: ["draft", "published", "archived"],
      stock_movement_type: [
        "purchase",
        "sale",
        "return",
        "adjustment",
        "loss",
        "consignment_in",
        "consignment_out",
      ],
      supplier_type: ["consignment", "purchase", "own", "depot_vente"],
      vinyl_condition: ["M", "NM", "VG+", "VG", "G+", "G", "F", "P"],
    },
  },
} as const
