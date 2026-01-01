// Données de démonstration basées sur le catalogue réel outre-national.com

export interface Supplier {
  id: string;
  name: string;
  email: string | null;
  type: 'consignment' | 'purchase' | 'own';
  commissionRate: number;
  country: string;
  contactName: string;
  phone: string;
  address: string;
  products: number;
  revenue: number;
  pendingPayout: number;
  active: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  sku: string;
  title: string;
  artist: string;
  supplierId: string;
  supplierName: string;
  format: 'lp' | '2lp' | 'cd' | 'boxset' | '7inch' | 'cassette';
  sellingPrice: number;
  purchasePrice: number | null;
  description: string;
  stock: number;
  threshold: number;
  location: string;
  status: 'draft' | 'published' | 'archived';
  imageUrl: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  country: string;
  ordersCount: number;
  totalSpent: number;
  lastOrderAt: string;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  subtotal: number;
  shipping: number;
  total: number;
  items: OrderItem[];
  shippingAddress: string;
  trackingNumber: string | null;
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  productTitle: string;
  artist: string;
  quantity: number;
  unitPrice: number;
  supplierId: string;
  supplierType: 'consignment' | 'purchase' | 'own';
  commissionRate: number;
}

// Fournisseurs
export const suppliers: Supplier[] = [
  {
    id: "sup-1",
    name: "Sublime Frequencies",
    email: "orders@sublimefrequencies.com",
    type: "purchase",
    commissionRate: 0,
    country: "USA",
    contactName: "Alan Bishop",
    phone: "+1 206 555 0123",
    address: "Seattle, WA, USA",
    products: 15,
    revenue: 18923,
    pendingPayout: 0,
    active: true,
    createdAt: "2023-01-15"
  },
  {
    id: "sup-2",
    name: "Via Parigi",
    email: "contact@viaparigi.com",
    type: "consignment",
    commissionRate: 0.20,
    country: "Italie",
    contactName: "Marco Ferretti",
    phone: "+39 02 555 0123",
    address: "Milan, Italie",
    products: 12,
    revenue: 12847,
    pendingPayout: 10278,
    active: true,
    createdAt: "2023-03-20"
  },
  {
    id: "sup-3",
    name: "Outre-National Records",
    email: null,
    type: "own",
    commissionRate: 0,
    country: "France",
    contactName: "—",
    phone: "—",
    address: "Paris, France",
    products: 10,
    revenue: 9210,
    pendingPayout: 0,
    active: true,
    createdAt: "2022-01-01"
  },
  {
    id: "sup-4",
    name: "Mississippi Records",
    email: "info@mississippirecords.net",
    type: "consignment",
    commissionRate: 0.25,
    country: "USA",
    contactName: "Eric Isaacson",
    phone: "+1 503 555 0456",
    address: "Portland, OR, USA",
    products: 8,
    revenue: 8456,
    pendingPayout: 6342,
    active: true,
    createdAt: "2023-06-10"
  },
  {
    id: "sup-5",
    name: "Numero Group",
    email: "wholesale@numerogroup.com",
    type: "purchase",
    commissionRate: 0,
    country: "USA",
    contactName: "Ken Shipley",
    phone: "+1 773 555 0789",
    address: "Chicago, IL, USA",
    products: 6,
    revenue: 4892,
    pendingPayout: 0,
    active: true,
    createdAt: "2024-02-15"
  },
];

