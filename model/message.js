const {dt_store, dt_get, getUsersToUpdateToken, getUsersByToken, store_message} = require('../datastore/datastore.js');
const util = require('../utils/util.js');
const {postFormData, axios_error_logger, fetchWaTemplate} = require('../utils/api.js');

const model = {
  sendWhatsappMessage: async (template_id, number, msg_id, waba_number,_components, campaign_id, jumperToken, uid_shop_name, jumperTemplate) => {
    var components = {'HEADER':[],'BODY':[],'BUTTONS':[]}
    let jumperTemplateAllButtons = [];

    // get all buttons from jumper template
    if (jumperTemplate?.message?.BUTTONS) {
      jumperTemplateAllButtons = model.buttonsListHandler(jumperTemplate.message.BUTTONS);
    }

    // generate message from MoEngage template parameters
    if(_components){
      for(comp of _components){
        if(comp.type=="header"){
          var p = new Array()
          for(params of comp.parameters){
            let h = {}, link;
            if(params?.image?.link) {
              link = params?.image?.link;
              h[link] = "image"
            }
            if(params?.video?.link) {
              link = params?.video?.link;
              h[link] = "video"
            }
            components.HEADER.push(h)
          }
        }
        if(comp.type=="body"){
          var p = new Array()
          for(params of comp.parameters){
            h = {}
            if(params.type=="text"){
              text = params.text
              h[text] = "text"
              components.BODY.push(h)
            }
          }
        }
        if(comp.type=="button"){
          // var p = new Array()
          //   for (var i = 0; i < comp.parameters.length; i++) {
          //     console.dir(comp.parameters[i], {depth:9})
          //     if(comp.parameters[i]["type"] == "payload"){
          //       comp.parameters[i]["type"] = "text"
          //       comp.parameters[i]["text"] = comp.parameters[i]["payload"]
          //       delete comp.parameters[i]["payload"]
          //       console.dir(comp.parameters[i], {depth:9})
          //     }
          //   }
          
          comp.index = Number(comp.index)
          
          components.BUTTONS.push(comp)
        }
      }
    }

    // code for bot and product flow buttons
    if(!components.BUTTONS.length && jumperTemplateAllButtons.length) {
      jumperTemplateAllButtons.forEach((button) => {
        if (button.static != true) {
          components.BUTTONS.push(
            {
              "type": "button",
              "sub_type": button.sub_type,
              "index": button.index,
              "parameters": button.parameters
            }
          )
        }
      });
    }
  
    console.log(`msg_id:${msg_id} Generated Components`, JSON.stringify(components))
  
    const body = {
        to: number,
        channel: 'whatsapp',
        message: `s3ndt3mpl4te_${template_id}`,
        messagetype: 'template',
      // message_params:  JSON.stringify( {'HEADER':[],'BODY':[{'1':'text'}],'BUTTONS':[{'type':'button','sub_type':'url','index':0,'parameters':[{'type':'text','text':'/order/1234'}]}]}),
        message_params: JSON.stringify(components),
        source: 'moengage'
      };
  
    try {
      const responsePromise = await postFormData('https://api.jumper.ai/chat/send-message', body, jumperToken, uid_shop_name);
      // const response = await axiosInstance.request(config);
      const response = await responsePromise.json();
      console.log(`msg_id:${msg_id} message send response:`, JSON.stringify(response))
      if (response.success == true){
  
        const message = {
          mo_msg_id: msg_id,
          mo_waba_number: waba_number,
          mo_template_id: template_id,
          wa_message_id: response.message_id,
          wa_conv_id: response.conversationid,
          campaign_id: campaign_id || '',
          uid_shop_name,
          receiver_number: number.replace("+", "")
        }
  
        await store_message(message)
        return {"status":"success","message":response}
      }
      else return {"status":"error","message":"failed sending message"}
    } catch (error) {
      axios_error_logger('https://api.jumper.ai/chat/send-message',error)
      return {"status":"error","message":"failed sending message"}
    }
  },
  buttonsListHandler(messageButtons) {
    let buttons = [];
    if (messageButtons) {
      messageButtons.forEach((messageButton, index) => {
        if (messageButton.type == 'URL') {
          const isStatic = !messageButton.url.includes("{");
          let button = { ...messageButton, ...{ sub_type: 'url', type: 'button', index, static: isStatic, parameters: [{ "type": "text", "text": "" }] } };
          button.text = button.text || 'Web Url';
          buttons.push(button);
        } else if (messageButton.type == 'QUICK_REPLY') {
          let payload = {
            parameters: [
              {
                "type": "payload",
                "payload": messageButton.payload
              }
            ]
          }
          let button = { ...messageButton, ...{ sub_type: 'quick_reply', type: 'button', index, static: false }, ...payload };
          button.text = button.text || 'Quick Reply';
          buttons.push(button);
        } else if (messageButton.type == 'PHONE_NUMBER') {
          let button = { ...messageButton, ...{ sub_type: 'phone_number', type: 'button', index, static: true } };
          button.text = button.text || 'Phone Number';
          buttons.push(button);
        } else {
          buttons.push(messageButton);
        }
      });
    }
    return buttons;
  },
};

module.exports = model;
