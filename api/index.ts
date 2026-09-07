import express from 'express';

const app = express();
app.use(express.json());

// Cabeçalhos CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-public-key, x-secret-key');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Configurações SigiloPay
function getSigiloPayConfig(
  customPublicKey?: string,
  customSecretKey?: string,
  customUrl?: string
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

// Criar cobrança Pix
async function createSigiloPayPix(params: any) {
  const { orderId, amount, customer, customPublicKey, customSecretKey, customUrl } = params;
  const config = getSigiloPayConfig(customPublicKey, customSecretKey, customUrl);

  const cleanCpf = (customer?.cpf || '').replace(/\D/g, '') || '11144477735';
  const cleanPhone = (customer?.phone || '').replace(/\D/g, '') || '11999999999';

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dueDate = tomorrow.toISOString().split('T')[0];

  const endpoint = `${config.apiUrl}/gateway/pix/receive`;
  const payload = {
    identifier: orderId,
    amount: Number(Number(amount).toFixed(2)),
    client: {
      name: customer?.name || 'Cliente',
      email: customer?.email || 'cliente@exemplo.com.br',
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
    try {
      const QRCode = await import('qrcode');
      qrCodeBase64 = await (QRCode.default || QRCode).toDataURL(pixCode, { width: 340, margin: 2 });
    } catch {
      // O frontend já desenha o QR Code localmente se vier vazio
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

  throw new Error(data?.message || data?.error || `Erro da SigiloPay (${res.status}): ${resBody}`);
}

// 1. Health Check
app.get(['/api/health', '/health'], (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 2. Obter Config
app.get(['/api/sigilopay/config', '/sigilopay/config'], (req, res) => {
  const config = getSigiloPayConfig();
  res.json({
    isConfigured: config.isConfigured,
    apiUrl: config.apiUrl,
    status: config.isConfigured ? 'connected' : 'simulation_mode',
  });
});

// 3. Gerar Pix
app.post(['/api/sigilopay/create-pix', '/sigilopay/create-pix'], async (req, res) => {
  try {
    const { orderId, amount, customer, customPublicKey, customSecretKey, customUrl } = req.body;

    if (!orderId || !amount) {
      return res.status(400).json({ error: 'orderId e amount são obrigatórios.' });
    }

    const result = await createSigiloPayPix({
      orderId,
      amount,
      customer,
      customPublicKey,
      customSecretKey,
      customUrl,
    });

    res.json(result);
  } catch (err: any) {
    console.error('[SigiloPay Error]:', err);
    res.status(500).json({ error: err?.message || 'Falha ao gerar cobrança Pix.' });
  }
});

// 4. Checar Status
app.get(['/api/sigilopay/status/:id', '/sigilopay/status/:id'], async (req, res) => {
  try {
    const { id } = req.params;
    const config = getSigiloPayConfig();
    const endpoint = `${config.apiUrl}/gateway/transactions?id=${encodeURIComponent(id)}`;

    const response = await fetch(endpoint, {
      headers: {
        'x-public-key': config.publicKey,
        'x-secret-key': config.secretKey,
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return res.json({ found: true, status: data.status || 'PENDING', raw: data });
    }
    res.json({ found: false, status: 'PENDING' });
  } catch {
    res.json({ found: false, status: 'PENDING' });
  }
});

// 5. Simular Pagamento
app.post(['/api/sigilopay/simulate-paid', '/sigilopay/simulate-paid'], (req, res) => {
  res.json({ success: true, message: 'Transação marcada como PAGA!' });
});

export default app;
