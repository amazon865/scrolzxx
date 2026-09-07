import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import {
  createSigiloPayPix,
  getSigiloPayConfig,
  getSigiloPayTransactionStatus,
  handleSigiloPayWebhookEvent,
  simulateMarkAsPaid,
} from "./server/sigilopay";

dotenv.config();

// Lazy Gemini client helper
let genAiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "MY_GEMINI_API_KEY") {
    return null;
  }
  if (!genAiClient) {
    genAiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return genAiClient;
}

// Fallback generator when API key is not configured or in case of rate limit
function generateSmartFallbackCheckout(prompt: string, preferredLayout?: "yampi_cards" | "multi_step" | "single_page"): any {
  const p = prompt.toLowerCase();
  const id = `checkout-${Date.now()}`;
  const now = new Date().toISOString();

  let storeName = "Nova Loja Premium";
  let tagline = "Checkout Oficial Criptografado";
  let badgeText = "Compra Segura";
  let logoInitials = "NL";
  let primaryColor: any = "emerald";
  let themeMode: "light" | "dark" = "light";
  let productName = "Produto Exclusivo Selecionado";
  let productPrice = 199.9;
  let productImage = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=80";
  let buttonText = "Comprar agora";
  let timerEnabled = false;
  let layoutStyle: "yampi_cards" | "multi_step" | "single_page" = preferredLayout || "yampi_cards";
  let variant = "Padrão Oficial";

  // Check layout structure requested by user if not specified
  if (!preferredLayout) {
    if (p.includes("multi") || p.includes("etapas") || p.includes("passos") || p.includes("+1") || p.includes("telas")) {
      layoutStyle = "multi_step";
    } else if (p.includes("one-page") || p.includes("pagina unica") || p.includes("página única") || p.includes("direto")) {
      layoutStyle = "single_page";
    } else {
      layoutStyle = "yampi_cards";
    }
  }

  // Exact match for the user's reference image (Nike Air Max Plus TN 3 Triple Black / 3 Caixas)
  if (
    p.includes("air max") ||
    p.includes("tn 3") ||
    p.includes("tn3") ||
    p.includes("triple black") ||
    p.includes("foto") ||
    p.includes("print") ||
    p.includes("yampi") ||
    p.includes("3 caixas") ||
    p.includes("jota")
  ) {
    storeName = "Jota Store";
    tagline = "Loja Oficial Sneakers & Streetwear";
    badgeText = "Autenticidade Garantida";
    logoInitials = "JC";
    primaryColor = "emerald";
    themeMode = "light";
    productName = 'Air Max Plus TN 3 "Triple Black"';
    variant = "size: 40";
    productPrice = 349.0;
    productImage = "https://images.unsplash.com/photo-1552346154-21d32810aba3?w=500&auto=format&fit=crop&q=80";
    buttonText = "Comprar agora";
    if (!p.includes("multi")) layoutStyle = "yampi_cards";
  } else if (p.includes("apple") || p.includes("iphone") || p.includes("minimalista") || p.includes("tech")) {
    storeName = "iStore Tech Experience";
    tagline = "Distribuidor Autorizado Premium";
    badgeText = "Garantia Apple 1 Ano";
    logoInitials = "iS";
    primaryColor = "neutral";
    themeMode = p.includes("escuro") || p.includes("dark") ? "dark" : "light";
    productName = "iPhone 16 Pro Max 256GB Titânio";
    productPrice = 7499.0;
    productImage = "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=500&auto=format&fit=crop&q=80";
    buttonText = "Garantir meu iPhone Agora";
  } else if (p.includes("suplemento") || p.includes("fitness") || p.includes("whey") || p.includes("creatina")) {
    storeName = "MaxPro Nutrition";
    tagline = "Fórmulas de Alta Pureza e Rendimento";
    badgeText = "Aprovado por Atletas";
    logoInitials = "MP";
    primaryColor = "emerald";
    themeMode = "dark";
    productName = "Kit Whey Protein Isolado 900g + Creatina Creapure 300g";
    productPrice = 229.9;
    productImage = "https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=500&auto=format&fit=crop&q=80";
    buttonText = "Garantir meu Kit Promocional";
    timerEnabled = true;
  } else if (p.includes("tenis") || p.includes("street") || p.includes("sneaker") || p.includes("nike")) {
    storeName = "Kicks Drop Brasil";
    tagline = "Coleção Limitada Streetwear Autêntica";
    badgeText = "100% Autêntico Verificado";
    logoInitials = "KD";
    primaryColor = "emerald";
    themeMode = "light";
    productName = 'Air Max Plus TN 3 "Triple Black"';
    variant = "size: 40";
    productPrice = 349.0;
    productImage = "https://images.unsplash.com/photo-1552346154-21d32810aba3?w=500&auto=format&fit=crop&q=80";
    buttonText = "Comprar agora";
  } else if (p.includes("beleza") || p.includes("skincare") || p.includes("cosmetico") || p.includes("perfume")) {
    storeName = "Lumière Cosmétiques";
    tagline = "Beleza Natural com Resultados Científicos";
    badgeText = "Dermatologicamente Testado";
    logoInitials = "LM";
    primaryColor = "rose";
    themeMode = "light";
    productName = "Sérum Facial Antioxidante Ácido Hialurônico + Vitamina C";
    productPrice = 147.9;
    productImage = "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500&auto=format&fit=crop&q=80";
    buttonText = "Comprar com Frete Grátis";
  }

  return {
    id,
    name: `Checkout ${storeName}`,
    slug: storeName.toLowerCase().replace(/[^a-z0-9]/g, "-"),
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
      borderRadius: "xl",
      fontFamily: "sans",
      announcementBar: {
        enabled: true,
        text: "⚡ OFERTA LIMITADA: Desconto especial aplicado automaticamente para hoje!",
      },
      timer: {
        enabled: timerEnabled,
        text: "Esta condição especial expira em:",
        durationMinutes: 15,
      },
      trustBadges: {
        badge1: "Compra 100% Protegida",
        badge2: "SSL 256 Bits Ativo",
        badge3: "Garantia Incondicional",
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
      name: "Sedex Expresso Prioritário",
      price: p.includes("gratis") || p.includes("grátis") ? 0 : 19.9,
      freeShippingThreshold: p.includes("gratis") || p.includes("grátis") ? 0 : 250,
      deliveryTimeEstimate: "2 a 4 dias úteis",
      allowZipCalculation: true,
    },
    payments: {
      pix: {
        enabled: true,
        discountPercent: p.includes("10%") ? 10 : 5,
        receiverName: `${storeName} Pagamentos Ltda`,
        receiverCity: "Sao Paulo",
        pixKey: `financeiro@${storeName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com.br`,
        expirationMinutes: 15,
        buttonText: "Gerar Código Pix Instantâneo",
      },
      creditCard: {
        enabled: !p.includes("apenas pix") && !p.includes("so pix") && !p.includes("só pix"),
        maxInstallments: 12,
        freeInstallments: 6,
        acceptedBrands: ["Visa", "Mastercard", "Elo", "Amex"],
        buttonText,
      },
    },
    customerFields: {
      requireCpf: !p.includes("sem cpf") && !p.includes("nao pedir cpf") && !p.includes("dispensar cpf"),
      requirePhone: true,
      requireComplement: false,
      requireNeighborhood: true,
      showCpf: !p.includes("sem cpf"),
      showPhone: true,
    },
    coupons: [
      { code: "DESCONTO10", discountPercent: 10 },
      { code: "FRETEGRATIS", freeShipping: true },
      { code: "PRIMEIRACOMPRA", discountPercent: 15 },
    ],
    footer: {
      companyName: `${storeName} Comércio Digital S.A.`,
      cnpj: "29.418.502/0001-94",
      address: "Av. Paulista, 1000 - Bela Vista, São Paulo - SP, 01310-100",
      showSecuritySeals: true,
      supportEmail: `suporte@${storeName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com.br`,
      supportWhatsapp: "(11) 98765-4321",
    },
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON with generous limit for multimodal base64 pictures
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // AI Checkout Generator Endpoint
  app.post("/api/ai/generate-checkout", async (req, res) => {
    try {
      const { prompt = "", imageBase64, mimeType = "image/png", currentConfig, layoutStyle } = req.body;

      if (!prompt.trim() && !imageBase64) {
        return res.status(400).json({
          error: "Por favor, envie um texto descrevendo como quer o checkout ou uma imagem de referência.",
        });
      }

      const client = getGeminiClient();

      if (!client) {
        // Fallback generator when GEMINI_API_KEY is not configured
        console.log("No GEMINI_API_KEY configured. Using intelligent rule-based generator.");
        const fallback = generateSmartFallbackCheckout(prompt || "Checkout Moderno", layoutStyle);
        return res.json({
          config: fallback,
          note: "Gerado com o motor inteligente de layout do TechStore.",
        });
      }

      const systemInstruction = `Você é o maior especialista em Engenharia de Conversão, UX/UI de E-commerce e Construtor de Checkouts Transparentes no Brasil (estilo Shopify, Yampi, CartPanda, Appmax).
O usuário quer criar ou refazer uma tela de checkout completa. Ele pode enviar uma instrução em texto (descrevendo a loja, nicho, cores, produtos, regras) E/OU uma imagem/print de um checkout que ele quer copiar ou se inspirar.

Sua missão é gerar um JSON RIGOROSAMENTE VÁLIDO correspondente ao objeto CheckoutConfig da aplicação.
Não inclua explicações ou texto antes ou depois do JSON. Apenas o JSON estrito.

ESTRUTURA DO OBJETO:
{
  "id": "checkout-<timestamp>",
  "name": "<Nome descritivo da tela, ex: Checkout Tênis Streetwear>",
  "slug": "<slug único em minúsculas com hifens>",
  "isDefault": false,
  "createdAt": "<ISO string>",
  "updatedAt": "<ISO string>",
  "aiPrompt": "<resumo da ideia>",
  "layoutStyle": "<yampi_cards | multi_step | single_page (use yampi_cards para layouts de 3 caixas estilo Yampi/Cartpanda ou foto; use multi_step se pedir +1 de uma tela ou etapas; use single_page para página direta)>",
  "buttonText": "<Texto do botão de compra principal, ex: Comprar agora, Finalizar Pedido, Garantir Oferta>",
  "brand": {
    "storeName": "<Nome da loja>",
    "tagline": "<Frase curta de credibilidade>",
    "badgeText": "<Ex: Checkout Seguro, Compra Verificada, Revendedor Oficial>",
    "logoInitials": "<2 letras maiúsculas para o logo>",
    "logoImageUrl": "<URL da imagem de logo se sugerido, ou deixe vazio>",
    "primaryColor": "<emerald | indigo | blue | purple | rose | amber | neutral | orange | cyan | zinc>",
    "customPrimaryColor": "<código HEX se aplicável, ex: #10B981 ou #F97316>",
    "themeMode": "<light ou dark (use dark se a foto for escura ou se o nicho pedir streetwear/tech/fitness)>",
    "borderRadius": "<none | sm | md | lg | xl | full>",
    "fontFamily": "<sans | mono | serif>",
    "announcementBar": {
      "enabled": <true ou false>,
      "text": "<Texto chamativo da barra superior, ex: ⚡ PROMOÇÃO DE LANÇAMENTO: Frete Grátis e 10% OFF no Pix hoje!>"
    },
    "timer": {
      "enabled": <true ou false>,
      "text": "<Texto do contador de urgência, ex: Oferta especial reservada por:>",
      "durationMinutes": <número de minutos, ex: 15>
    },
    "trustBadges": {
      "badge1": "<Ex: Compra 100% Protegida>",
      "badge2": "<Ex: SSL 256 Bits>",
      "badge3": "<Ex: Garantia Incondicional de 30 Dias>"
    }
  },
  "products": [
    {
      "id": "prod-<random>",
      "name": "<Nome do produto principal>",
      "variant": "<Variação, ex: Edição Limitada / Cor Preto / Tamanho M>",
      "price": <preço numérico em R$>,
      "originalPrice": <preço de 'de' numérico maior em R$>,
      "quantity": 1,
      "image": "<URL de alta qualidade do Unsplash compatível com o nicho>"
    }
  ],
  "shipping": {
    "name": "<Nome do frete, ex: Sedex Expresso, Entrega Ultra-Rápida>",
    "price": <preço numérico, 0 se frete grátis>,
    "freeShippingThreshold": <valor para frete grátis>,
    "deliveryTimeEstimate": "<ex: 2 a 4 dias úteis>",
    "allowZipCalculation": true
  },
  "payments": {
    "pix": {
      "enabled": <true ou false>,
      "discountPercent": <porcentagem de desconto no Pix, ex: 5 ou 10>,
      "receiverName": "<Nome da empresa para o Pix>",
      "receiverCity": "Sao Paulo",
      "pixKey": "<Chave pix simulada>",
      "expirationMinutes": 15,
      "buttonText": "<Texto chamativo do botão Pix, ex: Gerar Código Pix com Desconto>"
    },
    "creditCard": {
      "enabled": <true ou false>,
      "maxInstallments": <máximo de parcelas, ex: 12>,
      "freeInstallments": <parcelas sem juros, ex: 6 ou 12>,
      "acceptedBrands": ["Visa", "Mastercard", "Elo", "Amex"],
      "buttonText": "<Texto do botão de pagamento, ex: Finalizar Compra Segura>"
    }
  },
  "customerFields": {
    "requireCpf": <true ou false>,
    "requirePhone": true,
    "requireComplement": false,
    "requireNeighborhood": true,
    "showCpf": <true ou false>,
    "showPhone": true
  },
  "coupons": [
    { "code": "DESCONTO10", "discountPercent": 10 },
    { "code": "FRETEGRATIS", "freeShipping": true }
  ],
  "footer": {
    "companyName": "<Nome da Razão Social Ltda>",
    "cnpj": "<CNPJ formatado>",
    "address": "<Endereço comercial crível no Brasil>",
    "showSecuritySeals": true,
    "supportEmail": "<email de suporte>",
    "supportWhatsapp": "<whatsapp de suporte>"
  }
}

Regras essenciais:
1. Se o usuário enviou uma foto, analise com atenção as cores dominantes, se é tema escuro (dark) ou claro (light), produtos visíveis, logotipos, fontes e estilo geral.
2. Preços devem ser em Reais brasileiros (R$) realistas para o nicho informado.
3. Imagens de produto devem usar URLs seguras e confiáveis (ex: Unsplash com parâmetros ?w=500&auto=format&fit=crop&q=80).
4. Retorne APENAS o JSON puro.`;

      let contents: any;
      if (imageBase64) {
        const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, "");
        const imagePart = {
          inlineData: {
            mimeType: mimeType || "image/png",
            data: cleanBase64,
          },
        };
        const textPart = {
          text: `Analise a foto deste checkout e a seguinte instrução: "${prompt || "Copie o estilo visual, cores, tema e disposição desta imagem"}". Gere o JSON completo do CheckoutConfig reproduzindo a estética, produtos, cores e campos.`,
        };
        contents = { parts: [imagePart, textPart] };
      } else {
        contents = `Gere uma tela de checkout completa para a seguinte solicitação: "${prompt}".`;
      }

      const response = await client.models.generateContent({
        model: "gemini-3.8-flash",
        contents,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
        },
      });

      const responseText = response.text || "";
      let parsedConfig: any = null;

      try {
        parsedConfig = JSON.parse(responseText.trim());
      } catch (e) {
        // Try regex extraction of JSON block
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedConfig = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("Não foi possível decodificar o JSON retornado pela IA.");
        }
      }

      // Ensure mandatory fields
      if (!parsedConfig.id) parsedConfig.id = `checkout-${Date.now()}`;
      if (!parsedConfig.createdAt) parsedConfig.createdAt = new Date().toISOString();
      parsedConfig.updatedAt = new Date().toISOString();
      parsedConfig.aiPrompt = prompt;

      return res.json({
        config: parsedConfig,
        note: "Checkout gerado com sucesso pelo Gemini AI!",
      });
    } catch (err: any) {
      console.error("Error generating checkout with AI:", err);
      // Fallback gracefully so user always gets a created checkout
      const fallback = generateSmartFallbackCheckout(req.body?.prompt || "Checkout Moderno");
      return res.json({
        config: fallback,
        warning: `A IA encontrou uma instabilidade (${err?.message || "erro no processamento"}), então aplicamos nosso modelo inteligente para gerar seu checkout!`,
      });
    }
  });

  // ==========================================
  // SIGILOPAY GATEWAY PIX ENDPOINTS
  // ==========================================

  // 1. Get current SigiloPay status & webhook configuration
  app.get("/api/sigilopay/config", (req, res) => {
    const customPublicKey = req.query.publicKey as string;
    const customSecretKey = req.query.secretKey as string;
    const customKey = req.query.key as string;
    const customUrl = req.query.url as string;
    const config = getSigiloPayConfig(customPublicKey, customSecretKey, customUrl, customKey);
    const host = req.get("host") || "localhost:3000";
    const protocol = req.protocol || "https";
    const webhookUrl = `${protocol}://${host}/api/sigilopay/webhook`;

    res.json({
      isConfigured: config.isConfigured,
      apiUrl: config.apiUrl,
      webhookUrl,
      maskedPublicKey: config.publicKey ? `${config.publicKey.slice(0, 4)}••••••••${config.publicKey.slice(-4)}` : null,
      maskedSecretKey: config.secretKey ? `${config.secretKey.slice(0, 4)}••••••••${config.secretKey.slice(-4)}` : null,
      status: config.isConfigured ? "connected" : "simulation_mode",
    });
  });

  // 2. Create Real/Standard Pix Charge
  app.post("/api/sigilopay/create-pix", async (req, res) => {
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
          error: "Campos obrigatórios ausentes: orderId, amount, customer.",
        });
      }

      const host = req.get("host") || "localhost:3000";
      const protocol = req.protocol || "https";
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
      console.error("[SigiloPay Error] Create Pix failed:", err);
      res.status(500).json({
        error: err?.message || "Falha ao gerar cobrança Pix via SigiloPay.",
      });
    }
  });

  // 3. Realtime Status Check / Poller
  app.get("/api/sigilopay/status/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const customPublicKey = req.query.publicKey as string;
      const customSecretKey = req.query.secretKey as string;
      const customUrl = req.query.url as string;

      const result = await getSigiloPayTransactionStatus(id, customPublicKey, customSecretKey, customUrl);
      res.json(result);
    } catch (err: any) {
      console.error("[SigiloPay Error] Status check failed:", err);
      res.status(500).json({ error: "Erro ao consultar status da transação." });
    }
  });

  // 4. Webhook Receiver (Configured in SigiloPay Dashboard)
  app.post("/api/sigilopay/webhook", (req, res) => {
    try {
      const outcome = handleSigiloPayWebhookEvent(req.body);
      res.status(200).json({
        received: true,
        outcome,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("[SigiloPay Webhook Error]:", err);
      res.status(200).json({ received: false, error: err?.message });
    }
  });

  // 5. Test/Validate SigiloPay Credentials
  app.post("/api/sigilopay/test", async (req, res) => {
    try {
      const {
        publicKey,
        secretKey,
        apiKey,
        apiUrl = "https://app.sigilopay.com.br/api/v1",
      } = req.body;

      const config = getSigiloPayConfig(publicKey, secretKey, apiUrl, apiKey);

      if (!config.publicKey || !config.secretKey) {
        return res.status(400).json({
          valid: false,
          message: "Informe a Chave Pública (x-public-key) e a Chave Secreta (x-secret-key) para testar a conexão com a SigiloPay.",
        });
      }

      // Quick test call to official endpoint
      try {
        const pingUrl = `${config.apiUrl}/gateway/transactions?id=test_ping`;
        const pingRes = await fetch(pingUrl, {
          method: "GET",
          headers: {
            "x-public-key": config.publicKey,
            "x-secret-key": config.secretKey,
            "Accept": "application/json",
          },
        });

        // 401 or 403 means auth failure. 200 or 400 or 404 (transaction not found) means authenticated!
        if (pingRes.status !== 401 && pingRes.status !== 403) {
          return res.json({
            valid: true,
            status: pingRes.status,
            message: "Credenciais autenticadas com sucesso junto à SigiloPay!",
          });
        } else {
          return res.json({
            valid: false,
            status: pingRes.status,
            message: "Credenciais recusadas pela SigiloPay (401/403 Não Autorizado). Verifique sua Chave Pública e Chave Secreta.",
          });
        }
      } catch (fetchErr: any) {
        return res.json({
          valid: false,
          message: `Não foi possível conectar ao servidor da SigiloPay (${fetchErr?.message}). Verifique o endpoint da API.`,
        });
      }
    } catch (err: any) {
      res.status(500).json({ valid: false, message: err?.message });
    }
  });

  // 6. Test Simulation - Instant Approve
  app.post("/api/sigilopay/simulate-paid", (req, res) => {
    const { transactionId, orderId } = req.body;
    const target = transactionId || orderId;
    if (!target) {
      return res.status(400).json({ error: "Informe o transactionId ou orderId." });
    }

    const success = simulateMarkAsPaid(target);
    res.json({ success, message: success ? "Transação marcada como PAGA!" : "Transação não encontrada." });
  });

  // Vite middleware in dev; static dist in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
