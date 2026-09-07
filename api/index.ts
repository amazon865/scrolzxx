import express from 'express';
import {
  createSigiloPayPix,
  getSigiloPayConfig,
  getSigiloPayTransactionStatus,
  handleSigiloPayWebhookEvent,
  simulateMarkAsPaid,
} from './sigilopay';

const app = express();

app.use(express.json());

// CORS headers for API calls
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-public-key, x-secret-key');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Health check
app.get(['/api/health', '/health'], (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 1. SigiloPay Config
app.get(['/api/sigilopay/config', '/sigilopay/config', '/config'], (req, res) => {
  const customPublicKey = req.query.publicKey as string;
  const customSecretKey = req.query.secretKey as string;
  const customKey = req.query.key as string;
  const customUrl = req.query.url as string;
  const config = getSigiloPayConfig(customPublicKey, customSecretKey, customUrl, customKey);
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol || 'https';
  const webhookUrl = `${protocol}://${host}/api/sigilopay/webhook`;

  res.json({
    isConfigured: config.isConfigured,
    apiUrl: config.apiUrl,
    webhookUrl,
    maskedPublicKey: config.publicKey ? `${config.publicKey.slice(0, 4)}••••••••${config.publicKey.slice(-4)}` : null,
    maskedSecretKey: config.secretKey ? `${config.secretKey.slice(0, 4)}••••••••${config.secretKey.slice(-4)}` : null,
    status: config.isConfigured ? 'connected' : 'simulation_mode',
  });
});

// 2. Create Real/Standard Pix Charge
app.post(['/api/sigilopay/create-pix', '/sigilopay/create-pix', '/create-pix'], async (req, res) => {
  try {
    const {
      orderId,
      amount,
      customer,
      products,
      shippingFee,
      discount,
      customPublicKey,
      customSecretKey,
      customKey,
      customUrl,
      checkoutId,
    } = req.body;

    if (!orderId || !amount || !customer) {
      return res.status(400).json({
        error: 'Campos obrigatórios ausentes: orderId, amount, customer.',
      });
    }

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'https';
    const appUrl = `${protocol}://${host}`;

    const result = await createSigiloPayPix(
      {
        orderId,
        amount: Number(amount),
        customer,
        products,
        shippingFee,
        discount,
        checkoutId,
        customPublicKey,
        customSecretKey,
        customKey,
        customUrl,
      },
      appUrl
    );

    res.json(result);
  } catch (err: any) {
    console.error('[SigiloPay Error] Create Pix failed:', err);
    res.status(500).json({
      error: err?.message || 'Falha ao gerar cobrança Pix via SigiloPay.',
    });
  }
});

// 3. Status Check
app.get(['/api/sigilopay/status/:id', '/sigilopay/status/:id', '/status/:id'], async (req, res) => {
  try {
    const { id } = req.params;
    const customPublicKey = req.query.publicKey as string;
    const customSecretKey = req.query.secretKey as string;
    const customUrl = req.query.url as string;

    const result = await getSigiloPayTransactionStatus(id, customPublicKey, customSecretKey, customUrl);
    res.json(result);
  } catch (err: any) {
    console.error('[SigiloPay Error] Status check failed:', err);
    res.status(500).json({ error: 'Erro ao consultar status da transação.' });
  }
});

// 4. Webhook Receiver
app.post(['/api/sigilopay/webhook', '/sigilopay/webhook', '/webhook'], (req, res) => {
  try {
    const outcome = handleSigiloPayWebhookEvent(req.body);
    res.status(200).json({
      received: true,
      outcome,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[SigiloPay Webhook Error]:', err);
    res.status(200).json({ received: false, error: err?.message });
  }
});

// 5. Test Credentials
app.post(['/api/sigilopay/test', '/sigilopay/test', '/test'], async (req, res) => {
  try {
    const {
      publicKey,
      secretKey,
      apiKey,
      apiUrl = 'https://app.sigilopay.com.br/api/v1',
    } = req.body;

    const config = getSigiloPayConfig(publicKey, secretKey, apiUrl, apiKey);

    if (!config.publicKey || !config.secretKey) {
      return res.status(400).json({
        valid: false,
        message: 'Informe a Chave Pública e a Chave Secreta para testar a conexão.',
      });
    }

    try {
      const pingUrl = `${config.apiUrl}/gateway/transactions?id=test_ping`;
      const pingRes = await fetch(pingUrl, {
        method: 'GET',
        headers: {
          'x-public-key': config.publicKey,
          'x-secret-key': config.secretKey,
          Accept: 'application/json',
        },
      });

      if (pingRes.status !== 401 && pingRes.status !== 403) {
        return res.json({
          valid: true,
          status: pingRes.status,
          message: 'Credenciais autenticadas com sucesso junto à SigiloPay!',
        });
      } else {
        return res.json({
          valid: false,
          status: pingRes.status,
          message: 'Credenciais recusadas pela SigiloPay (401/403 Não Autorizado).',
        });
      }
    } catch (fetchErr: any) {
      return res.json({
        valid: false,
        message: `Não foi possível conectar à SigiloPay: ${fetchErr?.message}`,
      });
    }
  } catch (err: any) {
    res.status(500).json({ valid: false, message: err?.message });
  }
});

// 6. Simulate Paid
app.post('/api/sigilopay/simulate-paid', (req, res) => {
  const { transactionId, orderId } = req.body;
  const target = transactionId || orderId;
  if (!target) {
    return res.status(400).json({ error: 'Informe o transactionId ou orderId.' });
  }

  const success = simulateMarkAsPaid(target);
  res.json({ success, message: success ? 'Transação marcada como PAGA!' : 'Transação não encontrada.' });
});

export default app;