// Produits basés sur le catalogue réel
export const products: Product[] = [
  {
    id: "prod-1",
    sku: "SF130",
    title: "West Virginia Snake Handler Revival",
    artist: "Pastor Chris Congregation",
    supplierId: "sup-1",
    supplierName: "Sublime Frequencies",
    format: "lp",
    sellingPrice: 25.00,
    purchasePrice: 12.50,
    description: "They Shall Take Up Serpents - Enregistrements de services religieux pentecôtistes avec manipulation de serpents.",
    stock: 8,
    threshold: 5,
    location: "A-01",
    status: "published",
    imageUrl: "https://outre-national.com/wp-content/uploads/2025/11/SF130-324x324.jpg",
    createdAt: "2025-11-01"
  },
  {
    id: "prod-2",
    sku: "SF129",
    title: "Music From the Mountain People of Vietnam",
    artist: "Various Artists",
    supplierId: "sup-1",
    supplierName: "Sublime Frequencies",
    format: "lp",
    sellingPrice: 25.00,
    purchasePrice: 12.50,
    description: "Musiques traditionnelles des peuples montagnards du Vietnam.",
    stock: 12,
    threshold: 5,
    location: "A-02",
    status: "published",
    imageUrl: "https://outre-national.com/wp-content/uploads/2025/11/SF129-324x324.jpg",
    createdAt: "2025-11-01"
  },
  {
    id: "prod-3",
    sku: "VIA11LP",
    title: "Music Excitement Action Beauty",
    artist: "Motherfuckers JMB & Co",
    supplierId: "sup-2",
    supplierName: "Via Parigi",
    format: "lp",
    sellingPrice: 20.00,
    purchasePrice: null,
    description: "Free jazz italien explosif.",
    stock: 15,
    threshold: 10,
    location: "B-01",
    status: "published",
    imageUrl: "https://outre-national.com/wp-content/uploads/2025/07/630606757321-324x324.jpg",
    createdAt: "2025-07-15"
  },
  {
    id: "prod-4",
    sku: "VIA10LP",
    title: "Own Affairs",
    artist: "Kalahari Surfers",
    supplierId: "sup-2",
    supplierName: "Via Parigi",
    format: "lp",
    sellingPrice: 20.00,
    purchasePrice: null,
    description: "Post-punk sud-africain.",
    stock: 6,
    threshold: 10,
    location: "B-02",
    status: "published",
    imageUrl: "https://outre-national.com/wp-content/uploads/2025/07/630606757314-324x324.jpg",
    createdAt: "2025-07-15"
  },
  {
    id: "prod-5",
    sku: "SF126",
    title: "Tsapiky! Modern Music From Southwest Madagascar",
    artist: "Various Artists",
    supplierId: "sup-1",
    supplierName: "Sublime Frequencies",
    format: "lp",
    sellingPrice: 25.00,
    purchasePrice: 12.50,
    description: "Musique tsapiky moderne du sud-ouest de Madagascar.",
    stock: 0,
    threshold: 5,
    location: "A-03",
    status: "published",
    imageUrl: "https://outre-national.com/wp-content/uploads/2025/11/SF126-324x324.jpg",
    createdAt: "2025-11-01"
  },
  {
    id: "prod-6",
    sku: "SF127",
    title: "Bourini Records – Born in the City of Tanta",
    artist: "Various Artists",
    supplierId: "sup-1",
    supplierName: "Sublime Frequencies",
    format: "lp",
    sellingPrice: 25.00,
    purchasePrice: 12.50,
    description: "Lower Egyptian Urban Folklore and Bedouin Shaabi from Libya's Bourini Records 1968-75.",
    stock: 4,
    threshold: 5,
    location: "A-04",
    status: "published",
    imageUrl: "https://outre-national.com/wp-content/uploads/2025/11/SF127-324x324.jpg",
    createdAt: "2025-11-01"
  },
  {
    id: "prod-7",
    sku: "VIA09LP",
    title: "That's How I Got to Memphis",
    artist: "Alvarius B",
    supplierId: "sup-2",
    supplierName: "Via Parigi",
    format: "lp",
    sellingPrice: 20.00,
    purchasePrice: null,
    description: "And other Egyptian love songs - Alan Bishop solo.",
    stock: 22,
    threshold: 10,
    location: "B-03",
    status: "published",
    imageUrl: "https://outre-national.com/wp-content/uploads/2025/07/630606757307-324x324.jpg",
    createdAt: "2025-07-15"
  },
  {
    id: "prod-8",
    sku: "VIA08LP",
    title: "Funeste Human Nature",
    artist: "Comelade, Berrocal, Epplay",
    supplierId: "sup-2",
    supplierName: "Via Parigi",
    format: "lp",
    sellingPrice: 20.00,
    purchasePrice: null,
    description: "Collaboration entre Pascal Comelade, Jac Berrocal et Kuehn Malvezzi.",
    stock: 18,
    threshold: 10,
    location: "B-04",
    status: "published",
    imageUrl: "https://outre-national.com/wp-content/uploads/2025/07/630606757291-324x324.jpg",
    createdAt: "2025-07-15"
  },
  {
    id: "prod-9",
    sku: "SF122",
    title: "The Holy Mother (Plays The Rudra Veena)",
    artist: "Madhuvanti Pal",
    supplierId: "sup-1",
    supplierName: "Sublime Frequencies",
    format: "lp",
    sellingPrice: 36.00,
    purchasePrice: 18.00,
    description: "Rudra Veena classique indien.",
    stock: 3,
    threshold: 5,
    location: "A-05",
    status: "published",
    imageUrl: "https://outre-national.com/wp-content/uploads/2025/11/SF122-324x324.jpg",
    createdAt: "2025-11-01"
  },
  {
    id: "prod-10",
    sku: "SF121",
    title: "Sonbonbela",
    artist: "Baba Commandant",
    supplierId: "sup-1",
    supplierName: "Sublime Frequencies",
    format: "lp",
    sellingPrice: 25.00,
    purchasePrice: 12.50,
    description: "Afrobeat burkinabè explosif.",
    stock: 9,
    threshold: 5,
    location: "A-06",
    status: "published",
    imageUrl: "https://outre-national.com/wp-content/uploads/2025/11/SF121-324x324.jpg",
    createdAt: "2025-11-01"
  },
  {
    id: "prod-11",
    sku: "SF067",
    title: "Meçhul – Singles and Rarities",
    artist: "Erkin Koray",
    supplierId: "sup-1",
    supplierName: "Sublime Frequencies",
    format: "lp",
    sellingPrice: 25.00,
    purchasePrice: 12.50,
    description: "Compilations de singles rares du pionnier du rock psychédélique turc.",
    stock: 25,
    threshold: 10,
    location: "A-07",
    status: "published",
    imageUrl: "https://outre-national.com/wp-content/uploads/2025/11/SF067-324x324.jpg",
    createdAt: "2025-11-01"
  },
  {
    id: "prod-12",
    sku: "VIA06LP",
    title: "Return To The City Of Djinn",
    artist: "Muslimgauze vs The Rootsman",
    supplierId: "sup-2",
    supplierName: "Via Parigi",
    format: "lp",
    sellingPrice: 27.00,
    purchasePrice: null,
    description: "Collaboration dub/industrial orientale.",
    stock: 7,
    threshold: 10,
    location: "B-05",
    status: "published",
    imageUrl: "https://outre-national.com/wp-content/uploads/2025/07/630606762165-324x324.jpg",
    createdAt: "2025-07-15"
  },
  {
    id: "prod-13",
    sku: "ONR-001",
    title: "Forgotten Futures",
    artist: "Les Amazones d'Afrique",
    supplierId: "sup-3",
    supplierName: "Outre-National Records",
    format: "lp",
    sellingPrice: 24.00,
    purchasePrice: null,
    description: "Production propre Outre-National Records.",
    stock: 45,
    threshold: 15,
    location: "C-01",
    status: "published",
    imageUrl: "",
    createdAt: "2024-06-01"
  },
  {
    id: "prod-14",
    sku: "SF116",
    title: "Manbarani",
    artist: "Natik Awayez",
    supplierId: "sup-1",
    supplierName: "Sublime Frequencies",
    format: "lp",
    sellingPrice: 25.00,
    purchasePrice: 12.50,
    description: "Musique irakienne contemporaine.",
    stock: 11,
    threshold: 5,
    location: "A-08",
    status: "published",
    imageUrl: "https://outre-national.com/wp-content/uploads/2025/11/SF116-324x324.jpg",
    createdAt: "2025-11-01"
  },
  {
    id: "prod-15",
    sku: "VIA03LP",
    title: "The 'Imâra (The Dance Of The Stars)",
    artist: "The Tariqua Alawiya",
    supplierId: "sup-2",
    supplierName: "Via Parigi",
    format: "lp",
    sellingPrice: 20.00,
    purchasePrice: null,
    description: "Musique soufie marocaine.",
    stock: 14,
    threshold: 10,
    location: "B-06",
    status: "published",
    imageUrl: "https://outre-national.com/wp-content/uploads/2025/07/750122184002-324x324.jpg",
    createdAt: "2025-07-15"
  },
];

