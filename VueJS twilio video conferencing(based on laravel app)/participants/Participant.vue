<template>
  <div
    :class="{
      participant: true,
      dominant: isDominantSpeaker,
      hasCamera: camera,
    }"
    ref="participant"
  >
    <div ref="tracks" class="tracks">
      <div v-if="camera" class="nickname">
          <p>{{ participant.identity }}</p>
      </div>
      <div ref="localVideoTrack" class="video"></div>
      <div ref="localAudioTrack" class="audio"></div>
    </div>
    <div v-if="!camera" class="no-camera">
<!--      <img v-if="avatar" v-bind:src="avatar" />-->
      <div class="logo" v-bind:style="{ backgroundColor: participantColor }">
        {{ nickname }}
      </div>
    </div>
    <div v-if="!audio" class="no-audio">
      <i class="audio_muted-icon"></i>
    </div>
    <div v-if="camera" class="actions">
      <button
        v-on:click="setPin"
        :class="{
          'pin-btn': true,
          active: pinned,
        }"
      >
        <i class="fas fa-thumbtack"></i>
        <div v-if="!pinned" class="tip">Set PIN</div>
        <div v-else class="tip">Remove PIN</div>
      </button>
      <button
        v-on:click="setFullScreen"
        :class="{ 'fullscreen-btn': true, active: fullscreen }"
      >
        <i v-if="!fullscreen" class="fullscreen-icon"></i>
        <i v-else class="unfullscreen-icon"></i>
        <div v-if="!fullscreen" class="tip">FullScreen</div>
        <div v-else class="tip">Exit FullScreen</div>
      </button>
    </div>
    <div v-if="!camera" class="actions">
      <span>{{ participant.identity }}</span>
    </div>
  </div>
</template>

<script>
import { stringToColor } from '../../utils';
import { DEFAULT_USER_COLOR } from '../../config';

export default {
  name: 'Participant',
  data() {
    return {
      camera: false,
      audio: false,
      nickname: JSON.parse(localStorage.getItem('member')) ? JSON.parse(localStorage.getItem('member')).username : null,
      localVideoTrack: null,
      localAudioTrack: null,
      pinned: this.isPinned, // true if this user is pinned
      fullscreen: false,
      participantColor: DEFAULT_USER_COLOR,
      avatar:  JSON.parse(localStorage.getItem('member')) ? JSON.parse(localStorage.getItem('member')).avatar : null,
    };
  },
  props: {
    participant: {
      type: Object,
      default: () => {},
    },
    isDominantSpeaker: {
      type: Boolean,
      default: () => false,
    },
    isPinned: {
      type: Boolean,
      default: () => false,
    },
  },
  watch: {
    participant(newParticipant, oldParticipant) {},
    localVideoTrack(newTrack, oldtrack) {
      this.$refs.localVideoTrack.innerHTML = '';
      if (newTrack) {
        if (newTrack.constructor.name === 'RemoteVideoTrackPublication') {
          this.$refs.localVideoTrack.appendChild(newTrack.track.attach());
        } else {
          this.$refs.localVideoTrack.appendChild(newTrack.attach());
        }
      } else {
        this.camera = false;
      }
    },
    localAudioTrack(newTrack, oldTrack) {
      this.$refs.localAudioTrack.innerHTML = '';
      if (newTrack) {
        if (newTrack.constructor.name === 'RemoteAudioTrackPublication' && newTrack.track) {
          this.$refs.localAudioTrack.appendChild(newTrack.track.attach());
        } else {
          this.$refs.localAudioTrack.appendChild(newTrack.attach());
        }
      } else {
        this.audio = false;
      }
    },
    isPinned(isPinned) {
        this.pinned = isPinned
    }
  },
  methods: {
    setPin() {
      this.pinned = !this.pinned;
      if (this.pinned) this.$emit('setPin', this.participant);
      else this.$emit('setPin', null);
    },
    setFullScreen() {
      this.fullscreen = !this.fullscreen;
      if (!this.fullscreen) {
        document.exitFullscreen();
        return;
      }
      this.$refs.participant.requestFullscreen();
      this.$refs.participant.addEventListener('fullscreenchange', event => {
        if (document.fullscreenElement) {
          this.$refs.participant.classList.add('fullscreen');
        } else {
          this.$refs.participant.classList.remove('fullscreen');
          this.fullscreen = false;
        }
      });
    },
  },
  created: function() {},
  mounted: function() {
    const identity = this.participant.identity;
    if (identity.includes(' ')) {
      const [firstName, lastName] = identity.split(' ');
      this.nickname = firstName.toUpperCase()[0] + lastName.toUpperCase()[0];
    } else {
      this.nickname = identity.toUpperCase()[0];
    }

    this.participantColor = stringToColor(this.participant.sid);

    // Track subscribed
    this.participant.on('trackSubscribed', track => {
      if (track.kind === 'video') {
        this.camera = track.isEnabled;
        this.localVideoTrack = track;
      }
      if (track.kind === 'audio') {
        this.audio = track.isEnabled;
        this.localAudioTrack = track;
      }
    });

    // Stop Video
    this.participant.on('trackDisabled', track => {
      if (track.kind === 'video') {
        this.camera = false;
        this.localVideoTrack = null;
      }
      if (track.kind === 'audio') {
        this.audio = false;
        this.localAudioTrack = null;
      }
    });

    this.participant.on('trackUnpublished', track  => {
        if (! track) {
            this.camera = false;
            this.audio = false;
        }
        if (track && track.kind === 'video') {
            this.camera = track.isEnabled;
            this.localVideoTrack = track;
        }
        if (track && track.kind === 'audio') {
            this.audio = track.isEnabled;
            this.localAudioTrack = track;
        }
    })

    this.participant.on('trackPublished', publication => {
      if (publication.kind === 'video') {
        this.camera = true;
      }
      if (publication.kind === 'audio') {
        this.audio = true;
      }

      if (publication.track && publication.track.kind === 'video') {
        this.localVideoTrack = publication.track;
      } else {
        publication.on('subscribed', track => {
          // this.$refs.tracks.appendChild(track.attach());
        });
      }
    });

    // Start Video
    this.participant.on('trackEnabled', track => {
      if (track.kind === 'video') {
        this.camera = true;
        this.localVideoTrack = track;
      }
      if (track.kind === 'audio') {
        this.audio = true;
        this.localAudioTrack = track;
      }
    });

    this.participant.tracks.forEach(publication => {
      if (publication.kind === 'video') {
        this.localVideoTrack = publication.track;
      }
      if (publication.kind === 'audio') {
        this.localAudioTrack = publication.track;
      }
    });

    // If Audio is turned on
    this.participant.audioTracks.forEach(publication => {
        this.audio = publication.isTrackEnabled
    });

    // If Video is turned on
    this.participant.videoTracks.forEach(publication => {
        this.camera = publication.isTrackEnabled
    });
  },
};
</script>

