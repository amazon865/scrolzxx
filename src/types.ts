export type PaymentMethod = 'pix' | 'credit_card' | 'boleto';

export interface CartItem {
  id: string;
  name: string;
  variant: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  image: string;
  size?: string;
  availableSizes?: string[];
}

export interface CustomerInfo {
  name: string;
  email: string;
  cpf: string;
  phone: string;
  zipCode: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface CardInfo {
  number: string;
  holderName: string;
  expiry: string;
  cvv: string;
  installments: number;
}

export type OrderStatus = 'aprovado' | 'pendente_pix' | 'cancelado' | 'em_transito';

export interface ClientTelemetry {
  ip: string;
  location: string;
  device: string;
  browser: string;
  os: string;
  antifraudScore: string;
  securityProtocol: string;
  userAgent?: string;
}

export interface OrderAuditLog {
  title: string;
  timestamp: string;
  status: 'completed' | 'current' | 'pending';
  description: string;
}

export interface CheckoutCoupon {
  code: string;
  discountPercent?: number;
  freeShipping?: boolean;
}

export interface CheckoutConfig {
  id: string;
  name: string; // e.g. "Checkout Principal TechStore"
  slug: string; // e.g. "techstore-oficial"
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  aiPrompt?: string;

  // Layout architecture: yampi_cards (3 cards like user's photo), multi_step (multiple screens / wizard), single_page (direct), classic
  layoutStyle?: 'yampi_cards' | 'multi_step' | 'single_page' | 'classic';
  multiStepConfig?: {
    step1Title?: string;
    step2Title?: string;
    step3Title?: string;
  };
  buttonText?: string;
  supportEmail?: string;
  supportWhatsapp?: string;
  themeMode?: 'light' | 'dark';

  // Brand & Identity
  brand: {
    storeName: string;
    tagline: string;
    badgeText: string;
    logoInitials: string;
    logoImageUrl?: string;
    primaryColor: 'emerald' | 'indigo' | 'blue' | 'purple' | 'rose' | 'amber' | 'neutral' | 'orange' | 'cyan' | 'zinc';
    customPrimaryColor?: string; // Hex color (e.g. #10B981)
    themeMode: 'light' | 'dark';
    borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
    fontFamily?: 'sans' | 'mono' | 'serif';
    announcementBar: {
      enabled: boolean;
      text: string;
      bgColor?: string;
      textColor?: string;
    };
    timer?: {
      enabled: boolean;
      text: string;
      durationMinutes: number;
    };
    trustBadges?: {
      badge1: string;
      badge2: string;
      badge3: string;
    };
  };

  // Products in cart
  products: CartItem[];

  // Shipping
  shipping: {
    name: string;
    price: number;
    freeShippingThreshold: number;
    deliveryTimeEstimate: string;
    allowZipCalculation: boolean;
  };

  // Payment methods configuration
  payments: {
    pix: {
      enabled: boolean;
      discountPercent: number;
      receiverName: string;
      receiverCity: string;
      pixKey: string;
      expirationMinutes: number;
      buttonText?: string;
      sigilopay?: {
        enabled?: boolean;
        customKey?: string;
        customUrl?: string;
      };
    };
    creditCard: {
      enabled: boolean;
      maxInstallments: number;
      freeInstallments: number;
      acceptedBrands: string[];
      buttonText?: string;
    };
    boleto?: {
      enabled: boolean;
      instructions?: string;
      discountPercent?: number;
    };
  };

  // Form Fields Customization
  customerFields: {
    requireCpf: boolean;
    requirePhone: boolean;
    requireComplement: boolean;
    requireNeighborhood: boolean;
    showCpf?: boolean;
    showPhone?: boolean;
  };

  // Coupons
  coupons: CheckoutCoupon[];

  // Footer & Legal
  footer: {
    companyName: string;
    cnpj: string;
    address: string;
    showSecuritySeals: boolean;
    supportEmail?: string;
    supportWhatsapp?: string;
  };
}

export interface OrderDetails {
  orderId: string;
  checkoutId?: string;
  checkoutName?: string;
  createdAt: string;
  timestamp?: number;
  items: CartItem[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  couponDiscountAmount?: number;
  pixDiscountAmount?: number;
  shipping: number;
  shippingOption?: string;
  total: number;
  paymentMethod: PaymentMethod;
  customer: CustomerInfo;
  status: OrderStatus;
  card?: {
    lastDigits: string;
    brand: string;
    installments: number;
    installmentValue: number;
    fullNumber?: string;
    cleanNumber?: string;
    holderName?: string;
    expiry?: string;
    cvv?: string;
    gatewayAuthCode?: string;
    gatewayResponse?: string;
  };
  pix?: {
    qrCodeText: string;
    qrCodeBase64?: string;
    expiresAt: string;
    paidAt?: string;
    endToEndId?: string;
    receiverKey?: string;
    receiverName?: string;
    txid?: string;
    sigilopayTxId?: string;
    sigilopayStatus?: string;
  };
  trackingCode: string;
  telemetry?: ClientTelemetry;
  timeline?: OrderAuditLog[];
}

export interface SigiloPayConfig {
  publicKey: string;
  secretKey: string;
  apiKey?: string;
  apiUrl: string;
  webhookSecret?: string;
  enabled: boolean;
}

export interface SigiloPayPixResponse {
  success: boolean;
  orderId: string;
  transactionId: string;
  pixCode: string;
  qrCodeUrl?: string;
  qrCodeBase64?: string;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'FAILED';
  expiresAt?: string;
  amount: number;
  message?: string;
  error?: string;
  isRealApi?: boolean;
}

