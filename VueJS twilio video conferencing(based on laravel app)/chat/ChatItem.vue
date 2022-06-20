<template>
  <div class="chat-item">
    <div class="chat-item_avatar">
      {{ message.name }}
    </div>
    <div class="chat-item_message" v-if="file">
        <img :src="'storage/attachments/' + file" :alt="file" width="100%" v-if="file.match(/.(jpg|jpeg|png)$/i)">
        <a :href="'storage/attachments/' + file" target="_blank" :download="file.substring(0, file.length - 15)" v-else>
            <img :src="attachedFileLogo" width="25px" alt="">{{ file.substring(0, file.length - 15) }}</a>
    </div>
    <div class="chat-item_message" v-else-if="isLink">
      <a :href="message.msg" target="_blank">{{ message.msg }}</a>
    </div>
    <div class="chat-item_message" v-else>
      {{ message.msg }}
    </div>
    <div class="chat-item_time">
      {{ message.time }}
    </div>
  </div>
</template>

<script>
import {validateFile, validateUrl} from '../../helper';

export default {
  name: 'ChatItem',
  data() {
    return {
      isLink: false,
      file: false,
      attachedFileLogo: '/images/attached_file.png'
    };
  },
  props: {
    message: {
      type: Object,
      default: () => {},
    },
  },
  mounted() {
    this.isLink = validateUrl(this.message.msg);
    this.file = validateFile(this.message.msg);
  },
};
</script>
