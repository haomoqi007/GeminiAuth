// api/config.js
export default function handler(req, res) {
  // 从环境变量中读取，如果没有设置，则使用一个默认值（可选）
  const logoUrl = process.env.LOGO_URL || '';
  
  res.status(200).json({ 
    logo_url: logoUrl 
  });
}