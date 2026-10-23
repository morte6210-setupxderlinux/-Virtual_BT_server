const clientUrl=config.clientUrl;
const serverUrl=config.serverUrl;
const imgUrl=config.imgUrl;
const urlParams = new URLSearchParams(window.location.search);
const token=decodeURIComponent(urlParams.get('token'))||"";
const username=decodeURIComponent(urlParams.get('username'))||"";
if(!token||!username)window.location.href=clientUrl;
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
    const custtoken=await decryptflare(privateKeyE,token);
    const usernum=await decryptflare(privateKeyE,username);
    fetch(serverUrl+"/api/protected/me",{
        method:"POST",
        headers:{
            "Content-Type":"application/json",
            "Authorization":`Bearer ${custtoken}`
        }
    }).then(response=>{
        if(!response.ok){
            throw new Error(`HTTP 错误！状态码：${response.status}`)
        }
        return response.json();
    }).then(data=>{
        if(!data.success)window.location.href=clientUrl;                
        document.querySelector(".buttop>button:nth-child(1)").onclick=function(e){
            e.stopPropagation();
            document.querySelector(".main>.buttab2").style.display="block";
            document.querySelector(".main>.buttab3").style.display="none";
            document.querySelector(".main>.buttab2>div:nth-child(2)>select").oninput=function(e){
                e.stopPropagation();let This=this;
                document.querySelector(".main>.buttab2>div:nth-child(2)>button").onclick=function(e){
                    e.stopPropagation();
                    uploadfile(data.user.id,This.value);
                }
            }   
        }
        document.querySelector(".buttop>button:nth-child(2)").onclick=function(e){
            e.stopPropagation();
            document.querySelector(".main>.buttab2").style.display="none";
            document.querySelector(".main>.buttab3").style.display="flex";
            nextsetup()
        }
    }).catch(err=>{
        console.log(err);
    })
    async function nextsetup(){
        const requestData={
            username:JSON.parse(usernum).username,
            password:"",
            token:"",
            message:"",
            nonce:""
        };
        const nonce1 = generateRandom6Digits(); 
        requestData.nonce=nonce1;
        const timestamp1 = Math.floor(Date.now() / 1000).toString();
        const encrypted10=await encryptflare(publicKeyF,JSON.stringify(requestData));
        fetch(serverUrl+"/api/protected/findlink",{
            method:"POST",
            headers:{
                "Content-Type":"application/json",
                'x-request-nonce': nonce1,
                'x-request-timestamp': timestamp1,
                "Authorization":`Bearer ${custtoken}`
            },
            body:JSON.stringify({encrypted:encrypted10})
        }).then(response=>{
            if(!response.ok){
                throw new Error(`HTTP 错误！状态码：${response.status}`)
            }
            return response.json();
        }).then(data=>{
            if(data.success&&data.usernum===JSON.parse(usernum).username){
                const newObj=data.newObj;
                let html1="",html2="",html3="",html4="",html5="",html6="",html7=""; 
                if(newObj.userlist.length<1){
                    html7=`
                        <option></option>
                    `;
                }else{
                    newObj.userlist.forEach((item,index)=>{
                        html7+=`
                            <option value="${item.usernum}">${item.usernum}</option>
                        `;
                    })
                }               
                if(newObj.adlist.length<1){
                    html1=`
                        <li>
                            <div><p>ID：</p><input type="text" disabled value="${generateRandom6Digits()+Date.now()}"></div>
                            <div><p>归属：</p><select></select></div>
                            <div><p>标题：</p><input type="text" value=""></div>
                            <div><p>序号：</p><input type="text" value=""></div>
                            <div><p>机构：</p><input type="text" value=""></div>
                            <div><p>外链：</p><input type="text" value=""></div>
                            <div><p>有效期：</p><input type="text" value=""></div>
                            <div><button>修改</button><button>删除</button></div>
                        </li>
                    `;
                    document.querySelector(".main>.buttab3>div:nth-child(1)>ul").innerHTML=html1;
                    document.querySelectorAll(".main>.buttab3>div:nth-child(1)>ul>li").forEach((item)=>{
                        item.querySelector("div:nth-child(1)>select").innerHTML=html7;
                    })
                }else{
                newObj.adlist.forEach((item,index)=>{
                    html1+=`
                        <li>
                            <div><p>ID：</p><input type="text" value="${item.urlId}"></div>
                            <div><p>归属：</p><select></select></div>
                            <div><p>标题：</p><input type="text" value="${item.title}"></div>
                            <div><p>序号：</p><input type="text" value="${item.xuhao}"></div>
                            <div><p>机构：</p><input type="text" value="${item.postname}"></div>
                            <div><p>外链：</p><input type="text" value="${item.linkUrl}"></div>
                            <div><p>有效期：</p><input type="text" value="${item.expritime}"></div>
                            <div><button>修改</button><button>删除</button></div>
                        </li>
                    `;
                    if((index+1)===newObj.adlist.length){
                        document.querySelector(".main>.buttab3>div:nth-child(1)>ul").innerHTML=html1;
                        document.querySelectorAll(".main>.buttab3>div:nth-child(1)>ul>li").forEach((item,index)=>{
                            item.querySelector("div:nth-child(1)>select").innerHTML=html7;
                            item.querySelectorAll("div:nth-child(1)>select>option").forEach((item1)=>{
                                if(newObj.adlist[index].usernum===item1.value)item1.selected=true;
                            })
                        })
                    }
                })}
                const devpro=!newObj.custemail[0]?"":(JSON.parse(newObj.custemail[0].emailaunot).devpro?JSON.parse(newObj.custemail[0].emailaunot).devpro:"");
                const cust=!newObj.custemail[0]?"":(JSON.parse(newObj.custemail[0].emailaunot).cust?JSON.parse(newObj.custemail[0].emailaunot).cust:"");
                html2=`
                    <li>
                        <div><p>归属：</p><input type="text" value="开发者"></div>
                        <div><p>邮箱号：</p><input type="text" value="${devpro}"></div>
                        <div><button>修改</button><button>删除</button></div>
                    </li>
                    <li>
                        <div><p>归属：</p><input type="text" value="客服"></div>
                        <div><p>邮箱号：</p><input type="text" value="${cust}"></div>
                        <div><button>修改</button><button>删除</button></div>
                    </li>
                `;
                document.querySelector(".main>.buttab3>div:nth-child(2)>ul").innerHTML=html2;
                const LINE=!newObj.custemail[0]?"":(JSON.parse(newObj.custemail[0].custcode).LINE?JSON.parse(newObj.custemail[0].custcode).LINE:"");
                const WHATSAPP=!newObj.custemail[0]?"":(JSON.parse(newObj.custemail[0].custcode).WHATSAPP?JSON.parse(newObj.custemail[0].custcode).WHATSAPP:"");
                html3=`
                    <li>
                        <div><p>归属：</p><input type="text" value="LINE"></div>
                        <div><p>链接：</p><input type="text" value="${LINE}"></div>
                        <div><button>修改</button><button>删除</button></div>
                    </li>
                    <li>
                        <div><p>归属：</p><input type="text" value="WHATSAPP"></div>
                        <div><p>链接：</p><input type="text" value="${WHATSAPP}"></div>
                        <div><button>修改</button><button>删除</button></div>
                    </li>
                `;
                document.querySelector(".main>.buttab3>div:nth-child(3)>ul").innerHTML=html3;
                const XCOM_img=!newObj.custemail[0]?"":(JSON.parse(newObj.custemail[0].pubaunot)[X.COM].img?JSON.parse(newObj.custemail[0].pubaunot)[X.COM].img:"");
                const XCOM_url=!newObj.custemail[0]?"":(JSON.parse(newObj.custemail[0].pubaunot)[X.COM].url?JSON.parse(newObj.custemail[0].pubaunot)[X.COM].url:"");
                const YOUTUBE_img=!newObj.custemail[0]?"":(JSON.parse(newObj.custemail[0].pubaunot).YOUTUBE.img?JSON.parse(newObj.custemail[0].pubaunot).YOUTUBE.img:"");
                const YOUTUBE_url=!newObj.custemail[0]?"":(JSON.parse(newObj.custemail[0].pubaunot).YOUTUBE.url?JSON.parse(newObj.custemail[0].pubaunot).YOUTUBE.url:"");
                const FACEBOOK_img=!newObj.custemail[0]?"":(JSON.parse(newObj.custemail[0].pubaunot).FACEBOOK.img?JSON.parse(newObj.custemail[0].pubaunot).FACEBOOK.img:"");
                const FACEBOOK_url=!newObj.custemail[0]?"":(JSON.parse(newObj.custemail[0].pubaunot).FACEBOOK.url?JSON.parse(newObj.custemail[0].pubaunot).FACEBOOK.url:"");
                const TELEGRAM_img=!newObj.custemail[0]?"":(JSON.parse(newObj.custemail[0].pubaunot).TELEGRAM.img?JSON.parse(newObj.custemail[0].pubaunot).TELEGRAM.img:"");
                const TELEGRAM_url=!newObj.custemail[0]?"":(JSON.parse(newObj.custemail[0].pubaunot).TELEGRAM.url?JSON.parse(newObj.custemail[0].pubaunot).TELEGRAM.url:"");
                html4=`
                    <li>
                        <div><p>归属：</p><input type="text" value="X.COM"></div>
                        <div><p>头像：</p><input type="text" value="${XCOM_img}"></div>
                        <div><p>链接：</p><input type="text" value="${XCOM_url}"></div>
                        <div><button>修改</button><button>删除</button></div>
                    </li>
                    <li>
                        <div><p>归属：</p><input type="text" value="YOUTUBE"></div>
                        <div><p>头像：</p><input type="text" value="${YOUTUBE_img}"></div>
                        <div><p>链接：</p><input type="text" value="${YOUTUBE_url}"></div>
                        <div><button>修改</button><button>删除</button></div>
                    </li>
                    <li>
                        <div><p>归属：</p><input type="text" value="FACEBOOK"></div>
                        <div><p>头像：</p><input type="text" value="${FACEBOOK_img}"></div>
                        <div><p>链接：</p><input type="text" value="${FACEBOOK_url}"></div>
                        <div><button>修改</button><button>删除</button></div>
                    </li>
                    <li>
                        <div><p>归属：</p><input type="text" value="TELEGRAM"></div>
                        <div><p>头像：</p><input type="text" value="${TELEGRAM_img}"></div>
                        <div><p>链接：</p><input type="text" value="${TELEGRAM_url}"></div>
                        <div><button>修改</button><button>删除</button></div>
                    </li>
                `;
                document.querySelector(".main>.buttab3>div:nth-child(4)>ul").innerHTML=html4;
                if(newObj.items.length<1){
                    html5=`
                        <li>
                            <div><p>归属：</p><input type="text" value=""></div>
                            <div><p>链接：</p><input type="text" value=""></div>
                            <div><button>修改</button><button>删除</button></div>
                        </li>
                    `;
                    document.querySelector(".main>.buttab3>div:nth-child(5)>ul").innerHTML=html5; 
                }else{
                newObj.items.forEach((item,index)=>{
                    if(item.content==="paypal"||item.content==="wise"){
                        html5+=`
                            <li>
                                <div><p>归属：</p><input type="text" value="${item.content}"></div>
                                <div><p>链接：</p><input type="text" value="${item.file_key}"></div>
                                <div><button>修改</button><button>删除</button></div>
                            </li>
                        `;
                    } 
                    if((index+1)===newObj.items.length)document.querySelector(".main>.buttab3>div:nth-child(5)>ul").innerHTML=html5; 
                })}
                if(newObj.memberlist.length<1){
                    html6=`
                        <li>
                            <div><p>账户ID：</p><select></select></div>
                            <div><p>账户类别：</p><select><option value="" selected></option><option value="subscription">subscription</option><option value="lifetime">lifetime</option><option value="trial">trial</option><option value="free">free</option><option value="donate">donate</option></select></div>
                            <div><button>修改</button><button>删除</button></div>
                        </li>
                    `;
                    document.querySelector(".main>.buttab3>div:nth-child(6)>ul").innerHTML=html6; 
                    document.querySelectorAll(".main>.buttab3>div:nth-child(6)>ul>li").forEach((item)=>{
                        item.querySelector("div:nth-child(1)>select").innerHTML=html7;
                    })
                }else{
                newObj.memberlist.forEach((item,index)=>{
                    html6+=`
                        <li>
                            <div><p>账户ID：</p><input type="text" disabled value="${item.usernum}"></div>
                            <div><p>账户类别：</p><select><option value="${item.type}" selected>${item.type}</option><option value="subscription">subscription</option><option value="lifetime">lifetime</option><option value="trial">trial</option><option value="free">free</option><option value="donate">donate</option></select></div>
                            <div><button>修改</button><button>删除</button></div>
                        </li>
                    `;
                    if((index+1)===newObj.memberlist.length){
                        document.querySelector(".main>.buttab3>div:nth-child(6)>ul").innerHTML=html6; 
                        document.querySelectorAll(".main>.buttab3>div:nth-child(6)>ul>li").forEach((item)=>{
                            item.querySelector("div:nth-child(1)>select").innerHTML=html7;
                            item.querySelectorAll("div:nth-child(1)>select>option").forEach((item1)=>{
                                if(newObj.memberlist[index].usernum===item1.value)item1.selected=true;
                            })
                        })
                    }
                })}
                nextsetdata();
            }
        }).catch(err=>{
            console.log(err);
        })
    }
    function nextsetdata(){
        const setdata={};
        document.querySelector(".main>.buttab3>div:nth-child(1)>.hdiv>button").onclick=function(e){
            e.stopPropagation();
            let LI=document.createElement("li");
            
        }
        document.querySelector(".main>.buttab3>div:nth-child(2)>.hdiv>button").onclick=function(e){
            e.stopPropagation();
            
        }
        document.querySelector(".main>.buttab3>div:nth-child(3)>.hdiv>button").onclick=function(e){
            e.stopPropagation();
            
        }
        document.querySelector(".main>.buttab3>div:nth-child(4)>.hdiv>button").onclick=function(e){
            e.stopPropagation();
            
        }
        document.querySelector(".main>.buttab3>div:nth-child(5)>.hdiv>button").onclick=function(e){
            e.stopPropagation();
            
        }
        document.querySelector(".main>.buttab3>div:nth-child(6)>.hdiv>button").onclick=function(e){
            e.stopPropagation();
            
        }
    }
    function uploadfile(user_id,message){
        const fileInput = document.getElementById('fileInput');
        fileInput.click();
        fileInput.onchange=async function(){
            if (fileInput.files.length === 0) return alert('請選擇檔案');
            const formData = new FormData();
            formData.append('file', fileInput.files.item(0));
            const strobj={user_id:user_id,message:message};
            const encrypted11=await encryptflare(publicKeyF,JSON.stringify(strobj))
            const nonce2 = generateRandom6Digits();
            const timestamp2 = Math.floor(Date.now() / 1000).toString();
            const response = await fetch(serverUrl+'/api/protected/upload?encrypted='+encodeURIComponent(encrypted11), {
                method: 'POST',
                headers:{
                    'x-request-nonce': nonce2,
                    'x-request-timestamp': timestamp2,
                    "Authorization":`Bearer ${custtoken}`
                },
                body: formData // 不要手動設定 Content-Type，瀏覽器會自動處理 multipart/form-data
            });
            const result = await response.json();
            console.log('上傳結果：', result);
            if(result.success){
                let LI=document.createElement("li");
                let html=`<li><img src="${imgUrl+result.fileUrl}"></li>`;
                document.querySelector(".main>.buttab2>div:nth-child(3)>ul").appendChild(LI);
                document.querySelector(".main>.buttab2>div:nth-child(3)>ul>li:nth-last-child(1)").innerHTML=html;
            }
        }
    }
    function postserver(pathurl,encrypted12){
        fetch(serverUrl+pathurl,{
            method:"POST",
            headers:{
                "Content-Type":"application/json",
                "Authorization":`Bearer ${custtoken}`
            },
            body:JSON.stringify({encrypted:encrypted12})
        }).then(response=>{
            if(!response.ok){
                throw new Error(`HTTP 错误！状态码：${response.status}`)
            }
            return response.json();
        }).then(data=>{

        }).catch(err=>{
            console.log(err);
        })
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