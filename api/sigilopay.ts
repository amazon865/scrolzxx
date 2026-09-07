import QRCode from 'qrcode';

export interface SigiloPayChargeRequest {
  orderId: string;
  amount: number;
  customer: {
    name: string;
    email: string;
    cpf?: string;
    phone?: string;
  };
  products?: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  shippingFee?: number;
  discount?: number;
  checkoutId?: string;
  customPublicKey?: string;
  customSecretKey?: string;
  customKey?: string;
  customUrl?: string;
}

export function getSigiloPayConfig(
  customPublicKey?: string,
  customSecretKey?: string,
  customUrl?: string,
  customLegacyKey?: string
) {
  const publicKey = (
    customPublicKey ||
    process.env.SIGILOPAY_PUBLIC_KEY ||
    'guifzp7_zhklmrbkcxctkydl'
  ).trim();

  const secretKey = (
    customSecretKey ||
    process.env.SIGILOPAY_SECRET_KEY ||
    '05gpj4dschb3i5irfssvlq75j45ap005slug5rg5kw4cvm2fqsigthnsn4bnvgld'
  ).trim();

  const apiUrl = (
    customUrl ||
    process.env.SIGILOPAY_API_URL ||
    'https://app.sigilopay.com.br/api/v1'
  ).trim().replace(/\/$/, '');

  const isConfigured = Boolean(
    publicKey &&
    secretKey &&
    publicKey !== 'MY_SIGILOPAY_PUBLIC_KEY' &&
    secretKey !== 'MY_SIGILOPAY_SECRET_KEY'
  );

  return { publicKey, secretKey, apiUrl, isConfigured };
}

export async function createSigiloPayPix(params: SigiloPayChargeRequest, reqAppUrl?: string) {
  const { orderId, amount, customer, customPublicKey, customSecretKey, customUrl, customKey } = params;
  const config = getSigiloPayConfig(customPublicKey, customSecretKey, customUrl, customKey);

  const cleanCpf = (customer.cpf || '').replace(/\D/g, '') || '11144477735';
  const cleanPhone = (customer.phone || '').replace(/\D/g, '') || '11999999999';

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dueDate = tomorrow.toISOString().split('T')[0];

  const endpoint = `${config.apiUrl}/gateway/pix/receive`;
  const payload = {
    identifier: orderId,
    amount: Number(amount.toFixed(2)),
    client: {
      name: customer.name || 'Cliente',
      email: customer.email || 'cliente@exemplo.com.br',
      phone: cleanPhone,
      document: cleanCpf,
    },
    dueDate,
    metadata: { orderId },
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'x-public-key': config.publicKey,
      'x-secret-key': config.secretKey,
    },
    body: JSON.stringify(payload),
  });

  const resBody = await res.text();
  let data: any = {};
  try {
    data = JSON.parse(resBody);
  } catch {
    console.error('Resposta não-JSON da SigiloPay:', resBody);
  }

  if (res.ok && data) {
    const pixCode = data.pix?.code || data.pix?.qrcode_text || data.pix_copy_paste;
    const txId = String(data.transactionId || data.id || `sp-${orderId}`);

    let qrCodeBase64 = '';
    if (pixCode) {
      try {
        qrCodeBase64 = await QRCode.toDataURL(pixCode, { width: 340, margin: 2 });
      } catch (err) {
        console.warn('Erro ao gerar QRCode local:', err);
      }
    }

    return {
      success: true,
      transactionId: txId,
      orderId,
      pixCode: pixCode || '',
      qrCodeBase64,
      qrCodeUrl: data.pix?.image,
      status: 'PENDING',
      isRealApi: true,
      message: 'Cobrança Pix criada com sucesso via SigiloPay!',
    };
  }

  throw new Error(data?.message || data?.error || `Erro da SigiloPay (Status ${res.status}): ${resBody}`);
}

export function handleSigiloPayWebhookEvent(body: any) {
  return { processed: true, payload: body };
}

export async function getSigiloPayTransactionStatus(id: string, customPublicKey?: string, customSecretKey?: string, customUrl?: string) {
  const config = getSigiloPayConfig(customPublicKey, customSecretKey, customUrl);
  const endpoint = `${config.apiUrl}/gateway/transactions?id=${encodeURIComponent(id)}`;

  const res = await fetch(endpoint, {
    headers: {
      'x-public-key': config.publicKey,
      'x-secret-key': config.secretKey,
      'Accept': 'application/json',
    },
  });

  if (res.ok) {
    const data = await res.json();
    return { found: true, status: data.status || 'PENDING', raw: data };
  }
  return { found: false, status: 'PENDING' };
}

const activeTransactions = new Map<string, any>();

export function simulateMarkAsPaid(transactionIdOrOrderId: string): boolean {
  const record = activeTransactions.get(transactionIdOrOrderId);
  if (record) {
    record.status = 'PAID';
    record.paidAt = new Date().toISOString();
    return true;
  }
  return true;
}
