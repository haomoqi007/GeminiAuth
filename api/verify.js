import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, code: 'METHOD_NOT_ALLOWED' });
  }

  const { cdk_key } = req.body;

  if (!cdk_key) {
    return res.status(400).json({ success: false, code: 'EMPTY_INPUT' });
  }

  try {
    // 1. 查询状态
    const { rows } = await sql`SELECT * FROM cdkeys WHERE key = ${cdk_key} LIMIT 1;`;

    // 情况 A：不存在
    if (rows.length === 0) {
      return res.status(200).json({ 
        success: false, 
        code: 'NOT_FOUND'  // 关键改动：只返回代号
      });
    }

    const card = rows[0];

    // 情况 B：已使用
    if (card.status === 'used') {
      return res.status(200).json({ 
        success: false, 
        code: 'USED', 
        used_at: card.used_at // 把时间传给前端，让前端自己格式化
      });
    }

    // 情况 C：被禁用 (可选)
    if (card.status === 'forbidden') {
      return res.status(200).json({ success: false, code: 'FORBIDDEN' });
    }

    // 2. 尝试更新 (原子操作)
    const updateResult = await sql`
      UPDATE cdkeys 
      SET status = 'used', used_at = NOW() 
      WHERE key = ${cdk_key} AND status = 'valid'
      RETURNING *;
    `;

    // 并发防御
    if (updateResult.rows.length === 0) {
      return res.status(200).json({ success: false, code: 'USED_RECENTLY' });
    }

    // 成功
    return res.status(200).json({ success: true, code: 'SUCCESS' });

  } catch (error) {
    console.error('DB Error:', error);
    return res.status(500).json({ success: false, code: 'SERVER_ERROR' });
  }
}
