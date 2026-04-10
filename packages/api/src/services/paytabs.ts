import { env } from "@ticket-app/env/server";

export interface PaytabsPaymentInit {
  amount: number;
  currency: string;
  orderId: string;
  customerEmail: string;
  customerPhone: string;
  customerName: string;
  productName: string;
  returnUrl: string;
  webhookUrl: string;
}

export interface PaytabsPaymentVerify {
  transactionId: string;
}

export interface PaytabsCreateToken {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  cardholderName: string;
  email: string;
}

export type PaytabsPaymentMethodType = "mada" | "sadad" | "applepay" | "creditcard";

const _PAYTABS_REGION_MAP: Record<string, string> = {
  SA: "SAU",
  AE: "ARE",
  EG: "EGY",
  KW: "KWT",
  BH: "BHR",
  OM: "OMN",
  QA: "QAT",
};

export class PaytabsService {
  private serverKey: string;
  private clientKey: string;
  private baseUrl: string;

  constructor() {
    this.serverKey = env.PAYTABS_SERVER_KEY;
    this.clientKey = env.PAYTABS_CLIENT_KEY;
    this.baseUrl = env.PAYTABS_BASE_URL || "https://secure.paytabs.com";
  }

  async initializePayment(
    organizationId: number,
    params: PaytabsPaymentInit,
  ): Promise<PaytabsPaymentResult> {
    const response = await fetch(`${this.baseUrl}/payment/request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.serverKey,
      },
      body: JSON.stringify({
        profile_id: env.PAYTABS_PROFILE_ID,
        tran_type: "sale",
        tran_class: "ecom",
        amount: params.amount / 100,
        currency: params.currency,
        cart_id: params.orderId,
        cart_description: params.productName,
        cart_items: [],
        customer_details: {
          name: params.customerName,
          email: params.customerEmail,
          phone: params.customerPhone,
          street1: "",
          city: "",
          state: "",
          country: "",
          zip: "",
        },
        shipToDetails: {
          name: params.customerName,
          email: params.customerEmail,
          phone: params.customerPhone,
          street1: "",
          city: "",
          state: "",
          country: "",
          zip: "",
        },
        return: params.returnUrl,
        notify_url: params.webhookUrl,
        tokenization: {
          type: "card_save",
        },
        payment_methods: this.getPaymentMethods(params.currency),
      }),
    });

    const result = await response.json();

    if (result.response_code !== "4000") {
      throw new Error(result.result || "PayTabs payment initialization failed");
    }

    return {
      transactionId: result.tran_ref,
      paymentUrl: result.redirect_url,
      code: result.response_code,
    };
  }

  async verifyPayment(transactionId: string): Promise<PaytabsVerificationResult> {
    const response = await fetch(`${this.baseUrl}/payment/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.serverKey,
      },
      body: JSON.stringify({
        tran_ref: transactionId,
      }),
    });

    const result = await response.json();

    return {
      transactionId: result.tran_ref,
      amount: Math.round(parseFloat(result.trans_amount) * 100),
      currency: result.cart_currency,
      status: this.mapPaytabsStatus(result.response_code),
      cardLast4: result.payment_result?.card_last4,
      cardBrand: result.payment_result?.card_brand,
      paymentMethod: this.detectPaymentMethod(result),
      referenceId: result.reference_id,
      authCode: result.auth_code,
      responseCode: result.response_code,
    };
  }

  async createToken(
    organizationId: number,
    params: PaytabsCreateToken,
  ): Promise<PaytabsTokenResult> {
    const response = await fetch(`${this.baseUrl}/payment/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.serverKey,
      },
      body: JSON.stringify({
        profile_id: env.PAYTABS_PROFILE_ID,
        card_details: {
          number: params.cardNumber.replace(/\s/g, ""),
          expiry_month: params.expiryMonth,
          expiry_year: params.expiryYear,
          cvv: params.cvv,
          name_on_card: params.cardholderName,
        },
        customer_email: params.email,
        tokenization_type: "card_save",
      }),
    });

    const result = await response.json();

    if (result.response_code !== "4000") {
      throw new Error(result.result || "PayTabs token creation failed");
    }

    return {
      token: result.token,
      cardLast4: params.cardNumber.slice(-4),
      cardBrand: this.detectCardBrand(params.cardNumber),
    };
  }

  async refundPayment(
    transactionId: string,
    amount: number,
    reason?: string,
  ): Promise<PaytabsRefundResult> {
    const response = await fetch(`${this.baseUrl}/payment/refund`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.serverKey,
      },
      body: JSON.stringify({
        tran_ref: transactionId,
        tran_type: "refund",
        amount: amount / 100,
        reason: reason || "Customer requested refund",
      }),
    });

    const result = await response.json();

    return {
      success: result.response_code === "2800",
      transactionId: result.tran_ref,
      refundReference: result.reference_id,
      message: result.result,
    };
  }

  private getPaymentMethods(currency: string): string[] {
    const methods: string[] = ["creditcard"];

    if (currency === "SAR") {
      methods.push("mada", "sadad");
    }

    if (typeof window !== "undefined" && window.Apple?.Pay) {
      methods.push("applepay");
    }

    return methods;
  }

  private mapPaytabsStatus(code: string): "captured" | "pending" | "failed" | "void" {
    const statusMap: Record<string, "captured" | "pending" | "failed" | "void"> = {
      "4000": "captured",
      "4001": "pending",
      "4002": "pending",
      "4003": "pending",
      "4004": "failed",
      "4005": "failed",
      "4006": "failed",
      "4400": "pending",
      "4401": "void",
    };

    return statusMap[code] || "failed";
  }

  private detectPaymentMethod(result: any): PaytabsPaymentMethodType {
    if (result.payment_result?.card_brand) {
      const brand = result.payment_result.card_brand.toLowerCase();
      if (brand === "mada") return "mada";
      if (brand === "sadad") return "sadad";
      if (brand === "apple") return "applepay";
    }
    return "creditcard";
  }

  private detectCardBrand(cardNumber: string): string {
    const firstDigit = cardNumber[0];
    const firstTwo = cardNumber.slice(0, 2);

    if (firstDigit === "4") return "Visa";
    if (["51", "52", "53", "54", "55"].includes(firstTwo)) return "Mastercard";
    if (["34", "37"].includes(firstTwo)) return "Amex";
    if (["60", "65"].includes(firstTwo)) return "Mada";
    if (firstDigit === "5") return "Mastercard";
    if (firstDigit === "2") return "Mastercard";

    return "Unknown";
  }
}

export interface PaytabsPaymentResult {
  transactionId: string;
  paymentUrl: string;
  code: string;
}

export interface PaytabsVerificationResult {
  transactionId: string;
  amount: number;
  currency: string;
  status: "captured" | "pending" | "failed" | "void";
  cardLast4?: string;
  cardBrand?: string;
  paymentMethod: PaytabsPaymentMethodType;
  referenceId?: string;
  authCode?: string;
  responseCode: string;
}

export interface PaytabsTokenResult {
  token: string;
  cardLast4: string;
  cardBrand: string;
}

export interface PaytabsRefundResult {
  success: boolean;
  transactionId: string;
  refundReference: string;
  message: string;
}

export const paytabs = new PaytabsService();
