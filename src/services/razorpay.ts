// Razorpay Checkout Integration Service for Xeroxic
export const RAZORPAY_KEY_ID = 'rzp_test_TeOn3Cq5Vfubfu';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

/**
 * Dynamically loads the Razorpay checkout script if not already present in the DOM
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true);
      return;
    }
    const existingScript = document.getElementById('razorpay-checkout-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.id = 'razorpay-checkout-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export interface RazorpayPaymentSuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

export interface InitiatePaymentParams {
  amountInRupees: number;
  orderToken: string;
  fileName: string;
  pageCount: number;
  copies: number;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  studentRoll: string;
  department: string;
}

/**
 * Opens Razorpay Standard Checkout modal.
 * Only resolves when user successfully completes the payment.
 * Rejects if user dismisses/closes the modal or payment fails.
 */
export async function openRazorpayCheckout(
  params: InitiatePaymentParams
): Promise<RazorpayPaymentSuccessResponse> {
  const loaded = await loadRazorpayScript();
  if (!loaded || !window.Razorpay) {
    throw new Error('Razorpay SDK could not be loaded. Please check your internet connection.');
  }

  // Convert rupees to paise (e.g. ₹15 -> 1500 paise)
  const amountInPaise = Math.round(params.amountInRupees * 100);

  return new Promise((resolve, reject) => {
    let paymentCompleted = false;

    const options = {
      key: RAZORPAY_KEY_ID,
      amount: amountInPaise,
      currency: 'INR',
      name: 'Xeroxic Document Station',
      description: `Print Request #${params.orderToken} • ${params.pageCount} pgs (${params.copies}x)`,
      image: '/xeroxic-logo-cropped.png',
      prefill: {
        name: params.studentName || 'Student',
        email: params.studentEmail || 'student@campus.edu',
        contact: params.studentPhone || '9876543210',
      },
      notes: {
        order_token: params.orderToken,
        file_name: params.fileName,
        student_roll: params.studentRoll,
        department: params.department,
        pages: String(params.pageCount),
        copies: String(params.copies),
      },
      theme: {
        color: '#0067b8',
      },
      modal: {
        ondismiss: function () {
          if (!paymentCompleted) {
            reject(new Error('PAYMENT_DISMISSED'));
          }
        },
        confirm_close: true,
        backdropclose: false,
        escape: false,
      },
      handler: function (response: RazorpayPaymentSuccessResponse) {
        if (response && response.razorpay_payment_id) {
          paymentCompleted = true;
          resolve(response);
        } else {
          reject(new Error('INVALID_PAYMENT_RESPONSE'));
        }
      },
    };

    try {
      const rzpInstance = new window.Razorpay(options);

      rzpInstance.on('payment.failed', function (resp: any) {
        reject(new Error(resp?.error?.description || 'Payment transaction failed.'));
      });

      rzpInstance.open();
    } catch (err: any) {
      reject(err);
    }
  });
}
