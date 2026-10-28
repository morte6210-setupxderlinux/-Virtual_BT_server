const express = require('express');
const crypto = require('node:crypto'); // 內建用於產生 UUID
const postserver = require('./postserver')
const endesign = require("./endesign");
const fs=require("fs");
const path=require("path");
const app = express();
app.use(express.json());
// 目標 Cloudflare Workers API 網址
const CLOUDFLARE_API_URL = 'http://127.0.0.1:8787';
//注册
async function register1(){
  try {
    const requestBody = {
      username: "setupxderlinux@gmail.com",
      password:"189186210ERf",
      message:"",
      UUID:"87494ghhvvxfe87766935",
      nonce:""
    };
    const nonce = crypto.randomUUID(); // 隨機數
    requestBody.nonce=nonce;
    const timestamp = Math.floor(Date.now() / 1000).toString(); // 秒級時間戳
    const URL=CLOUDFLARE_API_URL+"/api/auth/userregister";
    const token="";
    const UUID="uncvtrufhfru854378ufbvfe549jfnmcnvbgfettotibvddfweri";
    const encrypted=endesign.encryptWithCloudflarePublicKey(JSON.stringify(requestBody));
    const encrypted1=endesign.encryptWithCloudflarePublicKey(requestBody.UUID);
    const result=await postserver(URL,nonce,timestamp,token,encrypted,encrypted1,UUID);
    console.log(result);//{success:true,userId:""}

  } catch (err) {
    console.error('請求 Cloudflare 失敗:', err.message); 
  }
};//register1()
async function register2(){
  try {
    const requestBody = {
      username: "morte6210@gmail.com",
      password:"189186210ERf",
      message:"",
      UUID:"yuefuuikfmncyirrn6899ugfdj",
      nonce:""
    };
    const nonce = crypto.randomUUID(); // 隨機數
    requestBody.nonce=nonce;
    const timestamp = Math.floor(Date.now() / 1000).toString(); // 秒級時間戳
    const URL=CLOUDFLARE_API_URL+"/api/auth/userregister";
    const token="";
    const UUID="ingfewrq7343nvbxv5754rgvbdse74njfnpdt4tngfdrueb5348t";
    const encrypted=endesign.encryptWithCloudflarePublicKey(JSON.stringify(requestBody));
    const encrypted1=endesign.encryptWithCloudflarePublicKey(requestBody.UUID);
    const result=await postserver(URL,nonce,timestamp,token,encrypted,encrypted1,UUID);
    console.log(result);//{success:true,userId:""}

  } catch (err) {
    console.error('請求 Cloudflare 失敗:', err.message); 
  }
};//register2();
async function register3(){
  try {
    const requestBody = {
      username: "18918656257",
      password:"189186210ERf",
      message:"",
      UUID:"iuirofkcgfy65645tvkxj76372",
      nonce:""
    };
    const nonce = crypto.randomUUID(); // 隨機數
    requestBody.nonce=nonce;
    const timestamp = Math.floor(Date.now() / 1000).toString(); // 秒級時間戳
    const URL=CLOUDFLARE_API_URL+"/api/auth/userregister";
    const token="";
    const UUID="767948hugxttyydsbbvuy7tjfkjdf902wkemcncbzbdry040hvvogg";
    const encrypted=endesign.encryptWithCloudflarePublicKey(JSON.stringify(requestBody));
    const encrypted1=endesign.encryptWithCloudflarePublicKey(requestBody.UUID);
    const result=await postserver(URL,nonce,timestamp,token,encrypted,encrypted1,UUID);
    console.log(result);//{success:true,userId:""}

  } catch (err) {
    console.error('請求 Cloudflare 失敗:', err.message); 
  }
};//register3();

//登录 
async function userlogin(){
  try {
      const requestBody = {
        username: "morte6210@gmail.com",
        password:"189186210ERf",
        message:"",
        UUID:"yuefuuikfmncyirrn6899ugfdj",
        nonce:""
      };
      const nonce = crypto.randomUUID(); // 隨機數
      requestBody.nonce=nonce;
      const timestamp = Math.floor(Date.now() / 1000).toString(); // 秒級時間戳
      const URL=CLOUDFLARE_API_URL+"/api/auth/userlogin";
      const token="";
    const UUID="ingfewrq7343nvbxv5754rgvbdse74njfnpdt4tngfdrueb5348t";
    const encrypted=endesign.encryptWithCloudflarePublicKey(JSON.stringify(requestBody));
    const encrypted1=endesign.encryptWithCloudflarePublicKey(requestBody.UUID);
    const result=await postserver(URL,nonce,timestamp,token,encrypted,encrypted1,UUID);
      console.log(result);
      if(result.success&&result.cloudflareResponse.token&&result.cloudflareResponse.username){
        const decrypted_token=endesign.decryptFromCloudflare(result.cloudflareResponse.token);
        if(requestBody.username===result.cloudflareResponse.username){
            fs.writeFileSync(path.join(__dirname,"./key/token.pem"),decrypted_token,(err)=>{console.log(err)})
        }
      }
      
    } catch (err) {
      console.error('請求 Cloudflare 失敗:', err.message);
      
    }
};//userlogin();
//密钥
async function findkey(){
  try {
    const nonce = crypto.randomUUID(); // 隨機數
    const timestamp = Math.floor(Date.now() / 1000).toString(); // 秒級時間戳
    const URL=CLOUDFLARE_API_URL+"/api/public/findkey";
    const result=await postserver(URL,nonce,timestamp,"","","","");
    console.log(result);//{success:true,data:{}}
      if(result.success&&result.cloudflareResponse.data.public_keyF&&result.cloudflareResponse.data.private_keyE){
        fs.writeFileSync(path.join(__dirname,"./key/publicKeyF.pem"),result.cloudflareResponse.data.public_keyF,(err)=>{console.log(err)})
        fs.writeFileSync(path.join(__dirname,"./key/privateKeyE.pem"),result.cloudflareResponse.data.private_keyE,(err)=>{console.log(err)})
      }
  } catch (err) {console.log(err)
    console.error('請求 Cloudflare 失敗:', err.message);
    
  }
};//findkey();
//获取验章公钥
async function usersign(){
  try {
      const requestBody = {
        username: "morte6210@gmail.com",
        password:"",
        message:"",
        UUID:"yuefuuikfmncyirrn6899ugfdj",
        nonce:""
      };
      const nonce = crypto.randomUUID(); // 隨機數
      requestBody.nonce=nonce;
      const timestamp = Math.floor(Date.now() / 1000).toString(); // 秒級時間戳
      const URL=CLOUDFLARE_API_URL+"/api/protected/device/useraddkey";
      const token=fs.readFileSync(path.join(__dirname,"./key/token.pem"),"utf-8");
      const UUID="ingfewrq7343nvbxv5754rgvbdse74njfnpdt4tngfdrueb5348t";
      const encrypted=endesign.encryptWithCloudflarePublicKey(JSON.stringify(requestBody));
      const encrypted1=endesign.encryptWithCloudflarePublicKey(requestBody.UUID);
      const result=await postserver(URL,nonce,timestamp,token,encrypted,encrypted1,UUID);
      console.log(result);
      if(result.success&&result.cloudflareResponse.usernum===requestBody.username&&result.cloudflareResponse.publicKeyD){
        fs.writeFileSync(path.join(__dirname,"./key/publicKeyD.pem"),result.cloudflareResponse.publicKeyD,(err)=>{console.log(err)});
      }
    } catch (err) {console.log(err)
      console.error('請求 Cloudflare 失敗:', err.message);
      
    }
};//usersign();

