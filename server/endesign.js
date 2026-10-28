const forge = require('node-forge');
const fs=require("fs");
const path=require("path");

function encryptWithCloudflarePublicKey(plainText) {
    if (!plainText) return null;
    
    const publicKeyPem = fs.readFileSync(path.join(__dirname, "./key/publicKeyF.pem"), "utf-8");
    if (!publicKeyPem) return null;
    
    const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
    
    // 💡 修正：明確指定使用 RSA-OAEP 並搭配 SHA-256
    const encryptedBytes = publicKey.encrypt(plainText, 'RSA-OAEP', {
        md: forge.md.sha256.create(), // 指定 SHA-256
        mgf1: {
            md: forge.md.sha256.create() // MGF1 也對應搭配 SHA-256
        }
    });
    
    // 轉為 Base64 方便傳輸
    return forge.util.encode64(encryptedBytes);
}
//解密
function decryptFromCloudflare(base64Cipher) {
    if (!base64Cipher) return false;
    const privateKeyPem = fs.readFileSync(path.join(__dirname, "./key/privateKeyE.pem"), "utf-8");
    if (!privateKeyPem) return false;
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
    
    // 將 Base64 轉回位元組
    const decodedBytes = forge.util.decode64(base64Cipher);
    
    try {
        // 💡 修正：明確指定使用 RSA-OAEP 並搭配 SHA-256
        const decryptedBytes = privateKey.decrypt(decodedBytes, 'RSA-OAEP', {
            md: forge.md.sha256.create(),
            mgf1: {
                md: forge.md.sha256.create()
            }
        });
        return decryptedBytes;
    } catch (err) {
        console.error("解密失敗:", err.message);
        return false;
    }
}
//验章
function verifyCloudflareSignature(message, base64Signature) {
    if (!message || !base64Signature) return null;
    const publicKeyPem = fs.readFileSync(path.join(__dirname, "./key/publicKeyD.pem"), "utf-8");
    if (!publicKeyPem) return null;
    
    try {
        const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
        
        // 建立 SHA-256 摘要
        const md = forge.md.sha256.create();
        md.update(message, 'utf8');
        
        // 將 Base64 簽章解碼為二進位
        const signatureBytes = forge.util.decode64(base64Signature);
        
        // 進行驗章 (明確指定使用 PKCS1 填充模式)
        const isValid = publicKey.verify(md.digest().bytes(), signatureBytes, {
            algorithm: 'RSASSA-PKCS1-V1_5',
            md: forge.md.sha256.create()
        });
        
        return isValid;
    } catch (err) {
        console.error("驗章過程發生錯誤:", err.message);
        return false;
    }
}

module.exports = {
    encryptWithCloudflarePublicKey,
    decryptFromCloudflare,
    verifyCloudflareSignature
};