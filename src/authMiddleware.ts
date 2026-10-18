import { Context, Next } from 'hono';

export const authMiddleware = async (c: Context, next: Next) => {
    /**
    const authHeader = c.req.header('Authorization');
    // 檢查是否有帶 Authorization 標頭且格式正確
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ success: false, error: '缺少或無效的授權標頭 (Authorization Header)' }, 401);
    }
    const token = authHeader.split(' ')[1];
     */
    const body = await c.req.json();
    const sysKeys: any = await c.env.DB.prepare(
        'SELECT * FROM system_keys WHERE key_name = ?'
    ).bind('default').first();
    
    if (!sysKeys||!sysKeys.private_keyF) {
        return c.json({ error: 'key not found' }, 400)
    }
    const privateKeyPem = sysKeys.private_keyF as string;
    const decrypted=await decryptflare(privateKeyPem,body.encrypted) as string;
    
    if (!decrypted) {
        return c.json({ error: 'encrypt not found' }, 400)
    }
    const meObj=JSON.parse(decrypted);console.log(meObj)
    const reg1=/^([\w.-]+@[\w.-]+\.\w+|1[3-9]\d{9})$/;console.log(reg1.test(meObj.username))
    const reg2=/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!meObj||!meObj.username) {
        return c.json({ error: 'Usernum no found' }, 400)
    }
    if(!reg1.test(meObj.username))return c.json({ error: 'Invalid username' }, 400);console.log(meObj,reg2.test(meObj.password))
    if(meObj.password&&!reg2.test(meObj.password))return c.json({ error: 'Invalid password' }, 400)
    //使用 c.set() 將解密後的資料掛載到上下文中
    // 你可以自訂一個鍵名，例如 'user' 或 'tokenPayload'
    c.set('usernum', meObj.username);
    c.set('password', meObj.password?meObj.password:"");
    c.set('token', meObj.token?meObj.token:"");
    c.set('message', meObj.message?meObj.message:"");
    c.set('subtag', meObj.subtag?meObj.subtag:"");

    // 驗證通過，繼續執行下一個中間件或 API 路由
    await next();
};

// 1. pem 轉 ArrayBuffer
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64String = pem
    .replace(/-----BEGIN (.*)-----/, '')
    .replace(/-----END (.*)-----/, '')
    .replace(/\s+/g, '');
  
  const binaryString = atob(base64String);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// 2. Base64 密文轉 ArrayBuffer (解密時需要)
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// 3. 解密
function decryptflare(pem:string,ciphertextBase64: string): Promise<string | null> {
  return new Promise(async (resolve) => {
    try {
        if (!pem||!ciphertextBase64) {
          resolve(null);
          return;
        }
        
        // A. 將 PEM 轉為 ArrayBuffer
        const pkBuffer = pemToArrayBuffer(pem);
        // B. 【關鍵修正】必須先 import 成 CryptoKey 物件
        const privateKey = await crypto.subtle.importKey(
          "pkcs8",
          pkBuffer,
          { name: "RSA-OAEP", hash: "SHA-256" },
          true,
          ["decrypt"]
        );

        // C. 將 Base64 密文轉為 ArrayBuffer
        const cipherBuffer = base64ToArrayBuffer(ciphertextBase64);

        // D. 執行解密
        const decryptedBuffer = await crypto.subtle.decrypt(
          { name: "RSA-OAEP" },
          privateKey,
          cipherBuffer
        );

        resolve(new TextDecoder().decode(decryptedBuffer));
    } catch (err) {console.log(err)
      resolve(null);
    }
  });
}