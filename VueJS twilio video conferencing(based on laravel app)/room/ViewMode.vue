<template>
  <div class="view-modes">
    <button @click="showModes = !showModes" class="view-mode-btn">
      <i class="view-mode-icon" />
      View
    </button>
    <ul
      v-if="showModes"
      v-click-outside="() => {
        if (showModes)
          showModes = false;
      }"
    >
      <li @click="changeViewMode" :class="{
          active: viewMode === 1
        }">
        Speaker View
        <i class="speaker-view-icon" />
      </li>
      <li @click="changeViewMode" :class="{
          active: viewMode === 2
        }">
        Gallery View
        <i class="gallery-view-icon"></i>
      </li>
    </ul>
  </div>
</template>

<script>
import { viewModes } from '../../config';
import vClickOutside from 'v-click-outside';

export default {
  name: 'ViewMode',
  data() {
    return {
      showModes: false,
    };
  },
  props: {
    viewMode: {
      type: Number,
    },
  },
  directives: {
    clickOutside: vClickOutside.directive,
  },
  methods: {
    changeViewMode() {
      this.$emit('changeViewMode');
      this.showModes = false;
    },
  },
};
</script>

<style lang="scss">
.view-modes {
  position: absolute;
  top: 10px;
  right: 20px;

  .view-mode-btn {
    display: flex;
    align-items: center;
    cursor: pointer;
    border: none;
    background-color: transparent;
    color: #232333;
    border-radius: 7px;
    padding: 4px 8px;
    font-size: 13px;
    outline: none!important;
    position: relative;
    z-index: 1;

    &:hover {
      background-color: #383838;
      color: #fff;

      .view-mode-icon {
          filter: brightness(1);
      }
    }

    .view-mode-icon {
        margin-right: 4px;
        display: inline-block;
        cursor: pointer;
        width: 25px;
        height: 25px;
        background: url(../../../images/wc_sprites2.png);
        background-size: 592.2px 484.8px;
        background-position: -9px -70px;
        filter: brightness(0);
    }
  }

  ul {
    text-align: left;
    background: hsla(0, 0%, 9%, 0.9);
    font-size: 12px;
    left: auto;
    right: 0;
    top: 34px;
    border: 1px solid #747487;
    border-radius: 4px;
    position: absolute;
    float: left;
    min-width: 160px;
    padding: 5px 0;
    margin: 2px 0 0;
    list-style: none;
    z-index: 10;

    li {
      color: #ddd;
      padding: 5px 20px 5px 39px;
      position: relative;
      display: block;
      clear: both;
      font-weight: 400;
      line-height: 1.42857143;
      white-space: nowrap;
      cursor: pointer;

      &:hover {
        color: #ddd;
        background: hsla(0, 0%, 100%, 0.1);
      }

      &.active:before {
        content: '';
        width: 13px;
        height: 12px;
        position: absolute;
        left: 15px;
        top: 9px;
        display: inline-block;
        background: url(../../../images/wc_sprites.png);
        background-position: -386px -6px;
        background-size: 416px 384px;
      }

      i {
        position: absolute;
        right: 4px;
        top: 6px;
        margin-right: 4px;
        display: inline-block;
        cursor: pointer;
        width: 16px;
        height: 16px;
        background: url(../../../images/wc_sprites2.png);
        background-size: 499.2px 460.8px;
      }

      .speaker-view-icon {
        background-position: -11px -72px;
      }

      .gallery-view-icon {
        background-position: -39px -72px;
      }
    }
  }
}
</style>
