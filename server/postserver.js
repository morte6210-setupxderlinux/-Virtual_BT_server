module.exports=async function(URL,nonce,timestamp,CUSTOM_TOKEN,requestBody,UUID,deviceId){
    const response = await fetch(URL, {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CUSTOM_TOKEN}`,
        'x-request-nonce': nonce,
        'x-request-timestamp': timestamp,
        'x-device-uuid':UUID,
        // 'x-signature': signature // 如果有加簽可以帶上這行
        },
        body:JSON.stringify({encrypted:requestBody,deviceId:deviceId}) 
    });

    // 檢查回應狀態
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP 錯誤！狀態碼：${response.status}, 原因：${JSON.stringify(errorData)}`);
    }

    const responseData = await response.json();
    
    // 5. 回傳 Cloudflare 的回應給前端或測試端
    return {
        success: true,
        message: '模擬後端請求成功！',
        cloudflareResponse: responseData
    };
}