//查找签章
async function findsign(){
  try {
      const requestBody = {
        username: "morte6210@gmail.com",
        password:"",
        message:"",
        UUID:"yuefuuikfmncyirrn6899ugfdj",
        nonce:""
      };
      const nonce = crypto.randomUUID(); // 隨機數
      requestBody.nonce=nonce;
      const timestamp = Math.floor(Date.now() / 1000).toString(); // 秒級時間戳
      const URL=CLOUDFLARE_API_URL+"/api/protected/device/findsign";
      const token=fs.readFileSync(path.join(__dirname,"./key/token.pem"),"utf-8");
      const UUID="ingfewrq7343nvbxv5754rgvbdse74njfnpdt4tngfdrueb5348t";
      const encrypted=endesign.encryptWithCloudflarePublicKey(JSON.stringify(requestBody));
      const encrypted1=endesign.encryptWithCloudflarePublicKey(requestBody.UUID);
      const result=await postserver(URL,nonce,timestamp,token,encrypted,encrypted1,UUID);
      console.log(result);
      if(result.success&&result.cloudflareResponse.expires&&result.cloudflareResponse.subtag&&result.cloudflareResponse.sign&&result.cloudflareResponse.usernum&&result.cloudflareResponse.fnsum&&result.cloudflareResponse.signbase64){
        //expires：有效期
        //subtag：类别
        //sign：混淆的签章
        //usernum：用户
        //fnsum：加密的随机值
        //signbase64：签章的校验值
      }
    } catch (err) {
      console.error('請求 Cloudflare 失敗:', err.message);
      
    }
};//findsign()


//获取adlink,paylist custemail
async function findlink(){
  try {
      const requestBody = {
        username: "morte6210@gmail.com",
        password:"",
        message:"",
        UUID:"yuefuuikfmncyirrn6899ugfdj",
        nonce:""
      };
      const nonce = crypto.randomUUID(); // 隨機數
      requestBody.nonce=nonce;
      const timestamp = Math.floor(Date.now() / 1000).toString(); // 秒級時間戳
      const URL=CLOUDFLARE_API_URL+"/api/protected/device/findlink";
      const token=fs.readFileSync(path.join(__dirname,"./key/token.pem"),"utf-8");
      const UUID="ingfewrq7343nvbxv5754rgvbdse74njfnpdt4tngfdrueb5348t";
      const encrypted=endesign.encryptWithCloudflarePublicKey(JSON.stringify(requestBody));
      const encrypted1=endesign.encryptWithCloudflarePublicKey(requestBody.UUID);
      const result=await postserver(URL,nonce,timestamp,token,encrypted,encrypted1,UUID);
      console.log(result);
      if(result.success&&result.cloudflareResponse.usernum&&result.cloudflareResponse.newObj){
        //result.cloudflareResponse.newObj.adlist：外链
        //result.cloudflareResponse.newObj.custemail：邮箱
        //result.cloudflareResponse.newObj.custcode：社交
        //result.cloudflareResponse.newObj.proaccount：自媒体
        //result.cloudflareResponse.newObj.paylist：支付
        //result.cloudflareResponse.newObj.types：付款类别描述
        //adlinkobj={usernum:"",urlId:"",title:"",xuhao:"",postname:"",linkUrl:"",expritime:""};
        //custemailobj={typename:"",enumber:""};
        //custcodeobj={codename:"",codeimg:""};
        //proaccountObj={proname:"",proimg:"",prourl:""};
        //payobj={payname:"",payimg:"",payurl:""};
        //typesobj={typename:"",content:"",price:""};
      }
    } catch (err) {
      console.error('請求 Cloudflare 失敗:', err.message);
      
    }
};findlink();
// 啟動本地 Express 伺服器
const PORT = 3030;
app.listen(PORT, () => {
  console.log(`模擬後端服務已啟動：http://localhost:${PORT}`);
});