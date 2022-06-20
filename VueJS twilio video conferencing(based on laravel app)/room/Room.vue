<template>
  <div class="d-flex h-100">
    <div class="room-container">
      <div class="header">
        <div class="loading-spinner" v-if="loading">
          <img class="loading-img" src="../../../images/loading.png" />
          <div>Joining Room...</div>
        </div>
        <div v-if="!loading" class="actions">
          <button @click="showRoomInfo = !showRoomInfo" class="icon-btn room_info-btn">
            <i class="room_info-icon"></i>
          </button>
        </div>
        <ViewMode
          v-if="!loading"
          :viewMode="viewMode"
          @changeViewMode="onChangeViewMode"
        />
        <div v-if="showRoomInfo" v-click-outside="hideRoomInfo" class="room-info">
          <!-- <div class="room_info-row title">

          </div>-->
          <div class="room_info-row id">
            <label>Room ID</label>
            {{ roomId }}
          </div>
          <!-- <div class="room_info-row host"></div> -->
          <div class="room_info-row passcode">
            <label>Passcode</label>
            {{ passcode }}
          </div>
          <div class="room_info-row room-link">
            <label>Meeting Link</label>
            <p>{{ roomLink }}</p>
          </div>
        </div>
      </div>
      <div class="row body">
        <Participants
           ref="refParticipants"
          :dominantSpeaker="pinnedParticipant ? pinnedParticipant : dominantSpeaker"
          :participants="participants"
          :isPinned="pinnedParticipant ? true : false"
          :viewMode="viewMode"
          @setPin="setPin"
        />
      </div>
      <div v-if="!loading" class="footer">
        <div class="footer-inner">
          <div class="footer__btns-container">
            <div class="footer-button-container">
              <button @click="muteAudio" v-if="audio" class="icon-btn join-audio-btn">
                <i class="audio_unmuted-icon"></i>
                Mute
              </button>
              <button @click="unmuteAudio" v-else class="icon-btn join-audio-btn">
                <i class="audio_muted-icon"></i>
                Unmute
              </button>
            </div>
            <div class="footer-button-container">
              <button @click="stopVideo" v-if="camera" class="icon-btn start-video-btn">
                <i class="stop_video-icon"></i>
                Stop Video
              </button>
              <button @click="startVideo" v-if="!camera" class="icon-btn start-video-btn">
                <i class="start_video-icon"></i>
                Start Video
              </button>
            </div>
            <div class="footer-button-container">
              <button
                @click="onCameraList"
                v-if="camera"
                class="icon-btn camera-options-btn"
              >
                <i class="fas fa-angle-up"></i>
              </button>
              <ul
                v-if="showCameraList"
                v-click-outside="() => (showCameraList = false)"
                class="camera-list"
              >
                <li class="heading">Select a Camera</li>
                <li
                  v-for="camera in cameras"
                  :key="camera.deviceId"
                  :class="{
                    'camera-item': true,
                    active: currentCameraId === camera.deviceId,
                  }"
                  @click="onChangeCamera(camera)"
                >
                  {{ camera.label }}
                </li>
              </ul>
            </div>
          </div>
          <div class="footer__btns-container">
            <button
              @click="showParticipantList(!participantList)"
              class="icon-btn participants-btn"
              v-bind:class="participantList ? 'on' : ''"
            >
              <i class="participant-icon"></i>
              Participants
            </button>
            <button
              @click="sharescreen"
              class="icon-btn screenshare-btn"
              v-bind:class="screenshare ? 'on' : ''"
            >
              <i class="screenshare-icon"></i>
              {{ screenshare ? 'Stop Sharing' : 'Share Screen' }}
            </button>
            <button @click="showChat(!chat)" class="icon-btn chat-btn">
              <i class="chat-icon"></i>
              Chat
              <div v-if="messageArrived" class="chat-notification"></div>
            </button>
          </div>
          <div>
            <button @click="endMeeting" class="leave-btn">End</button>
          </div>
        </div>
      </div>
    </div>
    <List
      v-if="participantList"
      :participants="participants"
      :host="host"
      @showParticipantList="showParticipantList"
    />
    <Chat
      v-if="chat"
      :messages="messages"
      :participants="participants"
      :host="host"
      :messageArrived="messageArrived"
      @closeChat="showChat"
      @pushMsg="pushMsg"
      @messageRead="() => (messageArrived = false)"
    />
      <div class="videoConfirmModal d-flex justify-content-center align-items-center w-100 position-absolute h-100" v-if="videoConfirmModal">
          <div class="d-flex bg-white justify-content-center align-items-center flex-column content-block">
              <div class="text-box text-center text-info">
                  Do you want to enable camera?
              </div>
              <div class=" w-100 d-flex justify-content-between">
                  <button v-on:click=" videoConfirmModal = false">No</button>
                  <button v-on:click="startVideo(), videoConfirmModal = false">Yes</button>
              </div>
          </div>
      </div>
  </div>
