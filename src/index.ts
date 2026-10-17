import { Hono } from 'hono'
import { jwt, sign } from 'hono/jwt'
import {cors} from "hono/cors"
import { securityMiddleware } from './securityMiddleware'
import { authMiddleware } from './authMiddleware';

type Bindings = {
  DB: D1Database
  BUCKET: R2Bucket
  JWT_SECRET: string
  TURNSTILE_SECRET_KEY: string
}

// 宣告 JWT Payload 型態，讓上下文 (Context) 具備型別提示
type Variables = {
  usernum: string
  password: string
  token: string
  message: string
  jwtPayload: {
    id: number
    username: string
    exp: number
  }
}
const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

//允许跨域
app.use("/*", cors({
  origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}))


// 輔助函式：使用 Web Crypto API 對密碼進行 SHA-256 雜湊
async function hashPassword(password: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

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
// 4. 加密
function encryptflare(pem: string,str: string): Promise<any> {
  return new Promise(async (resolve) => {    
    try {
      if (!pem||!str) {
        resolve(null);
        return;
      }
        // 選擇對應的公鑰欄位（請對齊你的資料庫欄位名稱，此處以 public_keyE 為例）
        const pkBuffer = pemToArrayBuffer(pem);

        // 【關鍵修正】必須先 import 成 CryptoKey 物件
        const publicKey = await crypto.subtle.importKey(
          "spki",
          pkBuffer,
          { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
          true,
          ["encrypt"]
        );

        const encodedMessage = new TextEncoder().encode(str);
        
        const ciphertext = await crypto.subtle.encrypt(
          { name: "RSASSA-PKCS1-v1_5" },
          publicKey,
          encodedMessage
        );

        // 將加密後的 ArrayBuffer 轉回 Base64 方便傳輸或檢視
        const base64Cipher = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
        resolve(base64Cipher);
      } catch (err: any) {
        resolve(null);
      }
  });
}
//签章
function verifysign(pem: string,str: string): Promise<any> {
    return new Promise(async (resolve) => {
      try{
        if (!pem||!str) {
          resolve(null);
          return;
        }
        // 2. 將 PEM 轉回 ArrayBuffer
        const privateKeyBuffer = pemToArrayBuffer(pem);

        // 3. 還原為 CryptoKey 物件
        const privateKey = await crypto.subtle.importKey(
          "pkcs8", // 私鑰格式
          privateKeyBuffer,
          {
            name: "RSASSA-PKCS1-v1_5",
            hash: "SHA-256",
          },
          true,
          ["sign"] // 宣告用途為簽章
        );
        // 4. 順利進行加簽！
        const signature = await crypto.subtle.sign(
          { name: "RSASSA-PKCS1-v1_5" },
          privateKey,
          new TextEncoder().encode(str)
        );
        const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
        resolve(signatureBase64);
      }catch(err: any){
        resolve(null);
      }
    })
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
          { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
          true,
          ["decrypt"]
        );

        // C. 將 Base64 密文轉為 ArrayBuffer
        const cipherBuffer = base64ToArrayBuffer(ciphertextBase64);

        // D. 執行解密
        const decryptedBuffer = await crypto.subtle.decrypt(
          { name: "RSASSA-PKCS1-v1_5" },
          privateKey,
          cipherBuffer
        );

        resolve(new TextDecoder().decode(decryptedBuffer));
    } catch (err) {
      resolve(null);
    }
  });
}

//随机数
function generateRandom6Digits(): string {
  // 建立一個長度為 1 的 Uint32Array 來存放亂數
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  
  // 將亂數對 1,000,000 取餘數，確保一定小於 1000000，然後補齊 6 位數（不足前面補 0）
  const randomNum = array[0] % 1000000;
  return String(randomNum).padStart(6, '0');
}

