import Stripe from 'stripe';
import { SubscriptionCreateInput } from '../types';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-06-30.basil',
});

export class PaymentService {
  static async createCustomer(email: string, name?: string): Promise<Stripe.Customer> {
    try {
      const customer = await stripe.customers.create({
        email,
        name,
        metadata: {
          source: 'insightify'
        }
      });
      
      console.log(`✅ Stripe customer created: ${customer.id}`);
      return customer;
    } catch (error) {
      console.error('❌ Failed to create Stripe customer:', error);
      throw error;
    }
  }

  static async createSubscription(
    customerId: string,
    subscriptionData: SubscriptionCreateInput
  ): Promise<{
    subscription: Stripe.Subscription;
    invoice: Stripe.Invoice;
  }> {
    try {
      // Create or get price ID based on plan
      const priceId = await this.getOrCreatePriceId(subscriptionData.planType, subscriptionData.amount);
      
      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          planType: subscriptionData.planType,
          amount: subscriptionData.amount.toString()
        }
      });

      // Get invoice
      const invoice = await stripe.invoices.retrieve(subscription.latest_invoice as string);

      console.log(`✅ Stripe subscription created: ${subscription.id}`);
      return { subscription, invoice };
    } catch (error) {
      console.error('❌ Failed to create Stripe subscription:', error);
      throw error;
    }
  }

  static async createPaymentIntent(
    amount: number,
    currency: string = 'jpy',
    customerId?: string
  ): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        customer: customerId,
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          source: 'insightify'
        }
      });

      console.log(`✅ Payment intent created: ${paymentIntent.id}`);
      return paymentIntent;
    } catch (error) {
      console.error('❌ Failed to create payment intent:', error);
      throw error;
    }
  }

  static async confirmPayment(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);
      console.log(`✅ Payment confirmed: ${paymentIntentId}`);
      return paymentIntent;
    } catch (error) {
      console.error('❌ Failed to confirm payment:', error);
      throw error;
    }
  }

  static async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      const subscription = await stripe.subscriptions.cancel(subscriptionId);
      console.log(`✅ Subscription cancelled: ${subscriptionId}`);
      return subscription;
    } catch (error) {
      console.error('❌ Failed to cancel subscription:', error);
      throw error;
    }
  }

  static async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      return subscription;
    } catch (error) {
      console.error('❌ Failed to retrieve subscription:', error);
      throw error;
    }
  }

  static async createInvoice(
    customerId: string,
    amount: number,
    description: string,
    metadata?: Record<string, string>
  ): Promise<Stripe.Invoice> {
    try {
      const invoice = await stripe.invoices.create({
        customer: customerId,
        description,
        metadata: {
          ...metadata,
          source: 'insightify'
        }
      });

      // Add invoice item
      await stripe.invoiceItems.create({
        customer: customerId,
        invoice: invoice.id,
        amount,
        currency: 'jpy',
        description
      });

      // Finalize and send invoice
      let finalizedInvoice = invoice;
      if (invoice.id) {
        finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
        if (finalizedInvoice.id) {
          await stripe.invoices.sendInvoice(finalizedInvoice.id);
        }
      }

      console.log(`✅ Invoice created and sent: ${invoice.id}`);
      return finalizedInvoice;
    } catch (error) {
      console.error('❌ Failed to create invoice:', error);
      throw error;
    }
  }

  // Bank transfer specific methods
  static async createBankTransferPayment(
    amount: number,
    customerId: string,
    description: string
  ): Promise<{
    paymentIntent: Stripe.PaymentIntent;
    bankAccount: Stripe.BankAccount;
  }> {
    try {
      // Create payment intent for bank transfer
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: 'jpy',
        customer: customerId,
        payment_method_types: ['customer_balance'],
        payment_method_data: {
          type: 'customer_balance',
          billing_details: {
            name: 'Bank Transfer'
          }
        },
        payment_method_options: {
          customer_balance: {
            funding_type: 'bank_transfer',
            bank_transfer: {
              type: 'jp_bank_transfer'
            }
          }
        },
        description,
        metadata: {
          source: 'insightify',
          payment_method: 'bank_transfer'
        }
      });

      // Get bank account details
      const bankAccount = await stripe.customers.retrieve(customerId) as Stripe.Customer;
      const defaultBankAccount = bankAccount.invoice_settings?.default_payment_method as Stripe.BankAccount;

      return { paymentIntent, bankAccount: defaultBankAccount };
    } catch (error) {
      console.error('❌ Failed to create bank transfer payment:', error);
      throw error;
    }
  }

  // Helper method to get or create price ID
  private static async getOrCreatePriceId(planType: string, amount: number): Promise<string> {
    try {
      // Check if price already exists
      const prices = await stripe.prices.list({
        active: true,
        currency: 'jpy',
        limit: 100
      });

      const existingPrice = prices.data.find(price => 
        price.unit_amount === amount && 
        price.recurring?.interval === (planType === 'monthly' ? 'month' : 'year')
      );

      if (existingPrice) {
        return existingPrice.id;
      }

      // Create new price
      const price = await stripe.prices.create({
        unit_amount: amount,
        currency: 'jpy',
        recurring: {
          interval: planType === 'monthly' ? 'month' : 'year'
        },
        product_data: {
          name: `Insightify ${planType === 'monthly' ? 'Monthly' : 'Yearly'} Plan`,
          description: `Insightify Analytics Platform - ${planType === 'monthly' ? 'Monthly' : 'Yearly'} subscription`
        }
      });

      return price.id;
    } catch (error) {
      console.error('❌ Failed to get or create price ID:', error);
      throw error;
    }
  }

  // Webhook handler for payment events
  static async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
          break;
        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      console.error('❌ Error handling webhook event:', error);
      throw error;
    }
  }

  private static async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    console.log(`Payment succeeded: ${paymentIntent.id}`);
    // Update subscription status in database
    // Send confirmation email
  }

  private static async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    console.log(`Payment failed: ${paymentIntent.id}`);
    // Update subscription status in database
    // Send failure notification
  }

  private static async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    console.log(`Invoice payment succeeded: ${invoice.id}`);
    // Update subscription status in database
    // Send confirmation email
  }

  private static async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    console.log(`Invoice payment failed: ${invoice.id}`);
    // Update subscription status in database
    // Send failure notification
  }

  private static async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    console.log(`Subscription created: ${subscription.id}`);
    // Update subscription status in database
  }

  private static async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    console.log(`Subscription updated: ${subscription.id}`);
    // Update subscription status in database
  }

  private static async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    console.log(`Subscription deleted: ${subscription.id}`);
    // Update subscription status in database
    // Send cancellation email
  }
} 