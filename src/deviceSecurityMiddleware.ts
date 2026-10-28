import { Context, Next } from 'hono';

export const deviceSecurityMiddleware = async (c: Context, next: Next) => {
  const db = c.env.DB;
  
  // 1. 從標頭（Headers）中取得 Node.js 設備的 UUID（建議統一規範為 x-device-uuid）
  const deviceUuid = c.req.header('x-device-uuid');
 
  if (!deviceUuid) {
    return c.json({ success: false, error: 'Missing device UUID header.' }, 400);
  }

  const now = Math.floor(Date.now() / 1000); // 當前秒數時間戳

  try {
    // ==========================================
    // 檢查 1：設備 UUID 頻率限制 (每個設備每秒限制，頻繁則封鎖)
    // ==========================================
    const deviceRecord: any = await db.prepare(
      'SELECT * FROM device_rate_limits WHERE device_id = ?'
    ).bind(deviceUuid).first();

    if (deviceRecord) {
      // 檢查是否仍在封鎖期中
      if (deviceRecord.blocked_until > now) {
        return c.json({ success: false, error: 'Too many requests. Please try again later.' }, 429);
      }

      // 檢查是否在 1 秒的時間窗口內
      if (now - deviceRecord.window_start < 1) {
        if (deviceRecord.request_count >= 5) { // 假設 1 秒內允許最多 5 次請求
          // 觸發限制，封鎖 10 秒
          const blockUntilTime = now + 10;
          await db.prepare(
            'UPDATE device_rate_limits SET blocked_until = ? WHERE device_id = ?'
          ).bind(blockUntilTime, deviceUuid).run();
          console.log("87353508250920 - Device Blocked:", deviceUuid);
          return c.json({ success: false, error: 'Rate limit exceeded. Temporarily blocked.' }, 429);
        } else {
          // 次數 +1
          await db.prepare(
            'UPDATE device_rate_limits SET request_count = request_count + 1 WHERE device_id = ?'
          ).bind(deviceUuid).run();
        }
      } else {
        // 超過 1 秒，重置窗口與計數
        await db.prepare(
          'UPDATE device_rate_limits SET request_count = 1, window_start = ?, blocked_until = 0 WHERE device_id = ?'
        ).bind(now, deviceUuid).run();
      }
    } else {
      // 首次記錄該設備 UUID
      await db.prepare(
        'INSERT INTO device_rate_limits (device_id, request_count, window_start, blocked_until) VALUES (?, 1, ?, 0)'
      ).bind(deviceUuid, now).run();
    }

    // ==========================================
    // 檢查 2：防重放攻擊 (Nonce 與時間校驗 - 完全复用)
    // ==========================================
    const nonce = c.req.header('x-request-nonce');
    const timestampHeader = c.req.header('x-request-timestamp');

    if (!nonce || !timestampHeader) {
      return c.json({ success: false, error: 'Missing security headers (nonce or timestamp).' }, 400);
    }

    const reqTimestamp = parseInt(timestampHeader, 10);
    
    // 時間校驗：如果請求時間與伺服器時間相差超過 90 秒，直接拒絕
    if (isNaN(reqTimestamp) || Math.abs(now - reqTimestamp) > 90) {
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
    // 定期清理：刪除超過 1 小時的舊 Nonce 與過期的設備紀錄
    // ==========================================
    const oneHourAgo = now - 3600;
    await db.prepare('DELETE FROM request_nonces WHERE created_at < ?').bind(oneHourAgo).run();

    // 通過所有檢查，放行
    return await next();

  } catch (err: any) {
    return c.json({ success: false, error: 'Device security middleware internal error: ' + err.message }, 500);
  }
};