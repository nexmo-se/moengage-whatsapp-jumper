const {dt_store, dt_get, getUsersToUpdateToken, getUsersByToken, store_message} = require('../datastore/datastore.js');
const util = require('../utils/util.js');
const {postFormData, axios_error_logger} = require('../utils/api.js');

const model = {
  sendWhatsappMessage: async (template_id, number, msg_id, waba_number,_components, campaign_id, jumperToken, uid_shop_name) => {
    var components = {'HEADER':[],'BODY':[],'BUTTONS':[]}
    if(_components){
      for(comp of _components){
        if(comp.type=="header"){
          var p = new Array()
          for(params of comp.parameters){
            h = {}
            link = params["image"]["link"]
            h[link] = "image"
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
          uid_shop_name
        }
  
        await store_message(message)
        return {"status":"success","message":response}
      }
      else return {"status":"error","message":"failed sending message"}
    } catch (error) {
      axios_error_logger('https://api.jumper.ai/chat/send-message',error)
      return {"status":"error","message":"failed sending message"}
    }
  }
};

module.exports = model;
