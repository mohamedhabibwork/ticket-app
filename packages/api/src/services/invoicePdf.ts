export interface InvoicePdfData {
  invoice: {
    id: number;
    uuid: string;
    number: string;
    status: string;
    currency: string;
    subtotal: number;
    taxAmount: number;
    taxRate: number;
    total: number;
    periodStart: Date;
    periodEnd: Date;
    dueDate: Date;
    paidAt?: Date;
    createdAt: Date;
  };
  items: Array<{
    id: number;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  organization: {
    name: string;
    slug: string;
    address?: string;
    city?: string;
    country?: string;
    phone?: string;
    email?: string;
    vatNumber?: string;
  };
  plan?: {
    name: string;
    description?: string;
  };
  locale?: string;
}

export function formatAmount(amount: number, currency: string): string {
  const major = Math.floor(amount / 100);
  const minor = amount % 100;
  return `${major}.${minor.toString().padStart(2, "0")} ${currency}`;
}

export function formatDate(date: Date, locale: string = "en"): string {
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  const localeMap: Record<string, string> = {
    ar: "ar-SA",
    en: "en-US",
  };

  return new Date(date).toLocaleDateString(localeMap[locale] || "en-US", options);
}

export function isRtlLocale(locale: string): boolean {
  const rtlLocales = ["ar", "he", "fa", "ur"];
  return rtlLocales.includes(locale.split("-")[0].toLowerCase());
}

export function generateInvoiceHtml(data: InvoicePdfData): string {
  const isRtl = isRtlLocale(data.locale || "en");
  const dir = isRtl ? "rtl" : "ltr";
  const lang = isRtl ? "ar" : "en";
  const textAlign = isRtl ? "right" : "left";

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

  const statusColor = statusColors[data.invoice.status] || statusColors.draft;
  const statusLabel = statusLabels[data.invoice.status] || data.invoice.status;

  const itemsHtml = data.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatAmount(item.unitPrice, data.invoice.currency)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatAmount(item.total, data.invoice.currency)}</td>
    </tr>
  `,
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${data.invoice.number}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;700&family=Inter:wght@400;500;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: ${isRtl ? "'Noto Sans Arabic', 'Arial', sans-serif" : "'Inter', 'Arial', sans-serif"};
      font-size: 14px;
      line-height: 1.6;
      color: #1f2937;
      background: #fff;
    }
    
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e5e7eb;
    }
    
    .company-info h1 {
      font-size: 24px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 4px;
    }
    
    .company-info p {
      color: #6b7280;
      font-size: 13px;
    }
    
    .invoice-info {
      text-align: ${textAlign};
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
      margin-bottom: 40px;
      gap: 40px;
    }
    
    .party {
      flex: 1;
    }
    
    .party h3 {
      font-size: 12px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }
    
    .party-content {
      padding: 16px;
      background-color: #f9fafb;
      border-radius: 8px;
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
    }
    
    .items-table th {
      background-color: #f3f4f6;
      padding: 12px;
      text-align: ${textAlign};
      font-weight: 600;
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .items-table th:nth-child(2),
    .items-table th:nth-child(3),
    .items-table th:nth-child(4) {
      text-align: center;
    }
    
    .totals {
      margin-left: auto;
      width: 300px;
    }
    
    .totals-table {
      width: 100%;
    }
    
    .totals-table tr td {
      padding: 8px 0;
    }
    
    .totals-table .label {
      color: #6b7280;
    }
    
    .totals-table .amount {
      text-align: ${textAlign};
      font-weight: 500;
    }
    
    .totals-table .total-row td {
      padding-top: 12px;
      border-top: 2px solid #e5e7eb;
      font-weight: 700;
      font-size: 16px;
    }
    
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #9ca3af;
      font-size: 12px;
    }
    
    .payment-info {
      margin-top: 40px;
      padding: 20px;
      background-color: #f0fdf4;
      border-radius: 8px;
      border-left: 4px solid #10b981;
      ${isRtl ? "border-left: none; border-right: 4px solid #10b981;" : ""}
    }
    
    .payment-info h4 {
      font-weight: 600;
      color: #166534;
      margin-bottom: 8px;
    }
    
    .payment-info p {
      color: #166534;
      font-size: 13px;
    }
    
    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      
      .invoice-container {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div class="company-info">
        <h1>${data.organization.name}</h1>
        ${data.organization.address ? `<p>${data.organization.address}</p>` : ""}
        ${data.organization.city || data.organization.country ? `<p>${[data.organization.city, data.organization.country].filter(Boolean).join(", ")}</p>` : ""}
        ${data.organization.phone ? `<p>${data.organization.phone}</p>` : ""}
        ${data.organization.email ? `<p>${data.organization.email}</p>` : ""}
        ${data.organization.vatNumber ? `<p>VAT: ${data.organization.vatNumber}</p>` : ""}
      </div>
      <div class="invoice-info">
        <h2>${isRtl ? "فاتورة" : "Invoice"}</h2>
        <div class="invoice-meta">
          <p><strong>${isRtl ? "رقم الفاتورة" : "Invoice #"}:</strong> ${data.invoice.number}</p>
          <p><strong>${isRtl ? "تاريخ الإصدار" : "Issue Date"}:</strong> ${formatDate(data.invoice.createdAt, data.locale)}</p>
          <p><strong>${isRtl ? "تاريخ الاستحقاق" : "Due Date"}:</strong> ${formatDate(data.invoice.dueDate, data.locale)}</p>
          <p><strong>${isRtl ? "الفترة" : "Period"}:</strong> ${formatDate(data.invoice.periodStart, data.locale)} - ${formatDate(data.invoice.periodEnd, data.locale)}</p>
        </div>
        <span class="status-badge">${statusLabel}</span>
      </div>
    </div>
    
    <div class="parties">
      <div class="party">
        <h3>${isRtl ? "فاتورة إلى" : "Bill To"}</h3>
        <div class="party-content">
          <div class="party-name">${data.organization.name}</div>
          <div class="party-details">
            ${data.plan?.name ? `<p>${data.plan.name} ${isRtl ? "خطة" : "Plan"}</p>` : ""}
          </div>
        </div>
      </div>
    </div>
    
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 50%;">${isRtl ? "الوصف" : "Description"}</th>
          <th style="width: 15%;">${isRtl ? "الكمية" : "Qty"}</th>
          <th style="width: 17.5%;">${isRtl ? "سعر الوحدة" : "Unit Price"}</th>
          <th style="width: 17.5%;">${isRtl ? "المجموع" : "Total"}</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>
    
    <div class="totals">
      <table class="totals-table">
        <tr>
          <td class="label">${isRtl ? "المجموع الفرعي" : "Subtotal"}</td>
          <td class="amount">${formatAmount(data.invoice.subtotal, data.invoice.currency)}</td>
        </tr>
        ${
          data.invoice.taxRate > 0
            ? `
        <tr>
          <td class="label">${isRtl ? "الضريبة" : "Tax"} (${data.invoice.taxRate}%)</td>
          <td class="amount">${formatAmount(data.invoice.taxAmount, data.invoice.currency)}</td>
        </tr>
        `
            : ""
        }
        <tr class="total-row">
          <td>${isRtl ? "المجموع" : "Total"}</td>
          <td class="amount">${formatAmount(data.invoice.total, data.invoice.currency)}</td>
        </tr>
      </table>
    </div>
    
    ${
      data.invoice.status === "paid" && data.invoice.paidAt
        ? `
    <div class="payment-info">
      <h4>✓ ${isRtl ? "تم الدفع" : "Payment Received"}</h4>
      <p>${isRtl ? "تم دفع هذه الفاتورة في" : "This invoice was paid on"} ${formatDate(data.invoice.paidAt, data.locale)}</p>
    </div>
    `
        : ""
    }
    
    <div class="footer">
      <p>${isRtl ? "شكراً لثقتك بنا" : "Thank you for your business"}</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function generateSimpleText(data: InvoicePdfData): string {
  const isRtl = isRtlLocale(data.locale || "en");
  const lines: string[] = [];

  lines.push("=".repeat(50));
  lines.push(`${data.organization.name}`.padStart(isRtl ? 0 : 25).padEnd(50));
  lines.push("=".repeat(50));
  lines.push(`Invoice: ${data.invoice.number}`);
  lines.push(`Date: ${formatDate(data.invoice.createdAt, data.locale)}`);
  lines.push(`Due: ${formatDate(data.invoice.dueDate, data.locale)}`);
  lines.push("-".repeat(50));

  for (const item of data.items) {
    lines.push(`${item.description}`);
    lines.push(
      `${item.quantity} x ${formatAmount(item.unitPrice, data.invoice.currency)} = ${formatAmount(item.total, data.invoice.currency)}`,
    );
  }

  lines.push("-".repeat(50));
  lines.push(`Subtotal: ${formatAmount(data.invoice.subtotal, data.invoice.currency)}`);
  if (data.invoice.taxRate > 0) {
    lines.push(
      `Tax (${data.invoice.taxRate}%): ${formatAmount(data.invoice.taxAmount, data.invoice.currency)}`,
    );
  }
  lines.push(`Total: ${formatAmount(data.invoice.total, data.invoice.currency)}`);
  lines.push("=".repeat(50));

  return lines.join("\n");
}
