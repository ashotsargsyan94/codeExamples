export default function silenceConsole() {
    // silence console in production
    const console = {
        log: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        trace: () => {}
    };

    // Redefine the old console
    window.console = console;

    // We could capture errors and send them to the server for debugging?
    window.onerror = function(message, source, lineNo, colNo, error) {
        // TODO: Send data to server and store in DB

        // Example for what to send to server
        // console.log(`${message} ${source}:${lineNo}:${colNo}`);
        // console.log(`Stack: ${error.stack}`);

        // Return true to show error in console as normal, return false, to silence error
        return false;
    };
}