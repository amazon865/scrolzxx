import React, { useState } from 'react';
import { CartItem, PaymentMethod } from '../types';
import { formatCurrency } from '../utils/formatters';
import { VALID_COUPONS } from '../data/mockData';
import { ShoppingBag, Tag, ChevronDown, ChevronUp, Plus, Minus, CheckCircle2, ShieldCheck, Truck } from 'lucide-react';

interface OrderSummaryProps {
  items: CartItem[];
  paymentMethod: PaymentMethod;
  couponCode: string;
  onApplyCoupon: (code: string) => void;
  couponDiscount: number;
  freeShippingCoupon: boolean;
  onUpdateQuantity: (id: string, delta: number) => void;
  shippingConfig?: {
    name: string;
    price: number;
    freeShippingThreshold: number;
    deliveryTimeEstimate: string;
  };
  pixDiscountPercent?: number;
  themeMode?: 'light' | 'dark';
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({
  items,
  paymentMethod,
  couponCode,
  onApplyCoupon,
  couponDiscount,
  freeShippingCoupon,
  onUpdateQuantity,
  shippingConfig,
  pixDiscountPercent = 5,
  themeMode = 'light',
}) => {
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const isDark = themeMode === 'dark';
  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  // Dynamic shipping calculation
  const freeThreshold = shippingConfig?.freeShippingThreshold ?? 350;
  const standardShippingPrice = shippingConfig?.price ?? 19.90;
  const isFreeShipping = freeShippingCoupon || (freeThreshold > 0 && subtotal >= freeThreshold);
  const rawShipping = isFreeShipping ? 0 : standardShippingPrice;
  const shippingName = shippingConfig?.name || (isFreeShipping ? 'Frete Grátis' : 'Frete Sedex Expresso');

  // Coupon discount amount
  const couponDiscountAmount = (subtotal * couponDiscount) / 100;

  // Pix discount calculation
  const isPix = paymentMethod === 'pix';
  const effectivePixDiscount = isPix ? ((subtotal - couponDiscountAmount) * (pixDiscountPercent / 100)) : 0;

  const finalTotal = Math.max(0, subtotal - couponDiscountAmount - effectivePixDiscount + rawShipping);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = couponInput.trim().toUpperCase();
    if (!clean) return;

    if (VALID_COUPONS[clean]) {
      onApplyCoupon(clean);
      setCouponError('');
      setCouponSuccess(`Cupom "${clean}" aplicado com sucesso!`);
      setCouponInput('');
    } else {
      setCouponError('Cupom inválido. Tente "DESCONTO10" ou "FRETEGRATIS"');
      setCouponSuccess('');
    }
  };

