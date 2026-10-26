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
async function nextpost(publicKeyF,privateKeyE){
    const requestData={
        username:"",
        password:"",
        token:"",
        message:"",
        nonce:""
    };
    const nonce1 = generateRandom6Digits(); 
    requestData.nonce=nonce1;
    const timestamp1 = Math.floor(Date.now() / 1000).toString();
    const encrypted10=await encryptflare(publicKeyF,JSON.stringify(requestData));
    fetch(serverUrl+"/api/auth/payselect",{
        method:"POST",
        headers:{
            "Content-Type":"application/json",
            'x-request-nonce': nonce1,
            'x-request-timestamp': timestamp1,
        },
        body:JSON.stringify({encrypted:encrypted10})
    }).then(response=>{
        if(!response.ok){
            throw new Error(`HTTP 错误！状态码：${response.status}`)
        }
        return response.json();
    }).then(async data=>{
        if(data.success){
            const message="";
            const decrypted=await decryptflare(privateKeyE,data.encrypted);
            data.setupArr[0].paylist.forEach((item)=>{
                if(item.payname==="paypal")message+=encodeURIComponent(item.payurl);
                if(item.payname==="wise")message+=encodeURIComponent(item.payurl);
                if(decrypted===message)nextsetup(data.setupArr)
            })
        }
    }).catch(err=>{
        console.log(err);
    })
}

function nextsetup(setupArr){
    /**setupArr=[
        {value:"donate",name:"捐赠",equity:["所见即所得"],price:["随缘乐捐"],paylist:[{payname:"paypal",payimg:"",payurl:""},{payname:"wise",payimg:"",payurl:""}]},
        {value:"subscription",name:"订阅",equity:[],price:[],paylist:[]},
        {value:"lifetime",name:"终身",equity:[],price:[],paylist:[]},
    ];*/
    if(setupArr.length<1)return alert("请设置分类付款");
    let html1="",html2="",html3="",html4="";
    setupArr.forEach((item,index)=>{
        html1+=`<button>${item.name}</button>`;  
        
        if(index===0){
            setupArr[index].equity.forEach((item1,index1)=>{
                html2+=`
                    <li>${item1}</li>                    
                `;
                if((index1+1)===setupArr[index].equity.length){
                    document.querySelector(".main>.payselect>div:nth-child(1)>ul").innerHTML=html2;
                }
            })
            setupArr[index].price.forEach((item1,index1)=>{
                html3+=`
                    <button>${item1}</button>
                `;
                if((index1+1)===setupArr[index].price.length){
                    document.querySelector(".main>.payselect>div:nth-child(2)").innerHTML=html3;
                    paystart(index);
                }
            })
        }
              
        if((index+1)===setupArr.length){
            document.querySelector(".main>.vipselect").innerHTML=html1; 
            document.querySelector(".main>.vipselect>button:nth-child(2)").disabled=true;
            document.querySelector(".main>.vipselect>button:nth-child(3)").disabled=true;          
            document.querySelectorAll(".main>.vipselect>button").forEach((item0,index0)=>{
                item0.onclick=function(e){
                    e.stopPropagation();html2="";html3="";
                    setupArr[index0].equity.forEach((item1,index1)=>{
                        html2+=`
                            <li>${item1}</li>                    
                        `;
                        if((index1+1)===setupArr[index0].equity.length){
                            document.querySelector(".main>.payselect>div:nth-child(1)>ul").innerHTML=html2;
                        }
                    })
                    setupArr[index0].price.forEach((item1,index1)=>{
                        html3+=`
                            <button>${item1}</button>
                        `;
                        if((index1+1)===setupArr[index0].price.length){
                            document.querySelector(".main>.payselect>div:nth-child(2)").innerHTML=html3;
                            paystart(index0);
                        }
                    })
                }
            })
        }
    })
}

function paystart(indx){
    document.querySelectorAll(".main>.payselect>div:nth-child(2)>button").forEach((item)=>{
        item.onclick=function(e){
            e.stopPropagation();
            document.querySelector(".butposition").style.display="flex";
            document.querySelector(".butposition>button").onclick=function(e1){
                e1.stopPropagation();
                document.querySelector(".butposition").style.display="none";
                document.querySelector(".butpay").style.display="flex";
                html4="";
                setupArr[indx].paylist.forEach((itm,ind)=>{
                    html4+=`
                        <li>
                            <img src="${itm.payimg}">
                            <button>直接跳转</button>
                        </li>
                    `;
                    if((ind+1)===setupArr[indx].paylist.length){
                        document.querySelector(".butpay>ul").innerHTML=html4;
                        document.querySelectorAll(".butpay>ul>li").forEach((item11,index11)=>{
                            item11.onclick=function(e2){
                                e2.stopPropagation();
                                window.location.href=setupArr[indx].paylist[index11].payurl;
                            }
                        })
                        
                    }
                })
            }
        }
    })
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