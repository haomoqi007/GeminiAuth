export default function handler(req, res) {
  // 读取环境变量
  const logoUrl = process.env.LOGO_URL || '';
  // 如果没设置文档地址，默认跳转到 # (即不跳转)
  const docsUrl = process.env.DOCS_URL || '#';
  
  res.status(200).json({ 
    logo_url: logoUrl,
    docs_url: docsUrl
  });
}