// Clients
export const customers: Customer[] = [
  {
    id: "cust-1",
    email: "jean.dupont@gmail.com",
    firstName: "Jean",
    lastName: "Dupont",
    phone: "+33 6 12 34 56 78",
    city: "Paris",
    country: "France",
    ordersCount: 12,
    totalSpent: 487.50,
    lastOrderAt: "2026-01-01",
    createdAt: "2024-03-15"
  },
  {
    id: "cust-2",
    email: "marie.martin@outlook.fr",
    firstName: "Marie",
    lastName: "Martin",
    phone: "+33 6 98 76 54 32",
    city: "Lyon",
    country: "France",
    ordersCount: 8,
    totalSpent: 312.00,
    lastOrderAt: "2025-12-28",
    createdAt: "2024-05-20"
  },
  {
    id: "cust-3",
    email: "pierre.bernard@free.fr",
    firstName: "Pierre",
    lastName: "Bernard",
    phone: "+33 6 11 22 33 44",
    city: "Bordeaux",
    country: "France",
    ordersCount: 5,
    totalSpent: 189.00,
    lastOrderAt: "2025-12-20",
    createdAt: "2024-08-10"
  },
  {
    id: "cust-4",
    email: "sophie.laurent@gmail.com",
    firstName: "Sophie",
    lastName: "Laurent",
    phone: "+33 6 55 66 77 88",
    city: "Marseille",
    country: "France",
    ordersCount: 15,
    totalSpent: 623.00,
    lastOrderAt: "2025-12-15",
    createdAt: "2023-11-01"
  },
  {
    id: "cust-5",
    email: "lucas.moreau@yahoo.fr",
    firstName: "Lucas",
    lastName: "Moreau",
    phone: "+33 6 99 88 77 66",
    city: "Nantes",
    country: "France",
    ordersCount: 3,
    totalSpent: 95.00,
    lastOrderAt: "2025-12-10",
    createdAt: "2025-06-15"
  },
  {
    id: "cust-6",
    email: "emma.petit@gmail.com",
    firstName: "Emma",
    lastName: "Petit",
    phone: "+33 6 44 33 22 11",
    city: "Toulouse",
    country: "France",
    ordersCount: 7,
    totalSpent: 267.00,
    lastOrderAt: "2025-12-05",
    createdAt: "2024-09-20"
  },
  {
    id: "cust-7",
    email: "thomas.durand@proton.me",
    firstName: "Thomas",
    lastName: "Durand",
    phone: "+33 6 77 88 99 00",
    city: "Lille",
    country: "France",
    ordersCount: 22,
    totalSpent: 891.50,
    lastOrderAt: "2025-12-30",
    createdAt: "2023-06-01"
  },
  {
    id: "cust-8",
    email: "max.mueller@web.de",
    firstName: "Max",
    lastName: "Müller",
    phone: "+49 170 123 4567",
    city: "Berlin",
    country: "Allemagne",
    ordersCount: 4,
    totalSpent: 156.00,
    lastOrderAt: "2025-11-28",
    createdAt: "2025-02-10"
  },
];

