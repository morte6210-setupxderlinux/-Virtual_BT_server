const express = require('express');
const crypto = require('node:crypto'); // 內建用於產生 UUID
const postserver = require('./postserver')
const endesign = require("./endesign");
const fs=require("fs");
const path=require("path");
const app = express();
app.use(express.json());
// 目標 Cloudflare Workers API 網址
const CLOUDFLARE_API_URL = 'http://127.0.0.1:8787';//换成你的Cloudflare生成的真实网址
//注册
async function register(){
  try {
    const requestBody = {
      username: "setupxderlinux@gmail.com",//应该由设备端代码写入
      password:"189186210ERf",//应该由设备端代码写入
      message:"",
      UUID:"87494ghhvvxfe87766935",//应该由设备端代码写入，约定截取真实设备代码生成的UUID前20位
      nonce:""
    };
    const nonce = crypto.randomUUID(); // 隨機數
    requestBody.nonce=nonce;
    const timestamp = Math.floor(Date.now() / 1000).toString(); // 秒級時間戳
    const URL=CLOUDFLARE_API_URL+"/api/auth/userregister";
    const token="";
    const UUID="uncvtrufhfru854378ufbvfe549jfnmcnvbgfettotibvddfweri";//被截取的设备UUID剩余的
    const encrypted=endesign.encryptWithCloudflarePublicKey(JSON.stringify(requestBody));
    const encrypted1=endesign.encryptWithCloudflarePublicKey(requestBody.UUID);
    const result=await postserver(URL,nonce,timestamp,token,encrypted,encrypted1,UUID);
    console.log(result);
    if(result.success&&result.cloudflareResponse.success&&result.cloudflareResponse.userId){
      //result.cloudflareResponse.userId是注册成功的用户Id
    }
  } catch (err) {
    console.error('請求 Cloudflare 失敗:', err.message); 
  }
};//register()

//登录 
async function userlogin(){
  try {
      const requestBody = {
        username: "morte6210@gmail.com",//应该由设备端代码写入
        password:"189186210ERf",//应该由设备端代码写入
        message:"",
        UUID:"yuefuuikfmncyirrn6899ugfdj",//应该由设备端代码写入，约定截取真实设备代码生成的UUID前20位
        nonce:""
      };
      const nonce = crypto.randomUUID(); // 隨機數
      requestBody.nonce=nonce;
      const timestamp = Math.floor(Date.now() / 1000).toString(); // 秒級時間戳
      const URL=CLOUDFLARE_API_URL+"/api/auth/userlogin";
      const token="";
    const UUID="ingfewrq7343nvbxv5754rgvbdse74njfnpdt4tngfdrueb5348t";//被截取的设备UUID剩余的
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

//获取公共密钥
async function findkey(){
  try {
    const nonce = crypto.randomUUID(); // 隨機數
    const timestamp = Math.floor(Date.now() / 1000).toString(); // 秒級時間戳
    const URL=CLOUDFLARE_API_URL+"/api/public/findkey";
    const result=await postserver(URL,nonce,timestamp,"","","","");
    console.log(result);
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
        UUID:"yuefuuikfmncyirrn6899ugfdj",//应该由设备端代码写入，约定截取真实设备代码生成的UUID前20位
        nonce:""
      };
      const nonce = crypto.randomUUID(); // 隨機數
      requestBody.nonce=nonce;
      const timestamp = Math.floor(Date.now() / 1000).toString(); // 秒級時間戳
      const URL=CLOUDFLARE_API_URL+"/api/protected/device/useraddkey";
      const token=fs.readFileSync(path.join(__dirname,"./key/token.pem"),"utf-8");
      const UUID="ingfewrq7343nvbxv5754rgvbdse74njfnpdt4tngfdrueb5348t";//被截取的设备UUID剩余的
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

//获取验章公钥
async function getopencode(){
  try {
      const requestBody = {
        username: "morte6210@gmail.com",
        password:"",
        message:"",
        UUID:"yuefuuikfmncyirrn6899ugfdj",//应该由设备端代码写入，约定截取真实设备代码生成的UUID前20位
        nonce:""
      };
      const nonce = crypto.randomUUID(); // 隨機數
      requestBody.nonce=nonce;
      const timestamp = Math.floor(Date.now()/1000).toString(); // 秒級時間戳
      const URL=CLOUDFLARE_API_URL+"/api/protected/device/opensign";
      const token=fs.readFileSync(path.join(__dirname,"./key/token.pem"),"utf-8");
      const UUID="ingfewrq7343nvbxv5754rgvbdse74njfnpdt4tngfdrueb5348t";//被截取的设备UUID剩余的
      const encrypted=endesign.encryptWithCloudflarePublicKey(JSON.stringify(requestBody));
      const encrypted1=endesign.encryptWithCloudflarePublicKey(requestBody.UUID);
      const result=await postserver(URL,nonce,timestamp,token,encrypted,encrypted1,UUID);
      console.log(result);
      if(result.success&&result.cloudflareResponse.usernum===requestBody.username&&result.cloudflareResponse.fnsum&&result.cloudflareResponse.signatureBase64){
          //fnsum: encrypted,//随机数加密
          //usernum:usernum,//用户
          //signatureBase64:signatureBase64//签章usernum+fnsum
      }
    } catch (err) {console.log(err)
      console.error('請求 Cloudflare 失敗:', err.message);
      
    }
};//getopencode();

//查找签章
async function findsign(){
  try {
      const requestBody = {
        username: "morte6210@gmail.com",//应该由设备端代码写入
        password:"",
        message:"",
        UUID:"yuefuuikfmncyirrn6899ugfdj",//应该由设备端代码写入，约定截取真实设备代码生成的UUID前20位
        nonce:""
      };
      const nonce = crypto.randomUUID(); // 隨機數
      requestBody.nonce=nonce;
      const timestamp = Math.floor(Date.now() / 1000).toString(); // 秒級時間戳
      const URL=CLOUDFLARE_API_URL+"/api/protected/device/findsign";
      const token=fs.readFileSync(path.join(__dirname,"./key/token.pem"),"utf-8");
      const UUID="ingfewrq7343nvbxv5754rgvbdse74njfnpdt4tngfdrueb5348t";//被截取的设备UUID剩余的
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
        UUID:"yuefuuikfmncyirrn6899ugfdj",//应该由设备端代码写入，约定截取真实设备代码生成的UUID前20位
        nonce:""
      };
      const nonce = crypto.randomUUID(); // 隨機數
      requestBody.nonce=nonce;
      const timestamp = Math.floor(Date.now() / 1000).toString(); // 秒級時間戳
      const URL=CLOUDFLARE_API_URL+"/api/protected/device/findlink";
      const token=fs.readFileSync(path.join(__dirname,"./key/token.pem"),"utf-8");
      const UUID="ingfewrq7343nvbxv5754rgvbdse74njfnpdt4tngfdrueb5348t";//被截取的设备UUID剩余的
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
};//findlink();


// 啟動本地 Express 伺服器
const PORT = 3030;
app.listen(PORT, () => {
  console.log(`模擬後端服務已啟動：http://localhost:${PORT}`);
});