window.SquirrelLive = (function() {

    const {
        ENVIRONMENT,
        ANT_MEDIA_SERVER,
        ANT_MEDIA_MAX_BANDWIDTH
    } = window.app.constants;

    let state = {
      publishing: false,
      muted: false,
      video: true,
      selectedCam: '',
      selectedMic: '',
      selectedBandwidth: ANT_MEDIA_MAX_BANDWIDTH,
      slecetedPrevCam: '',
      streamId: undefined,
      settings: {
        websocketUrl: "wss://" + ANT_MEDIA_SERVER + "/websocket",
        pc_config: {
            'iceServers' : [ 
                {'urls':'stun:stun.l.google.com:19302'},
                {'urls':'stun:stun1.l.google.com:19302'},
                {'urls':'stun:stun2.l.google.com:19302'},
                {'urls':'stun:stun3.l.google.com:19302'},
                {'urls':'stun:stun4.l.google.com:19302'},
            ]
        },
        sdpConstraints: {
            OfferToReceiveAudio : false,
            OfferToReceiveVideo : false
        },
        mediaConstraints: {
            video : isMobile() ? {width: 720, height: 960} : true,
            audio : true
        },
        localVideoId: "publisher-video"
      }
    };

    let webRTCAdaptor = null;
    let screenShareSupported = false;
    let selectedMobileCam = "";

    const init = (publishStarted, publishFinished, parseAvailableDevices) => {
        webRTCAdaptor = new WebRTCAdaptor({
            websocket_url: state.settings.websocketUrl,
            mediaConstraints: state.settings.mediaConstraints,
            peerconnection_config: state.settings.pc_config,
            sdp_constraints: state.settings.sdpConstraints,
            localVideoId: state.settings.localVideoId,
            debug: ENVIRONMENT !== 'production',
            bandwidth: state.selectedBandwidth,
            callback : function(info, obj) {
                console.debug( info + " notification received");

                if (info == "initialized") {
                    $('#start_publish_button').attr('disabled',false);
                    $('#send_comment_button').attr('disabled',false);
                    $('#send_comment_textarea').attr('disabled',false);
                } else if (info == "publish_started") { 
                    state.streamId = obj.streamId;
                    publishStarted();
                } else if (info == "publish_finished") {
                    publishFinished();
                } else if (info == "closed") {
                    publishFinished();
                } else if (info == "browser_screen_share_supported") {
                    screenShareSupported = true;
                } else if (info == "available_devices") {
                    parseAvailableDevices(obj, screenShareSupported);
                } else {
                    console.debug( info + " notification received");
                }
            },
            callbackError : function(error) {
                let errorMessage = JSON.stringify(error);

                if (error.indexOf("NotFoundError") != -1) {
                    errorMessage = translate("Camera or Mic are not found or not allowed in your device");
                } else if (error.indexOf("NotReadableError") != -1 || error.indexOf("TrackStartError") != -1) {
                    errorMessage = translate("Camera or Mic is being used by some other process that does not let read the devices");
                } else if(error.indexOf("OverconstrainedError") != -1 || error.indexOf("ConstraintNotSatisfiedError") != -1) {
                    errorMessage = translate("There is no device found that fits your video and audio constraints. You may change video and audio constraints")
                } else if (error.indexOf("NotAllowedError") != -1 || error.indexOf("PermissionDeniedError") != -1) {
                    errorMessage = translate("You are not allowed to access camera and mic.");
                } else if (error.indexOf("TypeError") != -1) {
                    errorMessage = translate("Video/Audio is required");
                } else if (error.indexOf("ScreenSharePermissionDenied") != -1) {
                    errorMessage = translate("You have chosen either to cancel screen sharing or declined permission to share screen");			
                } else if (error.indexOf("WebSocketNotConnected") != -1) {
                    errorMessage = translate("WebSocket Connection is disconnected.");
                }

                $('#message-in-progress').html(errorMessage).show().css('fontSize','28px');

                showError(errorMessage);
            }
        });
    };

    const toggleMic = (mute) => {
        if (mute) {
            webRTCAdaptor.muteLocalMic();
        } else {
            webRTCAdaptor.unmuteLocalMic();
        }
    }

    const toggleCam = (turnOff) => {
        if (turnOff) {
            webRTCAdaptor.turnOffLocalCamera();
        } else {
            webRTCAdaptor.turnOnLocalCamera();
        }
    }

    const start = (streamId) => {
		webRTCAdaptor.publish(streamId, null);
    }

    const stop = (streamId) => {
        state.publishing = false;
        
        webRTCAdaptor.stop(streamId);
        webRTCAdaptor.closeWebSocket(streamId);
        webRTCAdaptor.closeStream();
    }

    const isLive = (streamId) => {
        const signallingState = webRTCAdaptor.signallingState(streamId);
        
        if (signallingState != null && signallingState != "closed") {
            const iceState = webRTCAdaptor.iceConnectionState(streamId);

            if (iceState != null && iceState != "failed" && iceState != "disconnected") {
                console.log(signallingState + ' ' + iceState);
                return true;
            }
        }

        console.error('streamId ' + streamId + ' has signallingState is ' + signallingState);

        return false;
    }

    const isPublishing = () => {
        return state.publishing;
    }

    const getStats = (streamId) => {
        console.debug(webRTCAdaptor.getStats(streamId));
    }

    const enableStats = (streamId) => {
        webRTCAdaptor.enableStats(streamId);
    }

    const onPublishPeerConnected = () => {
        state.publishing = true;
    }

    const onPublishPeerConnectionStopped = () => {
        state.publishing = false;
    }

    const onCameraChanged = (cameraId) => {
        if (state.selectedCam !== cameraId) {
            state.selectedCam = cameraId;

            if (cameraId == "screen") {
                webRTCAdaptor.switchDesktopCapture(state.streamId);
            } else if (cameraId == "screen_camera") {
                webRTCAdaptor.switchDesktopCaptureWithCamera(state.streamId);
            } else {
                webRTCAdaptor.switchVideoCameraCapture(state.streamId, cameraId);
            }
        }
    }
    
    const onMicrophoneChanged = (microphoneId) => {
        if (state.selectedMic !== microphoneId) {
            state.selectedMic = microphoneId;

            webRTCAdaptor.switchAudioInputSource(state.streamId, microphoneId);
        }
    }

    const onBandwidthChange = (bandwidth) => {
        if (state.selectedBandwidth !== bandwidth) {
            state.selectedBandwidth = bandwidth;

            if (typeof state.streamId !== 'undefined') {
                webRTCAdaptor.changeBandwidth(bandwidth, state.streamId);
            }
        }
    }

    const parseAvailableDevices = (devices, screenShareSupported) => {
        let label;
        let deviceLabel;
        let videoIndex = 0;
        let audioIndex = 0;

        let $videoSource = $('#videoSource');
        let $audioSource = $('#audioSource');

        devices.forEach(function(device) {
            if (device.kind == "videoinput") {
                label = 'Video';
                deviceLabel = device.label || `${label}_${videoIndex}`;
                $videoSource.append(`<option value="${device.deviceId}">${deviceLabel}</option>`);

                if (videoIndex == 0) {
                    state.selectedCam = device.deviceId;
                }

                videoIndex++;
            } else if (device.kind == "audioinput"){
                label = 'Audio';
                deviceLabel = device.label || `${label}_${audioIndex}`;
                $audioSource.append(`<option value="${device.deviceId}">${deviceLabel}</option>`);

                if (audioIndex == 0) {
                    state.selectedMic = device.deviceId;
                }

                audioIndex++;
            }
        });

        if (screenShareSupported) {
            $videoSource.append(`<option value="screen">` + translate('Screen Share') + `</option>`);
        }

        $(document).on('click', '#apply_settings', function() {
            $('.video-settings-popup').toggleClass('show');
            onBandwidthChange(parseInt($('#maxVideoBitrate').val()));
            onMicrophoneChanged($('#audioSource').val());
            onCameraChanged($('#videoSource').val());
        });
    }
  
    return {
        toggleMic: toggleMic,
        toggleCam: toggleCam,
        start: start,
        stop: stop,
        isLive: isLive,
        getStats: getStats,
        isPublishing: isPublishing,
        enableStats: enableStats,
        init: (callback) => {
            init(
                function() {
                    if (callback) callback();
                    onPublishPeerConnected();
                },
                onPublishPeerConnectionStopped,
                parseAvailableDevices
            );
        },
    };
} ());
