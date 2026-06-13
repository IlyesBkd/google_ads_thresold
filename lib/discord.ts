import { getErrorMessage } from './errors';
/**
 * Discord notification helper
 * Sends formatted notifications to Discord via webhook
 */

const COLORS = {
  SUCCESS: 0x34a853, // Green
  WARNING: 0xfbbc04, // Yellow
  ERROR: 0xea4335, // Red
  INFO: 0x4285f4, // Blue
};

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  footer?: {
    text: string;
  };
  timestamp?: string;
}

export interface DiscordMessage {
  content?: string;
  embeds?: DiscordEmbed[];
  username?: string;
  avatar_url?: string;
}

/**
 * Send a notification to Discord webhook
 */
export async function sendDiscordNotification(
  webhookUrl: string,
  message: DiscordMessage
): Promise<{ success: boolean; error?: string }> {
  if (!webhookUrl) {
    console.warn('Discord webhook URL not configured');
    return { success: false, error: 'Webhook URL not configured' };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Discord webhook error:', response.status, errorText);
      return { success: false, error: `HTTP ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    console.error('Discord notification error:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

/**
 * Format sale notification
 */
export function formatSaleNotification(sale: {
  orderId: string;
  productName: string;
  quantity: number;
  amount: number;
  coin: string;
  customerEmail: string;
}): DiscordMessage {
  const amountUSD = (sale.amount / 100).toFixed(2);

  return {
    username: 'GADSCALE Sales',
    embeds: [
      {
        title: '🎉 New Sale!',
        description: `**${sale.productName}** × ${sale.quantity}`,
        color: COLORS.SUCCESS,
        fields: [
          {
            name: '💰 Amount',
            value: `$${amountUSD} (${sale.coin})`,
            inline: true,
          },
          {
            name: '📦 Quantity',
            value: `${sale.quantity}`,
            inline: true,
          },
          {
            name: '📧 Customer',
            value: sale.customerEmail,
            inline: false,
          },
          {
            name: '🔖 Order ID',
            value: `\`${sale.orderId.substring(0, 8)}\``,
            inline: true,
          },
        ],
        footer: {
          text: 'GADSCALE Store',
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

/**
 * Format stock alert (low stock warning)
 */
export function formatStockAlert(alert: {
  productId: string;
  productName: string;
  currentStock: number;
  threshold: number;
}): DiscordMessage {
  const severity = alert.currentStock === 0 ? 'CRITICAL' : 'WARNING';
  const emoji = alert.currentStock === 0 ? '🔴' : '⚠️';
  const color = alert.currentStock === 0 ? COLORS.ERROR : COLORS.WARNING;

  return {
    username: 'GADSCALE Alerts',
    embeds: [
      {
        title: `${emoji} Stock Alert - ${severity}`,
        description: `**${alert.productName}** is ${alert.currentStock === 0 ? 'OUT OF STOCK' : 'running low'}`,
        color,
        fields: [
          {
            name: '📊 Current Stock',
            value: `${alert.currentStock} units`,
            inline: true,
          },
          {
            name: '⚙️ Alert Threshold',
            value: `${alert.threshold} units`,
            inline: true,
          },
          {
            name: '🔔 Action Required',
            value: alert.currentStock === 0
              ? '❗ **Import new stock immediately**'
              : '⚡ Consider restocking soon',
            inline: false,
          },
        ],
        footer: {
          text: 'GADSCALE Store',
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

/**
 * Format error notification
 */
export function formatErrorNotification(error: {
  type: string;
  message: string;
  orderId?: string;
  details?: string;
}): DiscordMessage {
  return {
    username: 'GADSCALE Errors',
    embeds: [
      {
        title: '🔴 Error Occurred',
        description: `**${error.type}**`,
        color: COLORS.ERROR,
        fields: [
          {
            name: '❌ Error Message',
            value: getErrorMessage(error),
            inline: false,
          },
          ...(error.orderId
            ? [
                {
                  name: '🔖 Order ID',
                  value: `\`${error.orderId}\``,
                  inline: true,
                },
              ]
            : []),
          ...(error.details
            ? [
                {
                  name: '📝 Details',
                  value: error.details.substring(0, 1000),
                  inline: false,
                },
              ]
            : []),
        ],
        footer: {
          text: 'GADSCALE Store',
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

/**
 * Format daily summary
 */
export function formatDailySummary(summary: {
  date: string;
  totalSales: number;
  totalRevenue: number;
  ordersDelivered: number;
  ordersPending: number;
  stockRemaining: Record<string, number>;
}): DiscordMessage {
  const stockLines = Object.entries(summary.stockRemaining)
    .map(([productId, stock]) => `${productId === '350' ? '$350' : '$500'}: ${stock} units`)
    .join('\n');

  return {
    username: 'GADSCALE Daily Report',
    embeds: [
      {
        title: '📊 Daily Summary',
        description: `Report for **${summary.date}**`,
        color: COLORS.INFO,
        fields: [
          {
            name: '💰 Total Revenue',
            value: `$${(summary.totalRevenue / 100).toFixed(2)}`,
            inline: true,
          },
          {
            name: '🛒 Total Sales',
            value: `${summary.totalSales}`,
            inline: true,
          },
          {
            name: '✅ Delivered',
            value: `${summary.ordersDelivered}`,
            inline: true,
          },
          {
            name: '⏳ Pending',
            value: `${summary.ordersPending}`,
            inline: true,
          },
          {
            name: '📦 Stock Remaining',
            value: stockLines || 'No stock',
            inline: false,
          },
        ],
        footer: {
          text: 'GADSCALE Store',
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

/**
 * Format test notification
 */
export function formatTestNotification(): DiscordMessage {
  return {
    username: 'GADSCALE Test',
    embeds: [
      {
        title: '✅ Webhook Test Successful',
        description: 'Your Discord webhook is working correctly!',
        color: COLORS.SUCCESS,
        fields: [
          {
            name: '📡 Connection',
            value: 'Active',
            inline: true,
          },
          {
            name: '⚙️ Status',
            value: 'Configured',
            inline: true,
          },
        ],
        footer: {
          text: 'GADSCALE Store',
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

/**
 * Send sale notification
 */
export async function notifySale(
  webhookUrl: string,
  sale: Parameters<typeof formatSaleNotification>[0]
) {
  const message = formatSaleNotification(sale);
  return sendDiscordNotification(webhookUrl, message);
}

/**
 * Send stock alert
 */
export async function notifyStockAlert(
  webhookUrl: string,
  alert: Parameters<typeof formatStockAlert>[0]
) {
  const message = formatStockAlert(alert);
  return sendDiscordNotification(webhookUrl, message);
}

/**
 * Send error notification
 */
export async function notifyError(
  webhookUrl: string,
  error: Parameters<typeof formatErrorNotification>[0]
) {
  const message = formatErrorNotification(error);
  return sendDiscordNotification(webhookUrl, message);
}

/**
 * Send daily summary
 */
export async function notifyDailySummary(
  webhookUrl: string,
  summary: Parameters<typeof formatDailySummary>[0]
) {
  const message = formatDailySummary(summary);
  return sendDiscordNotification(webhookUrl, message);
}

/**
 * Send test notification
 */
export async function notifyTest(webhookUrl: string) {
  const message = formatTestNotification();
  return sendDiscordNotification(webhookUrl, message);
}
