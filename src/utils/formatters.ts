export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function formatCEP(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  const parts = [];
  for (let i = 0; i < digits.length; i += 4) {
    parts.push(digits.slice(i, i + 4));
  }
  return parts.join(' ');
}

export function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export type CardBrand = 'visa' | 'mastercard' | 'elo' | 'amex' | 'hipercard' | 'generic';

export function detectCardBrand(cardNumber: string): CardBrand {
  const clean = cardNumber.replace(/\D/g, '');
  if (!clean) return 'generic';

  // Elo prefixes: 4011, 4312, 4389, 4514, 4576, 5041, 5066, 5090, 6277, 6362, 6363, 6504, 6505, 6509, 6516, 6550
  const eloRegex = /^(4011(78|79)|431274|438935|451416|45763[12]|504175|506699|5067[0-7][0-9]|5090[0-8][0-9]|627780|636297|636368|6504|6505|6509|6516|6550)/;
  if (eloRegex.test(clean)) return 'elo';

  // Amex: 34 or 37
  if (/^3[47]/.test(clean)) return 'amex';

  // Hipercard: 606282
  if (/^606282/.test(clean)) return 'hipercard';

  // Visa: starts with 4
  if (/^4/.test(clean)) return 'visa';

  // Mastercard: starts with 51-55 or 2221-2720
  if (/^(5[1-5]|2[2-7])/.test(clean)) return 'mastercard';

  return 'generic';
}

export function generateOrderId(): string {
  const random = Math.floor(100000 + Math.random() * 900000);
  return `BR-${random}`;
}

export function generateTrackingCode(): string {
  const letters = 'BR';
  const digits = Math.floor(100000000 + Math.random() * 900000000);
  return `NL${digits}${letters}`;
}

export function generatePixPayload(
  orderIdOrOptions: string | { amount: number; orderId: string; receiverName?: string; receiverCity?: string; pixKey?: string },
  maybeAmount?: number
): string {
  let orderId = '';
  let amount = 0;
  let receiverName = 'TECHSTORE BRASIL';
  let receiverCity = 'SAO PAULO';

  if (typeof orderIdOrOptions === 'object') {
    orderId = orderIdOrOptions.orderId;
    amount = orderIdOrOptions.amount;
    if (orderIdOrOptions.receiverName) {
      receiverName = orderIdOrOptions.receiverName.toUpperCase().slice(0, 25);
    }
    if (orderIdOrOptions.receiverCity) {
      receiverCity = orderIdOrOptions.receiverCity.toUpperCase().slice(0, 15);
    }
  } else {
    orderId = orderIdOrOptions;
    amount = maybeAmount || 0;
  }

  const cleanAmount = amount.toFixed(2);
  const cleanId = orderId.replace(/[^a-zA-Z0-9]/g, '');
  return `00020126580014br.gov.bcb.pix0136f47ac10b-58cc-4372-a567-0e02b2c3d4e5520400005303986540${cleanAmount.length < 10 ? '0' : ''}${cleanAmount.length}${cleanAmount}5802BR59${receiverName.length.toString().padStart(2, '0')}${receiverName}60${receiverCity.length.toString().padStart(2, '0')}${receiverCity}62070503${cleanId}6304`;
}
