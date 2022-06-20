/**
 * SimpleTimer
 * Class implements simple stopwatch
 * Usage:
 * timer = new simpleTimer('#timerDiv');
 * timer.start();
 * timer.stop();
 * Alexander Vysokikh
 */

window.simpleTimer = function (timerSelector) {
    let callerTimerInterval = null,
        runningTimer = false,
        startTime = null,
        timerElement = $(timerSelector);

    return {
        start() {
            if (!runningTimer) {
                timerElement.html('0:00:00');
                timerElement.show();
                startTime = new Date().getTime();
                callerTimerInterval = setInterval(this.updateTimer, 1000);
                runningTimer = true;
            }
        },

        stop() {
            if (runningTimer) {
                clearInterval(callerTimerInterval);
                runningTimer = false;
            }
        },

        updateTimer() {
            let difference = (new Date().getTime() - startTime);

            timerElement.html(moment.utc(difference).format("H:mm:ss"));
        }
    }
};