<style lang="scss">
.participant {
  display: block;
  position: relative;
  padding: 8px;
  order: 2;

  &.hasCamera{
      order: 1!important;
  }

  .actions {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    transition: all 300ms linear;
    opacity: 0;
    border-radius: 15px;
    padding: 20px 25px;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;

    button {
      display: flex;
      align-items: center;
      height: 40px;
      color: white;
      background-color: transparent;
      outline: 2px solid transparent;
      outline-offset: 1px;
      touch-action: manipulation;
      border-radius: 0;
      border: none;
      cursor: pointer;
      position: relative;
      margin-left: 5px;
      margin-right: 5px;

      &.pin-btn {
        font-size: 32px;
      }

      &.fullscreen-btn {
        i {
          display: inline-block;
          background: url(../../../images/wc_sprites2.png);
          background-size: 832px 768px;
        }

        .fullscreen-icon {
          background-position: -240px -16px;
          width: 32px;
          height: 32px;
        }

        .unfullscreen-icon {
          background-position: -296px -16px;
          width: 32px;
          height: 32px;
        }
      }

      .tip {
        position: absolute;
        transition: all 500ms linear;
        transform: translateX(-50%);
        left: 50%;
        white-space: pre;
        font-size: 14px;
        color: white;
        opacity: 0;
        top: 100%;
      }

      &:hover {
        .tip {
          opacity: 1;
        }
      }

      &.active {
        color: gray;
      }
    }
  }

  &:hover {
    .actions {
      opacity: 1;

      span {
        font-size: 20px;
        font-weight: 700;
      }
    }
  }

  &.dominant {
    border: 1px solid #289e88;
    border-radius: 5px;
    width: 100%;
    height: 100%;

    .tracks {
      .video {
        display: flex;
        justify-content: center;
        align-items: center;

        video {
          max-width: 100%;
          max-height: 100%;
          object-fit: cover;
          width: 100%;
          height: 100%;
          background-color: #2b2b2b;
        }

        .nickname {
          position: absolute;
          top: 8px;
          left: 8px;
          z-index: 1;
          padding: 2px 15px;
          background: #565656a1;
          font-size: 13px;

          p {
              margin-bottom: 0;
          }
        }
      }
    }
  }

  &.fullscreen {
    .actions {
      top: 15px;
      right: 15px;
      left: auto;
      transform: translate(0, 0);
    }

    .pin-btn {
      display: none;
    }
  }

  .no-camera {
    position: absolute;
    left: 6px;
    top: 6px;
    right: 6px;
    bottom: 6px;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #2b2b2b;
    border-radius: 5px;

    .logo {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 60px;
      user-select: none;
      @media (max-width: 1024px) {
          width: 50px;
          height: 50px;
          font-size: 30px;
      }
    }
    img {
        border-radius: 50%;
    }
  }

  .no-audio {
    display: inline-block;
    position: absolute;
    left: 15px;
    bottom: 15px;
    opacity: 0.7;
  }

  .tracks {
    height: 100%;

    .video {
      height: 100%;
      background-color: #2b2b2b;
      border-radius: 5px;
      position: relative;
    }

    video {
      max-width: 100%;
      max-height: 100%;
      object-fit: cover;
      width: 100%;
      height: 100%;
    }

    .nickname {
        position: absolute;
        top: 8px;
        left: 8px;
        z-index: 1;
        padding: 2px 15px;
        background: #565656a1;
        font-size: 13px;

        p {
            margin-bottom: 0;
        }
    }
  }
}
</style>
