import type { InvoicePdfData } from "@ticket-app/api/services/invoicePdf";
import { isRtlLocale, formatAmount, formatDate } from "@ticket-app/api/services/invoicePdf";

export { type InvoicePdfData } from "@ticket-app/api/services/invoicePdf";

const ARABIC_FONTS = {
  regular:
    "https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap",
  amiri:
    "https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Inter:wght@400;500;600;700&display=swap",
  tajawal:
    "https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&family=Inter:wght@400;500;600;700&display=swap",
};

export type ArabicFont = keyof typeof ARABIC_FONTS;

export interface ArabicPdfOptions {
  font?: ArabicFont;
  fontSize?: number;
  pageSize?: "A4" | "Letter";
  margin?: number;
}

export function generateArabicInvoiceHtml(
  data: InvoicePdfData,
  options: ArabicPdfOptions = {},
): string {
  const { font = "tajawal", fontSize = 14, pageSize = "A4", margin = 40 } = options;

  const isRtl = isRtlLocale(data.locale || "en");
  const dir = isRtl ? "rtl" : "ltr";
  const lang = isRtl ? "ar" : "en";
  const textAlign = isRtl ? "right" : "left";
  const fontUrl = ARABIC_FONTS[font];

  const statusColors: Record<string, string> = {
    draft: "#6b7280",
    finalized: "#3b82f6",
    paid: "#10b981",
    overdue: "#ef4444",
    void: "#6b7280",
  };

  const statusLabels: Record<string, string> = {
    draft: isRtl ? "مسودة" : "Draft",
    finalized: isRtl ? "نهائي" : "Finalized",
    paid: isRtl ? "مدفوع" : "Paid",
    overdue: isRtl ? "متأخر" : "Overdue",
    void: isRtl ? "ملغى" : "Void",
  };

  const labels = {
    invoice: isRtl ? "فاتورة" : "Invoice",
    invoiceNumber: isRtl ? "رقم الفاتورة" : "Invoice #",
    issueDate: isRtl ? "تاريخ الإصدار" : "Issue Date",
    dueDate: isRtl ? "تاريخ الاستحقاق" : "Due Date",
    period: isRtl ? "الفترة" : "Period",
    billTo: isRtl ? "فاتورة إلى" : "Bill To",
    description: isRtl ? "الوصف" : "Description",
    quantity: isRtl ? "الكمية" : "Qty",
    unitPrice: isRtl ? "سعر الوحدة" : "Unit Price",
    total: isRtl ? "المجموع" : "Total",
    subtotal: isRtl ? "المجموع الفرعي" : "Subtotal",
    tax: isRtl ? "الضريبة" : "Tax",
    grandTotal: isRtl ? "المجموع الكلي" : "Grand Total",
    paymentReceived: isRtl ? "تم الدفع" : "Payment Received",
    paidOn: isRtl ? "تم دفع هذه الفاتورة في" : "This invoice was paid on",
    thankYou: isRtl ? "شكراً لثقتك بنا" : "Thank you for your business",
    plan: isRtl ? "الخطة" : "Plan",
    vat: isRtl ? "الضريبة المضافة" : "VAT",
  };

  const statusColor = statusColors[data.invoice.status] || statusColors.draft;
  const statusLabel = statusLabels[data.invoice.status] || data.invoice.status;

  const itemsHtml = data.items
    .map((item) => {
      const rtlStyle = isRtl ? 'dir="rtl"' : "";
      const rtlAlign = isRtl ? "text-align: right;" : "text-align: left;";
      return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; ${rtlAlign}" ${rtlStyle}>${item.description}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatAmount(item.unitPrice, data.invoice.currency)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatAmount(item.total, data.invoice.currency)}</td>
        </tr>
      `;
    })
    .join("");

  const subtotalText = formatAmount(data.invoice.subtotal, data.invoice.currency);
  const totalText = formatAmount(data.invoice.total, data.invoice.currency);

  const pageWidth = pageSize === "A4" ? "595px" : "612px";
  const pageHeight = pageSize === "A4" ? "842px" : "792px";

  return `
<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${labels.invoice} ${data.invoice.number}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${fontUrl}" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: ${isRtl ? `'Tajawal', 'Noto Sans Arabic', 'Arial', sans-serif` : "'Inter', 'Arial', sans-serif"};
      font-size: ${fontSize}px;
      line-height: 1.6;
      color: #1f2937;
      background: #fff;
    }
    
    .invoice-page {
      width: ${pageWidth};
      min-height: ${pageHeight};
      margin: 0 auto;
      padding: ${margin}px;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e5e7eb;
      direction: ${dir};
    }
    
    .company-info h1 {
      font-size: 22px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 4px;
    }
    
    .company-info p {
      color: #6b7280;
      font-size: 12px;
    }
    
    .invoice-info {
      text-align: ${textAlign};
      direction: ${dir};
    }
    
    .invoice-info h2 {
      font-size: 20px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 8px;
    }
    
    .invoice-meta {
      color: #6b7280;
      font-size: 13px;
      direction: ${dir};
    }
    
    .invoice-meta p {
      margin-bottom: 4px;
    }
    
    .invoice-meta strong {
      color: #111827;
    }
    
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      color: white;
      background-color: ${statusColor};
      margin-top: 8px;
    }
    
    .parties {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
      gap: 30px;
      direction: ${dir};
    }
    
    .party {
      flex: 1;
    }
    
    .party h3 {
      font-size: 11px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 10px;
      direction: ${dir};
    }
    
    .party-content {
      padding: 14px;
      background-color: #f9fafb;
      border-radius: 8px;
      direction: ${dir};
    }
    
    .party-name {
      font-weight: 600;
      color: #111827;
      margin-bottom: 4px;
    }
    
    .party-details {
      color: #6b7280;
      font-size: 13px;
    }
    
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      direction: ${dir};
    }
    
    .items-table th {
      background-color: #f3f4f6;
      padding: 10px 12px;
      text-align: ${textAlign};
      font-weight: 600;
      font-size: 11px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .items-table th:nth-child(2),
    .items-table th:nth-child(3),
    .items-table th:nth-child(4) {
      text-align: center;
    }
    
    .totals {
      ${isRtl ? "margin-right: auto;" : "margin-left: auto;"}
      width: 280px;
      direction: ${dir};
    }
    
    .totals-table {
      width: 100%;
    }
    
    .totals-table tr td {
      padding: 8px 0;
      direction: ${dir};
    }
    
    .totals-table .label {
      color: #6b7280;
    }
    
    .totals-table .amount {
      text-align: ${textAlign};
      font-weight: 500;
      direction: ${dir};
    }
    
    .totals-table .total-row td {
      padding-top: 12px;
      border-top: 2px solid #e5e7eb;
      font-weight: 700;
      font-size: 16px;
    }
    
    .payment-info {
      margin-top: 40px;
      padding: 16px 20px;
      background-color: #f0fdf4;
      border-radius: 8px;
      border-${isRtl ? "right" : "left"}: 4px solid #10b981;
      direction: ${dir};
    }
    
    .payment-info h4 {
      font-weight: 600;
      color: #166534;
      margin-bottom: 6px;
    }
    
    .payment-info p {
      color: #166534;
      font-size: 13px;
    }
    
    .footer {
      margin-top: 50px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #9ca3af;
      font-size: 12px;
      direction: ${dir};
    }
    
    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      
      .invoice-page {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-page">
    <div class="header">
      <div class="company-info">
        <h1>${data.organization.name}</h1>
        ${data.organization.address ? `<p>${data.organization.address}</p>` : ""}
        ${data.organization.city || data.organization.country ? `<p>${[data.organization.city, data.organization.country].filter(Boolean).join(", ")}</p>` : ""}
        ${data.organization.phone ? `<p>${data.organization.phone}</p>` : ""}
        ${data.organization.email ? `<p>${data.organization.email}</p>` : ""}
        ${data.organization.vatNumber ? `<p>${labels.vat}: ${data.organization.vatNumber}</p>` : ""}
      </div>
      <div class="invoice-info">
        <h2>${labels.invoice}</h2>
        <div class="invoice-meta">
          <p><strong>${labels.invoiceNumber}:</strong> ${data.invoice.number}</p>
          <p><strong>${labels.issueDate}:</strong> ${formatDate(data.invoice.createdAt, data.locale || "en")}</p>
          <p><strong>${labels.dueDate}:</strong> ${formatDate(data.invoice.dueDate, data.locale || "en")}</p>
          <p><strong>${labels.period}:</strong> ${formatDate(data.invoice.periodStart, data.locale || "en")} - ${formatDate(data.invoice.periodEnd, data.locale || "en")}</p>
        </div>
        <span class="status-badge">${statusLabel}</span>
      </div>
    </div>
    
    <div class="parties">
      <div class="party">
        <h3>${labels.billTo}</h3>
        <div class="party-content">
          <div class="party-name">${data.organization.name}</div>
          <div class="party-details">
            ${data.plan?.name ? `<p>${data.plan.name} ${labels.plan}</p>` : ""}
          </div>
        </div>
      </div>
    </div>
    
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 50%;">${labels.description}</th>
          <th style="width: 15%;">${labels.quantity}</th>
          <th style="width: 17.5%;">${labels.unitPrice}</th>
          <th style="width: 17.5%;">${labels.total}</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>
    
    <div class="totals">
      <table class="totals-table">
        <tr>
          <td class="label">${labels.subtotal}</td>
          <td class="amount">${subtotalText}</td>
        </tr>
        ${
          data.invoice.taxRate > 0
            ? `
        <tr>
          <td class="label">${labels.tax} (${data.invoice.taxRate}%)</td>
          <td class="amount">${formatAmount(data.invoice.taxAmount, data.invoice.currency)}</td>
        </tr>
        `
            : ""
        }
        <tr class="total-row">
          <td>${labels.grandTotal}</td>
          <td class="amount">${totalText}</td>
        </tr>
      </table>
    </div>
    
    ${
      data.invoice.status === "paid" && data.invoice.paidAt
        ? `
    <div class="payment-info">
      <h4>✓ ${labels.paymentReceived}</h4>
      <p>${labels.paidOn} ${formatDate(data.invoice.paidAt, data.locale || "en")}</p>
    </div>
    `
        : ""
    }
    
    <div class="footer">
      <p>${labels.thankYou}</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function getArabicInvoicePdf(data: InvoicePdfData, options?: ArabicPdfOptions): string {
  return generateArabicInvoiceHtml(data, options);
}

export function convertToArabicPdfBuffer(_html: string): Buffer | null {
  return null;
}
