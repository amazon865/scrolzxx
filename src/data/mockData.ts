import { CartItem, CustomerInfo } from '../types';

export const INITIAL_CART_ITEMS: CartItem[] = [
  {
    id: 'prod-1',
    name: 'Fone Bluetooth TWS Pro Anti-Ruído',
    variant: 'Preto Fosco • Bluetooth 5.3',
    price: 49.90,
    originalPrice: 99.90,
    quantity: 1,
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'prod-2',
    name: 'Case Protetora Reforçada para Fone',
    variant: 'Preto Carbono • Anti-Queda',
    price: 19.90,
    originalPrice: 39.90,
    quantity: 1,
    image: 'https://images.unsplash.com/photo-1584679109597-c656b19974c9?w=400&auto=format&fit=crop&q=80',
  },
];

export const SAMPLE_CUSTOMER: CustomerInfo = {
  name: 'Lucas Silva Santos',
  email: 'lucas.santos@gmail.com',
  cpf: '529.982.247-25',
  phone: '(11) 98765-4321',
  zipCode: '01310-100',
  street: 'Avenida Paulista',
  number: '1578',
  complement: 'Apto 42B',
  neighborhood: 'Bela Vista',
  city: 'São Paulo',
  state: 'SP',
};

export const TEST_CARDS = [
  {
    label: 'Cartão Visa Internacional',
    brand: 'visa',
    number: '4532 0159 8832 9104',
    holderName: 'LUCAS S SANTOS',
    expiry: '11/29',
    cvv: '824',
  },
  {
    label: 'Cartão Mastercard Gold',
    brand: 'mastercard',
    number: '5412 7512 3412 3456',
    holderName: 'LUCAS S SANTOS',
    expiry: '08/28',
    cvv: '452',
  },
  {
    label: 'Cartão Elo Nanquim',
    brand: 'elo',
    number: '6504 8712 9012 3456',
    holderName: 'LUCAS S SANTOS',
    expiry: '05/30',
    cvv: '123',
  },
];

export const VALID_COUPONS: Record<string, { discountPercent?: number; freeShipping?: boolean }> = {
  'DESCONTO10': { discountPercent: 10 },
  'PROMO15': { discountPercent: 15 },
  'FRETEGRATIS': { freeShipping: true },
};