</template>

<script>
import Vue from 'vue';
import vClickOutside from 'v-click-outside';
import axios from 'axios';

import Participants from '../participants/Participants';
import List from '../participants/List';
import ViewMode from './ViewMode';
import Chat from '../chat/Chat';
import { viewModes } from '../../config';

import Twilio, {
  connect,
  createLocalTracks,
  createLocalTrackOptions,
  createLocalVideoTrack,
  createLocalAudioTrack,
  LocalVideoTrack,
  LocalDataTrack,
} from 'twilio-video';

export default {
  name: 'Video',
  data() {
    return {
      dominantSpeaker: null, // a participant with the loudest voice
      pinnedParticipant: null, // pinned Participant object or null
      loading: false,
      activeRoom: '', // Room object
      roomName: '',
      audio: false, // Your audio status in the footer
      camera: false, // Your camera status in the footer
      participants: [], // Array of all participants
      screenshare: false, // true: if screen is shared
      screenTrack: null, // media track of desktop
      participantList: false, // true if participant list is open
      showRoomInfo: false, // true if room info modal is open
      roomLink: '', // Public link to this room
      showCameraList: false, // true if video options is clicked
      cameras: [], // camera devices connected to the computer
      currentCameraId: '', // device id of current camera
      viewMode: viewModes.speaker, // View modes => default: Speaker mode
      oldViewMode: viewModes.speaker, // default: Speaker mode
      chat: false,
      messages: [],
      messageArrived: false,
      videoConfirmModal: false,
    };
  },
  components: {
    Participants,
    List,
    ViewMode,
    Chat,
  },
  directives: {
    clickOutside: vClickOutside.directive,
  },
  props: {
    // props that will be passed to this component
    username: {
      type: String,
      default: () => '',
    },
    roomId: {
      type: String|Number,
      default: () => '',
    },
    passcode: {
      type: String,
      default: () => '',
    },
    host: {
      type: Boolean,
      default: () => false,
    },
  },
  watch: {
    participants(newParticipants, oldParticipants) {
      this.dominantSpeaker = newParticipants[0];
    },
  },
  created() {
    this.createChat(this.roomId);
    window.addEventListener('beforeunload', this.leaveRoomIfJoined);
  },
  methods: {
    pushMsg(msg) {
      this.messages.push(msg);
    },
    setPin(participant) {
      console.log('participant', participant);
      this.pinnedParticipant = participant;
      // if (participant) this.dominantSpeaker = participant;
    },

    hideRoomInfo() {
      if (this.showRoomInfo) this.showRoomInfo = false;
    },

    // Generate access token
    async getAccessToken() {
      const token = await axios.get(`/api/access_token/${this.username}`);
      return token.data;
    },

    // Leave Room.
    leaveRoomIfJoined() {
      if (this.activeRoom) {
        this.activeRoom.disconnect();
      }
    },

    participantConnected(participant) {
      this.participants.push(participant);
    },

    // Create a new chat
    async createChat(room_name) {
      const _this = this;

      this.loading = true;

      this.getAccessToken().then(async data => {
        this.roomName = null;
        const token = data;
        let connectOptions = {
          name: room_name,
          dominantSpeaker: true,
          audio: false,
           video: {
              width:  1280,
              height:  720,
              frameRate: 24
          },
          bandwidthProfile: {
          video: {
              mode: 'collaboration',
              dominantSpeakerPriority: 'standard'
            }
          },
          maxAudioBitrate: 16000, //For music remove this line
          preferredVideoCodecs: [{ codec: 'VP8', simulcast: true }],
          networkQuality: {local:1, remote: 1}
        };

        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
          console.log('enumerateDevices() not supported.');
          return;
        }

        // List cameras and microphones.
        try {
          await (async () => {
            await navigator.mediaDevices.getUserMedia({
                video: {
                    width:  1280,
                    height:  720,
                    frameRate: 24
                },
                audio: false}).then(async () => {
                await navigator.mediaDevices.enumerateDevices().then((localDevices) => {
                    localDevices.forEach(function (device, index) {
                        if (device.kind === 'audioinput' && device.label !== '') {
                            connectOptions.audio = true;
                        }
                        if (device.kind === 'videoinput' && device.label !== '') {
                            connectOptions.video = true;
                            const {label, deviceId} = device;
                            if (!_this.currentCameraId) {
                                _this.currentCameraId = deviceId;
                            }
                        }
                    })
                })
            });
          })();
        } catch (err) {
          console.log(err.name + ': ' + err.message);
        }

        console.log('connectOptions: ', connectOptions);

        // before a user enters a new room,
        // disconnect the user from they joined already
        this.leaveRoomIfJoined();

        // remove any remote track when joining a new room
        this.tracks = [];

        Twilio.connect(token, connectOptions).then(async function(room) {
          _this.activeRoom = room;
          _this.roomName = room_name;
          _this.loading = false;

          _this.camera = connectOptions.video;
          _this.audio = connectOptions.audio;

          _this.participantConnected(room.localParticipant);

          const localDataTrack = new LocalDataTrack();
          if (_this.camera ) {
              _this.stopVideo();
              _this.videoConfirmModal = true
          }
          room.localParticipant.publishTrack(localDataTrack);
          console.log('Successfully joined a Room: ', room);
          // Attach the Tracks of all the remote Participants.
          room.participants.forEach(participant => {
            _this.participantConnected(participant);
          });

          // When a Participant joins the Room, log the event.
          room.on('participantConnected', function(participant) {
            _this.participantConnected(participant);
          });

          // When a Participant leaves the Room, detach its Tracks.
          room.on('participantDisconnected', function(participant) {
            _this.participants = _this.participants.filter(item => item !== participant);
            let instance = Vue.$toast.open(`${participant.identity} disconnected.`);
          });

          room.on('disconnected', function(room, error) {
            if (error) {
              console.log('Unexpectedly disconnected:', error);
            }
            room.localParticipant.tracks.forEach(function(publication) {
              if (publication.kind === 'video' || publication.kind === 'audio') {
                publication.track.stop();
                publication.track.detach();
              }
            });
          });

          room.on('dominantSpeakerChanged', function(dominantSpeaker) {
            console.log('dominantSpeakerChanged', dominantSpeaker);
            if (_this.participants.length === 2) {
                _this.dominantSpeaker = _this.participants.filter(item => item.sid !== room.localParticipant.sid)[0];
            } else {
                _this.dominantSpeaker = dominantSpeaker ?? _this.participants[0];
            }
            // if (!_this.pinnedParticipant)
          });

          room.localParticipant.on('trackEnabled', function(publication) {
            if (publication.kind === 'video') _this.camera = true;
            if (publication.kind === 'audio') _this.audio = true;
          });

          room.localParticipant.on('trackDisabled', function(publication) {
            if (publication.kind === 'video') _this.camera = false;
            if (publication.kind === 'audio') _this.audio = false;
          });

          room.on('trackMessage', function(message) {
            console.log({ message });
            const messageBody = JSON.parse(message);
            const { type } = messageBody;

            if (type === 'CHAT_MSG') {
              const { msg, from, to, time, name } = messageBody;
              _this.messages.push({ msg, from, time, name });
              _this.messageArrived = !_this.chat;
            } else {
              const { participant } = messageBody;
              if (type === 'ROOM_CONNECTED') {
                let instance = Vue.$toast.open(`${participant.identity} connected.`);
                if (_this.screenshare){
                    _this.activeRoom.localParticipant.dataTracks.forEach(dataTrack => {
                        dataTrack.track.send(
                            JSON.stringify({
                                type: 'SCREEN_SHARED',
                                participant:  _this.activeRoom.localParticipant,
                            })
                        );
                    });
                }
              }

              if (type === 'ROOM_DISCONNECTED') {
                let instance = Vue.$toast.open(`${participant.identity} disconnected.`);
              }

              if (type === 'SCREEN_SHARED') {
                  _this.activeRoom.participants.forEach(participantData => {
                    if (participantData.sid === participant.sid) {
                        _this.setPin(participantData);
                    }
                  });
                  _this.oldViewMode = _this.viewMode;
                  _this.viewMode = viewModes.speaker
              }

              if (type === 'STOP_SHARING') {
                  _this.setPin();
                  _this.viewMode = _this.oldViewMode
              }

              if (participant.sid === room.localParticipant.sid) {
                switch (type) {
                  case 'STOP_CAMERA':
                    room.localParticipant.videoTracks.forEach(publication =>
                      publication.track.disable()
                    );
                    break;
                  case 'START_CAMERA':
                    room.localParticipant.videoTracks.forEach(publication =>
                      publication.track.enable()
                    );
                    break;
                  case 'MUTE_AUDIO':
                    room.localParticipant.audioTracks.forEach(publication =>
                      publication.track.disable()
                    );
                    break;
                  case 'UNMUTE_AUDIO':
                    room.localParticipant.audioTracks.forEach(publication =>
                      publication.track.enable()
                    );
                    break;
                }
              }
            }
          });

          room.localParticipant.on('trackPublished', publication => {
            if (publication.kind === 'data') {
              console.log({ track: publication.track });
              publication.track.send(
                JSON.stringify({
                  type: 'ROOM_CONNECTED',
                  participant: room.localParticipant,
                })
              );
            }
          });
        });
      });
    },

    // Mute
    muteAudio() {
      this.activeRoom.localParticipant.audioTracks.forEach(publication => {
        publication.track.disable();
        publication.track.stop();
      });
      this.audio = false;
    },

    // Unmute
    unmuteAudio() {
      const _this = this;

      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        alert('No audio devices found!');
        return;
      }

      (async () => {
        try {
          const localDevices = await navigator.mediaDevices.enumerateDevices();
          localDevices.forEach(function(device) {
            if (device.kind === 'audioinput') {
              _this.audio = true;
            }
          });
          if (_this.audio) {
            if (_this.activeRoom.localParticipant.audioTracks) {
              _this.activeRoom.localParticipant.audioTracks.forEach(publication => {
                _this.activeRoom.localParticipant.unpublishTrack(publication.track);
              });
            }

            await createLocalAudioTrack().then(track => {
              _this.activeRoom.localParticipant.publishTrack(track);
            });
          } else {
            alert('No audio devices found!');
            return;
          }
        } catch (err) {
          console.log(err.name + ': ' + err.message);
        }
      })();
    },

    // Stop video
    stopVideo() {
      this.activeRoom.localParticipant.videoTracks.forEach(publication => {
        publication.track.disable();
        publication.track.stop();
      });
      this.camera = false;
    },

    // Start video
    startVideo() {
      const _this = this;

      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        alert('No camera devices found!');
        return;
      }

      (async () => {
        try {
          await navigator.mediaDevices.getUserMedia({
              video: {
                  width:  1280,
                  height:  720,
                  frameRate: 24
              },
              audio: false,
          }).then(async () =>{
            await navigator.mediaDevices.enumerateDevices().then(async (localDevices) => {
              localDevices.forEach(function(device) {
                if (device.kind === 'videoinput') {
                    _this.camera = true;
                }
              });
              if (_this.camera) {
                if (_this.activeRoom.localParticipant.videoTracks) {
                    _this.activeRoom.localParticipant.videoTracks.forEach(publication =>
                        _this.activeRoom.localParticipant.unpublishTrack(publication.track)
                    );
                }
                const localVideoTrack = await createLocalVideoTrack();
                await _this.activeRoom.localParticipant.publishTrack(localVideoTrack);
              } else {
                alert('No camera devices found!');
                return;
              }
            });
          })
        } catch (err) {
          console.log(err.name + ': ' + err.message);
        }
      })();
    },

    async onCameraList() {
      this.showCameraList = !this.showCameraList;
      this.cameras = [];
      try {
        const localDevices = await navigator.mediaDevices.enumerateDevices();
        localDevices.forEach(device => {
          if (device.kind === 'videoinput') {
            this.cameras.push({ label: device.label, deviceId: device.deviceId });
          }
        });
        console.log({ localDevices });
      } catch (err) {
        console.log(err.name + ': ' + err.message);
      }
    },

    onChangeCamera(camera) {
      const localParticipant = this.activeRoom.localParticipant;
      if (camera.deviceId) {
        this.currentCameraId = camera.deviceId;
        createLocalVideoTrack({ deviceId: { exact: camera.deviceId } }).then(function(
          localVideoTrack
        ) {
          localParticipant.videoTracks.forEach(publication => {
            localParticipant.unpublishTrack(publication.track);
          });

          localParticipant.publishTrack(localVideoTrack);
        });
      }
    },

    // Share screen
    async sharescreen() {
      const _this = this;

      if (!_this.screenshare) {
        navigator.mediaDevices.getDisplayMedia().then(stream => {
          const mediaStreamTrack = stream.getTracks()[0];

          mediaStreamTrack.onended = function() {
            _this.screenshare = true;
            _this.sharescreen();
            return;
          };

          const screenTrack = new LocalVideoTrack(mediaStreamTrack);

          _this.activeRoom.localParticipant.videoTracks.forEach(publication =>
            _this.activeRoom.localParticipant.unpublishTrack(publication.track)
          );
          _this.activeRoom.localParticipant.publishTrack(screenTrack);
          _this.screenTrack = screenTrack;
          _this.screenshare = true;
          _this.setPin(_this.activeRoom.localParticipant);
          _this.oldViewMode = _this.viewMode;
          _this.viewMode = viewModes.speaker;
          _this.activeRoom.localParticipant.dataTracks.forEach(dataTrack => {
              dataTrack.track.send(
                  JSON.stringify({
                      type: 'SCREEN_SHARED',
                      participant:  _this.activeRoom.localParticipant,
                  })
              );
          });
        });
      } else {
        _this.activeRoom.localParticipant.unpublishTrack(_this.screenTrack);
        _this.screenTrack.stop();
        _this.screenTrack = null;
        _this.screenshare = false;
        _this.viewMode = _this.oldViewMode;
        _this.setPin();
        _this.activeRoom.localParticipant.dataTracks.forEach(dataTrack => {
            dataTrack.track.send(
                JSON.stringify({
                    type: 'STOP_SHARING',
                    participant:  _this.activeRoom.localParticipant,
                })
            );
        });
        if (_this.camera) {
          createLocalVideoTrack().then(function(localTrack) {
            _this.activeRoom.localParticipant.publishTrack(localTrack);
          });
        } else {
            _this.$refs.refParticipants.$refs.refParticipant.camera = false;
        }
      }
    },

    // Show Participant List
    showParticipantList(view) {
      this.participantList = view;
      this.chat = false;
    },

    showChat(view) {
      this.chat = view;
      this.participantList = false;
    },

    // End Meeting
    endMeeting() {
      const _this = this;
      if (_this.activeRoom) {
        _this.activeRoom.localParticipant.tracks.forEach(function(publication) {
            if (publication.kind === 'data') {
            publication.track.send(
              JSON.stringify({
                type: 'ROOM_DISCONNECTED',
                participant: _this.activeRoom.localParticipant,
              })
            );
          }
        });
        _this.stopVideo();
        _this.muteAudio();
        _this.activeRoom.disconnect();
        _this.$router.push({ path: '/' });
      }
    },

    onChangeViewMode() {
      this.viewMode =
        this.viewMode === viewModes.speaker ? viewModes.grid : viewModes.speaker;
    },
  },
  mounted() {
    this.roomLink = `${location.origin}/#/join?roomId=${this.roomId}&passcode=${this.passcode}&join=2`;
  },
};
</script>

<style lang="scss">
@import './room.scss';

.videoConfirmModal {
    background-color: #0000008c;

    .content-block {
        padding: 25px;
        border-radius: 5px;

        button {
            cursor: pointer;
            transition: all 300ms linear;
            margin: 0 15px;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 100px;
            height: 35px;
            background: #caa053;
            color: #fff;
            font-size: 13px;
            font-family: "semi", sans-serif;
            text-align: center;
            padding: 0 20px 0;
            letter-spacing: 1px;
            white-space: nowrap;
            border: 0;
            border-radius: 7px;
            outline: none !important;
        }
    }

    .text-box {
        margin-bottom: 25px;
    }
}
</style>
