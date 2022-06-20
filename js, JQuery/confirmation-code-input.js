/**
 * Handle pasting of code
 * @param {*} event
 */
export function handleConfirmCodePaste(event) {
    event.preventDefault();
    const clipboardData = (event.originalEvent || event).clipboardData;
    const text = clipboardData.getData('text/plain');
    if (isNumber(text)) {
        const numbers = text.split('');
        const $confirmCode = $('.confirm-code');
        // set each input to its corresponding number
        $confirmCode.each((index) => {
            $confirmCode.eq(index).val(numbers[index]);
        });
        // put focus on last element
        $confirmCode.last().focus();
    }
}

/**
 *
 * @param {*} event
 * Don't allow invalid key presses
 */
export function preventInvalidKeys(event) {
    const key = event.which;
    // If key is not a number, don't allow input
    if (!keyIsAllowed(key)) {
        event.preventDefault();
        return false;
    }
}


/**
 * Advance to next input, erase previous input, etc.
 * @param {*} event
 */
export function handleConfirmCodeInput(event) {
    const $target = $(event.target);
    // advance to the next input
    const nextInput = $target.parent().next('li').find('input');
    if (nextInput && nextInput.length && $target.val()) {
        nextInput.focus();
    }
}

/**
 * Handle non-character keys, ex. arrow, backspace, enter
 * @param {*} event
 */
export function handleConfirmCodeActions(event) {
    const key = event.which;
    const $target = $(event.target);
    const backspaceKey = 8;
    const leftKey = 37;
    const rightKey = 39;
    const enterKey = 13;

    let prevInput = $target.parent().prev('li').find('input');
    let nextInput = $target.parent().next('li').find('input');


    // Handle non character input ex. arrow keys, backspace, etc.
    if (key === leftKey) {
        // If there is no input before this one, use this one
        if (!prevInput || !prevInput.length) {
            prevInput = $target;
        }
        return prevInput.select();
    }

    if (key === rightKey) {
        // if we are on the last input, use this one
        if (!nextInput || !nextInput.length) {
            nextInput = $target;
        }
        return nextInput.select();
    }

    // Erase previous input
    if (key === backspaceKey) {
        // If there is no input before this one, use this one
        if (!prevInput || !prevInput.length) {
            prevInput = $target;
        }

        // if we are on the last input
        if (!nextInput || !nextInput.length) {
            // if the last line is not empty, erase the current input
            if ($target.val() !== '') {
                return $target.val('');
            }
        }

        // Focus and erase previous input
        return prevInput.focus().val('');
    }

    // submit code
    if (key === enterKey) {
        $('#confirmCodeButton').click();
    }
}

export function onConfirmCodeClick(event) {
    $(event.target).select();
}

/**
 *
 * @param {number} key - event.which key code
 * If key is allowed to be inputted. Only concerned with keys that print actual characters
 * Ex. a-zA-z0-9, don't need to test backspace, arrow keys, etc.
 */
function keyIsAllowed(key) {
    const zeroKey = 48;
    const nineKey = 57;
    const numpadZeroKey = 96;
    const numpadNineKey = 105;
    if ((key >= zeroKey && key <= nineKey) || (key >= numpadZeroKey && key <= numpadNineKey)) {
        return true;
    }
    return false;
}

function isNumber(input) {
    return /^\d+$/.test(input);
}

$(function () {
    const $verifyConfirmationCode = $('#verifyConfirmationCode');
    $verifyConfirmationCode.on('paste', 'input', handleConfirmCodePaste);
    $verifyConfirmationCode.on('keydown', 'input', preventInvalidKeys);
    $verifyConfirmationCode.on('keyup', 'input', handleConfirmCodeActions);
    $verifyConfirmationCode.on('input', handleConfirmCodeInput);
    $verifyConfirmationCode.on('click', 'input', onConfirmCodeClick);
});
