const clientUrl=config.clientUrl;
const serverUrl=config.serverUrl;
const nonce = generateRandom6Digits(); // 隨機數
const timestamp = Math.floor(Date.now() / 1000).toString(); // 秒級時間戳
fetch(serverUrl+"/api/public/findkey",{
    method:"POST",
    headers:{
        "Content-Type":"application/json",
        'x-request-nonce': nonce,
        'x-request-timestamp': timestamp,
    }
}).then(response=>{
    if(!response.ok){
        throw new Error(`HTTP 错误！状态码：${response.status}`)
    }
    return response.json();
}).then(data=>{
    if(data.success)nextpost(data.data.public_keyF,data.data.private_keyE)
}).catch(err=>{
    console.log(err);
})
function nextpost(publicKeyF,privateKeyE){
    const inputvalue={username:"",password:"",message:"",subtag:"login",nonce:""};
    document.querySelector(".main>div:nth-child(1)>button:nth-child(1)").onclick=function(e){
        e.stopPropagation();
        document.querySelector(".main>div:nth-child(4)").style.display="none";
        inputvalue.subtag="login";
    }
    document.querySelector(".main>div:nth-child(1)>button:nth-child(2)").onclick=function(e){
        e.stopPropagation();
        document.querySelector(".main>div:nth-child(4)").style.display="flex";
        inputvalue.subtag="restart";
    }
    const reg1=/^([\w.-]+@[\w.-]+\.\w+|1[3-9]\d{9})$/;
    const reg2=/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    
    document.querySelector(".main>div:nth-child(2)>input").oninput=function(e){
        e.stopPropagation();
        let This=this;
        if(reg1.test(This.value))inputvalue.username=this.value;
        e.stopPropagation();
    }
    document.querySelector(".main>div:nth-child(3)>input").oninput=function(e){
        e.stopPropagation();
        let This=this;
        e.stopPropagation();
        if(reg2.test(This.value))inputvalue.password=this.value;
    }
    document.querySelector(".main>div:nth-child(4)>input").oninput=function(e){
        e.stopPropagation();
        let This=this;
        if(reg2.test(This.value))inputvalue.message=this.value;
    }
    document.querySelector(".main>div:nth-child(5)>button").onclick=async function(e){
        e.stopPropagation();
        if(inputvalue.subtag==="login"){
            alert("你需要登录吗？");
            if(inputvalue.username&&inputvalue.password&&inputvalue.subtag){
                function nextlogin(){
                    return new Promise(async (resolve)=>{
                        const nonce2 = generateRandom6Digits();
                        const timestamp2 = Math.floor(Date.now() / 1000).toString();  
                        inputvalue.nonce=nonce2;inputvalue.password="";           
                        const encrypted2=await encryptflare(publicKeyF,JSON.stringify(inputvalue));
                        fetch(serverUrl+"/api/public/clientencry",{
                            method:"POST",
                            headers:{
                                "Content-Type":"application/json",
                                'x-request-nonce': nonce2,
                                'x-request-timestamp': timestamp2,
                            },
                            body:JSON.stringify({encrypted:encrypted2})
                        }).then(response1=>{
                            if(!response1.ok){
                                throw new Error(`HTTP 错误！状态码：${response1.status}`)
                            }
                            return response1.json();
                        }).then(data1=>{
                            resolve(data1.encrypted)
                        }).catch(err=>{
                            resolve(err+"1122");
                        })
                    })   
                }
                const nonce1 = generateRandom6Digits();
                const timestamp1 = Math.floor(Date.now() / 1000).toString(); 
                inputvalue.nonce=nonce1;
                const encrypted1=await encryptflare(publicKeyF,JSON.stringify(inputvalue));
                fetch(serverUrl+"/api/auth/adminlogin",{
                    method:"POST",
                    headers:{
                        "Content-Type":"application/json",
                        'x-request-nonce': nonce1,
                        'x-request-timestamp': timestamp1,
                    },
                    body:JSON.stringify({encrypted:encrypted1})
                }).then(response=>{
                    if(!response.ok){
                        throw new Error(`HTTP 错误！状态码：${response.status}`)
                    }
                    return response.json();
                }).then(async data=>{
                    if(data.success){
                        const encrypted2=await nextlogin();
                        inputvalue.username="";
                        inputvalue.password="";
                        inputvalue.message="";
                        inputvalue.subtag="login";
                        document.querySelector(".main>div:nth-child(2)>input").value="";
                        document.querySelector(".main>div:nth-child(3)>input").value="";
                        document.querySelector(".main>div:nth-child(4)>input").value="";
                        window.location.href=clientUrl+"/updatefile?username="+encodeURIComponent(encrypted2);
                    }
                }).catch(err=>{
                    console.log(err+"1122");
                })
            }
        }
        if(inputvalue.subtag==="restart"){
            alert("你需要修改密码吗？")
            if(inputvalue.username&&inputvalue.password&&inputvalue.message){
                const nonce1 = generateRandom6Digits(); // 隨機數
                const timestamp1 = Math.floor(Date.now() / 1000).toString(); 
                inputvalue.nonce=nonce1;
                const encrypted=await encryptflare(publicKeyF,JSON.stringify(inputvalue));
                fetch(serverUrl+"/api/auth/adminrestart",{
                    method:"POST",
                    headers:{
                        "Content-Type":"application/json",
                        'x-request-nonce': nonce1,
                        'x-request-timestamp': timestamp1,
                    },
                    body:JSON.stringify({encrypted:encrypted})
                }).then(response=>{
                    if(!response.ok){
                        throw new Error(`HTTP 错误！状态码：${response.status}`)
                    }
                    return response.json();
                }).then(data=>{
                    if(data.success){
                        inputvalue.username="";
                        inputvalue.password="";
                        inputvalue.message="";
                        inputvalue.subtag="login";
                        document.querySelector(".main>div:nth-child(2)>input").value="";
                        document.querySelector(".main>div:nth-child(3)>input").value="";
                        document.querySelector(".main>div:nth-child(4)>input").value="";
                        document.querySelector(".main>div:nth-child(1)>button:nth-child(1)").click();
                    }
                }).catch(err=>{
                    console.log(err+"1122");
                })
            }
        }
    }
}
function encryptflare(pem,str){
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
        } catch (err) {
            resolve(null);
        }
    });
}
function pemToArrayBuffer(pem) {
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
// 3. 解密
function decryptflare(pem,ciphertextBase64){
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
// 2. Base64 密文轉 ArrayBuffer (解密時需要)
function base64ToArrayBuffer(base64){
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}
//随机数
function generateRandom6Digits(){
    // 建立一個長度為 1 的 Uint32Array 來存放亂數
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    
    // 將亂數對 1,000,000 取餘數，確保一定小於 1000000，然後補齊 6 位數（不足前面補 0）
    const randomNum = array[0] % 1000000;
    return String(randomNum).padStart(6, '0');
}