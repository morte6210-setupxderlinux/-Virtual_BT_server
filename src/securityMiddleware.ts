import { Context, Next } from 'hono';

export const securityMiddleware = async (c: Context, next: Next) => {
  const db = c.env.DB;
  
  // 1. 取得客戶端 IP (Cloudflare Workers 會透過 header 提供)
  const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
  const now = Math.floor(Date.now() / 1000); // 當前秒數時間戳

  try {
    // ==========================================
    // 檢查 1：IP 頻率限制 (每個 IP 每秒限制，頻繁則封鎖)
    // ==========================================
    const ipRecord: any = await db.prepare(
      'SELECT * FROM ip_rate_limits WHERE ip = ?'
    ).bind(clientIp).first();

    if (ipRecord) {
      // 檢查是否仍在封鎖期中
      if (ipRecord.blocked_until > now) {
        return c.json({ success: false, error: 'Too many requests. Please try again later.' }, 429);
      }

      // 檢查是否在 1 秒的時間窗口內
      if (now - ipRecord.window_start < 1) {
        if (ipRecord.request_count >= 5) { // 假設 1 秒內允許最多 5 次請求
          // 觸發限制，封鎖 10 秒
          const blockUntilTime = now + 10;
          await db.prepare(
            'UPDATE ip_rate_limits SET blocked_until = ? WHERE ip = ?'
          ).bind(blockUntilTime, clientIp).run();
          console.log("87353508250920")
          return c.json({ success: false, error: 'Rate limit exceeded. Temporarily blocked.' }, 429);
        } else {
          // 次數 +1
          await db.prepare(
            'UPDATE ip_rate_limits SET request_count = request_count + 1 WHERE ip = ?'
          ).bind(clientIp).run();
        }
      } else {
        // 超過 1 秒，重置窗口與計數
        await db.prepare(
          'UPDATE ip_rate_limits SET request_count = 1, window_start = ?, blocked_until = 0 WHERE ip = ?'
        ).bind(now, clientIp).run();
      }
    } else {
      // 首次記錄該 IP
      await db.prepare(
        'INSERT INTO ip_rate_limits (ip, request_count, window_start, blocked_until) VALUES (?, 1, ?, 0)'
      ).bind(clientIp, now).run();
    }

    // ==========================================
    // 檢查 2：防重放攻擊 (Nonce 與時間校驗)
    // ==========================================
    const nonce = c.req.header('x-request-nonce');
    const timestampHeader = c.req.header('x-request-timestamp');

    if (!nonce || !timestampHeader) {
      return c.json({ success: false, error: 'Missing security headers (nonce or timestamp).' }, 400);
    }

    const reqTimestamp = parseInt(timestampHeader, 10);
    
    // 時間校驗：如果請求時間與伺服器時間相差超過 90 秒，直接拒絕（防止表被清空後舊請求又拿來重放）
    if (isNaN(reqTimestamp) || Math.abs(now - reqTimestamp) > 5*60) {
      return c.json({ success: false, error: 'Request expired or invalid timestamp.' }, 403);
    }

    // 檢查 Nonce 是否已經被使用過
    const existingNonce = await db.prepare(
      'SELECT nonce FROM request_nonces WHERE nonce = ?'
    ).bind(nonce).first();

    if (existingNonce) {
      return c.json({ success: false, error: 'Replay attack detected. Nonce already used.' }, 403);
    }

    // 將當前 Nonce 存入資料庫
    await db.prepare(
      'INSERT INTO request_nonces (nonce, created_at) VALUES (?, ?)'
    ).bind(nonce, now).run();

    // ==========================================
    // 定期清理：刪除超過 1 小時的舊 Nonce 與過期的 IP 紀錄
    // ==========================================
    const oneHourAgo = now - 3600;
    // 為避免每個請求都跑清理影響效能，可以選擇性執行或直接清理
    await db.prepare('DELETE FROM request_nonces WHERE created_at < ?').bind(oneHourAgo).run();

    // 通過所有檢查，放行
    return await next();

  } catch (err: any) {console.log(err)
    return c.json({ success: false, error: 'Security middleware internal error: ' + err.message }, 500);
  }
};