//建表
app.post('/api/public/init-db', securityMiddleware, async (c) => {
  try {
    // 建立 users 表格
    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        UUID TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL
      )
    `).run();
    // 建立 admin 表格
    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS admin (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        publicid TEXT
        adminname TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      )
    `).run();

    // 建立 system_keys 表格（公共公私鑰）
    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS system_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key_name TEXT UNIQUE NOT NULL, -- 例如命名為 'default' 或 'main'
        public_keyD TEXT NOT NULL,
        private_keyD TEXT NOT NULL,
        public_keyE TEXT NOT NULL,
        private_keyE TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `).run();

    // 建立 user_sign 表格（特征值签章）
    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS user_sign (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        usernum TEXT NOT NULL,
        UUID TEXT NOT NULL,
        expires TEXT NOT NULL,
        type TEXT NOT NULL,
        signature TEXT NOT NULL,
        expires_at DATETIME NOT NULL
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `).run();

    // 防重放 Nonce 表
    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS request_nonces (
          nonce TEXT PRIMARY KEY,
          created_at INTEGER NOT NULL -- 儲存秒數時間戳
      );
    `).run();

    //IP 頻率限制表
    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS ip_rate_limits (
          ip TEXT PRIMARY KEY,
          request_count INTEGER NOT NULL,
          window_start INTEGER NOT NULL, -- 窗口起始時間戳
          blocked_until INTEGER DEFAULT 0 -- 如果被封鎖，解封的時間戳
      );
    `).run();

    //ADlink表格
    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS ADlink (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          usernum TEXT NOT NULL,
          urlId TEXT NOT NULL,
          title TEXT NOT NULL,
          xuhao TEXT NOT NULL,
          postname TEXT NOT NULL,
          linkUrl TEXT NOT NULL,
          expritime DATETIME
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `).run();

    //custemail表格，emailauno联系邮箱{devpro:"",cust:""}，custcode社交{LINE:"",WHATSAPP:""}，pubaunot自媒体平台{X:{img,url},Y:{img,url},F:{img,url},T:{img,url}}
    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS custemail (
          publicid TEXT,
          emailaunot TEXT,
          custcode TEXT,
          pubaunot TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `).run();

    //member_start表格
    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS mbmber_start (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `).run();

    //items图片文件链接表格,title文件名称，content查找标识，file_key链接
    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          usernum INTEGER NOT NULL,
          title INTEGER NOT NULL,
          content INTEGER NOT NULL,
          file_key INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `).run();


    return c.json({ success: true, message: 'Tables created successfully!' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// ----------------------------------------------------
// 1. 公開路由 (Auth: 註冊與登入)
// ----------------------------------------------------
//使用 c.get() 取出中间件掛載的資料
//const currentUser = c.get('user');
// 用戶註冊
app.post('/api/auth/register', securityMiddleware, authMiddleware, async (c) => {
  /**
  // === 驗證人類還是機器人 (Turnstile 伺服器端驗證) ===
  const turnstileSecret = c.env.TURNSTILE_SECRET_KEY
  // 建立傳給 Cloudflare 驗證伺服器的表單資料
  const formData = new FormData()
  formData.append('secret', turnstileSecret)
  formData.append('response', registerObj.token)
  // 可選：帶入使用者 IP（從 Cloudflare Header 取得）
  const clientIp = c.req.header('CF-Connecting-IP')
  if (clientIp) {
    formData.append('remoteip', clientIp)
  }

  const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: formData,
  })

  const verifyResult: any = await verifyRes.json()

  // 如果驗證失敗，直接阻擋
  if (!verifyResult.success) {
    return c.json({ error: '人機驗證失敗，請重試。', details: verifyResult['error-codes'] }, 400)
  }

  // === 驗證成功，繼續執行原本的註冊邏輯 ===
   */
  try {
    const usernum = c.get('usernum')
    const password=c.get("password")
    const message=c.get("message")
    if(!usernum||!password||!message)return c.json({ error: 'Invalid username or password' },401)
    const passwordHash = await hashPassword(password)
    const username: any = await c.env.DB.prepare(
        'SELECT * FROM users WHERE username = ?'
    ).bind(usernum).first();
    if (username) {
        return c.json({ error: 'username is error' }, 400)
    }
    const result = await c.env.DB.prepare(
      'INSERT INTO users (username, password_hash,UUID) VALUES (?,?,?)'
    )
    .bind(usernum, passwordHash,message)
    .run()

    return c.json({ success: true, userId: result.meta.last_row_id }, 201)
  } catch (err: any) {
    return c.json({ error: 'Username already exists or database error' }, 400)
  }
})
//管理员注册
app.post('/api/auth/adminregister', securityMiddleware, authMiddleware, async (c) => {
  try {
    const usernum = c.get('usernum')
    const password=c.get("password")
    if(!usernum||!password)return c.json({ error: 'Invalid adminname or password' },401)
    const sysKeys: any = await c.env.DB.prepare(
      'SELECT * FROM system_keys WHERE key_name = ?'
  ).bind('default').first();
  if (!sysKeys||!sysKeys.public_keyD) {
      return c.json({ error: 'key not found' }, 400)
  }
  const publicKeyPem = sysKeys.public_keyD as string;
  const encrypted=await encryptflare(publicKeyPem,password);
    const adminname: any = await c.env.DB.prepare(
        'SELECT * FROM admin WHERE adminname = ?'
    ).bind(usernum).first();
    if (adminname) {
        return c.json({ error: 'username is error' }, 400)
    }
    const result = await c.env.DB.prepare(
      'INSERT INTO admin (adminname, password,publicid) VALUES (?,?,?)'
    )
    .bind(usernum, encrypted,"758805")
    .run()

    return c.json({ success: true, adminId: result.meta.last_row_id }, 201)
  } catch (err: any) {
    return c.json({ error: 'adminname already exists or database error' }, 400)
  }
})

//生成公用密钥
app.post('/api/public/addkey', securityMiddleware, async (c) => {
    try{
        const query = 'SELECT * FROM system_keys WHERE key_name = ? ORDER BY created_at DESC'
        const res = await c.env.DB.prepare(query)
          .bind("default")
          .all()
        
        if(res.results.length<1||!res.results[0].public_keyD||!res.results[0].private_keyD||!res.results[0].public_keyF||!res.results[0].private_keyF){
            //用于加解密
          const keyPair1 = (await crypto.subtle.generateKey(
              {
                name: "RSASSA-PKCS1-v1_5",
                modulusLength: 2048, // 密鑰長度
                publicExponent: new Uint8Array([1, 0, 1]), 
                hash: "SHA-256",
              },
              true, // 是否可匯出
              ["encrypt", "decrypt","sign", "verify"]
          )) as CryptoKeyPair;

        // 2. 將公鑰匯出為 SPKI (PEM 格式的前置步驟)
        const exportedPublicKeyD = await crypto.subtle.exportKey("spki", keyPair1.publicKey);
        const publicKeyPemD = formatPem(exportedPublicKeyD as ArrayBuffer, "PUBLIC KEY");

        // 3. 將私鑰匯出為 PKCS8
        const exportedPrivateKeyD = await crypto.subtle.exportKey("pkcs8", keyPair1.privateKey);
        const privateKeyPemD = formatPem(exportedPrivateKeyD as ArrayBuffer, "PRIVATE KEY");

        // 輔助函式：將 ArrayBuffer 轉換為標準 PEM 格式字串
        function formatPem(buffer:ArrayBuffer, label:string) {
            const bytes=new Uint8Array(buffer);
            let binary="";
            for(let i=0;i<bytes.byteLength;i++){
              binary+=String.fromCharCode(bytes[i]);
            }

            const base64 = btoa(binary);
            const chunks = base64.match(/.{1,64}/g) || [];
            return `-----BEGIN ${label}-----\n${chunks.join('\n')}\n-----END ${label}-----`;
        }

        //
        const KeyPair2 = await crypto.subtle.generateKey(
          {
            name: "RSASSA-PKCS1-v1_5",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
          },
          true,
          ["encrypt", "decrypt"] // 宣告用途
        ) as CryptoKeyPair;

        // 2. 匯出公鑰 (spki 格式) 與私鑰 (pkcs8 格式)
        const exportedPublicKeyE = await crypto.subtle.exportKey("spki", KeyPair2.publicKey);
        const exportedPrivateKeyE = await crypto.subtle.exportKey("pkcs8", KeyPair2.privateKey);

        // 3. 使用你的 formatPem 轉成標準 PEM 字串
        const publicKeyPemE = formatPem(exportedPublicKeyE as ArrayBuffer, "PUBLIC KEY");
        const privateKeyPemE = formatPem(exportedPrivateKeyE as ArrayBuffer, "PRIVATE KEY");

        const result_system = await c.env.DB.prepare(
          'INSERT INTO system_keys (key_name,public_keyD,private_keyD,public_keyE,private_keyE) VALUES (?,?,?,?,?)'
        )
        .bind("default",publicKeyPemD,privateKeyPemD,publicKeyPemE,privateKeyPemE)
        .run()
        return c.json({ success: true, id: result_system.meta.last_row_id,})
        }else{
          return c.json({ success: false, data: "金钥已经存在" })
        }
    }catch(err:any){
      return c.json({ 
        success: false, 
        error: err.message 
      }, 500)
    }
})

// 获取公共密钥
app.post('/api/public/findkey', securityMiddleware, async (c) => {
  try {
    const query = 'SELECT * FROM system_keys WHERE key_name = ? ORDER BY created_at DESC'
    const res = await c.env.DB.prepare(query)
      .bind("default")
      .all()
      
    if(res.results.length>0&&res.results[0].public_keyD&&res.results[0].private_keyE){
      return c.json({
          success: true, 
          data: {
            public_keyD:res.results[0].public_keyD,
            private_keyE:res.results[0].private_keyE
          }
      })
    }

    return c.json({ 
      success: false, 
    }, 400)
    
  } catch (err: any) {
    // 4. 捕獲並返回異常錯誤
    return c.json({ 
      success: false, 
      error: err.message || 'Internal Server Error' 
    }, 500)
  }
})

// 用戶登入 (核發 JWT)
app.post('/api/auth/login', securityMiddleware, authMiddleware, async (c) => {
  try{  
    const usernum = c.get('usernum')
    const password=c.get("password")
    if(!usernum||!password)return c.json({ error: 'Invalid username or password' },401)
    const passwordHash = await hashPassword(password)
    // 1. 驗證用戶帳號與密碼
    const user: any = await c.env.DB.prepare(
      'SELECT id, username FROM users WHERE username = ? AND password_hash = ?'
    )
      .bind(usernum, passwordHash)
      .first()
    
    if (!user) {
      return c.json({ error: 'Invalid username or password' }, 401)
    }
    
    // 2. 簽署生成 JWT Token (設定 24 小時後過期)
    const payload = {
      id: user.id,
      username: user.username,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 // 24 hours
    }
    const token = await sign(payload, c.env.JWT_SECRET) 
    const sysKeys: any = await c.env.DB.prepare(
        'SELECT * FROM system_keys WHERE key_name = ?'
    ).bind('default').first();
    if (!sysKeys||!sysKeys.public_keyE||!sysKeys.private_keyD) {
        return c.json({ error: 'key not found' }, 400)
    }
    
    const publicKeyPem = sysKeys.public_keyE as string;
    const encrypted=await encryptflare(publicKeyPem,token);
    const publicKeyPem1 = sysKeys.private_keyD as string;
    const signbase64= await verifysign(publicKeyPem1,token);
    return c.json({
      success: true,
      token:encrypted,
      username: user.username,
      signbase64:signbase64
    })
  } catch (err: any) {
    // 4. 捕獲並返回異常錯誤
    return c.json({ 
      success: false, 
      error: err.message || 'Internal Server Error' 
    }, 500)
  }
})

// ----------------------------------------------------
// 2. 註冊 JWT 鑑權中間件 (保護所有以 /api/protected/* 開頭的路由)
// ----------------------------------------------------
app.use('/api/protected/*', (c, next) => {
  
  const jwtMiddleware = jwt({
    secret: c.env.JWT_SECRET,
    alg:"HS256"
  })
  return jwtMiddleware(c, next)
})

// ----------------------------------------------------
// 3. 受保護路由 (Protected Routes)
// ----------------------------------------------------

//签章特征值
app.post("/api/protected/sign", securityMiddleware, authMiddleware, async (c)=>{
  try{
    const user = c.get('jwtPayload')
    const usernum = c.get('usernum')
    const message=c.get("message")
    if(!usernum||usernum!==user.username||usernum!==message.split("(ASD)")[0])return c.json({ error: 'Invalid username' },401)
      const mechinaId: any = await c.env.DB.prepare(
        'SELECT * FROM users WHERE user_id = ?'
    ).bind(user.id).first();
      // 1. 從資料庫讀出私鑰 PEM 字串
    if(!mechinaId||!mechinaId.UUID)return c.json({ error: 'Invalid username' },401)
    const dbKeyRecord: any = await c.env.DB.prepare(
        'SELECT * FROM system_keys WHERE key_name = ?'
    ).bind('default').first();
    if(!dbKeyRecord||!dbKeyRecord.private_keyD||!dbKeyRecord.public_keyD)return c.json({ 
      success: false, 
    }, 400) 
    const privateKeyPem = dbKeyRecord.private_keyD as string;
    const expires=message.split("(ASD)")[1];
    const subtype=message.split("(ASD)")[2];
    const signatureBase64=await verifysign(privateKeyPem,usernum+mechinaId.UUID+expires+subtype) 
    const adminlist: any = await c.env.DB.prepare(
        'SELECT * FROM admin WHERE publicid = ?'
    ).bind('758805').first();
    if(!adminlist||adminlist.adminname!=="17369622758")return c.json({ 
      success: false, 
    }, 400)
    const plantext=await decryptflare(privateKeyPem,adminlist.password);
    if(!plantext)return c.json({ 
      success: false, 
    }, 400)
    const password_base=btoa(plantext);
    const sum=Math.floor(Math.random()*(signatureBase64.length-1));
    const sign=signatureBase64.substring(0,sum)+password_base+signatureBase64.substring(sum,signatureBase64.length);
    await c.env.DB.prepare(
      'INSERT INTO user_sign (user_id,usernum,UUID,expires,signature) VALUES (?,?,?,?,?)'
    )
    .bind(user.id,usernum,message.split("(ASD)")[1],expires,sign)
    .run()


  verifynext(signatureBase64)
    async function verifynext(signature_Base64: string){
      // 1. 從資料庫讀出公鑰 PEM 字串（通常對應使用者的公鑰欄位）
      const dbKeyRecord1: any = await c.env.DB.prepare(
        'SELECT * FROM system_keys WHERE key_name = ?'
    ).bind('default').first();

      if (!dbKeyRecord1 || !dbKeyRecord1.public_keyD) {
        return c.json({ success: false, error: '找不到對應的公鑰' }, 400);
      }
      const publicKeyPem = dbKeyRecord1.public_keyD as string;

      // 2. 將 PEM 轉回 ArrayBuffer（與加簽時的 pemToArrayBuffer 相同邏輯）
      const publicKeyBuffer = pemToArrayBuffer(publicKeyPem);

      // 3. 還原為用於驗證的 CryptoKey 物件
      const publicKey = await crypto.subtle.importKey(
        "spki", // 公鑰標準格式為 spki
        publicKeyBuffer,
        {
          name: "RSASSA-PKCS1-v1_5",
          hash: "SHA-256",
        },
        true,
        ["verify"] // 宣告用途為驗證簽章
      );

      // 將 Base64 轉回 Uint8Array / ArrayBuffer
      const binaryString = atob(signature_Base64);
      const signatureBytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        signatureBytes[i] = binaryString.charCodeAt(i);
      }

      // 5. 進行驗證！
      const isValid = await crypto.subtle.verify(
        { name: "RSASSA-PKCS1-v1_5" },
        publicKey,
        signatureBytes,
        new TextEncoder().encode(message)
      );

      if (!isValid) {
        return c.json({ success: false, error: '簽章驗證失敗，資料可能遭篡改' }, 403);
      }
      console.log(isValid,"87749640fhhjdkg");
      // 驗證成功，繼續後續邏輯...
      }

    
    return c.json({
      success: true, 
      usernum:usernum
    })
  } catch (err: any) {
    // 4. 捕獲並返回異常錯誤
    return c.json({ 
      success: false, 
      error: err.message || 'Internal Server Error' 
    }, 500)
  }  
})

//产生与获取解禁码
app.post("/api/protected/opensign", securityMiddleware, authMiddleware, async (c)=>{
  try{  
    const user = c.get('jwtPayload')
    const usernum = c.get('usernum')
    if(!usernum||usernum!==user.username)return c.json({ error: 'Invalid username' },401)
      const dbKeyRecord: any = await c.env.DB.prepare(
        'SELECT * FROM system_keys WHERE key_name = ?'
    ).bind('default').first();
    if(!dbKeyRecord||!dbKeyRecord.private_keyD||!dbKeyRecord.public_keyD)return c.json({ 
      success: false, 
    }, 400) 
    const openobj: any = await c.env.DB.prepare(
        'SELECT * FROM mbmber_start WHERE user_id = ?'
    ).bind(user.id).first();
    if(!openobj||!openobj.user_id)return c.json({ 
      success: false, 
    }, 400) 
    const privateKeyPem = dbKeyRecord.private_keyD as string;
    const fnsum=generateRandom6Digits();
    const signatureBase64=await verifysign(privateKeyPem,usernum+fnsum);
    const sysKeys: any = await c.env.DB.prepare(
        'SELECT * FROM system_keys WHERE key_name = ?'
    ).bind('default').first();
    if (!sysKeys||!sysKeys.public_keyE) {
        return c.json({ error: 'key not found' }, 400)
    }
    const publicKeyPem = sysKeys.public_keyE as string;
    const encrypted=await encryptflare(publicKeyPem,fnsum);
    return c.json({
      success: true,
      fnsum: encrypted,
      signatureBase64:signatureBase64
    })

   } catch (err: any) {
    // 4. 捕獲並返回異常錯誤
    return c.json({ 
      success: false, 
      error: err.message || 'Internal Server Error' 
    }, 500)
  } 
})

//查找特征值签章
app.post("/api/protected/findsign", securityMiddleware, authMiddleware, async (c)=>{
  try{
    const user = c.get('jwtPayload')
    const usernum = c.get('usernum')
    if(!usernum||usernum!==user.username)return c.json({ error: 'Invalid username' },401)
    const signobj: any = await c.env.DB.prepare(
        'SELECT * FROM user_sign WHERE user_id = ?'
    ).bind(user.id).first();
    if(!signobj||!signobj.usernum||!signobj.UUID||!signobj.expires||!signobj.type||!signobj.signature)return c.json({ 
      success: false, 
    }, 400) 
    const sysKeys: any = await c.env.DB.prepare(
        'SELECT * FROM system_keys WHERE key_name = ?'
    ).bind('default').first();
    if (!sysKeys||!sysKeys.public_keyE||!sysKeys.private_keyD) {
        return c.json({ error: 'key not found' }, 400)
    }
    const token=signobj.signature.substring(0,500);
    const publicKeyPem1 = sysKeys.private_keyD as string;
    const signbase64= await verifysign(publicKeyPem1,token);
    return c.json({
      success: true,
      UUID:signobj.UUID,
      expires:signobj.expires,
      subtag:signobj.type,
      sign:signobj.signature,
      usernum: user.username,
      signbase64:signbase64
    })
  } catch (err: any) {
    // 4. 捕獲並返回異常錯誤
    return c.json({ 
      success: false, 
      error: err.message || 'Internal Server Error' 
    }, 500)
  }
})

// 受保護的文件上傳 API
app.post('/api/protected/upload', securityMiddleware, authMiddleware, async (c) => {
  try{
    const user = c.get('jwtPayload')
    const usernum=c.get("usernum")
    const message=c.get('message')
    if(!usernum||usernum!==user.username)return c.json({ error: 'Invalid username' },401)
    
    const body = await c.req.parseBody()
    const file = body['file'] as File

    if (!file) {
      return c.json({ error: 'No file uploaded' }, 400)
    }

    const fileExt = file.name.split('.').pop()
    const fileKey = `user-${user.id}/${Date.now()}.${fileExt}`

    // 上傳至 R2
    await c.env.BUCKET.put(fileKey, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type }
    })

    // 寫入 D1
    await c.env.DB.prepare(
      'INSERT INTO items (title, content, file_key,usernum) VALUES (?, ?, ?,?)'
    )
      .bind(file.name, message, fileKey,usernum)
      .run()

    return c.json({
      success: true,
      fileKey,
      fileUrl: `/files/${fileKey}`
    })
  } catch (err: any) {
    // 4. 捕獲並返回異常錯誤
    return c.json({ 
      success: false, 
      error: err.message || 'Internal Server Error' 
    }, 500)
  }
})

