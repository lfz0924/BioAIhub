const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 3000;

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'ima-openapi-clientid', 'ima-openapi-apikey', 'ima-openapi-ctx']
}));

app.use('/ima', createProxyMiddleware({
    target: 'https://ima.qq.com',
    changeOrigin: true,
    pathRewrite: { '^/ima': '' },
    onProxyReq: (proxyReq, req, res) => {
        console.log(`[IMA Proxy] Forwarding ${req.method} to Tencent IMA...`);
    },
    onError: (err, req, res) => {
        res.status(500).json({ code: -100, msg: 'Proxy Error: ' + err.message });
    }
}));

app.listen(PORT, () => {
    console.log(`🚀 IMA Local Proxy Server is running on http://localhost:${PORT}/ima`);
});
