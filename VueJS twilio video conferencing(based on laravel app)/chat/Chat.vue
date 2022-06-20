<template>
  <div class="chat-container">
    <div >
      <h2 class="heading">Chat</h2>
      <div @click="closeChat" class="close-btn">X</div>
    </div>
    <div class="chatbox" ref="chatContainer">
      <ChatItem v-for="(message, index) in messages" :key="index" :message="message" />
    </div>
    <div>
      <textarea
        maxlength="1024"
        rows="5"
        placeholder="Type message here ..."
        v-model="message"
      />
      <div v-if="previewUrl" class="previewBlock">
        <div>
          <img :src="previewUrl" alt="" v-if="isImagePreview">
          <img :src="attachedFileLogo" alt=""  v-else>
          <sup @click="resetFiles">X</sup>
        </div>
      </div>
      <div class="buttons">
        <label for="file" class="btn btn-success">
          <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Capa_1" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve" fill="#fff">
          <g><g><path d="M446.661,37.298c-49.731-49.731-130.641-49.731-180.372,0L76.378,227.208c-5.861,5.861-5.861,15.356,0,21.217    c5.861,5.861,15.356,5.861,21.217,0l189.91-189.91c36.865-36.836,101.073-36.836,137.938,0c38.023,38.023,38.023,99.901,0,137.924    l-265.184,268.17c-22.682,22.682-62.2,22.682-84.881,0c-23.4-23.4-23.4-61.467,0-84.867l254.576-257.577    c8.498-8.498,23.326-8.498,31.825,0c8.776,8.776,8.776,23.063,0,31.84L117.826,400.958c-5.06,5.06-5.06,16.156,0,21.217    c5.861,5.861,15.356,5.861,21.217,0l243.952-246.954c20.485-20.485,20.485-53.789,0-74.273c-19.839-19.839-54.449-19.81-74.258,0    L54.161,358.524c-34.826,34.826-34.826,92.474,0,127.301C71.173,502.837,93.781,512,117.825,512s46.654-9.163,63.651-26.174    L446.66,217.655C496.391,167.924,496.391,87.028,446.661,37.298z"/></g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g>
        </svg>
        </label>
        <input type="file" id="file" ref="file" v-on:change="onFileAttach()"/>
        <button @click="onSendMsg" class="btn btn-primary">
            Send
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import ChatItem from './ChatItem';

export default {
  name: 'Chat',
  data() {
    return {
      message: '',
      file: '',
      previewUrl: '',
      attachedFileLogo: '/images/attached_file.png',
      isImagePreview: false,
    };
  },
  components: {
    ChatItem,
  },
  props: {
    participants: {
      type: Array,
      default: () => [],
    },
    host: {
      type: Boolean,
      default: () => false,
    },
    messages: {
      type: Array,
      default: () => [],
    },
  },
  mounted() {
    this.$emit('messageRead');
  },
  computed: {},
  updated() {
      this.$nextTick(() => this.scrollToBottom());
  },
  watch: {
    messages(newMessages, oldMEssages) {
      console.log({ newMessages });
    },
  },
  methods: {
    closeChat() {
      this.$emit('closeChat', false);
    },
    onFileAttach(){
        this.file = this.$refs.file.files[0];
        this.isImagePreview = false;
        if (this.file['name'].match(/.(jpg|jpeg|png)$/i)) {
            this.isImagePreview = true
        }
        this.previewUrl = URL.createObjectURL(this.file);
    },
    async onSendFileMsg() {
        if (this.file) {
            const formData = new FormData()
            formData.append('attachment', this.file, this.file['name'])
            const _this = this;
            await axios.post("api/room/attach-file", formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            }).then(function (res) {
                _this.message = 'attached_file:' + res.data;
            });
            const participant = this.participants[0];
            const name = participant.identity.includes(' ')
                ? `${participant.identity.split(' ')[0][0]}${
                    participant.identity.split(' ')[1][0]
                }`.toUpperCase()
                : participant.identity.toUpperCase()[0];
            const date = new Date();
            this.$emit('pushMsg', {
                msg: _this.message,
                from: participant,
                time: date.toLocaleTimeString(),
                name,
            });
            participant.dataTracks.forEach(dataTrack => {
                dataTrack.track.send(
                    JSON.stringify({
                        type: 'CHAT_MSG',
                        msg: _this.message,
                        from: participant,
                        time: date.toLocaleTimeString(),
                        name,
                    })
                );
            });
            _this.message = '';
            this.$refs.file.value = '';
            this.file = '';
            this.previewUrl = '';
            this.isImagePreview = false;
        }
    },
    resetFiles() {
        this.$refs.file.value = null;
        this.previewUrl = '';
        this.isImagePreview = false;
    },
    onSendMsg() {
      if (this.message) {
        const participant = this.participants[0];
        const name = participant.identity.includes(' ')
          ? `${participant.identity.split(' ')[0][0]}${
              participant.identity.split(' ')[1][0]
            }`.toUpperCase()
          : participant.identity.toUpperCase()[0];
        const date = new Date();
        this.$emit('pushMsg', {
          msg: this.message,
          from: participant,
          time: date.toLocaleTimeString(),
          name,
        });
        participant.dataTracks.forEach(dataTrack => {
          dataTrack.track.send(
            JSON.stringify({
              type: 'CHAT_MSG',
              msg: this.message,
              from: participant,
              time: date.toLocaleTimeString(),
              name,
            })
          );
        });
        this.message = '';
      }

      this.onSendFileMsg();
    },
    scrollToBottom() {
        const chatContainer = this.$refs.chatContainer;
        chatContainer.scrollTop = chatContainer.scrollHeight;
    },
  },
};
</script>

