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
    // 核心逻辑：尝试找到一个 'valid' 的卡密，并立即将其改为 'used'
    // RETURNING * 表示如果更新成功，返回被更新的那一行数据
    const { rows } = await sql`
      UPDATE cdkeys 
      SET status = 'used', used_at = NOW() 
      WHERE key = ${cdk_key} AND status = 'valid'
      RETURNING *;
    `;

    // 如果 rows 长度为 0，说明：
    // 1. 卡密不存在
    // 2. 或者卡密存在但状态不是 valid (已经被用了)
    if (rows.length === 0) {
      return res.status(200).json({ 
        success: false, 
        message: '认证失败：卡密无效或已被使用' 
      });
    }

    // 如果 rows 有数据，说明更新成功（认证成功）
    return res.status(200).json({ 
        success: true, 
        message: '认证成功！权益已激活。' 
    });

  } catch (error) {
    console.error('DB Error:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
}