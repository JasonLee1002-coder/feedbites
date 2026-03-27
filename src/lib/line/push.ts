/**
 * LINE Push Message via Yuzu-san Bot
 * Uses LINE Messaging API to send push messages to store owners
 */

const LINE_API_URL = 'https://api.line.me/v2/bot/message/push';

function getChannelToken(): string {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error('LINE_CHANNEL_ACCESS_TOKEN not configured');
  return token;
}

/** Send a simple text message */
export async function pushTextMessage(lineUserId: string, text: string): Promise<boolean> {
  try {
    const res = await fetch(LINE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getChannelToken()}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [{ type: 'text', text }],
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Send a Flex Message (rich card) */
export async function pushFlexMessage(
  lineUserId: string,
  altText: string,
  contents: Record<string, unknown>,
): Promise<boolean> {
  try {
    const res = await fetch(LINE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getChannelToken()}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [{ type: 'flex', altText, contents }],
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Build a FeedBites notification Flex Message bubble */
export function buildFeedbackResolvedMessage(params: {
  storeName: string;
  reportTitle: string;
  replyMessage: string;
}): Record<string, unknown> {
  return {
    type: 'bubble',
    header: {
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            { type: 'text', text: '🍽️ FeedBites', size: 'sm', color: '#FFFFFF', weight: 'bold' },
            { type: 'text', text: '問題回報已處理', size: 'xs', color: '#FFFFFFCC' },
          ],
        },
        { type: 'text', text: '✅', size: 'xxl', align: 'end' },
      ],
      backgroundColor: '#C5A55A',
      paddingAll: '16px',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'md',
      contents: [
        {
          type: 'text',
          text: params.reportTitle,
          weight: 'bold',
          size: 'md',
          wrap: true,
          color: '#3A3A3A',
        },
        { type: 'separator', color: '#E8E2D8' },
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            { type: 'text', text: '處理回覆', size: 'xs', color: '#8A8585' },
            { type: 'text', text: params.replyMessage, size: 'sm', wrap: true, color: '#3A3A3A', margin: 'sm' },
          ],
        },
        {
          type: 'text',
          text: `店家：${params.storeName}`,
          size: 'xxs',
          color: '#8A8585',
          margin: 'md',
        },
      ],
      paddingAll: '16px',
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          action: {
            type: 'uri',
            label: '查看回報歷史',
            uri: 'https://feedbites-seven.vercel.app/dashboard/feedback',
          },
          style: 'primary',
          color: '#C5A55A',
          height: 'sm',
        },
      ],
      paddingAll: '12px',
    },
    styles: {
      footer: { separator: true },
    },
  };
}
