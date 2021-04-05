'use strict';

const axios = require('axios');
const proxy = require('proxy-agent');
const packageData = require('../package.json');
const sendGridUrl = 'https://api.sendgrid.com/v3/mail/send';
const sendGridOptionsSupported = ['categories','send_at','batch_id','asm','ip_pool_name','mail_settings','tracking_settings'];

function SendGridTransport(options) {
  options = options || {};

  this.options = options;
  this.name = 'SendGridTransport';
  this.version = packageData.version;
}

SendGridTransport.prototype.send = async function(mail, callback) {
  let email = mail.data;

  // transform and normalize addresses
  let transformAddresses = () => {
    let addresses = mail.message.getAddresses();
    let replyTo = addresses['reply-to'];
    let from = [].concat(addresses.from || addresses.sender || replyTo || []).shift();
    let to = [].concat(addresses.to || []);
    let cc = [].concat(addresses.cc || []);
    let bcc = [].concat(addresses.bcc || []);

    email.personalizations = [{ to: [] }];

    if (replyTo) {
      email.reply_to = {
        email: replyTo.address,
        name: replyTo.name ? replyTo.name : null
      }
    };

    email.from = {
      email: from.address,
      name: from.name ? from.name : null
    }

    let nuto = to.map(x => {
      return {
        email: x.address || '',
        name: x.name ? x.name : null
      };
    });
    if (nuto.length > 0) email.personalizations[0].to = nuto;

    let nucc = cc.map(x => {
      return {
        email: x.address || '',
        name: x.name ? x.name : null
      };
    });
    if (nucc.length > 0) email.personalizations[0].cc = nucc;

    let nubcc = bcc.map(x => {
      return {
        email: x.address || '',
        name: x.name ? x.name : null
      };
    });
    if (nubcc.length > 0) email.personalizations[0].bcc = nubcc;
  };

  // prepare content list for processing
  let prepareContents = () => {
    let contents = [];
    if (email.text) {
      contents.push({
        obj: email,
        key: 'text'
      });
    }

    if (email.html) {
      contents.push({
        obj: email,
        key: 'html'
      });
    }

    email.attachments = [].concat(email.attachments || []);
    email.files = email.attachments;
    [].concat(email.files || []).forEach((attachment, idx) => {
      contents.push({
        obj: email.files,
        key: idx,
        isAttachment: true
      });
    });

    return contents;
  };

  // transform and normalize contents
  let resolveContent = async (contentItem, index) => {
    // We need to store a pointer to the original attachment object in case
    // resolveContent replaces it with the Stream value
    if (contentItem.isAttachment) {
      var prevObj = contentItem.obj[contentItem.key];
      // ensure the object is an actual attachment object, not a string, buffer or a stream
      if (prevObj instanceof Buffer ||  typeof prevObj === 'string' || (prevObj && typeof prevObj.pipe === 'function')) {
        prevObj = { content: prevObj };
      }
    };
    
    // use the helper function to convert file paths, urls and streams to strings or buffers
    let content = await mail.resolveContent(contentItem.obj, contentItem.key);
    if (!contentItem.isAttachment) {
      let contentType = contentItem.key === 'html' ? 'text/html' : 'text/plain';
      contentItem.obj.content = [].concat({
        "type": contentType,
        "value": content
      } || []);
    } else {
      // If the object is a String or a Buffer then it is most likely replaces by resolveContent
      if (contentItem.obj[contentItem.key] instanceof Buffer ||  typeof contentItem.obj[contentItem.key] === 'string') {
        contentItem.obj[contentItem.key] = prevObj;
      }

      if (contentItem.obj[contentItem.key] instanceof Buffer) {
        contentItem.obj[contentItem.key].content = Buffer.from(content, 'binary').toString('base64');
      } else {
        contentItem.obj[contentItem.key].content = Buffer.from(content).toString('base64');
      }

      if (contentItem.obj[contentItem.key].path) {
        if (!contentItem.obj[contentItem.key].filename) {
          // try to detect the required filename from the path
          contentItem.obj[contentItem.key].filename = contentItem.obj[contentItem.key].path.split(/[\\\/]/).pop();
        }
        delete contentItem.obj[contentItem.key].path;
      }
      // set default filename if filename and content-type are not set (allowed for Nodemailer but not for SendGrid)
      if (!contentItem.obj[contentItem.key].filename && !contentItem.obj[contentItem.key].contentType) {
        contentItem.obj[contentItem.key].filename = 'attachment-' + index + '.dat';
      }

      if (contentItem.obj[contentItem.key].contentType) {
        contentItem.obj[contentItem.key].type = contentItem.obj[contentItem.key].contentType;
        delete contentItem.obj[contentItem.key].contentType;
      }
      if (contentItem.obj[contentItem.key].contentDisposition) {
        contentItem.obj[contentItem.key].disposition = contentItem.obj[contentItem.key].contentDisposition;
        delete contentItem.obj[contentItem.key].contentDisposition;
      }
    }
  };

  let getValue = (object, key) => {
    return key.split(".").reduce(function(o, x) {
        return (typeof o == "undefined" || o === null) ? o : o[x];
    }, object);
  };

  let setValue = (object, path, value) => {
    let schema = object;
    let pList = path.split('.');
    let len = pList.length;
    for(let i = 0; i < len-1; i++) {
      let element = pList[i];
        if(!schema[element]) schema[element] = {};
        schema = schema[element];
    };
    schema[pList[len-1]] = value;
  };

  let processSendGridOptions = () => {
    if (email.sendGrid) {
      for (let item in email.sendGrid) {
        if (!sendGridOptionsSupported.includes(item)) {
          delete email.sendGrid[item];
        }
      };
      email = Object.assign({}, email, email.sendGrid);
    }
    if (getValue(email, 'tracking_settings.subscription_tracking.enable') == undefined) {
      setValue(email, 'tracking_settings.subscription_tracking.enable', false);
    }
  }

  try {
    transformAddresses();
    let contents = prepareContents();
    await Promise.all(contents.map(resolveContent));
    if (email.attachments.length == 0) email.attachments = null;
    processSendGridOptions();
    await axios.post(sendGridUrl, email, {
      headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.options.auth.api_key}`
      },
      proxy: false,
      httpsAgent: proxy(process.env.PROXY)
    });
    return callback();
  }
  catch (err) {
    return callback(err);
  }
};

module.exports = SendGridTransport;
