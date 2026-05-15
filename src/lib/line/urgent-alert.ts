import { pushFlexMessage } from './push';

const NEGATIVE_WORDS = ['鹹', '淡', '慢', '貴', '冷', '硬', '油', '臭', '差', '爛', '等太久', '不新鮮', '不好', '難吃'];

export async function checkAndPushUrgentAlert({
  lineUserId,
  storeName,
  recentTexts,
}: {
  lineUserId: string;
  storeName: string;
  recentTexts: string[];
}): Promise<void> {
  for (const kw of NEGATIVE_WORDS) {
    const matches = recentTexts.filter(t => t.includes(kw));
    if (matches.length >= 3) {
      await pushFlexMessage(lineUserId, `🚨 緊急：「${kw}」被提到 ${matches.length} 次`, {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'horizontal',
          backgroundColor: '#DC2626',
          paddingAll: '16px',
          contents: [
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                { type: 'text', text: '🚨 FeedBites 緊急警示', size: 'sm', color: '#FFFFFF', weight: 'bold' },
                { type: 'text', text: storeName, size: 'xs', color: '#FFFFFFCC' },
              ],
            },
          ],
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          paddingAll: '16px',
          contents: [
            {
              type: 'text',
              text: `「${kw}」在過去 1 小時被提到 ${matches.length} 次`,
              weight: 'bold',
              size: 'md',
              wrap: true,
              color: '#3A3A3A',
            },
            { type: 'separator', color: '#E8E2D8' },
            ...matches.slice(0, 2).map(m => ({
              type: 'text' as const,
              text: `• ${m.slice(0, 40)}`,
              size: 'sm' as const,
              color: '#555555',
              wrap: true,
            })),
          ],
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          paddingAll: '12px',
          contents: [{
            type: 'button',
            action: {
              type: 'uri',
              label: '立刻查看回饋',
              uri: 'https://feedbites-seven.vercel.app/dashboard/surveys',
            },
            style: 'primary',
            color: '#DC2626',
            height: 'sm',
          }],
        },
        styles: { footer: { separator: true } },
      });
      return; // 只推一次最嚴重的
    }
  }
}
