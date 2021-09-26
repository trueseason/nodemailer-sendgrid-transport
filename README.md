# nodemailer-sendgrid-transport

This repository is a nodemailer transport plugin sending email via SendGrid's V3 REST API.  
Support SendGrid options such as categories, tracking settings or send_at etc.  
Support http, https, socks4 or socks5 proxy via proxy-agent.

## dependencies
axios

## Usage

Install via npm.  

Support SendGrid options of *categories, send_at, batch_id, asm, ip_pool_name, mail_settings, tracking_settings*

```javascript
var nodemailer = require('nodemailer');
var sgTransport = require('@singtone/nodemailer-sendgrid-transport');
var proxy = require('proxy-agent');  //optional

var options = {
	auth: {
		api_key: 'SENDGRID_APIKEY'
	},
    proxyAgent: proxy(process.env.PROXY)  //optional. i.e. https://myproxy.sample.com:8080
}

var mailer = nodemailer.createTransport(sgTransport(options));
```

```javascript
var email = {
	to: ['john@foo.com', 'smith@bar.com'],
	from: 'david@baz.com',
	subject: 'Hello World',
	text: 'Awesome sauce',
	html: '<b>Awesome sauce</b>',
	attachments: {
		filename: 'text1.txt',
		content: 'aGVsbG8gd29ybGQh',
		encoding: 'base64'
	},
	sendGrid: {  //optional SendGrid Options
		"categories": [
			"cake",
			"pie",
			"baking"
		],
		"send_at": 1617260400,
		"tracking_settings": {
			"click_tracking": {
				"enable": true,
				"enable_text": false
			}
		}
	}
};

mailer.sendMail(email, function(err, res) {
	if (err) { 
		console.log(err) 
	}
	console.log(res);
});
```