//获取ADlink,paylist,custemail
app.post("/api/protected/findlink", securityMiddleware, authMiddleware, async (c)=>{
  try{
    const user = c.get('jwtPayload')
    const usernum = c.get('usernum')
    const message=c.get("message")
    const newObj: {
      adlist: Record<string, unknown>[];
      items: Record<string, unknown>[];
      custemail: Record<string, unknown>[];
    } = {
      adlist: [],
      items: [],
      custemail: []
    };
    if(!usernum||usernum!==user.username)return c.json({ error: 'Invalid username' },401)
      const res1 = await c.env.DB.prepare(
        'SELECT * FROM ADlink WHERE usernum = ? ORDER BY created_at DESC'
    ).bind(usernum).all();
      let results
      if (message) {
        // 2. 如果有提供關鍵字，使用帶有模糊查詢（LIKE）的參數化語句，防止 SQL 注入
        const query = 'SELECT * FROM items WHERE usernum LIKE ? OR content LIKE ? ORDER BY created_at DESC'
        const searchTerm1 = `%${usernum}%`
        const searchTerm2 = `%${message}%`
        const res = await c.env.DB.prepare(query)
          .bind(searchTerm1, searchTerm2)
          .all()
        results = res.results
      } else {
        // 3. 如果沒有提供關鍵字，則返回最近的全部數據（或限制筆數）
        const res = await c.env.DB.prepare(
          'SELECT * FROM items ORDER BY created_at DESC LIMIT 50'
        ).all()
        results = res.results
      }
    const res2 = await c.env.DB.prepare(
        'SELECT * FROM custemail WHERE publicid = ? ORDER BY created_at DESC'
    ).bind("758805").all();
    if(res1.results.length>0)newObj.adlist.push(...res1.results);
    if(results.length>0)newObj.items.push(...results);
    if(res2.results.length>0)newObj.custemail.push(...res2.results);
    return c.json({
      success: true,
      usernum: user.username,
      newObj:newObj
    })
  } catch (err: any) {
    // 4. 捕獲並返回異常錯誤
    return c.json({ 
      success: false, 
      error: err.message || 'Internal Server Error' 
    }, 500)
  }
})
export default app
