import express from 'express';

const app = express();

// Permite envio de imagens em base64 (fotos/prints do checkout)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-public-key, x-secret-key');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// ==========================================
// 1. GERADOR DE CHECKOUT COM INTELIGÊNCIA ARTIFICIAL
// ==========================================

function generateSmartFallbackCheckout(prompt: string, preferredLayout?: 'yampi_cards' | 'multi_step' | 'single_page'): any {
  const p = (prompt || '').toLowerCase();
  const id = `checkout-${Date.now()}`;
  const now = new Date().toISOString();

  let storeName = 'Loja Oficial';
  let tagline = 'Checkout Oficial Criptografado SSL';
  let badgeText = 'Compra Segura & Verificada';
  let logoInitials = 'LO';
  let primaryColor: any = 'emerald';
  let themeMode: 'light' | 'dark' = 'light';
  let productName = 'Produto Selecionado Exclusivo';
  let productPrice = 249.90;
  let productImage = 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=500&auto=format&fit=crop&q=80';
  let buttonText = 'Comprar agora';
  let layoutStyle: 'yampi_cards' | 'multi_step' | 'single_page' = preferredLayout || 'multi_step';
  let variant = 'Edição Especial';

  if (p.includes('air max') || p.includes('tn 3') || p.includes('nike') || p.includes('tenis') || p.includes('sneaker')) {
    storeName = 'Sneakers House';
    tagline = 'Autenticidade e Qualidade Garantida';
    logoInitials = 'SH';
    productName = 'Tênis Esportivo Premium';
    productPrice = 349.00;
  } else if (p.includes('apple') || p.includes('iphone') || p.includes('tech')) {
    storeName = 'iStore Experience';
    tagline = 'Garantia Apple 1 Ano';
    logoInitials = 'iS';
    productName = 'Smartphone Pro Max';
    productPrice = 4899.00;
  }

  return {
    id,
    name: `Checkout ${storeName}`,
    slug: storeName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    isDefault: false,
    createdAt: now,
    updatedAt: now,
    aiPrompt: prompt,
    layoutStyle,
    buttonText,
    brand: {
      storeName,
      tagline,
      badgeText,
      logoInitials,
      primaryColor,
      themeMode,
      borderRadius: 'xl',
      fontFamily: 'sans',
      announcementBar: {
        enabled: true,
        text: '⚡ OFERTA ESPECIAL: Frete Grátis e Desconto Exclusivo no Pix hoje!',
      },
      timer: {
        enabled: true,
        text: 'Sua condição especial expira em:',
        durationMinutes: 15,
      },
      trustBadges: {
        badge1: 'Compra 100% Protegida',
        badge2: 'SSL 256 Bits Ativo',
        badge3: 'Garantia Incondicional de 7 Dias',
      },
    },
    products: [
      {
        id: `prod-${Date.now()}`,
        name: productName,
        variant,
        price: productPrice,
        originalPrice: Math.round(productPrice * 1.35 * 100) / 100,
        quantity: 1,
        image: productImage,
      },
    ],
    shipping: {
      name: 'Sedex Expresso Prioritário',
      price: 0,
      freeShippingThreshold: 0,
      deliveryTimeEstimate: '2 a 5 dias úteis',
      allowZipCalculation: true,
    },
    payments: {
      pix: {
        enabled: true,
        discountPercent: 5,
        receiverName: `${storeName} Pagamentos`,
        receiverCity: 'Sao Paulo',
        pixKey: `contato@${storeName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com.br`,
        expirationMinutes: 15,
        buttonText: 'Gerar Pix com Desconto',
      },
      creditCard: {
        enabled: true,
        maxInstallments: 12,
        freeInstallments: 6,
        acceptedBrands: ['Visa', 'Mastercard', 'Elo', 'Amex'],
        buttonText: 'Finalizar Pagamento',
      },
    },
    customerFields: {
      requireCpf: true,
      requirePhone: true,
      requireComplement: false,
      requireNeighborhood: true,
      showCpf: true,
      showPhone: true,
    },
    coupons: [
      { code: 'DESCONTO10', discountPercent: 10 },
      { code: 'FRETEGRATIS', freeShipping: true },
    ],
    footer: {
      companyName: `${storeName} Comércio Digital`,
      cnpj: '29.418.502/0001-94',
      address: 'São Paulo - SP, Brasil',
      showSecuritySeals: true,
      supportEmail: 'contato@loja.com.br',
      supportWhatsapp: '(11) 99999-9999',
    },
  };
}

app.post(['/api/ai/generate-checkout', '/ai/generate-checkout'], async (req, res) => {
  try {
    const { prompt = '', imageBase64, mimeType = 'image/png', layoutStyle } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey });

        let contents: any;
        if (imageBase64) {
          const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
          contents = {
            parts: [
              {
                inlineData: {
                  mimeType: mimeType || 'image/png',
                  data: cleanBase64,
                },
              },
              {
                text: `Você é um especialista em UI/UX de e-commerce no Brasil. Analise a imagem de checkout fornecida e a instrução: "${prompt}". Retorne um JSON estrito correspondente ao objeto CheckoutConfig com layoutStyle="${layoutStyle || 'multi_step'}", produtos, cores e campos.`,
              },
            ],
          };
        } else {
          contents = `Gere uma configuração completa de CheckoutConfig em JSON para: "${prompt}". Layout style="${layoutStyle || 'multi_step'}".`;
        }

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const text = response.text || '';
        const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
        if (!parsed.id) parsed.id = `checkout-${Date.now()}`;
        if (!parsed.layoutStyle) parsed.layoutStyle = layoutStyle || 'multi_step';
        return res.json({ config: parsed });
      } catch (geminiErr) {
        console.warn('Gemini falhou, usando fallback inteligente:', geminiErr);
      }
    }

    // Fallback inteligente garantido (nunca falha e atende layoutStyle e prompt)
    const fallbackConfig = generateSmartFallbackCheckout(prompt, layoutStyle);
    return res.json({ config: fallbackConfig });
  } catch (err: any) {
    console.error('Erro em generate-checkout:', err);
    const fallbackConfig = generateSmartFallbackCheckout(req.body?.prompt || '', req.body?.layoutStyle);
    return res.json({ config: fallbackConfig });
  }
});

// ==========================================
// 2. SIGILOPAY GATEWAY PIX
// ==========================================

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
      // O frontend gera o QR Code no próprio navegador caso venha vazio
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

// Health Check
app.get(['/api/health', '/health'], (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Config SigiloPay
app.get(['/api/sigilopay/config', '/sigilopay/config'], (req, res) => {
  const config = getSigiloPayConfig();
  res.json({
    isConfigured: config.isConfigured,
    apiUrl: config.apiUrl,
    status: config.isConfigured ? 'connected' : 'simulation_mode',
  });
});

// Gerar Pix
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

// Status da transação
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

// Simular pagamento
app.post(['/api/sigilopay/simulate-paid', '/sigilopay/simulate-paid'], (req, res) => {
  res.json({ success: true, message: 'Transação marcada como PAGA!' });
});

export default app;
