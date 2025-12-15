import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  // 1. 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { cdk_key } = req.body;

  if (!cdk_key) {
    return res.status(400).json({ success: false, message: '请输入卡密' });
  }

  try {
    // --- 第一步：先查询卡密的状态 ---
    const { rows } = await sql`SELECT * FROM cdkeys WHERE key = ${cdk_key} LIMIT 1;`;

    // 情况 A：数据库里根本没这一行
    if (rows.length === 0) {
      return res.status(200).json({ 
        success: false, 
        message: '认证失败：卡密不存在，请检查输入' 
      });
    }

    const card = rows[0];

    // 情况 B：卡密存在，但状态已经是 'used'
    if (card.status === 'used') {
      // 处理时间格式：将 UTC 时间转为可读格式 (例如：2024/5/20 12:30:00)
      // 如果数据库里的 used_at 是空的，就显示"未知时间"
      let timeStr = '未知时间';
      if (card.used_at) {
        // 这里简单地转为本地时间字符串
        timeStr = new Date(card.used_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
      }

      return res.status(200).json({ 
        success: false, 
        message: `认证失败：此卡密已于 [${timeStr}] 被使用` 
      });
    }

    // --- 第二步：尝试更新 (原子操作防止并发) ---
    // 只有当 status = 'valid' 时才更新
    const updateResult = await sql`
      UPDATE cdkeys 
      SET status = 'used', used_at = NOW() 
      WHERE key = ${cdk_key} AND status = 'valid'
      RETURNING *;
    `;

    // 再次确认：如果更新行数为0，说明刚才那一瞬间被别人抢先用了
    if (updateResult.rows.length === 0) {
      return res.status(200).json({ 
        success: false, 
        message: '认证失败：卡密刚刚已被使用' 
      });
    }

    // --- 第三步：成功 ---
    return res.status(200).json({ 
        success: true, 
        message: '认证成功！权益已激活。' 
    });

  } catch (error) {
    console.error('DB Error:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误，请稍后重试' });
  }
}
