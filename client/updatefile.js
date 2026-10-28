const clientUrl=config.clientUrl;
const serverUrl=config.serverUrl;
const imgUrl=config.imgUrl;
const urlParams = new URLSearchParams(window.location.search);
const token=decodeURIComponent(urlParams.get('token'))||"";
const username=decodeURIComponent(urlParams.get('username'))||"";
if(!token||!username)window.location.href=clientUrl+"/admin";
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
}).catch(err=>{console.log(err)
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
        if(!data.success)window.location.href=clientUrl+"/admin";  
        nextimage();imagebut();
        function imagebut(){
            document.querySelector(".main>.buttab2>div:nth-child(2)>button").onclick=function(e){
                e.stopPropagation();
                const value=document.querySelector(".main>.buttab2>div:nth-child(1)>select").value;
                uploadfile(data.user.id,data.user.username,value);
            }
        }                 
        document.querySelector(".buttop>button:nth-child(1)").onclick=function(e){
            e.stopPropagation();
            document.querySelector(".main>.buttab2").style.display="block";
            document.querySelector(".main>.buttab3").style.display="none";  
            imagebut();
        }
        document.querySelector(".buttop>button:nth-child(2)").onclick=function(e){
            e.stopPropagation();
            document.querySelector(".main>.buttab2").style.display="none";
            document.querySelector(".main>.buttab3").style.display="flex";
            nextsetup()
        }
    }).catch(err=>{
        console.log(err);
        window.location.href=clientUrl+"/admin";
    })
    let items=[],adlist=[],custemail=[],custcode=[],proaccount=[],paylist=[],memberlist=[],types=[],typepost="rest";console.log(items)
    async function nextimage(){
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
        fetch(serverUrl+"/api/protected/findimage",{
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
            items.push(...data.newObj.items);
            let html10="";
            if(items.length>0){
                items.forEach((item,index)=>{
                    html10+=`
                        <li><img src="${serverUrl}/files/${item.file_key}"></li>
                    `;
                    if((index+1)===items.length)document.querySelector(".main>.buttab2>div:nth-child(3)>ul").innerHTML=html10;
                })
            }            
        }).catch(err=>{
            console.log(err);
        })
    }
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
        }).then(data=>{console.log(data)
            if(data.success&&data.usernum===JSON.parse(usernum).username){
                const newObj=data.newObj;
                let html1="",html2="",html3="",html4="",html5="",html6="",html7="",html8="",html9=""; 
                adlist.push(...newObj.adlist);
                custemail.push(...newObj.custemail);
                custcode.push(...newObj.custcode);
                proaccount.push(...newObj.proaccount);
                paylist.push(...newObj.paylist);
                memberlist.push(...newObj.memberlist);
                types.push(...newObj.types);
                if(newObj.userlist.length<1){
                    html7=`
                        <option></option>
                    `;
                }else{
                    newObj.userlist.forEach((item,index)=>{
                        html7+=`
                            <option value="${item.username}">${item.username}</option>
                        `;
                    })
                }  
                if(items.length<1){
                    html8=`
                        <option></option>
                    `;
                }else{
                    items.forEach((item,index)=>{
                        html8+=`
                            <option value="${item.content}">${item.content}</option>
                        `;
                    })    
                }        
                if(newObj.adlist.length<1){
                    html1=`
                        <li>
                            <div><p>ID：</p><input type="text" disabled value="${generateRandom6Digits()+Date.now()}"></div>
                            <div><p>归属：</p><select disabled></select></div>
                            <div><p>标题：</p><input type="text" value="" disabled></div>
                            <div><p>序号：</p><input type="text" value="" disabled></div>
                            <div><p>机构：</p><input type="text" value="" disabled></div>
                            <div><p>外链：</p><input type="text" value="" disabled></div>
                            <div><p>有效期：</p><input placeholder="举例：2027-12-30" type="text" value="" disabled></div>
                            <div><button>修改</button><button>保存</button><button>删除</button></div>
                        </li>
                    `;
                    document.querySelector(".main>.buttab3>div:nth-child(1)>ul").innerHTML=html1;
                    document.querySelector(".main>.buttab3>div:nth-child(1)>ul>li>div:nth-child(2)>select").innerHTML=html7;
                    next_email();
                }else{
                    newObj.adlist.forEach((item,index)=>{
                        html1+=`
                            <li>
                                <div><p>ID：</p><input type="text" value="${item.urlId}" disabled></div>
                                <div><p>归属：</p><select disabled></select></div>
                                <div><p>标题：</p><input type="text" value="${item.title}" disabled></div>
                                <div><p>序号：</p><input type="text" value="${item.xuhao}" disabled></div>
                                <div><p>机构：</p><input type="text" value="${item.postname}" disabled></div>
                                <div><p>外链：</p><input type="text" value="${item.linkUrl}" disabled></div>
                                <div><p>有效期：</p><input placeholder="举例：2027-12-30" type="text" value="${item.expritime}" disabled></div>
                                <div><button>修改</button><button>保存</button><button>删除</button></div>
                            </li>
                        `;
                        if((index+1)===newObj.adlist.length){
                            document.querySelector(".main>.buttab3>div:nth-child(1)>ul").innerHTML=html1;
                            document.querySelectorAll(".main>.buttab3>div:nth-child(1)>ul>li").forEach((item2,index2)=>{
                                item2.querySelector("div:nth-child(2)>select").innerHTML=html7;
                                item2.querySelectorAll("div:nth-child(2)>select>option").forEach((item3)=>{
                                    if(item3.value===newObj.adlist[index2].usernum)item3.selected=true;
                                })
                            })
                            next_email();
                        }
                    })
                }
                function next_email(){
                if(newObj.custemail.length<1){
                    html2=`
                        <li>
                            <div><p>归属：</p><select disabled><option value="devpro">devpro</option><option value="cust">cust</option></select></div>
                            <div><p>邮箱号：</p><input type="text" value="" disabled></div>
                            <div><button>修改</button><button>保存</button><button>删除</button></div>
                        </li>
                    `;
                    document.querySelector(".main>.buttab3>div:nth-child(2)>ul").innerHTML=html2;
                    next_code();
                }else{
                    newObj.custemail.forEach((item,index)=>{
                        html2+=`
                            <li>
                                <div><p>归属：</p><select disabled><option value="devpro">devpro</option><option value="cust">cust</option></select></div>
                                <div><p>邮箱号：</p><input type="text" value="${item.enumber}" disabled></div>
                                <div><button>修改</button><button>保存</button><button>删除</button></div>
                            </li>
                        `;
                        if((index+1)===newObj.custemail.length){
                            document.querySelector(".main>.buttab3>div:nth-child(2)>ul").innerHTML=html2;
                            document.querySelectorAll(".main>.buttab3>div:nth-child(2)>ul>li").forEach((item1,index1)=>{
                                item1.querySelectorAll("div:nth-child(1)>select>option").forEach((item3)=>{
                                    if(item3.value===newObj.custemail[index1].typename)item3.selected=true;
                                })
                            })
                            next_code();
                        }
                    })
                }}
                function next_code(){
                if(newObj.custcode.length<1){
                    html3=`
                        <li>
                            <div><p>归属：</p><select disabled></select></div>
                            <div><p>链接：</p><input type="text" value="" disabled></div>
                            <div><button>修改</button><button>保存</button><button>删除</button></div>
                        </li>
                    `;
                    document.querySelector(".main>.buttab3>div:nth-child(3)>ul").innerHTML=html3;
                    document.querySelector(".main>.buttab3>div:nth-child(3)>ul>li>div:nth-child(1)>select").innerHTML=html8;
                    next_account();
                }else{
                    newObj.custcode.forEach((item,index)=>{
                        html3+=`
                            <li>
                                <div><p>归属：</p><select disabled></select></div>
                                <div><p>链接：</p><input type="text" value="${item.codeimg}" disabled></div>
                                <div><button>修改</button><button>保存</button><button>删除</button></div>
                            </li>
                        `;
                        if((index+1)===newObj.custcode.length){
                            document.querySelector(".main>.buttab3>div:nth-child(3)>ul").innerHTML=html3;
                            document.querySelectorAll(".main>.buttab3>div:nth-child(3)>ul>li").forEach((item2,index2)=>{
                                item2.querySelector("div:nth-child(1)>select").innerHTML=html8;
                                item2.querySelectorAll("div:nth-child(1)>select>option").forEach((item3)=>{
                                    if(item3.value===newObj.custcode[index2].codename)item3.selected=true;
                                })
                            })
                            next_account();
                        }
                    })
                }}
                function next_account(){
                if(newObj.proaccount.length<1){
                    html4=`
                        <li>
                            <div><p>归属：</p><select disabled></select></div>
                            <div><p>头像：</p><input type="text" value="" disabled></div>
                            <div><p>链接：</p><input type="text" value="" disabled></div>
                            <div><button>修改</button><button>保存</button><button>删除</button></div>
                        </li>
                    `;
                    document.querySelector(".main>.buttab3>div:nth-child(4)>ul").innerHTML=html4;
                    document.querySelector(".main>.buttab3>div:nth-child(4)>ul>li>div:nth-child(1)>select").innerHTML=html8;
                    next_pay();
                }else{
                    newObj.proaccount.forEach((item,index)=>{
                        html4+=`
                            <li>
                                <div><p>归属：</p><select disabled></select></div>
                                <div><p>头像：</p><input type="text" value="${item.proimg}" disabled></div>
                                <div><p>链接：</p><input type="text" value="${item.prourl}" disabled></div>
                                <div><button>修改</button><button>保存</button><button>删除</button></div>
                            </li>
                        `;
                        if((index+1)===newObj.proaccount.length){
                            document.querySelector(".main>.buttab3>div:nth-child(4)>ul").innerHTML=html4;
                            document.querySelectorAll(".main>.buttab3>div:nth-child(4)>ul>li").forEach((item2,index2)=>{
                                item2.querySelector("div:nth-child(1)>select").innerHTML=html8;
                                item2.querySelectorAll("div:nth-child(1)>select>option").forEach((item3)=>{
                                    if(item3.value===newObj.proaccount[index2].proname)item3.selected=true;
                                })
                            })
                            next_pay();
                        }
                    })
                }}
                function next_pay(){
                if(newObj.paylist.length<1){
                    html5=`
                        <li>
                            <div><p>归属：</p><select disabled></select></div>
                            <div><p>链接：</p><input type="text" value="" disabled></div>
                            <div><p>跳转：</p><input type="text" value="" disabled></div>
                            <div><button>修改</button><button>保存</button><button>删除</button></div>
                        </li>
                    `;
                    document.querySelector(".main>.buttab3>div:nth-child(5)>ul").innerHTML=html5; 
                    document.querySelector(".main>.buttab3>div:nth-child(5)>ul>li>div:nth-child(1)>select").innerHTML=html8;
                    next_member();
                }else{
                    newObj.paylist.forEach((item,index)=>{
                        html5+=`
                            <li>
                                <div><p>归属：</p><select disabled></select></div>
                                <div><p>链接：</p><input type="text" value="${item.payimg}" disabled></div>
                                <div><p>跳转：</p><input type="text" value="${item.payurl}" disabled></div>
                                <div><button>修改</button><button>保存</button><button>删除</button></div>
                            </li>
                        `;
                        if((index+1)===newObj.paylist.length){
                            document.querySelector(".main>.buttab3>div:nth-child(5)>ul").innerHTML=html5;
                            document.querySelectorAll(".main>.buttab3>div:nth-child(5)>ul>li").forEach((item2,index2)=>{
                                item2.querySelector("div:nth-child(1)>select").innerHTML=html8;
                                item2.querySelectorAll("div:nth-child(1)>select>option").forEach((item3)=>{
                                    if(item3.value===newObj.paylist[index2].payname)item3.selected=true;
                                })
                            })
                            next_member();
                        }
                    })
                }}
                function next_member(){
                if(newObj.memberlist.length<1){
                    html6=`
                        <li>
                            <div><p>归属：</p><select disabled></select></div>
                            <div><p>账户类别：</p><select disabled></select></div>
                            <div><p>有效期：</p><input placeholder="举例：2027-12-30" type="text" disabled></div>
                            <div><button>修改</button><button>保存</button><button>删除</button></div>
                        </li>
                    `;
                    document.querySelector(".main>.buttab3>div:nth-child(6)>ul").innerHTML=html6; 
                    document.querySelector(".main>.buttab3>div:nth-child(6)>ul>li>div:nth-child(1)>select").innerHTML=html7;
                    document.querySelector(".main>.buttab3>div:nth-child(6)>ul>li>div:nth-child(2)>select").innerHTML=`<option value="subscription">subscription</option><option value="lifetime">lifetime</option><option value="trial">trial</option><option value="free">free</option><option value="donate">donate</option>`;
                    next_types();
                }else{
                    newObj.memberlist.forEach((item,index)=>{
                        html6+=`
                            <li>
                                <div><p>归属：</p><select disabled></select></div>
                                <div><p>账户类别：</p><select disabled></select></div>
                                <div><p>有效期：</p><input placeholder="举例：2027-12-30" type="text" value="${item.expires}" disabled></div>
                                <div><button>修改</button><button>保存</button><button>删除</button></div>
                            </li>
                        `;
                        if((index+1)===newObj.memberlist.length){
                            document.querySelector(".main>.buttab3>div:nth-child(6)>ul").innerHTML=html6; 
                            document.querySelectorAll(".main>.buttab3>div:nth-child(6)>ul>li").forEach((item2,index2)=>{
                                item2.querySelector("div:nth-child(1)>select").innerHTML=html7;
                                item2.querySelector("div:nth-child(2)>select").innerHTML=`<option value="subscription">subscription</option><option value="lifetime">lifetime</option><option value="trial">trial</option><option value="free">free</option><option value="donate">donate</option>`;
                                item2.querySelectorAll("div:nth-child(1)>select>option").forEach((item3)=>{
                                    if(item3.value===newObj.memberlist[index2].usernum)item3.selected=true;
                                })
                                item2.querySelectorAll("div:nth-child(2)>select>option").forEach((item3)=>{
                                    if(item3.value===newObj.memberlist[index2].type)item3.selected=true;
                                })
                            })
                            next_types();
                        }
                    })
                }}
                function next_types(){
                if(newObj.types.length<1){
                    html9=`
                        <li>
                            <div><p>类别：</p><select disabled></select></div>
                            <div><p>描述：</p><textarea placeholder="每段描述之间用;号分开" disabled></textarea></div>
                            <div><p>价格：</p><textarea placeholder="每段价格之间用;号分开" disabled></textarea></div>
                            <div><button>修改</button><button>保存</button><button>删除</button></div>
                        </li>
                    `;
                    document.querySelector(".main>.buttab3>div:nth-child(7)>ul").innerHTML=html9; 
                    document.querySelector(".main>.buttab3>div:nth-child(7)>ul>li>div:nth-child(1)>select").innerHTML=`<option value="subscription">subscription</option><option value="lifetime">lifetime</option><option value="trial">trial</option><option value="free">free</option><option value="donate">donate</option>`;
                    nextsetdata(html7,html8);
                }else{
                    newObj.types.forEach((item,index)=>{
                        html9+=`
                            <li>
                                <div><p>类别：</p><select disabled></select></div>
                                <div><p>描述：</p><textarea placeholder="每段描述之间用;号分开" disabled>${item.content}</textarea></div>
                                <div><p>价格：</p><textarea placeholder="每段价格之间用;号分开" disabled>${item.price}</textarea></div>
                                <div><button>修改</button><button>保存</button><button>删除</button></div>
                            </li>
                        `;
                        if((index+1)===newObj.types.length){
                            document.querySelector(".main>.buttab3>div:nth-child(7)>ul").innerHTML=html9;
                            document.querySelectorAll(".main>.buttab3>div:nth-child(7)>ul>li").forEach((item2,index2)=>{
                                item2.querySelector("div:nth-child(1)>select").innerHTML=`<option value="subscription">subscription</option><option value="lifetime">lifetime</option><option value="trial">trial</option><option value="free">free</option><option value="donate">donate</option>`;
                                item2.querySelectorAll("div:nth-child(1)>select>option").forEach((item3)=>{
                                    if(item3.value===newObj.types[index2].typename)item3.selected=true;
                                })
                            })
                            nextsetdata(html7,html8);
                        }
                    })
                }}                
            }
        }).catch(err=>{
            console.log(err);
        })
    }
    function nextsetdata(html7,html8){ 
        nextadlink();nextcustemail();nextcustcode();nextproaccount();nextpaylist();nextmember();nexttypes();nextinputvalue();
        document.querySelector(".main>.buttab3>div:nth-child(1)>.hdiv>button").onclick=function(e){
            e.stopPropagation();
            if(!adlist[0]){
                return alert("有空白表单未处理");
            }else{
                if(!document.querySelector(".main>.buttab3>div:nth-child(1)>ul>li:nth-child(1)>div:nth-child(6)>input").value&&adlist[0].linkUrl)return alert("有空白表单未处理");
            }
            let newLI=document.createElement("li");
            newLI.innerHTML=`
                <div><p>ID：</p><input type="text" disabled value="${generateRandom6Digits()+Date.now()}"></div>
                <div><p>归属：</p><select disabled>${html7}</select></div>
                <div><p>标题：</p><input type="text" value="" disabled></div>
                <div><p>序号：</p><input type="text" value="" disabled></div>
                <div><p>机构：</p><input type="text" value="" disabled></div>
                <div><p>外链：</p><input type="text" value="" disabled></div>
                <div><p>有效期：</p><input type="text" value="" disabled></div>
                <div><button>修改</button><button>保存</button><button>删除</button></div>
            `;
            let oldLI=document.querySelectorAll(".main>.buttab3>div:nth-child(1)>ul>li")[0];
            document.querySelector(".main>.buttab3>div:nth-child(1)>ul").insertBefore(newLI,oldLI);
            typepost="add";nextadlink();nextinputvalue();
        }
        document.querySelector(".main>.buttab3>div:nth-child(2)>.hdiv>button").onclick=function(e){
            e.stopPropagation();
            if(!custemail[0]){
                return alert("有空白表单未处理");
            }else{
                if(!document.querySelector(".main>.buttab3>div:nth-child(2)>ul>li:nth-child(1)>div:nth-child(2)>input").value&&custemail[0].enumber)return alert("有空白表单未处理");
            }
            const html11=`<option value="devpro">devpro</option><option value="cust">cust</option>`;
            let newLI=document.createElement("li");
            newLI.innerHTML=`
                <div><p>归属：</p><select disabled>${html11}</select></div>
                <div><p>邮箱号：</p><input type="text" disabled></div>
                <div><button>修改</button><button>保存</button><button>删除</button></div>
            `;
            let oldLI=document.querySelectorAll(".main>.buttab3>div:nth-child(2)>ul>li")[0];
            document.querySelector(".main>.buttab3>div:nth-child(2)>ul").insertBefore(newLI,oldLI);
            typepost="add";nextcustemail();nextinputvalue();
        }
        document.querySelector(".main>.buttab3>div:nth-child(3)>.hdiv>button").onclick=function(e){
            e.stopPropagation();
            if(!custcode[0]){
                return alert("有空白表单未处理");
            }else{
                if(!document.querySelector(".main>.buttab3>div:nth-child(3)>ul>li:nth-child(1)>div:nth-child(2)>input").value&&custcode[0].codeimg)return alert("有空白表单未处理");
            }
            let newLI=document.createElement("li");
            newLI.innerHTML=`
                <div><p>归属：</p><select disabled>${html8}</select></div>
                <div><p>链接：</p><input type="text" disabled></div>
                <div><button>修改</button><button>保存</button><button>删除</button></div>
            `;
            let oldLI=document.querySelectorAll(".main>.buttab3>div:nth-child(3)>ul>li")[0];
            document.querySelector(".main>.buttab3>div:nth-child(3)>ul").insertBefore(newLI,oldLI);
            typepost="add";nextcustcode();nextinputvalue();
        }
        document.querySelector(".main>.buttab3>div:nth-child(4)>.hdiv>button").onclick=function(e){
            e.stopPropagation();
            if(!proaccount[0]){
                return alert("有空白表单未处理");
            }else{
                if(!document.querySelector(".main>.buttab3>div:nth-child(4)>ul>li:nth-child(1)>div:nth-child(2)>input").value&&proaccount[0].proimg)return alert("有空白表单未处理");
            }
            let newLI=document.createElement("li");
            newLI.innerHTML=`
                <div><p>归属：</p><select disabled>${html8}</select></div>
                <div><p>头像：</p><input type="text" disabled></div>
                <div><p>链接：</p><input type="text" disabled></div>
                <div><button>修改</button><button>保存</button><button>删除</button></div>
            `;
            let oldLI=document.querySelectorAll(".main>.buttab3>div:nth-child(4)>ul>li")[0];
            document.querySelector(".main>.buttab3>div:nth-child(4)>ul").insertBefore(newLI,oldLI);
            typepost="add";nextproaccount();nextinputvalue();
        }
        document.querySelector(".main>.buttab3>div:nth-child(5)>.hdiv>button").onclick=function(e){
            e.stopPropagation();
            if(!paylist[0]){
                return alert("有空白表单未处理");
            }else{
                if(!document.querySelector(".main>.buttab3>div:nth-child(5)>ul>li:nth-child(1)>div:nth-child(2)>input").value&&paylist[0].payimg)return alert("有空白表单未处理");
            }
            let newLI=document.createElement("li");
            newLI.innerHTML=`
                <div><p>归属：</p><select disabled>${html8}</select></div>                
                <div><p>链接：</p><input type="text" disabled></div>
                <div><p>跳转：</p><input type="text" disabled></div>
                <div><button>修改</button><button>保存</button><button>删除</button></div>
            `;
            let oldLI=document.querySelectorAll(".main>.buttab3>div:nth-child(5)>ul>li")[0];
            document.querySelector(".main>.buttab3>div:nth-child(5)>ul").insertBefore(newLI,oldLI);
            typepost="add";nextpaylist();nextinputvalue();
        }
        document.querySelector(".main>.buttab3>div:nth-child(6)>.hdiv>button").onclick=function(e){
            e.stopPropagation();
            if(!memberlist[0]){
                return alert("有空白表单未处理");
            }else{
                if(!document.querySelector(".main>.buttab3>div:nth-child(6)>ul>li:nth-child(1)>div:nth-child(3)>input").value&&memberlist[0].linkUrl)return alert("有空白表单未处理");
            }
            const html11=`<option value="subscription">subscription</option><option value="lifetime">lifetime</option><option value="trial">trial</option><option value="free">free</option><option value="donate">donate</option>`;
            let newLI=document.createElement("li");
            newLI.innerHTML=`
                <div><p>归属：</p><select disabled>${html7}</select></div>
                <div><p>账户类别：</p><select disabled>${html11}</select></div>
                <div><p>有效期：</p><input type="text" disabled></div>
                <div><button>修改</button><button>保存</button><button>删除</button></div>
            `;
            let oldLI=document.querySelectorAll(".main>.buttab3>div:nth-child(6)>ul>li")[0];
            document.querySelector(".main>.buttab3>div:nth-child(6)>ul").insertBefore(newLI,oldLI);
            typepost="add";nextmember();nextinputvalue();
        }
        document.querySelector(".main>.buttab3>div:nth-child(7)>.hdiv>button").onclick=function(e){
            e.stopPropagation();
            if(!types[0]){
                return alert("有空白表单未处理");
            }else{
                if(!document.querySelector(".main>.buttab3>div:nth-child(7)>ul>li:nth-child(1)>div:nth-child(3)>textarea").value&&types[0].price)return alert("有空白表单未处理");
            }
            let newLI=document.createElement("li");
            const html11=`<option value="subscription">subscription</option><option value="lifetime">lifetime</option><option value="trial">trial</option><option value="free">free</option><option value="donate">donate</option>`;
            newLI.innerHTML=`
                <div><p>归属：</p><select disabled>${html11}</select></div>                
                <div><p>描述：</p><textarea placeholder="每段描述之间用;号分开" disabled></textarea></div>
                <div><p>价格：</p><textarea placeholder="每段描述之间用;号分开" disabled></textarea></div>
                <div><button>修改</button><button>保存</button><button>删除</button></div>
            `;
            let oldLI=document.querySelectorAll(".main>.buttab3>div:nth-child(7)>ul>li")[0];
            document.querySelector(".main>.buttab3>div:nth-child(7)>ul").insertBefore(newLI,oldLI);
            typepost="add";nexttypes();nextinputvalue();
        }
    }
    let adlinkobj={usernum:"",urlId:"",title:"",xuhao:"",postname:"",linkUrl:"",expritime:""};
    let custemailobj={typename:"",enumber:""};
    let custcodeobj={codename:"",codeimg:""};
    let proaccountObj={proname:"",proimg:"",prourl:""};
    let payobj={payname:"",payimg:"",payurl:""};
    let memberobj={usernum:"",type:"",expires:""};
    let typesobj={typename:"",content:"",price:""};
    let adlink_index=0,email_index=0,custcode_index=0,account_index=0,pay_index=0,member_index=0,types_index=0;
    const reg=/select|update|delete|insert|trancate|char|into|substr|ascii|declare|exec|count|master|into|drop|execute|union|and| or |--|\'|\"/i;
    function nextinputvalue(){        
        document.querySelectorAll(".main>.buttab3>div:nth-child(1)>ul>li").forEach((item,index)=>{
            item.querySelector("div:nth-child(3)>input").oninput=function(e){
                e.stopPropagation();
                if(index!==adlink_index){
                    adlink_index=index;
                    adlinkobj.usernum="";adlinkobj.urlId="";adlinkobj.title="";adlinkobj.xuhao="";adlinkobj.postname="";adlinkobj.linkUrl="";adlinkobj.expritime="";
                }
                adlinkobj.urlId=item.querySelector("div:nth-child(1)>input").value;
                adlinkobj.title=this.value;
            }
            item.querySelector("div:nth-child(4)>input").oninput=function(e){
                e.stopPropagation();
                if(index!==adlink_index){
                    adlink_index=index;
                    adlinkobj.usernum="";adlinkobj.urlId="";adlinkobj.title="";adlinkobj.xuhao="";adlinkobj.postname="";adlinkobj.linkUrl="";adlinkobj.expritime="";
                }
                adlinkobj.urlId=item.querySelector("div:nth-child(1)>input").value;
                adlinkobj.xuhao=this.value;
            }
            item.querySelector("div:nth-child(5)>input").oninput=function(e){
                e.stopPropagation();
                if(index!==adlink_index){
                    adlink_index=index;
                    adlinkobj.usernum="";adlinkobj.urlId="";adlinkobj.title="";adlinkobj.xuhao="";adlinkobj.postname="";adlinkobj.linkUrl="";adlinkobj.expritime="";
                }
                adlinkobj.urlId=item.querySelector("div:nth-child(1)>input").value;
                adlinkobj.postname=this.value;
            }
            item.querySelector("div:nth-child(6)>input").oninput=function(e){
                e.stopPropagation();
                if(index!==adlink_index){
                    adlink_index=index;
                    adlinkobj.usernum="";adlinkobj.urlId="";adlinkobj.title="";adlinkobj.xuhao="";adlinkobj.postname="";adlinkobj.linkUrl="";adlinkobj.expritime="";
                }
                adlinkobj.urlId=item.querySelector("div:nth-child(1)>input").value;
                adlinkobj.linkUrl=this.value;
            }
            item.querySelector("div:nth-child(7)>input").oninput=function(e){
                e.stopPropagation();
                if(index!==adlink_index){
                    adlink_index=index;
                    adlinkobj.usernum="";adlinkobj.urlId="";adlinkobj.title="";adlinkobj.xuhao="";adlinkobj.postname="";adlinkobj.linkUrl="";adlinkobj.expritime="";
                }
                adlinkobj.urlId=item.querySelector("div:nth-child(1)>input").value;
                adlinkobj.expritime=this.value;
            }
        })
        document.querySelectorAll(".main>.buttab3>div:nth-child(2)>ul>li").forEach((item,index)=>{
            item.querySelector("div:nth-child(2)>input").oninput=function(e){
                e.stopPropagation();
                if(index!==email_index){
                    email_index=index;
                    custemailobj.typename="";custemailobj.enumber="";
                }
                custemailobj.enumber=this.value;
            }
        })  
        document.querySelectorAll(".main>.buttab3>div:nth-child(3)>ul>li").forEach((item,index)=>{
            item.querySelector("div:nth-child(2)>input").oninput=function(e){
                e.stopPropagation();
                if(index!==custcode_index){
                    custcode_index=index;
                    custcodeobj.codename="";custcodeobj.codeimg="";
                }
                custcodeobj.codeimg=this.value;
            }
        })       
        document.querySelectorAll(".main>.buttab3>div:nth-child(4)>ul>li").forEach((item,index)=>{
            item.querySelector("div:nth-child(2)>input").oninput=function(e){
                e.stopPropagation();
                if(index!==account_index){
                    account_index=index;
                    proaccountObj.proname="";proaccountObj.proimg="";proaccountObj.prourl="";
                }
                proaccountObj.proimg=this.value;
            }
            item.querySelector("div:nth-child(3)>input").oninput=function(e){
                e.stopPropagation();
                if(index!==account_index){
                    account_index=index;
                    proaccountObj.proname="";proaccountObj.proimg="";proaccountObj.prourl="";
                }
                proaccountObj.prourl=this.value;
            }
        })
        document.querySelectorAll(".main>.buttab3>div:nth-child(5)>ul>li").forEach((item,index)=>{
            item.querySelector("div:nth-child(2)>input").oninput=function(e){
                e.stopPropagation();
                if(index!==pay_index){
                    pay_index=index;
                    payobj.payname="";payobj.payimg="";payobj.payurl="";
                }
                payobj.payimg=this.value;
            }
            item.querySelector("div:nth-child(3)>input").oninput=function(e){
                e.stopPropagation();
                if(index!==pay_index){
                    pay_index=index;
                    payobj.payname="";payobj.payimg="";payobj.payurl="";
                }
                payobj.payurl=this.value;
            }
        })
        document.querySelectorAll(".main>.buttab3>div:nth-child(6)>ul>li").forEach((item,index)=>{
            item.querySelector("div:nth-child(3)>input").oninput=function(e){
                e.stopPropagation();
                if(index!==member_index){
                    member_index=index;
                    memberobj.usernum="";memberobj.type="";memberobj.expires="";
                }
                memberobj.expires=this.value;
            }
        })
        document.querySelectorAll(".main>.buttab3>div:nth-child(7)>ul>li").forEach((item,index)=>{
            item.querySelector("div:nth-child(2)>textarea").oninput=function(e){
                e.stopPropagation();
                if(index!==types_index){
                    types_index=index;
                    typesobj.typename="";typesobj.content="";typesobj.price="";
                }
                typesobj.content=this.value;
            }
            item.querySelector("div:nth-child(3)>textarea").oninput=function(e){
                e.stopPropagation();
                if(index!==types_index){
                    types_index=index;
                    typesobj.typename="";typesobj.content="";typesobj.price="";
                }
                typesobj.price=this.value;
            }
        })
    }
    function nextadlink(){
        document.querySelectorAll(".main>.buttab3>div:nth-child(1)>ul>li").forEach((item,index)=>{
            item.querySelector("div:nth-child(8)>button:nth-child(1)").onclick=function(e){
                e.stopPropagation();
                if(!item.querySelector("div:nth-child(2)>select").value)return alert("没有注册用户");
                item.querySelector("div:nth-child(2)>select").disabled=false;
                item.querySelector("div:nth-child(3)>input").disabled=false;
                item.querySelector("div:nth-child(4)>input").disabled=false;
                item.querySelector("div:nth-child(5)>input").disabled=false;
                item.querySelector("div:nth-child(6)>input").disabled=false;
                item.querySelector("div:nth-child(7)>input").disabled=false;
                if(index===0&&!item.querySelector("div:nth-child(6)>input").value)typepost="add";
                item.querySelector("div:nth-child(8)>button:nth-child(2)").onclick=async function(e){
                    e.stopPropagation();
                    if(!document.querySelector(".main>.buttab3>div:nth-child(1)>ul>li:nth-child(1)>div:nth-child(6)>input").value&&adlist[0]&&adlist[0].linkUrl)return alert("有空白表单未处理");                   
                    if(index!==adlink_index){
                        adlink_index=index;
                        adlinkobj.usernum="";adlinkobj.urlId="";adlinkobj.title="";adlinkobj.xuhao="";adlinkobj.postname="";adlinkobj.linkUrl="";adlinkobj.expritime="";
                    }
                    if(reg.test(item.querySelector("div:nth-child(1)>input").value)
                    ||reg.test(item.querySelector("div:nth-child(2)>select").value)
                    ||reg.test(item.querySelector("div:nth-child(3)>input").value)
                    ||reg.test(item.querySelector("div:nth-child(4)>input").value)
                    ||reg.test(item.querySelector("div:nth-child(5)>input").value)
                    ||reg.test(item.querySelector("div:nth-child(6)>input").value)
                    ||reg.test(item.querySelector("div:nth-child(7)>input").value)
                    )return alert("文本不安全");
                    adlinkobj.urlId=item.querySelector("div:nth-child(1)>input").value;
                    adlinkobj.usernum=item.querySelector("div:nth-child(2)>select").value;                   
                    if(!adlinkobj.urlId||!adlinkobj.usernum||!adlinkobj.title||!adlinkobj.xuhao||!adlinkobj.postname||!adlinkobj.linkUrl||!adlinkobj.expritime)return alert("信息未填全");
                    const pathurl="/api/protected/adddelrest_adlink";
                    const requestData={
                        username:JSON.parse(usernum).username,
                        password:"",
                        token:"",
                        message:typepost+"(ASD)"+adlinkobj.usernum,
                        nonce:""
                    };
                    const nonce11 = generateRandom6Digits(); 
                    requestData.nonce=nonce11;
                    const message=adlinkobj.urlId+"(ASD)"+adlinkobj.title+"(ASD)"+adlinkobj.xuhao+"(ASD)"+adlinkobj.postname+"(ASD)"+encodeURIComponent(adlinkobj.linkUrl)+"(ASD)"+adlinkobj.expritime
                    const timestamp11 = Math.floor(Date.now() / 1000).toString();
                    const encrypted11=await encryptflare(publicKeyF,JSON.stringify(requestData));
                    postserver(pathurl,nonce11,timestamp11,encrypted11,"","",message)
                }
                item.querySelector("div:nth-child(8)>button:nth-child(3)").onclick=async function(e){
                    e.stopPropagation();
                    if(!document.querySelector(".main>.buttab3>div:nth-child(1)>ul>li:nth-child(1)>div:nth-child(6)>input").value&&adlist[0].linkUrl){
                        typepost="rest";
                        if(index===0){
                            document.querySelector(".main>.buttab3>div:nth-child(1)>ul").removeChild(document.querySelector(".main>.buttab3>div:nth-child(1)>ul>li:nth-child(1)"));
                        }else{
                            return alert("有空白表单未处理"); 
                        }                    
                    }else{
                        const pathurl="/api/protected/adddelrest_adlink";
                        const requestData={
                            username:JSON.parse(usernum).username,
                            password:"",
                            token:"",
                            message:"del(ASD)"+item.querySelector("div:nth-child(1)>input").value,
                            nonce:""
                        };
                        const nonce11 = generateRandom6Digits(); 
                        requestData.nonce=nonce11;
                        const timestamp11 = Math.floor(Date.now() / 1000).toString();
                        const encrypted11=await encryptflare(publicKeyF,JSON.stringify(requestData));
                        postserver(pathurl,nonce11,timestamp11,encrypted11,item,document.querySelector(".main>.buttab3>div:nth-child(1)>ul"),""); 
                    }                       
                }
            }
        })
    };
    function nextcustemail(){
        document.querySelectorAll(".main>.buttab3>div:nth-child(2)>ul>li").forEach((item,index)=>{
            item.querySelector("div:nth-child(3)>button:nth-child(1)").onclick=function(e){
                e.stopPropagation();
                item.querySelector("div:nth-child(1)>select").disabled=false;
                item.querySelector("div:nth-child(2)>input").disabled=false;
                if(index===0&&!item.querySelector("div:nth-child(2)>input").value)typepost="add";
                item.querySelector("div:nth-child(3)>button:nth-child(2)").onclick=async function(e){
                    e.stopPropagation();
                    if(!document.querySelector(".main>.buttab3>div:nth-child(2)>ul>li:nth-child(1)>div:nth-child(2)>input").value&&custemail[0]&&custemail[0].enumber)return alert("有空白表单未处理");
                    if(index!==email_index){
                        email_index=index;
                        custemailobj.typename="";custemailobj.enumber="";
                    }
                    if(reg.test(item.querySelector("div:nth-child(1)>select").value)
                    ||reg.test(item.querySelector("div:nth-child(2)>input").value)
                    )return alert("文本不安全");
                    custemailobj.typename=item.querySelector("div:nth-child(1)>select").value;
                    if(!custemailobj.typename||!custemailobj.enumber)return alert("信息未填全");
                    const pathurl="/api/protected/adddelrest_email";
                    const requestData={
                        username:JSON.parse(usernum).username,
                        password:"",
                        token:"",
                        message:typepost+"(ASD)"+custemailobj.typename+"(ASD)"+custemailobj.enumber,
                        nonce:""
                    };
                    const nonce11 = generateRandom6Digits(); 
                    requestData.nonce=nonce11;
                    const timestamp11 = Math.floor(Date.now() / 1000).toString();
                    const encrypted11=await encryptflare(publicKeyF,JSON.stringify(requestData));
                    postserver(pathurl,nonce11,timestamp11,encrypted11,"","")
                }
                item.querySelector("div:nth-child(3)>button:nth-child(3)").onclick=async function(e){
                    e.stopPropagation();
                    if(!document.querySelector(".main>.buttab3>div:nth-child(2)>ul>li:nth-child(1)>div:nth-child(2)>input").value&&custemail[0].enumber){
                        typepost="rest";
                        if(index===0){
                            document.querySelector(".main>.buttab3>div:nth-child(2)>ul").removeChild(document.querySelector(".main>.buttab3>div:nth-child(2)>ul>li>:nth-child(1)"));
                        }else{
                            return alert("有空白表单未处理");
                        }                      
                    }else{
                        const pathurl="/api/protected/adddelrest_email";
                        const requestData={
                            username:JSON.parse(usernum).username,
                            password:"",
                            token:"",
                            message:"del(ASD)"+item.querySelectorAll("div:nth-child(1)>select").value,
                            nonce:""
                        };
                        const nonce11 = generateRandom6Digits(); 
                        requestData.nonce=nonce11;
                        const timestamp11 = Math.floor(Date.now() / 1000).toString();
                        const encrypted11=await encryptflare(publicKeyF,JSON.stringify(requestData));
                        postserver(pathurl,nonce11,timestamp11,encrypted11,item,document.querySelector(".main>.buttab3>div:nth-child(2)>ul"));
                    }                        
                }
            }
        })
    };
    function nextcustcode(){
        document.querySelectorAll(".main>.buttab3>div:nth-child(3)>ul>li").forEach((item,index)=>{
            item.querySelector("div:nth-child(3)>button:nth-child(1)").onclick=function(e){
                e.stopPropagation();
                item.querySelector("div:nth-child(1)>select").disabled=false;
                item.querySelector("div:nth-child(2)>input").disabled=false;
                if(index===0&&!item.querySelector("div:nth-child(2)>input").value)typepost="add";
                item.querySelector("div:nth-child(3)>button:nth-child(2)").onclick=async function(e){
                    e.stopPropagation();
                    if(!document.querySelector(".main>.buttab3>div:nth-child(3)>ul>li:nth-child(1)>div:nth-child(2)>input").value&&custcode[0]&&custcode[0].codeimg)return alert("有空白表单未处理");
                    if(index!==custcode_index){
                        custcode_index=index;
                        custcodeobj.codename="";custcodeobj.codeimg="";
                    }
                    if(reg.test(item.querySelector("div:nth-child(1)>select").value))return alert("文本不安全");
                    custcodeobj.codename=item.querySelector("div:nth-child(1)>select").value;
                    items.forEach(async (item11,index11)=>{
                        if(item11.content===custcodeobj.codename){
                            item.querySelector("div:nth-child(2)>input").value=`${serverUrl}/files/${item11.file_key}`;
                            custcodeobj.codeimg=`${serverUrl}/files/${item11.file_key}`;
                        }
                        if((index11+1)===items.length){
                            alert(JSON.stringify(custcodeobj))
                            if(!custcodeobj.codename||!custcodeobj.codeimg)return alert("信息未填全");
                            const pathurl="/api/protected/adddelrest_code";
                            const requestData={
                                username:JSON.parse(usernum).username,
                                password:"",
                                token:"",
                                message:typepost+"(ASD)"+custcodeobj.codename+"(ASD)"+custcodeobj.codeimg,
                                nonce:""
                            };
                            const nonce11 = generateRandom6Digits(); 
                            requestData.nonce=nonce11;
                            const timestamp11 = Math.floor(Date.now() / 1000).toString();
                            const encrypted11=await encryptflare(publicKeyF,JSON.stringify(requestData));
                            postserver(pathurl,nonce11,timestamp11,encrypted11,"","")
                        }
                    })                            
                }
                item.querySelector("div:nth-child(3)>button:nth-child(3)").onclick=async function(e){
                    e.stopPropagation();
                    if(!document.querySelector(".main>.buttab3>div:nth-child(3)>ul>li:nth-child(1)>div:nth-child(2)>input").value&&custcode[0].codeimg){
                        typepost="rest";
                        if(index===0){
                            document.querySelector(".main>.buttab3>div:nth-child(3)>ul").removeChild(document.querySelector(".main>.buttab3>div:nth-child(3)>ul>li>:nth-child(1)"));
                        }else{
                            return alert("有空白表单未处理");
                        }                        
                    }else{
                        const pathurl="/api/protected/adddelrest_code";
                        const requestData={
                            username:JSON.parse(usernum).username,
                            password:"",
                            token:"",
                            message:"del(ASD)"+item.querySelectorAll("div:nth-child(1)>select").value,
                            nonce:""
                        };
                        const nonce11 = generateRandom6Digits(); 
                        requestData.nonce=nonce11;
                        const timestamp11 = Math.floor(Date.now() / 1000).toString();
                        const encrypted11=await encryptflare(publicKeyF,JSON.stringify(requestData));
                        postserver(pathurl,nonce11,timestamp11,encrypted11,item,document.querySelector(".main>.buttab3>div:nth-child(3)>ul")); 
                    }                       
                }
            }
        })
    };
    function nextproaccount(){
        document.querySelectorAll(".main>.buttab3>div:nth-child(4)>ul>li").forEach((item,index)=>{
            item.querySelector("div:nth-child(4)>button:nth-child(1)").onclick=function(e){
                e.stopPropagation();
                item.querySelector("div:nth-child(1)>select").disabled=false;
                item.querySelector("div:nth-child(2)>input").disabled=false;
                item.querySelector("div:nth-child(3)>input").disabled=false;
                if(index===0&&!item.querySelector("div:nth-child(2)>input").value)typepost="add";
                item.querySelector("div:nth-child(4)>button:nth-child(2)").onclick=async function(e){
                    e.stopPropagation();
                    if(!document.querySelector(".main>.buttab3>div:nth-child(4)>ul>li:nth-child(1)>div:nth-child(2)>input").value&&proaccount[0]&&proaccount[0].proimg)return alert("有空白表单未处理");
                    if(index!==account_index){
                        account_index=index;
                        proaccountObj.proname="";proaccountObj.proimg="";proaccountObj.prourl="";
                    }
                    if(reg.test(item.querySelector("div:nth-child(1)>select").value)
                    ||reg.test(item.querySelector("div:nth-child(3)>input").value)
                    )return alert("文本不安全");
                    proaccountObj.proname=item.querySelector("div:nth-child(1)>select").value;
                    items.some((itm)=>{
                        if(itm.content===proaccountObj.proname){
                            item.querySelector("div:nth-child(2)>input").value=`${serverUrl}/files/${itm.file_key}`;
                            proaccountObj.proimg=`${serverUrl}/files/${itm.file_key}`;
                        }
                    })
                    if(!proaccountObj.proname||!proaccountObj.proimg||!proaccountObj.prourl)return alert("信息未填全")
                    const pathurl="/api/protected/adddelrest_account";
                    const requestData={
                        username:JSON.parse(usernum).username,
                        password:"",
                        token:"",
                        message:typepost+"(ASD)"+proaccountObj.proname+"(ASD)"+proaccountObj.proimg+"(ASD)"+proaccountObj.prourl,
                        nonce:""
                    };
                    const nonce11 = generateRandom6Digits(); 
                    requestData.nonce=nonce11;
                    const timestamp11 = Math.floor(Date.now() / 1000).toString();
                    const encrypted11=await encryptflare(publicKeyF,JSON.stringify(requestData));
                    postserver(pathurl,nonce11,timestamp11,encrypted11,"","")
                }
                item.querySelector("div:nth-child(4)>button:nth-child(3)").onclick=async function(e){
                    e.stopPropagation();
                    if(!document.querySelector(".main>.buttab3>div:nth-child(4)>ul>li:nth-child(1)>div:nth-child(2)>input").value&&proaccount[0].proimg){
                        typepost="rest";
                        if(index===0){
                            document.querySelector(".main>.buttab3>div:nth-child(4)>ul").removeChild(document.querySelector(".main>.buttab3>div:nth-child(4)>ul>li>:nth-child(1)"));
                        }else{
                            return alert("有空白表单未处理");
                        }                        
                    }else{
                        const pathurl="/api/protected/adddelrest_account";
                        const requestData={
                            username:JSON.parse(usernum).username,
                            password:"",
                            token:"",
                            message:"del(ASD)"+item.querySelectorAll("div:nth-child(1)>select").value,
                            nonce:""
                        };
                        const nonce11 = generateRandom6Digits(); 
                        requestData.nonce=nonce11;
                        const timestamp11 = Math.floor(Date.now() / 1000).toString();
                        const encrypted11=await encryptflare(publicKeyF,JSON.stringify(requestData));
                        postserver(pathurl,nonce11,timestamp11,encrypted11,item,document.querySelector(".main>.buttab3>div:nth-child(4)>ul")); 
                    }                       
                }
            }
        })
    };
    function nextpaylist(){
        document.querySelectorAll(".main>.buttab3>div:nth-child(5)>ul>li").forEach((item,index)=>{
            item.querySelector("div:nth-child(4)>button:nth-child(1)").onclick=function(e){
                e.stopPropagation();
                item.querySelector("div:nth-child(1)>select").disabled=false;
                item.querySelector("div:nth-child(2)>input").disabled=false;
                item.querySelector("div:nth-child(3)>input").disabled=false;
                if(index===0&&!item.querySelector("div:nth-child(2)>input").value)typepost="add";
                item.querySelector("div:nth-child(4)>button:nth-child(2)").onclick=async function(e){
                    e.stopPropagation();
                    if(!document.querySelector(".main>.buttab3>div:nth-child(5)>ul>li:nth-child(1)>div:nth-child(2)>input").value&&paylist[0]&&paylist[0].payimg)return alert("有空白表单未处理");
                    if(index!==pay_index){
                        pay_index=index;
                        payobj.payname="";payobj.payimg="";payobj.payurl="";
                    }
                    if(reg.test(item.querySelector("div:nth-child(1)>select").value)
                    ||reg.test(item.querySelector("div:nth-child(3)>input").value)
                    )return alert("文本不安全");
                    payobj.payname=item.querySelector("div:nth-child(1)>select").value;
                    items.some((itm)=>{
                        if(itm.content===payobj.payname){
                            item.querySelector("div:nth-child(2)>input").value=`${serverUrl}/files/${itm.file_key}`;
                            payobj.payimg=`${serverUrl}/files/${itm.file_key}`;
                        }
                    })
                    if(!payobj.payname||!payobj.payimg||!payobj.payurl)return alert("信息未填全")
                    const pathurl="/api/protected/adddelrest_pay";
                    const requestData={
                        username:JSON.parse(usernum).username,
                        password:"",
                        token:"",
                        message:typepost+"(ASD)"+payobj.payname+"(ASD)"+payobj.payimg+"(ASD)"+payobj.payurl,
                        nonce:""
                    };
                    const nonce11 = generateRandom6Digits(); 
                    requestData.nonce=nonce11;
                    const timestamp11 = Math.floor(Date.now() / 1000).toString();
                    const encrypted11=await encryptflare(publicKeyF,JSON.stringify(requestData));
                    postserver(pathurl,nonce11,timestamp11,encrypted11,"","")
                }
                item.querySelector("div:nth-child(4)>button:nth-child(3)").onclick=async function(e){
                    e.stopPropagation();
                    if(!document.querySelector(".main>.buttab3>div:nth-child(5)>ul>li:nth-child(1)>div:nth-child(2)>input").value&&paylist[0].payimg){
                        typepost="rest";
                        if(index===0){
                            document.querySelector(".main>.buttab3>div:nth-child(5)>ul").removeChild(document.querySelector(".main>.buttab3>div:nth-child(5)>ul>li>:nth-child(1)"));
                        }else{    
                            return alert("有空白表单未处理");
                        }                        
                    }else{
                        const pathurl="/api/protected/adddelrest_pay";
                        const requestData={
                            username:JSON.parse(usernum).username,
                            password:"",
                            token:"",
                            message:"del(ASD)"+item.querySelectorAll("div:nth-child(1)>select").value,
                            nonce:""
                        };
                        const nonce11 = generateRandom6Digits(); 
                        requestData.nonce=nonce11;
                        const timestamp11 = Math.floor(Date.now() / 1000).toString();
                        const encrypted11=await encryptflare(publicKeyF,JSON.stringify(requestData));
                        postserver(pathurl,nonce11,timestamp11,encrypted11,item,document.querySelector(".main>.buttab3>div:nth-child(5)>ul")); 
                    }                       
                }
            }
        })
    };
    function nextmember(){
        document.querySelectorAll(".main>.buttab3>div:nth-child(6)>ul>li").forEach((item,index)=>{
            item.querySelector("div:nth-child(4)>button:nth-child(1)").onclick=function(e){
                e.stopPropagation();
                if(!item.querySelector("div:nth-child(1)>select").value)return alert("没有注册用户");
                item.querySelector("div:nth-child(1)>select").disabled=false;
                item.querySelector("div:nth-child(2)>select").disabled=false;
                item.querySelector("div:nth-child(3)>input").disabled=false;
                if(index===0&&!item.querySelector("div:nth-child(3)>input").value)typepost="add";
                item.querySelector("div:nth-child(4)>button:nth-child(2)").onclick=async function(e){
                    e.stopPropagation();
                    if(!document.querySelector(".main>.buttab3>div:nth-child(6)>ul>li:nth-child(1)>div:nth-child(3)>input").value&&memberlist[0]&&memberlist[0].expires)return alert("有空白表单未处理");
                    if(index!==member_index){
                        member_index=index;
                        memberobj.usernum="";memberobj.type="";memberobj.expires="";
                    }
                    if(reg.test(item.querySelector("div:nth-child(1)>select").value))return alert("文本不安全");
                    memberobj.usernum=item.querySelector("div:nth-child(1)>select").value;
                    if(reg.test(item.querySelector("div:nth-child(2)>select").value))return alert("文本不安全");
                    memberobj.type=item.querySelector("div:nth-child(2)>select").value;
                    if(reg.test(item.querySelector("div:nth-child(3)>input").value))return alert("文本不安全");
                    if(!memberobj.usernum||!memberobj.type||!memberobj.expires)return alert("信息未填全")
                    const pathurl="/api/protected/adddelrest_member";
                    const requestData={
                        username:JSON.parse(usernum).username,
                        password:"",
                        token:"",
                        message:typepost+"(ASD)"+memberobj.usernum+"(ASD)"+memberobj.type+"(ASD)"+memberobj.expires,
                        nonce:""
                    };
                    const nonce11 = generateRandom6Digits(); 
                    requestData.nonce=nonce11;
                    const timestamp11 = Math.floor(Date.now() / 1000).toString();
                    const encrypted11=await encryptflare(publicKeyF,JSON.stringify(requestData));
                    postserver(pathurl,nonce11,timestamp11,encrypted11,"","","")
                }
                item.querySelector("div:nth-child(4)>button:nth-child(3)").onclick=async function(e){
                    e.stopPropagation();
                    if(!document.querySelector(".main>.buttab3>div:nth-child(6)>ul>li:nth-child(1)>div:nth-child(3)>input").value&&memberlist[0].expires){
                        typepost="rest";
                        if(index===0){
                            document.querySelector(".main>.buttab3>div:nth-child(6)>ul").removeChild(document.querySelector(".main>.buttab3>div:nth-child(6)>ul>li>:nth-child(1)"));
                        }else{
                            return alert("有空白表单未处理");
                        }
                    }else{
                        const pathurl="/api/protected/adddelrest_member";
                        const requestData={
                            username:JSON.parse(usernum).username,
                            password:"",
                            token:"",
                            message:"del(ASD)"+item.querySelectorAll("div:nth-child(1)>select").value,
                            nonce:""
                        };
                        const nonce11 = generateRandom6Digits(); 
                        requestData.nonce=nonce11;
                        const timestamp11 = Math.floor(Date.now() / 1000).toString();
                        const encrypted11=await encryptflare(publicKeyF,JSON.stringify(requestData));
                        postserver(pathurl,nonce11,timestamp11,encrypted11,item,document.querySelector(".main>.buttab3>div:nth-child(6)>ul"),"");
                    }                        
                }
            }
        })
    };
    function nexttypes(){
        document.querySelectorAll(".main>.buttab3>div:nth-child(7)>ul>li").forEach((item,index)=>{
            item.querySelector("div:nth-child(4)>button:nth-child(1)").onclick=function(e){
                e.stopPropagation();
                item.querySelector("div:nth-child(1)>select").disabled=false;
                item.querySelector("div:nth-child(2)>textarea").disabled=false;
                item.querySelector("div:nth-child(3)>textarea").disabled=false;
                if(index===0&&!item.querySelector("div:nth-child(3)>textarea").value)typepost="add";
                item.querySelector("div:nth-child(4)>button:nth-child(2)").onclick=async function(e){
                    e.stopPropagation();
                    if(!document.querySelector(".main>.buttab3>div:nth-child(7)>ul>li:nth-child(1)>div:nth-child(3)>textarea").value&&types[0]&&types[0].price)return alert("有空白表单未处理");
                    if(index!==types_index){
                        types_index=index;
                        typesobj.typename="";typesobj.content="";typesobj.price="";
                    }
                    if(reg.test(item.querySelector("div:nth-child(1)>select").value)
                    ||reg.test(item.querySelector("div:nth-child(2)>textarea").value)
                    ||reg.test(item.querySelector("div:nth-child(3)>textarea").value)
                    )return alert("文本不安全");
                    typesobj.typename=item.querySelector("div:nth-child(1)>select").value;
                    if(!typesobj.typename||!typesobj.content||!typesobj.price)return alert("信息未填全")
                    const pathurl="/api/protected/adddelrest_types";
                    const requestData={
                        username:JSON.parse(usernum).username,
                        password:"",
                        token:"",
                        message:typepost+"(ASD)"+typesobj.typename,
                        nonce:""
                    };
                    const nonce11 = generateRandom6Digits(); 
                    requestData.nonce=nonce11;
                    const message=typesobj.content+"(ASD)"+typesobj.price;
                    const timestamp11 = Math.floor(Date.now() / 1000).toString();
                    const encrypted11=await encryptflare(publicKeyF,JSON.stringify(requestData));
                    postserver(pathurl,nonce11,timestamp11,encrypted11,"","",message)
                }
                item.querySelector("div:nth-child(4)>button:nth-child(3)").onclick=async function(e){
                    e.stopPropagation();
                    if(!document.querySelector(".main>.buttab3>div:nth-child(7)>ul>li:nth-child(1)>div:nth-child(3)>textarea").value&&types[0].price){
                        typepost="rest";
                        if(index===0){
                            document.querySelector(".main>.buttab3>div:nth-child(7)>ul").removeChild(document.querySelector(".main>.buttab3>div:nth-child(7)>ul>li>:nth-child(1)"));
                        }else{
                            return alert("有空白表单未处理");
                        }
                    }else{
                        const pathurl="/api/protected/adddelrest_types";
                        const requestData={
                            username:JSON.parse(usernum).username,
                            password:"",
                            token:"",
                            message:"del(ASD)"+item.querySelectorAll("div:nth-child(1)>select").value,
                            nonce:""
                        };
                        const nonce11 = generateRandom6Digits(); 
                        requestData.nonce=nonce11;
                        const timestamp11 = Math.floor(Date.now() / 1000).toString();
                        const encrypted11=await encryptflare(publicKeyF,JSON.stringify(requestData));
                        postserver(pathurl,nonce11,timestamp11,encrypted11,item,document.querySelector(".main>.buttab3>div:nth-child(7)>ul"));                        
                    }
                }
            }
        })
    }
    function postserver(pathurl,nonce0,timestamp0,encrypted0,item0,nodent,message){
        fetch(serverUrl+pathurl,{
            method:"POST",
            headers:{
                "Content-Type":"application/json",
                'x-request-nonce': nonce0,
                'x-request-timestamp': timestamp0,
                "Authorization":`Bearer ${custtoken}`
            },
            body:JSON.stringify({encrypted:encrypted0,message:message})
        }).then(response=>{
            if(!response.ok){
                throw new Error(`HTTP 错误！状态码：${response.status}`)
            }
            return response.json();
        }).then(data=>{
            console.log(data);
            if(nodent&&item0)nodent.removeChild(item0);
            document.querySelector(".buttop>button:nth-child(2)").click();
            typepost="rest";
        }).catch(err=>{
            console.log(err);
        })
    }
    function uploadfile(user_id,adminname,message){
        const fileInput = document.getElementById('fileInput');
        fileInput.click();
        fileInput.onchange=async function(){
            if (fileInput.files.length === 0) return alert('請選擇檔案');
            const formData = new FormData();
            formData.append('file', fileInput.files.item(0));
            const strobj={user_id:user_id,adminname:adminname,message:message};
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
                let newLI=document.createElement("li");
                let oldLI=document.querySelector(".main>.buttab2>div:nth-child(3)>ul>li:nth-child(1)");
                let html=`<img src="${serverUrl+result.fileUrl}">`;
                document.querySelector(".main>.buttab2>div:nth-child(3)>ul").insertBefore(newLI,oldLI);
                document.querySelector(".main>.buttab2>div:nth-child(3)>ul>li:nth-child(1)").innerHTML=html;
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
        } catch (err) {console.log(err)
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