// Commandes
export const orders: Order[] = [
  {
    id: "ord-1",
    orderNumber: "#1259",
    customerId: "cust-1",
    customerName: "Jean Dupont",
    customerEmail: "jean.dupont@gmail.com",
    status: "pending",
    paymentStatus: "paid",
    subtotal: 120.00,
    shipping: 7.50,
    total: 127.50,
    items: [
      { productId: "prod-1", productTitle: "West Virginia Snake Handler Revival", artist: "Pastor Chris Congregation", quantity: 1, unitPrice: 25.00, supplierId: "sup-1", supplierType: "purchase", commissionRate: 0 },
      { productId: "prod-3", productTitle: "Music Excitement Action Beauty", artist: "Motherfuckers JMB & Co", quantity: 2, unitPrice: 20.00, supplierId: "sup-2", supplierType: "consignment", commissionRate: 0.20 },
      { productId: "prod-11", productTitle: "Meçhul – Singles and Rarities", artist: "Erkin Koray", quantity: 1, unitPrice: 25.00, supplierId: "sup-1", supplierType: "purchase", commissionRate: 0 },
      { productId: "prod-15", productTitle: "The 'Imâra (The Dance Of The Stars)", artist: "The Tariqua Alawiya", quantity: 1, unitPrice: 20.00, supplierId: "sup-2", supplierType: "consignment", commissionRate: 0.20 },
    ],
    shippingAddress: "15 Rue de la Paix, 75002 Paris, France",
    trackingNumber: null,
    createdAt: "2026-01-01T10:30:00"
  },
  {
    id: "ord-2",
    orderNumber: "#1258",
    customerId: "cust-2",
    customerName: "Marie Martin",
    customerEmail: "marie.martin@outlook.fr",
    status: "processing",
    paymentStatus: "paid",
    subtotal: 81.50,
    shipping: 7.50,
    total: 89.00,
    items: [
      { productId: "prod-9", productTitle: "The Holy Mother (Plays The Rudra Veena)", artist: "Madhuvanti Pal", quantity: 1, unitPrice: 36.00, supplierId: "sup-1", supplierType: "purchase", commissionRate: 0 },
      { productId: "prod-10", productTitle: "Sonbonbela", artist: "Baba Commandant", quantity: 1, unitPrice: 25.00, supplierId: "sup-1", supplierType: "purchase", commissionRate: 0 },
      { productId: "prod-4", productTitle: "Own Affairs", artist: "Kalahari Surfers", quantity: 1, unitPrice: 20.00, supplierId: "sup-2", supplierType: "consignment", commissionRate: 0.20 },
    ],
    shippingAddress: "8 Place Bellecour, 69002 Lyon, France",
    trackingNumber: null,
    createdAt: "2025-12-31T14:15:00"
  },
  {
    id: "ord-3",
    orderNumber: "#1257",
    customerId: "cust-3",
    customerName: "Pierre Bernard",
    customerEmail: "pierre.bernard@free.fr",
    status: "shipped",
    paymentStatus: "paid",
    subtotal: 226.50,
    shipping: 7.50,
    total: 234.00,
    items: [
      { productId: "prod-2", productTitle: "Music From the Mountain People of Vietnam", artist: "Various Artists", quantity: 2, unitPrice: 25.00, supplierId: "sup-1", supplierType: "purchase", commissionRate: 0 },
      { productId: "prod-12", productTitle: "Return To The City Of Djinn", artist: "Muslimgauze vs The Rootsman", quantity: 2, unitPrice: 27.00, supplierId: "sup-2", supplierType: "consignment", commissionRate: 0.20 },
      { productId: "prod-7", productTitle: "That's How I Got to Memphis", artist: "Alvarius B", quantity: 1, unitPrice: 20.00, supplierId: "sup-2", supplierType: "consignment", commissionRate: 0.20 },
      { productId: "prod-13", productTitle: "Forgotten Futures", artist: "Les Amazones d'Afrique", quantity: 2, unitPrice: 24.00, supplierId: "sup-3", supplierType: "own", commissionRate: 0 },
      { productId: "prod-8", productTitle: "Funeste Human Nature", artist: "Comelade, Berrocal, Epplay", quantity: 1, unitPrice: 20.00, supplierId: "sup-2", supplierType: "consignment", commissionRate: 0.20 },
    ],
    shippingAddress: "25 Cours de l'Intendance, 33000 Bordeaux, France",
    trackingNumber: "LP123456789FR",
    createdAt: "2025-12-30T09:45:00"
  },
  {
    id: "ord-4",
    orderNumber: "#1256",
    customerId: "cust-4",
    customerName: "Sophie Laurent",
    customerEmail: "sophie.laurent@gmail.com",
    status: "delivered",
    paymentStatus: "paid",
    subtotal: 59.50,
    shipping: 7.50,
    total: 67.00,
    items: [
      { productId: "prod-6", productTitle: "Bourini Records – Born in the City of Tanta", artist: "Various Artists", quantity: 1, unitPrice: 25.00, supplierId: "sup-1", supplierType: "purchase", commissionRate: 0 },
      { productId: "prod-14", productTitle: "Manbarani", artist: "Natik Awayez", quantity: 1, unitPrice: 25.00, supplierId: "sup-1", supplierType: "purchase", commissionRate: 0 },
    ],
    shippingAddress: "12 La Canebière, 13001 Marseille, France",
    trackingNumber: "LP987654321FR",
    createdAt: "2025-12-29T16:20:00"
  },
  {
    id: "ord-5",
    orderNumber: "#1255",
    customerId: "cust-5",
    customerName: "Lucas Moreau",
    customerEmail: "lucas.moreau@yahoo.fr",
    status: "delivered",
    paymentStatus: "paid",
    subtotal: 148.50,
    shipping: 7.50,
    total: 156.00,
    items: [
      { productId: "prod-11", productTitle: "Meçhul – Singles and Rarities", artist: "Erkin Koray", quantity: 2, unitPrice: 25.00, supplierId: "sup-1", supplierType: "purchase", commissionRate: 0 },
      { productId: "prod-3", productTitle: "Music Excitement Action Beauty", artist: "Motherfuckers JMB & Co", quantity: 1, unitPrice: 20.00, supplierId: "sup-2", supplierType: "consignment", commissionRate: 0.20 },
      { productId: "prod-7", productTitle: "That's How I Got to Memphis", artist: "Alvarius B", quantity: 2, unitPrice: 20.00, supplierId: "sup-2", supplierType: "consignment", commissionRate: 0.20 },
      { productId: "prod-13", productTitle: "Forgotten Futures", artist: "Les Amazones d'Afrique", quantity: 1, unitPrice: 24.00, supplierId: "sup-3", supplierType: "own", commissionRate: 0 },
    ],
    shippingAddress: "5 Place du Commerce, 44000 Nantes, France",
    trackingNumber: "LP456789123FR",
    createdAt: "2025-12-28T11:00:00"
  },
  {
    id: "ord-6",
    orderNumber: "#1254",
    customerId: "cust-6",
    customerName: "Emma Petit",
    customerEmail: "emma.petit@gmail.com",
    status: "cancelled",
    paymentStatus: "refunded",
    subtotal: 37.50,
    shipping: 7.50,
    total: 45.00,
    items: [
      { productId: "prod-5", productTitle: "Tsapiky! Modern Music From Southwest Madagascar", artist: "Various Artists", quantity: 1, unitPrice: 25.00, supplierId: "sup-1", supplierType: "purchase", commissionRate: 0 },
    ],
    shippingAddress: "18 Place du Capitole, 31000 Toulouse, France",
    trackingNumber: null,
    createdAt: "2025-12-27T13:30:00"
  },
  {
    id: "ord-7",
    orderNumber: "#1253",
    customerId: "cust-7",
    customerName: "Thomas Durand",
    customerEmail: "thomas.durand@proton.me",
    status: "delivered",
    paymentStatus: "paid",
    subtotal: 167.50,
    shipping: 7.50,
    total: 175.00,
    items: [
      { productId: "prod-9", productTitle: "The Holy Mother (Plays The Rudra Veena)", artist: "Madhuvanti Pal", quantity: 1, unitPrice: 36.00, supplierId: "sup-1", supplierType: "purchase", commissionRate: 0 },
      { productId: "prod-12", productTitle: "Return To The City Of Djinn", artist: "Muslimgauze vs The Rootsman", quantity: 2, unitPrice: 27.00, supplierId: "sup-2", supplierType: "consignment", commissionRate: 0.20 },
      { productId: "prod-15", productTitle: "The 'Imâra (The Dance Of The Stars)", artist: "The Tariqua Alawiya", quantity: 1, unitPrice: 20.00, supplierId: "sup-2", supplierType: "consignment", commissionRate: 0.20 },
      { productId: "prod-10", productTitle: "Sonbonbela", artist: "Baba Commandant", quantity: 1, unitPrice: 25.00, supplierId: "sup-1", supplierType: "purchase", commissionRate: 0 },
      { productId: "prod-4", productTitle: "Own Affairs", artist: "Kalahari Surfers", quantity: 1, unitPrice: 20.00, supplierId: "sup-2", supplierType: "consignment", commissionRate: 0.20 },
    ],
    shippingAddress: "3 Grand Place, 59000 Lille, France",
    trackingNumber: "LP321654987FR",
    createdAt: "2025-12-26T10:00:00"
  },
];

// Helpers
export const getSupplierById = (id: string) => suppliers.find(s => s.id === id);
export const getProductById = (id: string) => products.find(p => p.id === id);
export const getCustomerById = (id: string) => customers.find(c => c.id === id);
export const getOrderById = (id: string) => orders.find(o => o.id === id);

export const formatCurrency = (amount: number) => 
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);

export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('fr-FR', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric'
  }).format(date);
};

export const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('fr-FR', { 
    day: '2-digit', 
    month: 'short', 
    hour: '2-digit', 
    minute: '2-digit' 
  }).format(date);
};
