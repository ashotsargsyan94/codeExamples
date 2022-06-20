<template>
  <div class="participants-list">
    <h2 class="heading">Participants ({{ participants.length }})</h2>
    <ul class="participants-ul">
      <li
        class="participants-li"
        v-for="(participant, index) in participants"
        :key="participant.sid"
      >
        <div class="info">
          <div class="avatar" v-bind:style="{ backgroundColor: colors[index] }">
            {{
              participant.identity.includes(' ')
                ? `${participant.identity.split(' ')[0][0]}${
                    participant.identity.split(' ')[1][0]
                  }`.toUpperCase()
                : participant.identity.toUpperCase()[0]
            }}
          </div>
          <div class="name">
            {{ participant.identity }}{{ index === 0 ? ' (Me)' : '' }}
          </div>
        </div>
        <div v-if="status.length" class="status">
          <div class="participants-icon__icon-box">
            <i v-if="status[index].audio" class="unmuted"></i>
            <i v-else class="muted"></i>
          </div>
          <div class="participants-icon__icon-box">
            <i v-if="status[index].video" class="video-started"></i>
            <i v-else class="video-stopped"></i>
          </div>
        </div>
        <div v-if="host && status.length" class="actions">
          <button
            v-if="status[index].audio"
            @click="muteParticipantAudio(participant, index === 0)"
          >
            Mute
          </button>
          <button v-else @click="unmuteParticipantAudio(participant, index === 0)">
            Unmute
          </button>
          <button
            v-if="status[index].video"
            @click="stopParticipantCamera(participant, index === 0)"
          >
            Stop Camera
          </button>
          <button v-else @click="startParticipantCamera(participant, index === 0)">
            Start Camera
          </button>
        </div>
      </li>
    </ul>
    <div @click="hideParticipantList" class="close-btn">X</div>
  </div>
</template>

<script>
import { stringToColor } from '../../utils';

export default {
  name: 'ParticipantList',
  data() {
    return {
      status: [],
      colors: [],
    };
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
  },
  mounted() {
    this.updateStatus();

    this.participants.forEach(participant => {
      participant.on('trackEnabled', publication => this.updateStatus());
      participant.on('trackDisabled', publication => this.updateStatus());
    });
  },
  computed: {},
  watch: {
    participants: function(newParticipants, oldParticipants) {
      this.updateStatus();
      newParticipants.forEach(participant => {
        participant.on('trackEnabled', publication => this.updateStatus());
        participant.on('trackDisabled', publication => this.updateStatus());
      });
    },
  },
  methods: {
    updateStatus() {
      this.status = this.participants.map(participant => {
        let audio = false;
        let video = false;
        if (participant.audioTracks) {
          participant.audioTracks.forEach(publication => {
            if (publication.isTrackEnabled) {
              audio = true;
            }
          });
        }
        if (participant.videoTracks) {
          participant.videoTracks.forEach(publication => {
            if (publication.isTrackEnabled) {
              video = true;
            }
          });
        }
        return { audio, video };
      });
      this.colors = this.participants.map(participant => stringToColor(participant.sid));
    },
    muteParticipantAudio(participant, isHost) {
      if (isHost) {
        participant.audioTracks.forEach(publication => {
          publication.track.disable();
        });
      } else {
        const hostParticipant = this.participants[0];
        console.log({ participant });
        hostParticipant.dataTracks.forEach(dataTrack => {
          dataTrack.track.send(
            JSON.stringify({
              type: 'MUTE_AUDIO',
              participant: participant,
            })
          );
        });
      }
    },

    unmuteParticipantAudio(participant, isHost) {
      if (isHost) {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
          alert('No audio devices found!');
          return;
        }

        participant.audioTracks.forEach(publication => {
          publication.track.enable();
        });
      } else {
        const hostParticipant = this.participants[0];
        hostParticipant.dataTracks.forEach(dataTrack => {
          dataTrack.track.send(
            JSON.stringify({
              type: 'UNMUTE_AUDIO',
              participant: participant,
            })
          );
        });
      }
    },

    startParticipantCamera(participant, isHost) {
      if (isHost) {
        participant.videoTracks.forEach(publication => {
          publication.track.enable();
        });
      } else {
        const _this = this;
        const hostParticipant = this.participants[0];
        hostParticipant.dataTracks.forEach(dataTrack => {
          dataTrack.track.send(
            JSON.stringify({
              type: 'START_CAMERA',
              participant: participant,
            })
          );
        });
      }
    },

    stopParticipantCamera(participant, isHost) {
      if (isHost) {
        participant.videoTracks.forEach(publication => {
          publication.track.disable();
        });
      } else {
        const _this = this;
        const hostParticipant = this.participants[0];
        hostParticipant.dataTracks.forEach(dataTrack => {
          dataTrack.track.send(
            JSON.stringify({
              type: 'STOP_CAMERA',
              participant: participant,
            })
          );
        });
      }
    },

    hideParticipantList() {
      this.$emit('showParticipantList', false);
    },
  },
};
</script>

<style lang="scss">
.participants-list {
  width: 400px;
  background-color: white;
  flex-shrink: 0;
  color: black;
  position: relative;

  .heading {
    font-size: 14px;
    font-weight: 700;
    border-top: 1px solid #eee;
    padding: 8px;
  }

  .participants-ul {
    font-weight: 400;
    position: relative;
    font-size: 12px;
    line-height: 18px;
    padding: 0;
    text-align: left;
    list-style: outside none none;
    margin-bottom: 0;
    max-height: 100%;

    .participants-li {
      padding: 5px 10px 5px 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: relative;

      .info {
        display: flex;
        align-items: center;

        .avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background-color: black;
          font-weight: bold;
          margin-right: 6px;
          font-size: 12px;
          color: white;
          display: flex;
          justify-content: center;
          align-items: center;
        }
      }

      .status {
        display: flex;
        align-items: center;
      }

      .participants-icon__icon-box {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 26px;

        i {
          display: inline-block;
          background: url(../../../images/wc_sprites.png) no-repeat;
          background-size: 416px 384px;
        }

        .unmuted {
          width: 12px;
          height: 20px;
          background-position: -102px -98px;
        }

        .muted {
          width: 21px;
          height: 21px;
          background-position: -121px -98px;
        }

        .video-stopped {
          width: 23px;
          height: 20px;
          background-position: -310px -184px;
        }

        .video-started {
          width: 23px;
          height: 16px;
          background-position: -286px -184px;
        }
      }

      .actions {
        position: absolute;
        left: auto;
        right: 0;
        top: 5px;
        bottom: 5px;
        display: flex;
        opacity: 0;
        transition: 300ms all ease;

        button {
          background-color: #0e71eb;
          border: 1px solid #0e71eb;
          border-radius: 5px;
          margin-left: 5px;
          color: white;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }
      }

      &:hover {
        .actions {
          opacity: 1;
        }
      }
    }
  }

  .close-btn {
    position: absolute;
    top: 5px;
    right: 10px;
    font-size: 12px;
    cursor: pointer;
    user-select: none;
  }
}

@media (max-width: 768px) {
  .participants-list {
    position: fixed;
    left: 50%;
    transform: translate(-50%, -50%);
    top: 50%;
    width: 300px;
    border-radius: 10px;

    .heading {
      border: none;
    }

    .participants-ul {
      padding: 30px 0;
    }
  }
}
</style>