<style lang="scss">
.chat-container {
  width: 400px;
  background-color: white;
  flex-shrink: 0;
  color: black;
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-height: 100vh;
  overflow: auto;

  &>div {
      width: 100%;
  }

  .buttons {
      display: flex;
      justify-content: space-between;
      align-items: center;

      #file {
         display: none;
      }

      label {
          height: 100%;
          width: 38px;
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0;
      }

      button {
          flex: 1;
      }
  }

  .previewBlock {
      display: flex;
      justify-content: center;
      margin: 15px 0;

      div {
          position: relative;
          border: 2px solid #80808057;
          padding: 5px;
          border-radius: 8px;

          sup {
              position: absolute;
              top: -8px;
              right: -8px;
              border: 1px solid red;
              color: #ff0000;
              border-radius: 50%;
              height: 16px;
              width: 16px;
              cursor: pointer;
              display: flex;
              align-items: center;
              background-color: #fffdfd;
              justify-content: center;
          }
      }
  }

  textarea {
    padding: 3px 10px;
    min-height: 80px;
    width: 100%;
  }

  .chatbox {
    flex-grow: 1;
    overflow: auto;

    .chat-item {
      display: flex;
      padding: 15px 15px;
      position: relative;

      .chat-item_avatar {
        margin: 7px 12px;
        width: 30px;
        height: 24px;
        border-radius: 6px;
        background-color: darkgrey;
      }

      .chat-item_message {
        padding: 12px 14px;
        background-color: #e7f1fd;
        border-radius: 16px;
        flex: 6;
        text-align: left;
        overflow-wrap: anywhere;
      }

      .chat-item_time {
        position: absolute;
        right: 15px;
        font-size: 12px;
        color: gray;
        top: 0;
      }
    }
  }

  .heading {
    font-size: 14px;
    font-weight: 700;
    border-top: 1px solid #eee;
    padding: 8px;
  }

  .close-btn {
    position: absolute;
    top: 5px;
    right: 10px;
    font-size: 12px;
    cursor: pointer;
    user-select: none;
  }

  .previewBlock {
      img {
          width: 50px;
      }
  }
}

@media (max-width: 768px) {
  .chat-container {
    position: fixed;
    left: 50%;
    transform: translate(-50%, -50%);
    top: 50%;
    width: 300px;
    border-radius: 10px;
    height: 90vh;

    .heading {
      border: none;
    }

    .participants-ul {
      padding: 30px 0;
    }
  }
}
</style>
