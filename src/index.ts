import { Hono } from 'hono'
import { jwt, sign } from 'hono/jwt'
import {cors} from "hono/cors"
import { securityMiddleware } from './securityMiddleware'
import { authMiddleware } from './authMiddleware'; 
import {adminconfig} from './config'
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
  allowHeaders: ["Content-Type", "Authorization","x-request-nonce","x-request-timestamp","x-signature"],
  credentials: true,
}))

// 抽離出初始化資料庫的共用函式
async function initializeDatabase(db: D1Database) {
  try {
    // 1. 建立 users 表格
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        UUID TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        publicid TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // 2. 建立 admin 表格 
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS admin (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        publicid TEXT,
        adminname TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // 3. 建立 system_keys 表格（公共公私鑰）
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS system_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key_name TEXT UNIQUE NOT NULL,
        public_keyE TEXT NOT NULL,
        private_keyE TEXT NOT NULL,
        public_keyF TEXT NOT NULL,
        private_keyF TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `).run();

    // 3. 建立 user_keys 表格（用户公私鑰）
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS user_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT UNIQUE NOT NULL,
        public_keyD TEXT NOT NULL,
        private_keyD TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `).run();

    // 4. 建立 user_sign 表格（特征值签章，注意：原本 expires_at 後面缺少了逗號）
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS user_sign (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        publicid TEXT,
        user_id INTEGER NOT NULL,
        usernum TEXT NOT NULL,
        UUID TEXT NOT NULL,
        expires TEXT NOT NULL,
        type TEXT NOT NULL,
        signature TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `).run();

    // 5. 防重放 Nonce 表
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS request_nonces (
          nonce TEXT PRIMARY KEY,
          created_at INTEGER NOT NULL
      );
    `).run();

    // 6. IP 頻率限制表
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS ip_rate_limits (
          ip TEXT PRIMARY KEY,
          request_count INTEGER NOT NULL,
          window_start INTEGER NOT NULL,
          blocked_until INTEGER DEFAULT 0
      );
    `).run();

    // 7. ADlink表格 (注意：expritime 後面補上了逗號)
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS ADlink (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          usernum TEXT NOT NULL,
          urlId TEXT NOT NULL,
          title TEXT NOT NULL,
          xuhao TEXT NOT NULL,
          postname TEXT NOT NULL,
          linkUrl TEXT NOT NULL,
          expritime DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `).run();

    // 8. custemail,custcode,proaccount,paylist表格
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS custemail (
          publicid TEXT,
          typename TEXT,
          enumber TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `).run();
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS custcode (
          publicid TEXT,
          codename TEXT,
          codeimg TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `).run();
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS proaccount (
          publicid TEXT,
          proname TEXT,
          proimg TEXT,
          prourl TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `).run();
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS paylist (
          publicid TEXT,
          payname TEXT,
          payimg TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `).run();

    // 9. member_start表格 (修正了你原本拼寫錯誤的 member_start)
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS member_start (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          publicid TEXT,
          user_id INTEGER NOT NULL,
          usernum INTEGER NOT NULL,
          type TEXT NOT NULL,
          expires TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `).run();

    // 10. items圖片文件鏈接表格
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          content INTEGER NOT NULL,
          file_key INTEGER NOT NULL,
          publicid TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `).run();

    console.log('Database tables initialized successfully!');
  } catch (err: any) {
    console.error('Failed to initialize database:', err.message);
  }
}
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
//生成公用密钥
async function addkeyendesign(db: D1Database){
  try{
        const query = 'SELECT * FROM system_keys WHERE key_name = ?'
        const res = await db.prepare(query)
          .bind("default")
          .all()
        
        if(res.results.length<1||!res.results[0].public_keyF||!res.results[0].private_keyF||!res.results[0].public_keyE||!res.results[0].private_keyE){
          const KeyPair2 = await crypto.subtle.generateKey(
            {
              name: "RSA-OAEP",
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

          //
          const KeyPair3 = await crypto.subtle.generateKey(
            {
              name: "RSA-OAEP",
              modulusLength: 2048,
              publicExponent: new Uint8Array([1, 0, 1]),
              hash: "SHA-256",
            },
            true,
            ["encrypt", "decrypt"] // 宣告用途
          ) as CryptoKeyPair;

          // 2. 匯出公鑰 (spki 格式) 與私鑰 (pkcs8 格式)
          const exportedPublicKeyF = await crypto.subtle.exportKey("spki", KeyPair3.publicKey);
          const exportedPrivateKeyF = await crypto.subtle.exportKey("pkcs8", KeyPair3.privateKey);

          // 3. 使用你的 formatPem 轉成標準 PEM 字串
          const publicKeyPemF = formatPem(exportedPublicKeyF as ArrayBuffer, "PUBLIC KEY");
          const privateKeyPemF = formatPem(exportedPrivateKeyF as ArrayBuffer, "PRIVATE KEY");

          const result_system = await db.prepare(
            'INSERT INTO system_keys (key_name,public_keyE,private_keyE,public_keyF,private_keyF) VALUES (?,?,?,?,?)'
          )
          .bind("default",publicKeyPemE,privateKeyPemE,publicKeyPemF,privateKeyPemF)
          .run()
          return { success: true, id: result_system.meta.last_row_id}
        }else{
          return { success: false, data: "金钥已经存在" }
        }
    }catch(err:any){
      return { 
        success: false, 
        error: err.message 
      }
    }
}

//生成管理员
async function addadminname(db: D1Database){
  const sysKeys: any = await db.prepare(
      'SELECT * FROM system_keys WHERE key_name = ?'
  ).bind('default').first();
  if (!sysKeys||!sysKeys.public_keyF) {
      return { error: 'key not found' }
  }
  const publicKeyPem = sysKeys.public_keyF as string;
  const usernum=adminconfig.adminname;
  // 檢查管理員是否已存在
  const existing = await db.prepare('SELECT id FROM admin WHERE adminname = ?').bind(usernum).first();
  if (existing) {
    return { success: true, message: "管理員已存在，跳過建立" };
  }
  const password=adminconfig.password;
  const encrypted=await encryptflare(publicKeyPem,password);
  const result=await db.prepare(
    'INSERT INTO admin (adminname, password,publicid) VALUES (?,?,?)'
  )
  .bind(usernum, encrypted,"758805")
  .run()
  return result
}
// 用一個全域變數確保在同一個 Worker 生命週期中只執行一次初始化
let isInitialized = false;
// 利用 Hono 的全域 Middleware，在收到第一個請求時自動觸發初始化（若尚未執行）
app.use('*', async (c, next) => {
  if (!isInitialized && c.env && c.env.DB) {
    isInitialized = true;
    // 非阻塞執行初始化，或者用 await 確保建好表才往下走
    await initializeDatabase(c.env.DB);
    await addkeyendesign(c.env.DB);
    await addadminname(c.env.DB);
  }
  await next();
});
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
          { name: "RSA-OAEP", hash: "SHA-256" },
          true,
          ["encrypt"]
        );

        const encodedMessage = new TextEncoder().encode(str);
        
        const ciphertext = await crypto.subtle.encrypt(
          { name: "RSA-OAEP" },
          publicKey,
          encodedMessage
        );

        // 將加密後的 ArrayBuffer 轉回 Base64 方便傳輸或檢視
        const base64Cipher = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
        resolve(base64Cipher);
      } catch (err: any) {console.log(err)
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
//签章会员特征值
async function addsignkey(db: D1Database,userId: Number,message: string,usernum: string){
    const mechinaId: any = await db.prepare(
        'SELECT * FROM users WHERE user_id = ?'
    ).bind(userId).first();
    if(!mechinaId||!mechinaId.UUID)return null
    // 1. 從資料庫讀出私鑰 PEM 字串
    const dbKeyRecord: any = await db.prepare(
        'SELECT * FROM user_keys WHERE user_id = ?'
    ).bind(userId).first();
    if(!dbKeyRecord||!dbKeyRecord.private_keyD)return null
    const dbKeyRecord1: any = await db.prepare(
        'SELECT * FROM system_keys WHERE key_name = ?'
    ).bind("default").first();
    if(!dbKeyRecord1||!dbKeyRecord1.private_keyF)return null
    const privateKeyPem = dbKeyRecord.private_keyD as string;
    const privateKeyPem1 = dbKeyRecord1.private_keyF as string;
    const expires=message.split("(ASD)")[2];
    const subtype=message.split("(ASD)")[1];
    const signatureBase64=await verifysign(privateKeyPem,usernum+mechinaId.UUID+expires+subtype) 
    const adminlist: any = await db.prepare(
        'SELECT * FROM admin WHERE publicid = ?'
    ).bind('758805').first();
    if(!adminlist||adminlist.adminname!=="17369622758")return null
    const plantext=await decryptflare(privateKeyPem1,adminlist.password);
    if(!plantext)return null
    const password_base=btoa(plantext);
    const sum=Math.floor(Math.random()*(signatureBase64.length-1));
    const sign=signatureBase64.substring(0,sum)+password_base+signatureBase64.substring(sum,signatureBase64.length);
    return {sign:sign,UUID:mechinaId.UUID}
}
async function setupsignvrifig(db: D1Database,userId: Number,message: string,usernum: string){
    if(message.split("(ASD)")[0]==="add"){
      const signObj=await addsignkey(db,userId,message,usernum) as any;
      await db.prepare(
        'INSERT INTO user_sign (user_id,usernum,UUID,expires,signature,type,publicid) VALUES (?,?,?,?,?,?,?)'
      )
      .bind(userId,usernum,signObj.UUID,message.split("(ASD)")[2],signObj.sign,message.split("(ASD)")[1],"758805")
      .run()
    }
    if(message.split("(ASD)")[0]==="del"){
        const query = 'SELECT * FROM user_sign WHERE usernum LIKE ? OR type LIKE ?'
        const searchTerm1 = `%${usernum}%`
        const searchTerm2 = `%${message.split("(ASD)")[1]}%`
        const res: any = await db.prepare(query)
        .bind(searchTerm1, searchTerm2).first()
        if(res&&res.id){
          await db.prepare(
            'DELETE FROM user_sign WHERE id = '
          )
          .bind(res.id)
          .run()
        }
    } 
    if(message.split("(ASD)")[0]==="rest"){
        const signObj=await addsignkey(db,userId,message,usernum) as any;
        const query = 'SELECT * FROM user_sign WHERE usernum LIKE ? OR type LIKE ?'
        const searchTerm1 = `%${usernum}%`
        const searchTerm2 = `%${message.split("(ASD)")[1]}%`
        const res: any = await db.prepare(query)
        .bind(searchTerm1, searchTerm2).first()
        if(res&&res.id){
          await db.prepare(
            'UPDATE user_sign SET type = ?,expires = ?,signature = ? WHERE id = ?'
          )
          .bind(message.split("(ASD)")[1],message.split("(ASD)")[2],signObj.sign,res.id)
          .run()
        } 
    } 
}

// ----------------------------------------------------
// 1. 公開路由 (Auth: 註冊與登入)
// ----------------------------------------------------
//使用 c.get() 取出中间件掛載的資料
//如：const currentUser = c.get('user');
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
    if (username||username.username) {
        return c.json({ error: 'username is error' }, 400)
    }
    const adminname: any = await c.env.DB.prepare(
        'SELECT * FROM admin WHERE adminname = ?'
    ).bind(usernum).first();
    if (adminname||adminname.adminname) {
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
//管理员修改密码
app.post('/api/auth/adminrestart', securityMiddleware, authMiddleware, async (c) => {
  try {
    const usernum = c.get('usernum')
    const password=c.get("password")
    const message=c.get("message")
    if(!usernum||!password||!message||usernum!==adminconfig.adminname)return c.json({ error: 'Invalid adminname or password' },401)
    const adminobj = await c.env.DB.prepare(
        'SELECT * FROM admin WHERE publicid = ?'
    ).bind('758805').first();
    if(!adminobj)return c.json({ error: 'Invalid admin sql' },401)
    const sysKeys: any = await c.env.DB.prepare(
        'SELECT * FROM system_keys WHERE key_name = ?'
    ).bind('default').first();
    if (!sysKeys||!sysKeys.public_keyF||!sysKeys.private_keyF) {
        return c.json({ error: 'key not found' }, 400)
    }
    const privateKeyPem=sysKeys.private_keyF as string;
    const adminpsw=adminobj.password as string;
    const decrypted=await decryptflare(privateKeyPem,adminpsw);
    if(decrypted!==password)return c.json({ error: 'Invalid password' },401)
    const publicKeyPem = sysKeys.public_keyF as string;
    const encrypted=await encryptflare(publicKeyPem,message);
    const result = await c.env.DB.prepare(
      'UPDATE admin SET password = ? WHERE adminname = ?'
    )
      .bind(encrypted, usernum)
      .run()

    return c.json({ 
      success: true, 
      message: 'Item updated successfully',
      meta: result.meta 
    })
  } catch (err: any) {
    return c.json({ error: 'adminname already exists or database error' }, 400)
  }
})
//生成加密值
app.post('/api/public/clientencry', securityMiddleware, async (c) => {
  try{
    const body = await c.req.json();
    const sysKeys: any = await c.env.DB.prepare(
        'SELECT * FROM system_keys WHERE key_name = ?'
    ).bind('default').first();
    if (!sysKeys||!sysKeys.public_keyE||!sysKeys.private_keyF){
        return c.json({ error: 'key not found' }, 400)
    }
    const privateKeyPem = sysKeys.private_keyF as string;
    const decrypted=await decryptflare(privateKeyPem,body.encrypted) as string;
    
    if (!decrypted) {
        return c.json({ error: 'encrypt not found' }, 400)
    }
    const publicKeyPem = sysKeys.public_keyE as string;
    const encrypted=await encryptflare(publicKeyPem,decrypted);
    return c.json({
      success: true,
      encrypted:encrypted
    })
  }catch (err: any) {
    // 4. 捕獲並返回異常錯誤
    return c.json({ 
      success: false, 
      error: err.message || 'Internal Server Error' 
    }, 500)
  }
})
// 获取公共密钥
app.post('/api/public/findkey', securityMiddleware, async (c) => {
  try {
    const query = 'SELECT * FROM system_keys WHERE key_name = ?'
    const res = await c.env.DB.prepare(query)
      .bind("default")
      .all() 
    if(res.results.length>0&&res.results[0].public_keyF&&res.results[0].private_keyE){
      return c.json({
          success: true, 
          data: {
            public_keyF:res.results[0].public_keyF,
            private_keyE:res.results[0].private_keyE
          }
      })
    }

    return c.json({ 
      success: false, 
    }, 400)
    
  } catch (err: any) {console.log(err)
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
    const passwordHash = await hashPassword(password);console.log(passwordHash)
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
    const token = await sign(payload, c.env.JWT_SECRET);
    const sysKeys: any = await c.env.DB.prepare(
        'SELECT * FROM system_keys WHERE key_name = ?'
    ).bind('default').first();
    if (!sysKeys||!sysKeys.public_keyE) {
        return c.json({ error: 'key not found' }, 400)
    }
    const publicKeyPem = sysKeys.public_keyE as string;
    const encrypted=await encryptflare(publicKeyPem,token);
    return c.json({
      success: true,
      token:encrypted,
      username: user.username
    })
  } catch (err: any) {
    // 4. 捕獲並返回異常錯誤
    return c.json({ 
      success: false, 
      error: err.message || 'Internal Server Error' 
    }, 500)
  }
})
// 管理员登入 (核發 JWT)
app.post('/api/auth/adminlogin', securityMiddleware, authMiddleware, async (c) => {
  try{  
    const usernum = c.get('usernum');
    const password=c.get("password")
    if(!usernum||!password)return c.json({ error: 'Invalid username or password' },401)
    const sysKeys: any = await c.env.DB.prepare(
        'SELECT * FROM system_keys WHERE key_name = ?'
    ).bind('default').first();
    if (!sysKeys||!sysKeys.public_keyE||!sysKeys.public_keyF) {
        return c.json({ error: 'key not found' }, 400)
    }
    const publicKeyPem1 = sysKeys.public_keyF as string;
      const passwordHash = await encryptflare(publicKeyPem1,password);
    // 1. 驗證用戶帳號與密碼
    const user: any = await c.env.DB.prepare(
      'SELECT * FROM admin WHERE adminname = ?'
    )
    .bind(usernum).first()
    
    if (!user&&user.password!==passwordHash) {
      return c.json({ error: 'Invalid adminname or password' }, 401)
    }
    
    // 2. 簽署生成 JWT Token (設定 24 小時後過期)
    const payload = {
      id: user.id,
      username: user.adminname,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 // 24 hours
    }
    const token = await sign(payload, c.env.JWT_SECRET);
    const publicKeyPem = sysKeys.public_keyE as string;
    const encrypted=await encryptflare(publicKeyPem,token);
    return c.json({
      success: true,
      token:encrypted,
      adminname: user.adminname
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
// 獲取目前登入用戶個人資訊
app.post('/api/protected/me', (c) => {
  // 從 JWT 解析結果中獲取當前用戶 Payload
  const payload = c.get('jwtPayload');
  return c.json({
    success:true,
    message: 'Authorized',
    user: payload
  })
})
/** 
app.post("/api/protected/sign", securityMiddleware, authMiddleware, async (c)=>{
  try{
    const user = c.get('jwtPayload')
    const usernum = c.get('usernum')
    const message=c.get("message")

    if(!usernum||usernum!==user.username||usernum!==message.split("(ASD)")[0])return c.json({ error: 'Invalid username' },401)
    


  verifynext(signatureBase64)
    async function verifynext(signature_Base64: string){
      // 1. 從資料庫讀出公鑰 PEM 字串（通常對應使用者的公鑰欄位）
      const dbKeyRecord2: any = await c.env.DB.prepare(
        'SELECT * FROM user_keys WHERE user_id = ?'
    ).bind(user.id).first();

      if (!dbKeyRecord2 || !dbKeyRecord2.public_keyD) {
        return c.json({ success: false, error: '找不到對應的公鑰' }, 400);
      }
      const publicKeyPem2 = dbKeyRecord2.public_keyD as string;

      // 2. 將 PEM 轉回 ArrayBuffer（與加簽時的 pemToArrayBuffer 相同邏輯）
      const publicKeyBuffer = pemToArrayBuffer(publicKeyPem2);

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
})*/

//产生与获取解禁码
app.post("/api/protected/opensign", securityMiddleware, authMiddleware, async (c)=>{
  try{  
    const user = c.get('jwtPayload')
    const usernum = c.get('usernum')
    if(!usernum||usernum!==user.username)return c.json({ error: 'Invalid username' },401)
      const dbKeyRecord: any = await c.env.DB.prepare(
        'SELECT * FROM user_keys WHERE user_id = ?'
    ).bind(user.id).first();
    if(!dbKeyRecord||!dbKeyRecord.private_keyD)return c.json({ 
      success: false, 
    }, 400) 
    const openobj: any = await c.env.DB.prepare(
        'SELECT * FROM member_start WHERE user_id = ?'
    ).bind(user.id).first();
    if(!openobj||!openobj.user_id||openobj.user_id!==user.id)return c.json({ 
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
      usernum:usernum,
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
//产生并返回用户验章密钥
app.post("/api/protected/useraddkey", securityMiddleware, authMiddleware, async (c)=>{
  try{
    const user = c.get('jwtPayload')
    const usernum = c.get('usernum')
    if(!usernum||usernum!==user.username)return c.json({ error: 'Invalid username' },401)
    const query = 'SELECT * FROM user_keys WHERE user_id = ?'
    const res = await c.env.DB.prepare(query)
      .bind(user.id)
      .all()
    if(res.results.length<1||!res.results[0].public_keyD||!res.results[0].private_keyD){
        //用于签章
      const keyPair1 = (await crypto.subtle.generateKey(
          {
            name: "RSASSA-PKCS1-v1_5",
            modulusLength: 2048, // 密鑰長度
            publicExponent: new Uint8Array([1, 0, 1]), 
            hash: "SHA-256",
          },
          true, // 是否可匯出
          ["sign", "verify"]
      )) as CryptoKeyPair;

      // 2. 將公鑰匯出為 SPKI (PEM 格式的前置步驟)
      const exportedPublicKeyD = await crypto.subtle.exportKey("spki", keyPair1.publicKey);
      const publicKeyPemD = formatPem(exportedPublicKeyD as ArrayBuffer, "PUBLIC KEY");

      // 3. 將私鑰匯出為 PKCS8
      const exportedPrivateKeyD = await crypto.subtle.exportKey("pkcs8", keyPair1.privateKey);
      const privateKeyPemD = formatPem(exportedPrivateKeyD as ArrayBuffer, "PRIVATE KEY");

      await c.env.DB.prepare(
        'INSERT INTO user_keys (user_id,public_keyD,private_keyD) VALUES (?,?,?)'
      )
      .bind(user.id,publicKeyPemD,privateKeyPemD)
      .run()
      return c.json({success:true,usernum:usernum,publicKeyD:privateKeyPemD})

    }else{
      return c.json({ success: false, data: "金钥已经存在" })
    }
  }catch(err:any){
    return c.json({ 
      success: false, 
      error: err.message || 'Internal Server Error' 
    }, 500)
  }  
})
//查找签章的特征值
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
    if (!sysKeys||!sysKeys.public_keyE) {
        return c.json({ error: 'key not found' }, 400)
    }
    const sysKeys1: any = await c.env.DB.prepare(
        'SELECT * FROM user_keys WHERE user_id = ?'
    ).bind(user.id).first();
    if (!sysKeys1||!sysKeys1.private_keyD) {
        return c.json({ error: 'key not found' }, 400)
    }
    const sum=Math.floor(Math.random()*(sign.length-1));
    const sum1=sum<500?sum:sum-500;
    const token=signobj.signature.substring(sum1,sum1+500);
    const publicKeyPem = sysKeys.public_keyE as string;
    const publicKeyPem1 = sysKeys1.private_keyD as string;
    const signbase64= await verifysign(publicKeyPem1,token);
    const encrypted=await encryptflare(publicKeyPem,sum1.toString())
    return c.json({
      success: true,
      UUID:signobj.UUID,
      expires:signobj.expires,
      subtag:signobj.type,
      sign:signobj.signature,
      usernum: user.username,
      fnsum:encrypted,
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
// 文件上傳 API
app.post('/api/protected/upload', securityMiddleware, async (c) => {
  try{
    const user = c.get('jwtPayload')
    const sysKeys: any = await c.env.DB.prepare(
        'SELECT * FROM system_keys WHERE key_name = ?'
    ).bind('default').first();
    if (!sysKeys||!sysKeys.private_keyF) {
        return c.json({ error: 'key not found' }, 400)
    }
    const encrypted=c.req.query("encrypted") as string;
    const decrypted=await decryptflare(sysKeys.private_keyF,decodeURIComponent(encrypted)) as string;
    const user_id=JSON.parse(decrypted).user_id;
    const message=JSON.parse(decrypted).message;
    const adminobj: any = await c.env.DB.prepare(
      'SELECT * FROM admin WHERE adminname = ?'
    )
    .bind(user.username).first()
    if(!user_id||parseInt(user_id)!==user.id||!adminobj)return c.json({ error: 'Invalid adminname' },401)
    
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
      'INSERT INTO items (content, file_key) VALUES (?,?)'
    )
      .bind( message, fileKey,user)
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
//获取ADlink,paylist,custemail,custcode,proaccount
app.post("/api/protected/findlink", securityMiddleware, authMiddleware, async (c)=>{
  try{
    const user = c.get('jwtPayload')
    const usernum = c.get('usernum')
    const newObj: {
      adlist: Record<string, unknown>[];
      custemail: Record<string, unknown>[];
      custcode: Record<string, unknown>[];
      proaccount: Record<string, unknown>[];
      paylist: Record<string, unknown>[];
      memberlist: Record<string, unknown>[];
      userlist: Record<string, unknown>[];
    } = {
      adlist: [],
      custemail: [],
      custcode: [],
      proaccount:[],
      paylist: [],
      memberlist:[],
      userlist: []
    };
    if(!usernum||usernum!==user.username)return c.json({ error: 'Invalid username' },401)
      const res1 = await c.env.DB.prepare(
        'SELECT * FROM ADlink WHERE usernum = ? ORDER BY created_at DESC'
    ).bind(usernum).all();    
    const res2 = await c.env.DB.prepare(
        'SELECT * FROM custemail WHERE publicid = ? ORDER BY created_at DESC'
    ).bind("758805").all();
    const res3 = await c.env.DB.prepare(
        'SELECT * FROM member_start WHERE publicid = ? ORDER BY created_at DESC'
    ).bind("758805").all();
    const res4 = await c.env.DB.prepare(
        'SELECT * FROM users WHERE publicid = ? ORDER BY created_at DESC'
    ).bind("758805").all();
    const res5 = await c.env.DB.prepare(
        'SELECT * FROM custcode WHERE publicid = ? ORDER BY created_at DESC'
    ).bind("758805").all();
    const res6 = await c.env.DB.prepare(
        'SELECT * FROM proaccount WHERE publicid = ? ORDER BY created_at DESC'
    ).bind("758805").all();
    const res7 = await c.env.DB.prepare(
        'SELECT * FROM paylist WHERE publicid = ? ORDER BY created_at DESC'
    ).bind("758805").all();
    if(res1.results.length>0)newObj.adlist.push(...res1.results);
    if(res2.results.length>0)newObj.custemail.push(...res2.results);
    if(res3.results.length>0)newObj.memberlist.push(...res3.results);
    if(res4.results.length>0)newObj.userlist.push(...res4.results);
    if(res5.results.length>0)newObj.custcode.push(...res5.results);
    if(res6.results.length>0)newObj.proaccount.push(...res6.results);
    if(res7.results.length>0)newObj.paylist.push(...res7.results);

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
//获取图片、文件
app.post("/api/protected/findimage", securityMiddleware, authMiddleware, async (c)=>{
  try{
    const user = c.get('jwtPayload')
    const usernum = c.get('usernum')
    const message=c.get("message")
    const newObj: {
      items: Record<string, unknown>[];
    } = {
      items: []
    };
    if(!usernum||usernum!==user.username)return c.json({ error: 'Invalid username' },401)
        
      let results=[];
      if (message) {
        // 2. 如果有提供關鍵字，使用帶有模糊查詢（LIKE）的參數化語句，防止 SQL 注入
        const query = 'SELECT * FROM items WHERE content LIKE ? ORDER BY created_at DESC'
        const searchTerm2 = `%${message}%`
        const res = await c.env.DB.prepare(query)
          .bind(searchTerm2)
          .all()
        results = res.results as any;
      } else {
          // 3. 如果沒有提供關鍵字，則返回最近的全部數據（或限制筆數）
        const res = await c.env.DB.prepare(
          'SELECT * FROM items ORDER BY created_at DESC LIMIT 50'
        ).all()
        results = res.results as any;
      }
    
    if(results.length>0)newObj.items.push(...results);

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
//增删改adlink
app.post("/api/protected/adddelrest_adlink", securityMiddleware, authMiddleware, async (c)=>{
    const user = c.get('jwtPayload')
    const usernum = c.get('usernum')
    const message=c.get("message")
    const adminobj: any = await c.env.DB.prepare(
      'SELECT * FROM admin WHERE adminname = ?'
    )
    .bind(user.username).first()
    if(!usernum||usernum!==user.username||!adminobj)return c.json({ error: 'Invalid username' },401)
    const res = await c.env.DB.prepare(
        'SELECT * FROM ADlink WHERE urlId = ?'
    ).bind(message.split("(ASD)")[1]).first();
    if(!res||!res.urlId){  
      if(message.split("(ASD)")[0]==="add"){
        const result = await c.env.DB.prepare(
          'INSERT INTO ADlink (usernum,urlId,title,xuhao,postname,linkUrl,expritime) VALUES (?,?,?,?,?,?,?)'
        )
        .bind(usernum,message.split("(ASD)")[1],message.split("(ASD)")[2],message.split("(ASD)")[3],message.split("(ASD)")[4],message.split("(ASD)")[5],message.split("(ASD)")[6])
        .run()
      }
    }else{
      if(message.split("(ASD)")[0]==="del"){
        const result = await c.env.DB.prepare(
          'DELETE FROM ADlink WHERE urlId = ?'
        )
        .bind(message.split("(ASD)")[1])
        .run()
      }
      if(message.split("(ASD)")[0]==="rest"){
        const result = await c.env.DB.prepare(
          'UPDATE ADlink SET title = ?,xuhao = ?,postname = ?,linkUrl = ?,expritime = ? WHERE urlId = ?'
        )
        .bind(message.split("(ASD)")[2],message.split("(ASD)")[3],message.split("(ASD)")[4],message.split("(ASD)")[5],message.split("(ASD)")[6],message.split("(ASD)")[1])
        .run()
      }
    }
})
//增删改email
app.post("/api/protected/adddelrest_email", securityMiddleware, authMiddleware, async (c)=>{
    const user = c.get('jwtPayload')
    const usernum = c.get('usernum')
    const message=c.get("message")
    const adminobj: any = await c.env.DB.prepare(
      'SELECT * FROM admin WHERE adminname = ?'
    )
    .bind(user.username).first()
    if(!usernum||usernum!==user.username||!adminobj)return c.json({ error: 'Invalid username' },401)
    const res = await c.env.DB.prepare(
        'SELECT * FROM custemail WHERE typename = ?'
    ).bind(message.split("(ASD)")[1]).first();
    if(!res||!res.enumber){
      if(message.split("(ASD)")[0]==="add"){
        const result = await c.env.DB.prepare(
          'INSERT INTO custemail (typename,enumber,publicid) VALUES (?,?,?)'
        )
        .bind(message.split("(ASD)")[1],message.split("(ASD)")[2],"758805")
        .run()
      }
    }else{
        if(message.split("(ASD)")[0]==="del"){
        const result = await c.env.DB.prepare(
          'DELETE FROM custemail WHERE typename = ?'
        )
        .bind(message.split("(ASD)")[1])
        .run()
      }
      if(message.split("(ASD)")[0]==="rest"){
        const result = await c.env.DB.prepare(
          'UPDATE custemail SET enumber = ? WHERE typename = ?'
        )
        .bind(message.split("(ASD)")[2],message.split("(ASD)")[1])
        .run()
      }
    }
})
//增删改custcode
app.post("/api/protected/adddelrest_code", securityMiddleware, authMiddleware, async (c)=>{
    const user = c.get('jwtPayload')
    const usernum = c.get('usernum')
    const message=c.get("message")
    const adminobj: any = await c.env.DB.prepare(
      'SELECT * FROM admin WHERE adminname = ?'
    )
    .bind(user.username).first()
    if(!usernum||usernum!==user.username||!adminobj)return c.json({ error: 'Invalid username' },401)
    const res = await c.env.DB.prepare(
        'SELECT * FROM custcode WHERE codename = ?'
    ).bind(message.split("(ASD)")[1]).first();
    if(!res||!res.codeimg){
      if(message.split("(ASD)")[0]==="add"){
        const result = await c.env.DB.prepare(
          'INSERT INTO custcode (codename,codeimg,publicid) VALUES (?,?,?)'
        )
        .bind(message.split("(ASD)")[1],message.split("(ASD)")[2],"758805")
        .run()
      }
    }else{
        if(message.split("(ASD)")[0]==="del"){
        const result = await c.env.DB.prepare(
          'DELETE FROM custcode WHERE codename = ?'
        )
        .bind(message.split("(ASD)")[1])
        .run()
      }
      if(message.split("(ASD)")[0]==="rest"){
        const result = await c.env.DB.prepare(
          'UPDATE custcode SET codeimg ? WHERE codename = ?'
        )
        .bind(message.split("(ASD)")[2],message.split("(ASD)")[1])
        .run()
      }
    }
})
//增删改proaccount
app.post("/api/protected/adddelrest_account", securityMiddleware, authMiddleware, async (c)=>{
    const user = c.get('jwtPayload')
    const usernum = c.get('usernum')
    const message=c.get("message")
    const adminobj: any = await c.env.DB.prepare(
      'SELECT * FROM admin WHERE adminname = ?'
    )
    .bind(user.username).first()
    if(!usernum||usernum!==user.username||!adminobj)return c.json({ error: 'Invalid username' },401)
    const res = await c.env.DB.prepare(
        'SELECT * FROM proaccount WHERE proname = ?'
    ).bind(message.split("(ASD)")[1]).first();
    if(!res||!res.proimg||!res.prourl){
      if(message.split("(ASD)")[0]==="add"){
        const result = await c.env.DB.prepare(
          'INSERT INTO proaccount (proname,proimg,prourl,publicid) VALUES (?,?,?,?)'
        )
        .bind(message.split("(ASD)")[1],message.split("(ASD)")[2],message.split("(ASD)")[3],"758805")
        .run()
      }
    }else{
        if(message.split("(ASD)")[0]==="del"){
        const result = await c.env.DB.prepare(
          'DELETE FROM proaccount WHERE proname = ?'
        )
        .bind(message.split("(ASD)")[1])
        .run()
      }
      if(message.split("(ASD)")[0]==="rest"){
        const result = await c.env.DB.prepare(
          'UPDATE proaccount SET proimg = ?,prourl = ? WHERE proname = ?'
        )
        .bind(message.split("(ASD)")[2],message.split("(ASD)")[3],message.split("(ASD)")[1])
        .run()
      }
    }
})
//增删改paylist
app.post("/api/protected/adddelrest_pay", securityMiddleware, authMiddleware, async (c)=>{
    const user = c.get('jwtPayload')
    const usernum = c.get('usernum')
    const message=c.get("message")
    const adminobj: any = await c.env.DB.prepare(
      'SELECT * FROM admin WHERE adminname = ?'
    )
    .bind(user.username).first()
    if(!usernum||usernum!==user.username||!adminobj)return c.json({ error: 'Invalid username' },401)
    const res = await c.env.DB.prepare(
        'SELECT * FROM items WHERE content = ?'
    ).bind(message.split("(ASD)")[2]).first();
    if(!res||!res.file_key){  
      if(message.split("(ASD)")[0]==="add"){
        const result = await c.env.DB.prepare(
          'INSERT INTO items (content,file_key,publicid) VALUES (?,?,?,?,?)'
        )
        .bind(usernum,message.split("(ASD)")[1],message.split("(ASD)")[2],"758805")
        .run()
      }
    }else{
      if(message.split("(ASD)")[0]==="del"){
        const result = await c.env.DB.prepare(
          'DELETE FROM items WHERE content = ?'
        )
        .bind(message.split("(ASD)")[1])
        .run()
      }
      if(message.split("(ASD)")[0]==="rest"){
        const result = await c.env.DB.prepare(
          'UPDATE items SET file_key = ? WHERE content = ?'
        )
        .bind(message.split("(ASD)")[2],message.split("(ASD)")[1])
        .run()
      }
    }
})
//增删改会员标识
app.post("/api/protected/adddelrest_member", securityMiddleware, authMiddleware, async (c)=>{
    const user = c.get('jwtPayload')
    const usernum = c.get('usernum')
    const message=c.get("message")
    const adminobj: any = await c.env.DB.prepare(
      'SELECT * FROM admin WHERE adminname = ?'
    )
    .bind(user.username).first()
    if(!usernum||usernum!==user.username||!adminobj)return c.json({ error: 'Invalid username' },401)
    const res = await c.env.DB.prepare(
        'SELECT * FROM member_start WHERE usernum = ?'
    ).bind(message.split("(ASD)")[1]).first();
    if(!res||!res.type||!res.expires){
      if(message.split("(ASD)")[0]==="add"){        
        const result = await c.env.DB.prepare(
          'INSERT INTO member_start (usernum,user_id,type,publicid,expires) VALUES (?,?,?,?,?)'
        )
        .bind(message.split("(ASD)")[1],user.id,message.split("(ASD)")[2],"758805",message.split("(ASD)")[3])
        .run()
        //关联user_sign表格
        setupsignvrifig(c.env.DB,user.id,message,message.split("(ASD)")[1]);
      }
    }else{
      if(message.split("(ASD)")[0]==="del"){
        const result = await c.env.DB.prepare(
          'DELETE FROM member_start WHERE usernum = ?'
        )
        .bind(usernum)
        .run()        
        //关联user_sign表格
        setupsignvrifig(c.env.DB,user.id,message,usernum);
      }
      if(message.split("(ASD)")[0]==="rest"){
        const result = await c.env.DB.prepare(
          'UPDATE member_start SET type = ?,expires = ? WHERE usernum = ?'
        )
        .bind(message.split("(ASD)")[1],message.split("(ASD)")[2],usernum)
        .run()
        //关联user_sign表格
        setupsignvrifig(c.env.DB,user.id,message,usernum);
      }
    }
})
export default app
