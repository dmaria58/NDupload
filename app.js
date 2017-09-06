const router = require('koa-router')();
const Koa = require('koa');
const cache = require('memory-cache');
const serve = require('koa-static');
const koaBody = require('koa-body');
const URL = require('url');
const fs = require('fs');
const UUID = require('uuid');
const app = new Koa();
app.use(koaBody({multipart: true}))
router.post('/upload',async function (ctx, next) {
        formmaxlength =	2 * 1024 * 1024;  //设置每次上传最大长度
        /**
		* filetype 文件的类型（如png,jpg,mp3）
		* mylist   文件内容
		* length   文件分成了几个包
		* ajaxkey	 第一次请求后台后，获取随机key	
		* ajaxi    当前包的序列号

        */
        if(!ctx.request.body.fields.filetype||!ctx.request.body.fields.mylist||!ctx.request.body.fields.length||ctx.request.body.fields.ajaxkey==null||ctx.request.body.fields.ajaxkey==undefined||!ctx.request.body.fields.ajaxi){ 
        	ctx.response.body={"end":"fail","reason":"参数不正确"};  //如果参数不正确，报错
        	return;
        }
        var buffer = new Buffer(ctx.request.body.fields.mylist);
        var ajaxkey;
		if(buffer.length>formmaxlength){  //文件过大
			ctx.response.body={"end":"fail","reason":"too long"};
			return;
		}
		if(ctx.request.body.fields.ajaxkey==""){   //第一个包，生成随机key
		   ajaxkey = UUID.v1()+UUID.v4();	
		   cache.put(ajaxkey,ctx.request.body.fields.mylist,60000)	   //设置过期时间60000ms
		}
		else{   //其他包
		   ajaxkey=ctx.request.body.fields.ajaxkey; 	
		   var b1=cache.get(ajaxkey);	
		   var b2=ctx.request.body.fields.mylist;	
		   var b3=b1+b2;
		   cache.put(ajaxkey,b3,60000);
		}
		if(ctx.request.body.fields.length==(parseInt(ctx.request.body.fields.ajaxi)+1)){  //拼接完成，最后上传
			var base64Data = cache.get(ajaxkey).split(';base64,')[1];
	        var dataBuffer = new Buffer(base64Data,'base64');
	        var _myopload=(fields,ajaxkey,dataBuffer)=>{
		        return new Promise(function (resolve, reject) {
					fs.writeFile('upload/'+ajaxkey+'.'+fields.filetype,dataBuffer,function (err) {
					  if(err){
					  	console.log("fail");
					  	resolve({"end":"fail"})
					  }
					  else{
						  console.log("upload success");
						  cache.del(ajaxkey);	
						  resolve({"end":"success","name":ajaxkey})
						  ctx.response.body={"end":"success","name":ajaxkey};
					  }
					});	
				})	
	        }
	        var b=await _myopload(ctx.request.body.fields,ajaxkey,dataBuffer);
	        if(b&&b.end=="success"){
	        	ctx.response.body={"end":"success","name":ajaxkey};
	        }
	        else{
	        	ctx.response.body={"end":"fail"};
	        }


		}
		else{
			ctx.response.body={"ing":"success","ajaxkey":ajaxkey};
		}
});
app.use(serve(__dirname + '/page'));
app.use(router.routes());
app.listen(3000);