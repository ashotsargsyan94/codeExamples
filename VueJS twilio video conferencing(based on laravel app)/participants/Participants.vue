<template>
  <div class="participant-container">
    <div v-if="dominantSpeaker && viewMode === 1" class="dominant-speaker">
      <Participant
        ref="refParticipant"
        :participant="dominantSpeaker"
        :isDominantSpeaker="true"
        :key="dominantSpeaker.sid"
        :isPinned="isPinned"
        v-on:setPin="setPin"
      />
    </div>
    <div
      :class="{
        'participant-view': true,
        grid: viewMode === 2,
      }"
    >
      <Participant
        v-for="participant in otherParticipants"
        :participant="participant"
        :isDominantSpeaker="participant.sid === dominantSpeaker.sid"
        :key="participant.sid"
        v-on:setPin="setPin"
      />
    </div>
  </div>
</template>

<script>
import { viewModes } from '../../config';
import Participant from './Participant';

export default {
  name: 'Participants',
  data() {
    return {};
  },
  components: {
    Participant,
  },
  watch: {
    participants(newParticipants, oldParticipants) {},
  },
  computed: {
    otherParticipants: function() {
      if (this.viewMode === viewModes.grid) return this.participants;
      if (this.dominantSpeaker) {
        return this.participants.filter(
          participant => participant.sid !== this.dominantSpeaker.sid
        );
      }
      return this.participants;
    },
  },
  methods: {
    setPin(participant) {
      this.$emit('setPin', participant);
    },
  },
  props: {
    participants: {
      type: Array,
      default: () => [],
    },
    dominantSpeaker: {
      type: Object,
      default: () => '',
    },
    isPinned: {
      type: Boolean,
      default: () => false,
    },
    viewMode: {
      type: Number,
    },
  },
};
</script>

<style lang="scss">
.participant-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: stretch;

  @media (max-width: 768px) {
    flex-direction: column-reverse;
    align-items: center;
  }

  .dominant-speaker {
    width: 70%;
    padding: 20px;

    @media (max-width: 768px) {
      width: 100%;
      height: 70%;
    }
  }

  .participant-view {
    width: 30%;
    padding: 20px;
    padding-left: 0;
    max-height: calc(100vh - 70px);
    overflow: auto;
    display: flex;
    flex-direction: column;

    @media (max-width: 768px) {
      max-height: auto;
      height: 30%;
      width: 100%;
      display: flex;
      flex-wrap: nowrap;
      overflow-x: scroll;
      flex-direction: row;
    }

    &.grid {
      width: 100%;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;

      @media (max-width: 768px) {
        height: 100%;
      }

      .participant {
        width: 33.33%;
        max-height: 50%;
      }
    }

    .participant {
      max-height: 33.3%;
      min-height: 33.3%;
      height: 100%;
      min-height: 120px;

      @media (max-width: 768px) {
        max-height: 100%;
        width: 50%;
        flex-shrink: 0;
      }
    }

    video {
      max-width: 100%;
      height: 100%;
    }
  }
}
</style>
