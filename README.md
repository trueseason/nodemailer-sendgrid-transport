# nodemailer-sendgrid-transport

	This repository is a nodemailer transport plugin sending email via SendGrid's V3 REST API call.
	Support optional SendGrid emails options such as categories, tracking configuration and send by schedule.
	Support http, https, socks4 or socks5 proxy.

## dependencies
	-axios
	-proxy-agent

## Usage
Install via npm.

```javascript
var nodemailer = require('nodemailer');
var sgTransport = require('@johnx/nodemailer-sendgrid-transport');

var options = {
	auth: {
		api_key: 'SENDGRID_APIKEY'
	}
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
	}
	sendGrid: {}  //optional SendGrid Options
};

mailer.sendMail(email, function(err, res) {
	if (err) { 
		console.log(err) 
	}
	console.log(res);
});
```