  return (
    <div className={`rounded-2xl border shadow-xs overflow-hidden transition-colors ${
      isDark ? 'bg-neutral-900 border-neutral-800 text-neutral-100' : 'bg-white border-neutral-200 text-neutral-900'
    }`}>
      {/* Mobile Toggle Bar */}
      <div className={`lg:hidden p-4 border-b flex items-center justify-between ${
        isDark ? 'bg-neutral-800/80 border-neutral-700' : 'bg-neutral-50/70 border-neutral-100'
      }`}>
        <button
          type="button"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className={`flex items-center gap-2 text-sm font-semibold ${isDark ? 'text-neutral-200' : 'text-neutral-800'}`}
        >
          <ShoppingBag className="w-4 h-4 text-emerald-500" />
          <span>Resumo do Pedido ({items.reduce((a, b) => a + b.quantity, 0)} itens)</span>
          {isMobileOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <div className="text-right">
          <span className={`text-base font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>{formatCurrency(finalTotal)}</span>
          {isPix && pixDiscountPercent > 0 && (
            <span className="block text-[10px] text-emerald-500 font-semibold">(com {pixDiscountPercent}% Pix)</span>
          )}
        </div>
      </div>

      <div className={`${isMobileOpen ? 'block' : 'hidden'} lg:block p-5 sm:p-6`}>
        <div className={`hidden lg:flex items-center justify-between pb-4 mb-4 border-b ${
          isDark ? 'border-neutral-800' : 'border-neutral-100'
        }`}>
          <div className={`flex items-center gap-2 font-bold text-base ${isDark ? 'text-white' : 'text-neutral-900'}`}>
            <ShoppingBag className={`w-5 h-5 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`} />
            <span>Resumo da Compra</span>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            isDark ? 'bg-neutral-800 text-neutral-300' : 'bg-neutral-100 text-neutral-600'
          }`}>
            {items.reduce((a, b) => a + b.quantity, 0)} {items.reduce((a, b) => a + b.quantity, 0) === 1 ? 'item' : 'itens'}
          </span>
        </div>

        {/* Item list */}
        <div className="space-y-4 mb-5">
          {items.map((item) => (
            <div key={item.id} className="flex gap-3.5 items-start">
              <img
                src={item.image}
                alt={item.name}
                className="w-16 h-16 rounded-xl object-cover bg-neutral-100 border border-neutral-200 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-neutral-900 leading-snug line-clamp-1">{item.name}</h4>
                <p className="text-xs text-neutral-500 mt-0.5">{item.variant}</p>
                <div className="flex items-center justify-between mt-2.5">
                  <div className="flex items-center border border-neutral-200 rounded-lg overflow-hidden bg-neutral-50">
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.id, -1)}
                      className="p-1 hover:bg-neutral-200 text-neutral-600 transition-colors"
                      title="Diminuir"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="px-2 text-xs font-semibold text-neutral-800">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.id, 1)}
                      className="p-1 hover:bg-neutral-200 text-neutral-600 transition-colors"
                      title="Aumentar"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-neutral-900">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                    {item.originalPrice && (
                      <span className="block text-[11px] text-neutral-400 line-through">
                        {formatCurrency(item.originalPrice * item.quantity)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Coupon form */}
        <form onSubmit={handleApplyCoupon} className="mb-5">
          <label className="block text-xs font-semibold text-neutral-700 mb-1.5 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-neutral-500" />
            <span>Possui cupom de desconto?</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
              placeholder="Ex: DESCONTO10"
              className="flex-1 px-3 py-2 text-xs uppercase tracking-wider rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Aplicar
            </button>
          </div>
          {couponSuccess && (
            <p className="text-[11px] text-emerald-700 font-medium mt-1.5 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {couponSuccess}
            </p>
          )}
          {couponError && <p className="text-[11px] text-rose-600 font-medium mt-1.5">{couponError}</p>}
          <div className="mt-1.5 flex gap-1.5 flex-wrap">
            <span className="text-[10px] text-neutral-400">Sugestões:</span>
            <button
              type="button"
              onClick={() => {
                setCouponInput('DESCONTO10');
              }}
              className="text-[10px] bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-1.5 py-0.5 rounded font-mono"
            >
              DESCONTO10
            </button>
            <button
              type="button"
              onClick={() => {
                setCouponInput('FRETEGRATIS');
              }}
              className="text-[10px] bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-1.5 py-0.5 rounded font-mono"
            >
              FRETEGRATIS
            </button>
          </div>
        </form>

        {/* Breakdown */}
        <div className="space-y-2.5 pt-4 border-t border-neutral-100 text-sm">
          <div className="flex justify-between text-neutral-600">
            <span>Subtotal</span>
            <span className="font-medium text-neutral-900">{formatCurrency(subtotal)}</span>
          </div>

          {couponDiscount > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span className="flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" /> Cupom ({couponCode})
              </span>
              <span className="font-medium">-{formatCurrency(couponDiscountAmount)}</span>
            </div>
          )}

          {isPix && effectivePixDiscount > 0 && (
            <div className={`flex justify-between p-2 rounded-lg border ${
              isDark ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400' : 'bg-emerald-50/70 border-emerald-200/60 text-emerald-700'
            }`}>
              <span className={`flex items-center gap-1 font-semibold text-xs ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>
                ⚡ Desconto Pix ({pixDiscountPercent}% OFF)
              </span>
              <span className={`font-bold text-xs ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>
                -{formatCurrency(effectivePixDiscount)}
              </span>
            </div>
          )}

          <div className={`flex justify-between ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
            <span className="flex items-center gap-1">
              <Truck className={`w-3.5 h-3.5 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`} />
              {shippingName}
            </span>
            <span className={`font-medium ${isDark ? 'text-white' : 'text-neutral-900'}`}>
              {rawShipping === 0 ? (
                <span className="text-emerald-600 font-semibold">Grátis</span>
              ) : (
                formatCurrency(rawShipping)
              )}
            </span>
          </div>

          <div className={`pt-3 border-t flex justify-between items-baseline ${isDark ? 'border-neutral-800' : 'border-neutral-200'}`}>
            <div>
              <span className={`text-base font-bold block ${isDark ? 'text-white' : 'text-neutral-900'}`}>Total</span>
              <span className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                {isPix ? 'À vista no Pix' : 'Em até 12x no cartão'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-neutral-900 tracking-tight">
                {formatCurrency(finalTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Benefits bar */}
        <div className="mt-5 pt-4 border-t border-neutral-100 grid grid-cols-2 gap-2 text-[11px] text-neutral-600">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Garantia de 12 meses</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span>Envio com rastreio</span>
          </div>
        </div>
      </div>
    </div>
  );
};
