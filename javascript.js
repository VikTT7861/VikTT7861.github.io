let lastEntryTimestamp = null;
let popupWindow = null;
let timerInterval = null;
let startTime = null;
let casesCount = parseInt(localStorage.getItem('casesCount')) || 0;
let entryCount = parseInt(localStorage.getItem('entryCount')) || 0;
let acctSumTotalTime = 0;
let acctSumStartTime = null;
let acctSumIntervalTimer = null;
let timerRecords = [];
let acctSumDisplayInterval = null;

function updateButtonStates(selectedButtons) {
    const buttons = {
        BR: document.querySelector('input[value="BR"]'),
        CA: document.querySelector('input[value="CA"]'),
        CN: document.querySelector('input[value="CN"]'),
        OOC: document.querySelector('input[value="OOC"]'),
        SU: document.querySelector('input[value="SU"]'),
        T2: document.querySelector('input[value="T2"]'),
        T3: document.querySelector('input[value="T3"]'),
        CTC: document.querySelector('input[value="CTC"]')
    };

    function blockButton(button) {
        if (button) {
            button.disabled = true;
            button.checked = false;
            button.parentElement.style.opacity = '0.5';
            button.parentElement.style.cursor = 'not-allowed';
        }
    }

    function unblockButton(button) {
        if (button) {
            button.disabled = false;
            button.parentElement.style.opacity = '1';
            button.parentElement.style.cursor = 'pointer';
        }
    }

    // Reset all buttons first
    Object.values(buttons).forEach(unblockButton);

    // Apply rules based on selected buttons
    if (selectedButtons.includes('BR')) {
        blockButton(buttons.CA);
        blockButton(buttons.CN);

        if (selectedButtons.includes('OOC')) {
            if (selectedButtons.includes('SU')) {
                if (selectedButtons.includes('T2')) {
                    blockButton(buttons.T3);
                } else if (selectedButtons.includes('T3')) {
                    blockButton(buttons.T2);
                }
            }
        }
    }

    // Similar patterns for CA and CN...
    if (selectedButtons.includes('CA')) {
        blockButton(buttons.BR);
        blockButton(buttons.OOC);
        blockButton(buttons.CN);

        if (selectedButtons.includes('SU')) {
            if (selectedButtons.includes('T2')) {
                blockButton(buttons.T3);
            } else if (selectedButtons.includes('T3')) {
                blockButton(buttons.T2);
            }
        }
    }

    if (selectedButtons.includes('CN')) {
        blockButton(buttons.CA);
        blockButton(buttons.BR);

        if (selectedButtons.includes('OOC')) {
            if (selectedButtons.includes('SU')) {
                if (selectedButtons.includes('T2')) {
                    blockButton(buttons.T3);
                } else if (selectedButtons.includes('T3')) {
                    blockButton(buttons.T2);
                }
            }
        }
    }

    // Save current state
    localStorage.setItem('buttonStates', JSON.stringify(selectedButtons));
}

function restoreButtonStates() {
    const savedStates = JSON.parse(localStorage.getItem('buttonStates')) || [];
    if (savedStates.length > 0) {
        savedStates.forEach(value => {
            const button = document.querySelector(`input[value="${value}"]`);
            if (button) button.checked = true;
        });
        updateButtonStates(savedStates);
    }
}

function handleTimerButtonStates() {
    const timerRunning = localStorage.getItem('timerStarted');
    const selectedButtons = Array.from(document.querySelectorAll('input[name="taskType"]:checked'))
        .map(cb => cb.value);

    if (timerRunning) {
        if (selectedButtons.includes('BR') && selectedButtons.includes('CTC')) {
            // Block all except OOC
            document.querySelectorAll('input[name="taskType"]').forEach(cb => {
                if (cb.value !== 'OOC') {
                    cb.disabled = true;
                    cb.parentElement.style.opacity = '0.5';
                    cb.parentElement.style.cursor = 'not-allowed';
                }
            });
        }

        // Handle Acct Sum case
        const acctSumSelected = document.getElementById('accsum').checked;
        if (acctSumSelected) {
            // Block all buttons
            document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                cb.disabled = true;
                cb.parentElement.style.opacity = '0.5';
                cb.parentElement.style.cursor = 'not-allowed';
            });
        }
    }
}

function saveCTCState() {
    const state = {
        ctcActive: document.querySelector('input[value="CTC"]').checked,
        selectedWithCTC: Array.from(document.querySelectorAll('input[name="taskType"]:checked')).map(cb => cb.value),
        blockedWithCTC: Array.from(document.querySelectorAll('input[name="taskType"]:disabled')).map(cb => cb.value)
    };
    localStorage.setItem('ctcState', JSON.stringify(state));
}

function restoreCTCState() {
    const savedState = localStorage.getItem('ctcState');
    if (!savedState) return;

    const state = JSON.parse(savedState);
    if (state.ctcActive) {
        // Restore selections
        state.selectedWithCTC.forEach(value => {
            const cb = document.querySelector(`input[name="taskType"][value="${value}"]`);
            if (cb) cb.checked = true;
        });

        // Restore blocked state
        state.blockedWithCTC.forEach(value => {
            const cb = document.querySelector(`input[name="taskType"][value="${value}"]`);
            if (cb) {
                cb.disabled = true;
                cb.parentElement.style.opacity = '0.5';
                cb.parentElement.style.cursor = 'not-allowed';
            }
        });

        // Block Acct Sum
        const acctSumCheckbox = document.getElementById('accsum');
        if (acctSumCheckbox) {
            acctSumCheckbox.checked = false;
            acctSumCheckbox.disabled = true;
            acctSumCheckbox.parentElement.style.opacity = '0.5';
            acctSumCheckbox.parentElement.style.cursor = 'not-allowed';
        }
    }
}

function handleQueueDeselectionWithCTC() {
    const queueCheckboxes = document.querySelectorAll('input[name="taskType"]');
    const ctcCheckbox = document.querySelector('input[value="CTC"]');
    const brCheckbox = document.querySelector('input[value="BR"]');
    const caCheckbox = document.querySelector('input[value="CA"]');
    const cnCheckbox = document.querySelector('input[value="CN"]');

    queueCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('click', function (e) {
            const timerRunning = localStorage.getItem('timerStarted');

            if (timerRunning && ctcCheckbox.checked) {
                if (this.value === 'BR' && !this.checked) {
                    e.preventDefault();
                    showQueueSelectionPopup('BR', ['CA', 'CN']);
                }
                else if (this.value === 'CA' && !this.checked) {
                    e.preventDefault();
                    showQueueSelectionPopup('CA', ['BR', 'CN']);
                }
                else if (this.value === 'CN' && !this.checked) {
                    e.preventDefault();
                    showQueueSelectionPopup('CN', ['BR', 'CA']);
                }
            }
        });
    });
}

function showQueueSelectionPopup(currentQueue, options) {
    const warningPopup = document.createElement('div');
    warningPopup.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: #232f3e;
        border: 2px solid #ff9900;
        padding: 20px;
        border-radius: 5px;
        z-index: 9999;
        color: white;
        text-align: center;
        min-width: 300px;
        box-shadow: 0 0 10px rgba(0,0,0,0.5);
    `;

    const optionsHTML = options.map(option => `
        <div class="option-container" style="margin: 10px 0;">
            <button onclick="selectQueueOption('${currentQueue}', '${option}')" style="
                background-color: #0066cc;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 4px;
                cursor: pointer;
                font-weight: bold;
                width: 100px;
                margin: 5px;
            ">${option}</button>
        </div>
    `).join('');

    warningPopup.innerHTML = `
        <h3 style="color: #ff9900; margin-top: 0;">🚨 WARNING!! 🚨</h3>
        <p>⚠️ ${currentQueue} cannot be deselected until you select another option.</p>
        <p style="color: #00ff00;">Please select one of the following options:</p>
        ${optionsHTML}
        <button onclick="this.parentElement.remove()" style="
            background-color: #ff9900;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            margin-top: 15px;
        ">Cancel</button>
    `;

    document.body.appendChild(warningPopup);

    // Play warning sound
    const audio = new Audio('data:audio/wav;base64,//uQRAAAAWMSLwULwUIYAAsYkXgoQwAEaYLWfkWgAI0wWs/ItAAAGDgYtAgAyN+QWaAAihwMWm4G8QQRDiMcCBcH3Cc+CDv/7xA4Tvh9Rz/y8QADBwMWgQAZG/ILNAARQ4GLTcDeIIIhxGOBAuD7hOfBB3/94gcJ3w+o5/5eIAIAAAVwWgQAVQ2ORaIQwEMAJiDg95G4nQL7mQVWI6GwRcfsZAcsKkJvxgxEjzFUgfHoSQ9Qq7KNwqHwuB13MA4a1q/DmBrHgPcmjiGoh//EwC5nGPEmS4RcfkVKOhJf+WOgoxJclFz3kgn//dBA+ya1GhurNn8zb//9NNutNuhz31f////9vt///z+IdAEAA**********************GAExBwe8jcToF9zIKrEdDYIuP2MgOWFSE34wYiR5iqQPj0JIeoVdlG4VD4XA67mAcNa1fhzA1jwHuTRxDUQ//iYBczjHiTJcIuPyKlHQkv/LHQUYkuSi57yQT//uggfZNajQ3Vmz+Zt//+mm3Wm3Q576v////+32///5/EOgAAADVghQAAAAA==');
    audio.play();
}

// Add this function to handle queue option selection
function selectQueueOption(currentQueue, selectedOption) {
    const currentCheckbox = document.querySelector(`input[value="${currentQueue}"]`);
    const selectedCheckbox = document.querySelector(`input[value="${selectedOption}"]`);

    if (currentCheckbox && selectedCheckbox) {
        // Uncheck current queue and check selected option
        currentCheckbox.checked = false;
        selectedCheckbox.checked = true;

        // Remove the popup
        const warningPopup = document.querySelector('div[style*="position: fixed"]');
        if (warningPopup) {
            warningPopup.remove();
        }

        // Re-enable all checkboxes first
        const queueCheckboxes = document.querySelectorAll('input[name="taskType"]');
        queueCheckboxes.forEach(cb => {
            cb.disabled = false;
            cb.style.pointerEvents = 'auto';
            cb.parentElement.style.opacity = '1';
            cb.parentElement.style.cursor = 'pointer';
        });

        // Trigger change event to apply new conditions
        const event = new Event('change');
        selectedCheckbox.dispatchEvent(event);
    }
}

// Add to your global scope to make it available to the onclick handlers
window.selectQueueOption = selectQueueOption;

function handleCTCDeselection() {
    const ctcCheckbox = document.querySelector('input[value="CTC"]');

    ctcCheckbox.addEventListener('click', function (e) {
        // Check if timer is running
        const timerRunning = localStorage.getItem('timerStarted');

        // If timer is running and trying to uncheck CTC
        if (timerRunning && !ctcCheckbox.checked) {
            e.preventDefault(); // Prevent checkbox from being unchecked

            // Show warning popup
            const warningPopup = document.createElement('div');
            warningPopup.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background-color: #232f3e;
                border: 2px solid #ff9900;
                padding: 20px;
                border-radius: 5px;
                z-index: 9999;
                color: white;
                text-align: center;
                min-width: 300px;
                box-shadow: 0 0 10px rgba(0,0,0,0.5);
            `;

            warningPopup.innerHTML = `
                <h3 style="color: #ff9900; margin-top: 0;">🚨 WARNING!! 🚨</h3>
                <p>⚠️ CTC option cannot be deselected while timer is running!</p>
                <p>Please stop the timer first.</p>
                <button onclick="this.parentElement.remove()" style="
                    background-color: #ff9900;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: bold;
                ">OK</button>
            `;

            document.body.appendChild(warningPopup);

            // Play warning sound
            const audio = new Audio('data:audio/wav;base64,//uQRAAAAWMSLwULwUIYAAsYkXgoQwAEaYLWfkWgAI0wWs/ItAAAGDgYtAgAyN+QWaAAihwMWm4G8QQRDiMcCBcH3Cc+CDv/7xA4Tvh9Rz/y8QADBwMWgQAZG/ILNAARQ4GLTcDeIIIhxGOBAuD7hOfBB3/94gcJ3w+o5/5eIAIAAAVwWgQAVQ2ORaIQwEMAJiDg95G4nQL7mQVWI6GwRcfsZAcsKkJvxgxEjzFUgfHoSQ9Qq7KNwqHwuB13MA4a1q/DmBrHgPcmjiGoh//EwC5nGPEmS4RcfkVKOhJf+WOgoxJclFz3kgn//dBA+ya1GhurNn8zb//9NNutNuhz31f////9vt///z+IdAEAA**********************GAExBwe8jcToF9zIKrEdDYIuP2MgOWFSE34wYiR5iqQPj0JIeoVdlG4VD4XA67mAcNa1fhzA1jwHuTRxDUQ//iYBczjHiTJcIuPyKlHQkv/LHQUYkuSi57yQT//uggfZNajQ3Vmz+Zt//+mm3Wm3Q576v////+32///5/EOgAAADVghQAAAAA==');
            audio.play();
        }
    });
}

function blockCTCDuringAcctSum(block) {
    const ctcCheckbox = document.querySelector('input[value="CTC"]');
    if (ctcCheckbox) {
        ctcCheckbox.disabled = block;
        ctcCheckbox.parentElement.style.opacity = block ? '0.5' : '1';
        ctcCheckbox.parentElement.style.cursor = block ? 'not-allowed' : 'pointer';
        if (block) ctcCheckbox.checked = false;
    }
}

function handleQueueAndAcctSumSelection() {
    const queueCheckboxes = document.querySelectorAll('input[name="taskType"]');
    const acctSumCheckbox = document.getElementById('accsum');
    const ctcCheckbox = document.querySelector('input[value="CTC"]');

    // Initial state check
    function updateAcctSumState() {
        const anyQueueSelected = Array.from(queueCheckboxes).some(cb => cb.checked);
        const isCTCSelected = ctcCheckbox.checked
        updateCheckboxState(acctSumCheckbox, !anyQueueSelected || isCTCSelected);
    }

    // Helper function to update checkbox state
    function updateCheckboxState(checkbox, disabled) {
        checkbox.disabled = disabled;
        checkbox.parentElement.style.opacity = disabled ? '0.5' : '1';
        checkbox.parentElement.style.cursor = disabled ? 'not-allowed' : 'pointer';
        if (disabled) checkbox.checked = false;
    }

    // Add listeners to all queue checkboxes
    queueCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            updateAcctSumState();
        });
    });

    // Special listener for CTC checkbox
    ctcCheckbox.addEventListener('change', () => {
        if (ctcCheckbox.checked) {
            updateCheckboxState(acctSumCheckbox, true);
        } else {
            updateAcctSumState(); // Recheck state based on other selections
        }
    });

    // Initial state setup
    updateAcctSumState();
}

function handleQueueSelection() {
    const queueCheckboxes = document.querySelectorAll('input[name="taskType"]');
    const brCheckbox = document.querySelector('input[value="BR"]');
    const cnCheckbox = document.querySelector('input[value="CN"]');
    const caCheckbox = document.querySelector('input[value="CA"]');
    const oocCheckbox = document.querySelector('input[value="OOC"]');
    const suCheckbox = document.querySelector('input[value="SU"]');
    const ctcCheckbox = document.querySelector('input[value="CTC"]');
    const t2Checkbox = document.querySelector('input[value="T2"]');
    const t3Checkbox = document.querySelector('input[value="T3"]');

    function updateCheckboxState(checkbox, disabled) {
        checkbox.disabled = disabled;
        checkbox.parentElement.style.opacity = disabled ? '0.5' : '1';
        checkbox.parentElement.style.cursor = disabled ? 'not-allowed' : 'pointer';
        if (disabled) checkbox.checked = false;
    }

    function showWarningPopup(message) {
        const warningPopup = document.createElement('div');
        warningPopup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: #232f3e;
            border: 2px solid #ff9900;
            padding: 20px;
            border-radius: 5px;
            z-index: 9999;
            color: white;
            text-align: center;
            min-width: 300px;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
        `;

        warningPopup.innerHTML = `
            <h3 style="color: #ff9900; margin-top: 0;">🚨 WARNING!! 🚨</h3>
            <p>${message}</p>
            <button onclick="this.parentElement.remove()" style="
                background-color: #ff9900;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                font-weight: bold;
            ">OK</button>
        `;

        document.body.appendChild(warningPopup);
        const audio = new Audio('data:audio/wav;base64,//uQRAAAAWMSLwULwUIYAAsYkXgoQwAEaYLWfkWgAI0wWs/ItAAAGDgYtAgAyN+QWaAAihwMWm4G8QQRDiMcCBcH3Cc+CDv/7xA4Tvh9Rz/y8QADBwMWgQAZG/ILNAARQ4GLTcDeIIIhxGOBAuD7hOfBB3/94gcJ3w+o5/5eIAIAAAVwWgQAVQ2ORaIQwEMAJiDg95G4nQL7mQVWI6GwRcfsZAcsKkJvxgxEjzFUgfHoSQ9Qq7KNwqHwuB13MA4a1q/DmBrHgPcmjiGoh//EwC5nGPEmS4RcfkVKOhJf+WOgoxJclFz3kgn//dBA+ya1GhurNn8zb//9NNutNuhz31f////9vt///z+IdAEAA**********************GAExBwe8jcToF9zIKrEdDYIuP2MgOWFSE34wYiR5iqQPj0JIeoVdlG4VD4XA67mAcNa1fhzA1jwHuTRxDUQ//iYBczjHiTJcIuPyKlHQkv/LHQUYkuSi57yQT//uggfZNajQ3Vmz+Zt//+mm3Wm3Q576v////+32///5/EOgAAADVghQAAAAA==');
        audio.play();
    }

    queueCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function () {
            if (this.checked) {
                switch (this.value) {
                    case 'BR':
                        updateCheckboxState(cnCheckbox, true);
                        updateCheckboxState(caCheckbox, true);
                        break;

                    case 'OOC':
                        if (!brCheckbox.checked && cnCheckbox.checked) {
                            this.checked = true;
                            return;
                        } else
                            if (!cnCheckbox.checked && brCheckbox.checked) {
                                this.checked = true;
                                return;
                            } else if (!cnCheckbox.checked || !brCheckbox.checked) {
                                this.checked = false;
                                showWarningPopup('⚠️ OOC requires BR or CN to be selected first! 📍');
                                return;
                            }
                        updateCheckboxState(caCheckbox, true);
                        updateCheckboxState(suCheckbox, true);
                        // updateCheckboxState(cnCheckbox, true);
                        updateCheckboxState(ctcCheckbox, true);
                        break;

                    case 'CA':
                        updateCheckboxState(brCheckbox, true);
                        updateCheckboxState(oocCheckbox, true);
                        updateCheckboxState(cnCheckbox, true);
                        break;

                    case 'SU':
                        if (!brCheckbox.checked && !caCheckbox.checked && !cnCheckbox.checked) {
                            this.checked = false;
                            showWarningPopup('⚠️ SU requires BR, CA, or CN to be selected first! 📍');
                            return;
                        }
                        updateCheckboxState(ctcCheckbox, true);
                        break;

                    case 'CN':
                        updateCheckboxState(brCheckbox, true);
                        updateCheckboxState(caCheckbox, true);
                        // updateCheckboxState(ctcCheckbox, true);
                        break;

                    case 'T2':
                        if (!brCheckbox.checked && !caCheckbox.checked && !cnCheckbox.checked) {
                            this.checked = false;
                            showWarningPopup('⚠️ T2/T3 requires BR, CA, or CN to be selected first! 📍');
                            return;
                        }
                        updateCheckboxState(ctcCheckbox, true);
                        updateCheckboxState(t3Checkbox, true);
                        break;
                    case 'T3':
                        if (!brCheckbox.checked && !caCheckbox.checked && !cnCheckbox.checked) {
                            this.checked = false;
                            showWarningPopup('⚠️ T2/T3 requires BR, CA, or CN to be selected first! 📍');
                            return;
                        }
                        updateCheckboxState(ctcCheckbox, true);
                        updateCheckboxState(t2Checkbox, true);
                        break;

                    case 'CTC':
                        if (!brCheckbox.checked && !caCheckbox.checked && !cnCheckbox.checked) {
                            this.checked = false;
                            showWarningPopup('⚠️ CTC requires BR, CA, or CN to be selected first! 📍');
                            return;
                        }
                        updateCheckboxState(suCheckbox, true);
                        updateCheckboxState(t2Checkbox, true);
                        updateCheckboxState(t3Checkbox, true);
                        break;
                }
            } else {
                // Reset states when unchecking
                queueCheckboxes.forEach(cb => {
                    updateCheckboxState(cb, false);
                });

                // Reapply current restrictions based on other selected checkboxes
                queueCheckboxes.forEach(cb => {
                    if (cb.checked) {
                        const changeEvent = new Event('change');
                        cb.dispatchEvent(changeEvent);
                    }
                });
            }
            const anyQueueSelected = Array.from(queueCheckboxes).some(cb => cb.checked);
            updateCheckboxState(document.getElementById('accsum'), !anyQueueSelected);
        });
    });
}

function handleSubTaskSelection() {
    const subTaskCheckboxes = document.querySelectorAll('input[name="subTaskType"]:not(#accsum)');
    const acctSumCheckbox = document.getElementById('accsum');

    subTaskCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function () {
            if (this.checked) {
                // Deselect all other sub-task checkboxes except Acct Sum and the current one
                subTaskCheckboxes.forEach(otherCheckbox => {
                    if (otherCheckbox !== this && otherCheckbox !== acctSumCheckbox) {
                        otherCheckbox.checked = false;
                    }
                });
            }
        });
    });
}

function handleCTCSelection() {
    const ctcCheckbox = document.querySelector('input[value="CTC"]');
    const subTaskCheckboxes = document.querySelectorAll('input[name="subTaskType"]');

    ctcCheckbox.addEventListener('change', function () {
        if (this.checked) {
            // Your existing code
            subTaskCheckboxes.forEach(cb => {
                cb.checked = false;
                cb.disabled = true;
                cb.parentElement.style.opacity = '0.5';
                cb.parentElement.style.cursor = 'not-allowed';
            });
            saveCTCState(); // Add this line
        } else {
            // Your existing code
            subTaskCheckboxes.forEach(cb => {
                cb.disabled = false;
                cb.parentElement.style.opacity = '1';
                cb.parentElement.style.cursor = 'pointer';
            });
            validateSubTaskSelections();
            localStorage.removeItem('ctcState'); // Add this line
        }
    });
}

// Add event listeners after DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    const startButton = document.querySelector('.start-button');
    if (startButton) {
        startButton.onclick = () => startTimer(false);
    }
    // Add click handlers to main window buttons
    document.querySelector('.start-button').addEventListener('click', () => startTimer(false));
    document.querySelector('.stop-button').addEventListener('click', () => stopTimer(false));
    document.getElementById('minimizeButton').addEventListener('click', openPopupWindow);
    restoreButtonStates();
    handleCTCDeselection();
    handleQueueDeselectionWithCTC();
    handleCTCSelection();
    handleSubTaskSelection();
    handleQueueSelection();
    handleQueueAndAcctSumSelection();

    document.querySelectorAll('input[name="taskType"]').forEach(checkbox => {
        checkbox.addEventListener('change', function () {
            const selectedButtons = Array.from(document.querySelectorAll('input[name="taskType"]:checked'))
                .map(cb => cb.value);
            updateButtonStates(selectedButtons);
        });
    });

    // Handle timer states
    const timerStarted = localStorage.getItem('timerStarted');
    if (timerStarted) {
        handleTimerButtonStates();
    }
});

function resetUIState() {
    // Reset buttons
    const startButton = document.querySelector('.start-button');
    const stopButton = document.querySelector('.stop-button');
    if (startButton && stopButton) {
        startButton.style.display = 'inline';
        stopButton.style.display = 'none';
    }

    // Reset timer display
    const timerDisplay = document.querySelector('.timer');
    if (timerDisplay) {
        timerDisplay.textContent = '00:00:00';
        timerDisplay.className = 'timer';
    }

    // Clear any existing intervals
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    // Reset stored timer state
    localStorage.removeItem('timerStarted');

    blockCTCDuringAcctSum(false);

    if (acctSumIntervalTimer) {
        clearInterval(acctSumIntervalTimer);
        acctSumIntervalTimer = null;
    }
    acctSumStartTime = null;
    const acctSumTimerDisplay = document.getElementById('acctSumTimer');
    if (acctSumTimerDisplay) {
        acctSumTimerDisplay.textContent = '00:00:00';
        acctSumTimerDisplay.className = 'acct-sum-timer';
    }

    if (acctSumIntervalTimer) {
        clearInterval(acctSumIntervalTimer);
    }
}

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('accsum').addEventListener('change', function () {
        const acctSumTimerDisplay = document.getElementById('acctSumTimer');
        if (this.checked) {
            blockCTCDuringAcctSum(true);
            acctSumStartTime = new Date();
            localStorage.setItem('acctSumStarted', acctSumStartTime.getTime());
            if (acctSumIntervalTimer) {
                clearInterval(acctSumIntervalTimer);
            }
            acctSumIntervalTimer = setInterval(() => {
                if (acctSumStartTime) {
                    const currentTime = new Date();
                    const diff = new Date(currentTime - acctSumStartTime);
                    const minutes = diff.getUTCMinutes();
                    const seconds = diff.getUTCSeconds();
                    const milliseconds = Math.floor(diff.getUTCMilliseconds() / 10);

                    // Update display with color based on duration
                    let colorClass = '';
                    if (minutes < 12) {
                        colorClass = 'timer-green';
                    } else if (minutes >= 12 && minutes < 20) {
                        colorClass = 'timer-yellow';
                    } else if (minutes >= 20 && minutes < 30) {
                        colorClass = 'timer-red';
                    } else {
                        colorClass = 'timer-black';
                    }
                    if (minutes === 40 && seconds === 0 && !alertShown) {
                        alertShown = true;  // Set flag to prevent multiple alerts
                        showAlert40Min();
                    }
                    // Reset flag if time is not 40 minutes
                    if (minutes !== 40) {
                        alertShown = false;
                    }

                    acctSumTimerDisplay.className = `acct-sum-timer ${colorClass}`;
                    acctSumTimerDisplay.textContent =
                        `${minutes.toString().padStart(2, '0')}:` +
                        `${seconds.toString().padStart(2, '0')}:` +
                        `${milliseconds.toString().padStart(2, '0')}`;
                }
            }, 10);
        } else {
            blockCTCDuringAcctSum(false);
            localStorage.removeItem('acctSumStarted');
            if (acctSumIntervalTimer) {
                clearInterval(acctSumIntervalTimer);
            }
            acctSumTimerDisplay.textContent = '00:00:00';
            acctSumTimerDisplay.className = 'acct-sum-timer';
            if (acctSumStartTime) {
                const endTime = new Date();
                const timeDiff = endTime - acctSumStartTime;

                // Convert milliseconds to minutes and seconds
                const totalMinutes = Math.floor(timeDiff / 60000);
                const totalSeconds = Math.floor((timeDiff % 60000) / 1000);

                // Create Account Summary entry
                const taskTypes = Array.from(document.querySelectorAll('input[name="taskType"]:checked'))
                    .map(cb => cb.value)
                    .join(', ');

                const entry = document.createElement('div');
                entry.className = 'registry-entry timer-blue';

                let colorClass, extraStyle, motivationalText;
                if (totalMinutes < 12) {
                    colorClass = 'timer-blue';
                    extraStyle = '';
                    motivationalText = 'Great Time! 😁 📊';
                } else if (totalMinutes >= 12 && totalMinutes < 20) {
                    colorClass = 'timer-blue';
                    extraStyle = 'border: 4px solid #ffff00;'; // Yellow border
                    motivationalText = 'Almost There! 😁 📊';
                } else if (totalMinutes >= 20 && totalMinutes < 30) {
                    colorClass = 'timer-blue';
                    extraStyle = 'border: 4px solid #ff0000;'; // Red border
                    motivationalText = 'Took too long! ☹️ 📊';
                } else {
                    colorClass = 'timer-black';
                    extraStyle = 'border: 4px solid #ff0000;'; // Red border
                    motivationalText = 'Game over dude! 😞 📊';
                }

                entry.className = `registry-entry ${colorClass}`;
                if (extraStyle) {
                    entry.style.cssText = extraStyle;
                }

                entryCount++;
                const entryId = `entry-${Date.now()}`;
                entry.id = entryId;

                const entryHTML = `
                    <div class="entry-content">
                        <strong>${entryCount}.</strong> Date: ${new Date().toLocaleString()} / 
                        Task: ${taskTypes || 'N/A'} / Sub-Task: Acct Sum / 
                        Total Duration: ${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}
                        <span style="float: right;">${motivationalText}</span>
                    </div>
                    <button class="delete-button" onclick="deleteEntry('${entryId}')" title="Delete entry">
                        <img src="http://imgfz.com/i/Dh8X6IV.png" alt="Delete" style="width: 27px; height: 27px;">
                    </button>
                `;

                entry.innerHTML = entryHTML;
                document.getElementById('registry').insertBefore(entry, document.getElementById('registry').firstChild);

                const savedEntries = JSON.parse(localStorage.getItem('registryEntries')) || [];
                savedEntries.unshift({
                    id: entryId,
                    html: entryHTML,
                    colorClass: colorClass,
                    borderStyle: extraStyle
                });
                localStorage.setItem('registryEntries', JSON.stringify(savedEntries));
                localStorage.setItem('entryCount', entryCount);

                casesCount++;
                updateCasesCount();
                updatePopupCases();

                // Reset Account Summary tracking
                acctSumStartTime = null;
            }
        }
    });
});

function toggleCheckboxButtons(disable) {
    const queueCheckboxes = document.querySelectorAll('input[name="taskType"]');
    const subTaskCheckboxes = document.querySelectorAll('input[name="subTaskType"]');
    const ctcCheckbox = document.querySelector('input[value="CTC"]');
    const brCheckbox = document.querySelector('input[value="BR"]');
    const caCheckbox = document.querySelector('input[value="CA"]');
    const cnCheckbox = document.querySelector('input[value="CN"]');
    const oocCheckbox = document.querySelector('input[value="OOC"]');

    // Check if CTC is checked
    const isCTCActive = ctcCheckbox && ctcCheckbox.checked;

    if (isCTCActive) {
        // Handle queue checkboxes with CTC rules
        queueCheckboxes.forEach(checkbox => {
            if (brCheckbox.checked) {
                // If BR is selected with CTC
                if (checkbox.value === 'CA' || checkbox.value === 'CN' || checkbox.value === 'SU' ||
                    checkbox.value === 'T2' || checkbox.value === 'T3') {
                    checkbox.disabled = true;
                    checkbox.style.pointerEvents = 'none';
                    checkbox.parentElement.style.opacity = '0.5';
                    checkbox.parentElement.style.cursor = 'not-allowed';
                }
            } else if (caCheckbox.checked) {
                // If CA is selected with CTC
                if (checkbox.value === 'BR' || checkbox.value === 'CN' || checkbox.value === 'SU' ||
                    checkbox.value === 'T2' || checkbox.value === 'T3') {
                    checkbox.disabled = true;
                    checkbox.style.pointerEvents = 'none';
                    checkbox.parentElement.style.opacity = '0.5';
                    checkbox.parentElement.style.cursor = 'not-allowed';
                }
            } else if (cnCheckbox.checked) {
                // If CN is selected with CTC
                if (checkbox.value === 'BR' || checkbox.value === 'CA' || checkbox.value === 'SU' ||
                    checkbox.value === 'T2' || checkbox.value === 'T3') {
                    checkbox.disabled = true;
                    checkbox.style.pointerEvents = 'none';
                    checkbox.parentElement.style.opacity = '0.5';
                    checkbox.parentElement.style.cursor = 'not-allowed';
                }
            }
        });
        // Save the current state to localStorage
        const currentState = {
            ctcActive: true,
            brChecked: brCheckbox.checked,
            caChecked: caCheckbox.checked,
            cnChecked: cnCheckbox.checked,
            disabledButtons: Array.from(queueCheckboxes)
                .filter(cb => cb.disabled)
                .map(cb => cb.value)
        };
        localStorage.setItem('checkboxState', JSON.stringify(currentState));
        saveCTCState();
        restoreCTCState();
    } else {
        // Regular disable/enable behavior for non-CTC cases
        const allCheckboxes = [...queueCheckboxes, ...subTaskCheckboxes];
        allCheckboxes.forEach(checkbox => {
            checkbox.disabled = disable;
            checkbox.style.pointerEvents = disable ? 'none' : 'auto';
            checkbox.parentElement.style.opacity = disable ? '0.5' : '1';
            checkbox.parentElement.style.cursor = disable ? 'not-allowed' : 'pointer';
        });
    }
}

function getSelectedOptions() {
    const taskTypes = Array.from(document.querySelectorAll('input[name="taskType"]:checked'))
        .map(cb => cb.value)
        .join(', ');
    const subTaskTypes = Array.from(document.querySelectorAll('input[name="subTaskType"]:checked'))
        .map(cb => cb.value)
        .join(', ');
    return { taskTypes, subTaskTypes };
}

document.getElementById('accsum').addEventListener('change', validateSubTaskSelections);
validateSubTaskSelections();

window.onload = function () {
    restoreCTCState();
    validateSubTaskSelections();
    updateCasesCount();

    const storedStartTime = localStorage.getItem('timerStarted');
    if (storedStartTime) {
        const startButton = document.querySelector('.start-button');
        const stopButton = startButton.nextElementSibling;
        const timerDisplay = startButton.parentElement.nextElementSibling.children[0];

        startButton.style.display = 'none';
        stopButton.style.display = 'inline';

        startTime = new Date(parseInt(storedStartTime));
        timerInterval = setInterval(() => {
            updateTimerDisplay(timerDisplay, false);
        }, 10);
    }

    // Restore Account Summary timer if it was running
    const storedAcctSumTime = localStorage.getItem('acctSumStarted');
    if (storedAcctSumTime) {
        blockCTCDuringAcctSum(true);
        const acctSumCheckbox = document.getElementById('accsum');
        const acctSumTimerDisplay = document.getElementById('acctSumTimer');

        acctSumCheckbox.checked = true;
        validateSubTaskSelections();

        acctSumStartTime = new Date(parseInt(storedAcctSumTime));
        acctSumIntervalTimer = setInterval(() => {
            const currentTime = new Date();
            const diff = new Date(currentTime - acctSumStartTime);
            const minutes = diff.getUTCMinutes();
            const seconds = diff.getUTCSeconds();
            const milliseconds = Math.floor(diff.getUTCMilliseconds() / 10);

            let colorClass = '';
            if (minutes < 12) {
                colorClass = 'timer-green';
            } else if (minutes >= 12 && minutes < 20) {
                colorClass = 'timer-yellow';
            } else if (minutes >= 20 && minutes < 30) {
                colorClass = 'timer-red';
            } else {
                colorClass = 'timer-black';
            }

            acctSumTimerDisplay.className = `acct-sum-timer ${colorClass}`;
            acctSumTimerDisplay.textContent =
                `${minutes.toString().padStart(2, '0')}:` +
                `${seconds.toString().padStart(2, '0')}:` +
                `${milliseconds.toString().padStart(2, '0')}`;
        }, 10);
    }

    document.getElementById('accsum').addEventListener('change', function () {
        validateSubTaskSelections();
        if (this.checked) {
            acctSumStartTime = new Date();
            acctSumIntervalTimer = setInterval(() => {
                const currentTime = new Date();
                const currentTotal = acctSumTotalTime + (currentTime - acctSumStartTime);
            }, 1000);
        } else {
            if (acctSumStartTime) {
                const endTime = new Date();
                const timeDiff = endTime - acctSumStartTime;
                acctSumTotalTime += timeDiff;

                // Clear the interval
                if (acctSumIntervalTimer) {
                    clearInterval(acctSumIntervalTimer);
                }

                // Create Account Summary entry with correct total time
                const taskTypes = Array.from(document.querySelectorAll('input[name="taskType"]:checked'))
                    .map(cb => cb.value)
                    .join(', ');

                // Convert total milliseconds to minutes and seconds properly
                const totalMinutes = Math.floor(acctSumTotalTime / 60000);
                const remainingMillis = acctSumTotalTime % 60000;
                const totalSeconds = Math.floor(remainingMillis / 1000);

                const entry = document.createElement('div');
                entry.className = 'registry-entry timer-blue';

                entryCount++;
                const entryId = `entry-${Date.now()}`;
                entry.id = entryId;

                const entryHTML = `
                    <div class="entry-content">
                        <strong>${entryCount}.</strong> Date: ${new Date().toLocaleString()} / 
                        Task: ${taskTypes || 'N/A'} / Sub-Task: Acct Sum / 
                        Total Duration: ${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}
                        <span style="float: right;">Acct Summary! 📊</span>
                    </div>
                    <button class="delete-button" onclick="deleteEntry('${entryId}')" title="Delete entry">
                        <img src="http://imgfz.com/i/Dh8X6IV.png" alt="Delete" style="width: 27px; height: 27px;">
                    </button>
                `;

                entry.innerHTML = entryHTML;
                document.getElementById('registry').insertBefore(entry, document.getElementById('registry').firstChild);

                const savedEntries = JSON.parse(localStorage.getItem('registryEntries')) || [];
                const registryDiv = document.getElementById('registry');
                savedEntries.forEach(entry => {
                    const entryDiv = document.createElement('div');
                    entryDiv.className = `registry-entry ${entry.colorClass}`;
                    entryDiv.id = entry.id || `entry-${Date.now()}`;
                    if (entry.extraStyle) {
                        entryDiv.style.cssText = entry.extraStyle;
                    }
                    entryDiv.innerHTML = entry.html;
                    registryDiv.appendChild(entryDiv);
                });

                // Reset Account Summary tracking
                acctSumStartTime = null;
                acctSumTotalTime = 0;
                acctSumIntervalTimer = null;
            }
        }
    });

    // Load saved entries
    const savedEntries = JSON.parse(localStorage.getItem('registryEntries')) || [];
    const registryDiv = document.getElementById('registry');
    savedEntries.forEach(entry => {
        const entryDiv = document.createElement('div');
        entryDiv.className = `registry-entry ${entry.colorClass}`;
        entryDiv.id = entry.id || `entry-${Date.now()}`;
        if (entry.borderStyle) {
            entryDiv.style.cssText = entry.borderStyle;
        }
        entryDiv.innerHTML = entry.html;
        registryDiv.appendChild(entryDiv);
    });
};

function validateSubTaskSelections() {
    const acctSumCheckbox = document.getElementById('accsum');
    const otherSubTasks = document.querySelectorAll('input[name="subTaskType"]:not(#accsum)');
    const ctcCheckbox = document.querySelector('input[value="CTC"]');
    const anyQueueSelected = Array.from(document.querySelectorAll('input[name="taskType"]')).some(cb => cb.checked);

    if (ctcCheckbox && ctcCheckbox.checked) {
        [acctSumCheckbox, ...otherSubTasks].forEach(checkbox => {
            checkbox.checked = false;
            checkbox.disabled = true;
            checkbox.parentElement.style.opacity = '0.5';
            checkbox.parentElement.style.cursor = 'not-allowed';
        });
        return;
    }
    if (!anyQueueSelected) {
        [acctSumCheckbox, ...otherSubTasks].forEach(checkbox => {
            checkbox.checked = false;
            checkbox.disabled = true;
            checkbox.parentElement.style.opacity = '0.5';
            checkbox.parentElement.style.cursor = 'not-allowed';
        });
        return;
    }
    acctSumCheckbox.disabled = false;
    acctSumCheckbox.parentElement.style.opacity = '1';
    acctSumCheckbox.parentElement.style.cursor = 'pointer';
    if (!acctSumCheckbox.checked) {
        otherSubTasks.forEach(checkbox => {
            checkbox.checked = false;
            checkbox.disabled = true;
            checkbox.parentElement.style.opacity = '0.5';
            checkbox.parentElement.style.cursor = 'not-allowed';
        });
    } else {
        otherSubTasks.forEach(checkbox => {
            checkbox.disabled = false;
            checkbox.parentElement.style.opacity = '1';
            checkbox.parentElement.style.cursor = 'pointer';
        });
    }
}

function recordAcctSumEntry() {
    const taskType = document.querySelector('input[name="taskType"]:checked')?.value || 'N/A';

    // Create entry
    const entry = document.createElement('div');
    entry.className = 'registry-entry timer-blue';

    entryCount++;
    const entryId = `entry-${Date.now()}`;
    entry.id = entryId;

    const entryHTML = `
        <div class="entry-content">
            <strong>${entryCount}.</strong> Date: ${new Date().toLocaleString()} / 
            Task: ${taskType} / Sub-Task: Acct Sum
            <span style="float: right;">Account Summary Review! 📊</span>
        </div>
        <button class="delete-button" onclick="deleteEntry('${entryId}')" title="Delete entry">
            <img src="http://imgfz.com/i/Dh8X6IV.png" alt="Delete" style="width: 27px; height: 27px;">
        </button>
    `;

    entry.innerHTML = entryHTML;
    document.getElementById('registry').insertBefore(entry, document.getElementById('registry').firstChild);

    // Save to localStorage
    const savedEntries = JSON.parse(localStorage.getItem('registryEntries')) || [];
    savedEntries.unshift({
        id: entryId,
        html: entryHTML,
        colorClass: 'timer-blue',
        isAcctSum: true
    });
    localStorage.setItem('registryEntries', JSON.stringify(savedEntries));
    localStorage.setItem('entryCount', entryCount);

    // Update cases count
    casesCount++;
    updateCasesCount();
    updatePopupCases();

    // Clear the Acct Sum radio selection after recording
    document.getElementById('accsum').checked = false;
}


function updateCasesCount() {
    const casesDisplay = document.querySelector('#cases-count span');
    casesDisplay.textContent = casesCount;

    if (casesCount < 20) {
        casesDisplay.className = 'cases-count timer-red';
    } else if (casesCount >= 20 && casesCount < 40) {
        casesDisplay.className = 'cases-count timer-yellow';
    } else {
        casesDisplay.className = 'cases-count timer-green';
    }
    localStorage.setItem('casesCount', casesCount);
}

function updateTimerDisplay(timerDisplay, isPopup = false) {
    const storedStartTime = localStorage.getItem('timerStarted');
    if (storedStartTime) {
        const currentTime = new Date();
        const diff = new Date(currentTime - parseInt(storedStartTime));
        const minutes = diff.getUTCMinutes();
        const seconds = diff.getUTCSeconds();

        let colorClass = '';
        if (minutes < 12) {
            colorClass = 'timer-green';
        } else if (minutes >= 12 && minutes < 20) {
            colorClass = 'timer-yellow';
        } else if (minutes >= 20 && minutes < 30) {
            colorClass = 'timer-red';
        } else {
            colorClass = 'timer-black';
        }
        if (minutes === 40 && seconds === 0 && !alertShown) {
            alertShown = true;  // Set flag to prevent multiple alerts
            showAlert40Min();
        }
        // Reset flag if time is not 40 minutes
        if (minutes !== 40) {
            alertShown = false;
        }

        const timeText =
            ('0' + minutes).slice(-2) + ':' +
            ('0' + diff.getUTCSeconds()).slice(-2) + ':' +
            ('0' + Math.floor(diff.getUTCMilliseconds() / 10)).slice(-2);

        if (isPopup) {
            timerDisplay.textContent = timeText;
            timerDisplay.className = 'popup-timer ' + colorClass;
        } else {
            timerDisplay.textContent = timeText;
            timerDisplay.className = 'timer ' + colorClass;
        }
    }
}

function startTimer(isPopup = false) {
    const ctcCheckbox = document.querySelector('input[value="CTC"]');
    const otherQueueSelected = Array.from(document.querySelectorAll('input[name="taskType"]:not([value="CTC"]):checked')).length > 0;

    // CTC validation logic
    if (ctcCheckbox && ctcCheckbox.checked) {
        if (!otherQueueSelected) {
            const warningPopup = document.createElement('div');
            warningPopup.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background-color: #232f3e;
                border: 2px solid #ff9900;
                padding: 20px;
                border-radius: 5px;
                z-index: 9999;
                color: white;
                text-align: center;
                min-width: 300px;
                box-shadow: 0 0 10px rgba(0,0,0,0.5);
            `;

            warningPopup.innerHTML = `
                <h3 style="color: #ff9900; margin-top: 0;">🚨 WARNING!! 🚨</h3>
                <p>⚠️ When selecting CTC, you must select at least one additional QUEUE option! 📍</p>
                <button onclick="this.parentElement.remove()" style="
                    background-color: #ff9900;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: bold;
                ">OK</button>
            `;

            document.body.appendChild(warningPopup);
            const audio = new Audio('data:audio/wav;base64,//uQRAAAAWMSLwULwUIYAAsYkXgoQwAEaYLWfkWgAI0wWs/ItAAAGDgYtAgAyN+QWaAAihwMWm4G8QQRDiMcCBcH3Cc+CDv/7xA4Tvh9Rz/y8QADBwMWgQAZG/ILNAARQ4GLTcDeIIIhxGOBAuD7hOfBB3/94gcJ3w+o5/5eIAIAAAVwWgQAVQ2ORaIQwEMAJiDg95G4nQL7mQVWI6GwRcfsZAcsKkJvxgxEjzFUgfHoSQ9Qq7KNwqHwuB13MA4a1q/DmBrHgPcmjiGoh//EwC5nGPEmS4RcfkVKOhJf+WOgoxJclFz3kgn//dBA+ya1GhurNn8zb//9NNutNuhz31f////9vt///z+I**********************GAExBwe8jcToF9zIKrEdDYIuP2MgOWFSE34wYiR5iqQPj0JIeoVdlG4VD4XA67mAcNa1fhzA1jwHuTRxDUQ//iYBczjHiTJcIuPyKlHQkv/LHQUYkuSi57yQT//uggfZNajQ3Vmz+Zt//+mm3Wm3Q576v////+32///5/EOgAAADVghQAAAAA==');
            audio.play();
            return;
        }
    } else {
        // Original validation for non-CTC cases
        const selectedQueue = document.querySelectorAll('input[name="taskType"]:checked').length;
        const acctSumSelected = document.getElementById('accsum').checked;
        const otherSubTaskSelected = document.querySelectorAll('input[name="subTaskType"]:checked:not(#accsum)').length;

        if (selectedQueue === 0 || !acctSumSelected || otherSubTaskSelected === 0) {
            const warningPopup = document.createElement('div');
            warningPopup.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background-color: #232f3e;
                border: 2px solid #ff9900;
                padding: 20px;
                border-radius: 5px;
                z-index: 9999;
                color: white;
                text-align: center;
                min-width: 300px;
                box-shadow: 0 0 10px rgba(0,0,0,0.5);
            `;

            warningPopup.innerHTML = `
                <h3 style="color: #ff9900; margin-top: 0;">🚨 WARNING!! 🚨</h3>
                <p>${selectedQueue === 0 ? '⚠️ PLEASE SELECT AT LEAST ONE <p><span style="color: #ff9900;"><strong>QUEUE</strong></span> OPTION!📍<br><br>' : ''}
                ${!acctSumSelected ? '⚠️ ACCOUNT SUMMARY MUST BE SELECTED <p><span style="color: #ff9900;"><strong>FIRST</strong></span> OPTION!📍<br><br>' : ''}
                ${otherSubTaskSelected === 0 ? '⚠️ PLEASE SELECT AT LEAST ONE <p><span style="color: #ff9900;"><strong>SUB-TASK</strong></span> OPTION!📍' : ''}</p>
                <button onclick="this.parentElement.remove()" style="
                    background-color: #ff9900;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: bold;
                ">OK</button>
            `;

            document.body.appendChild(warningPopup);
            const audio = new Audio('data:audio/wav;base64,//uQRAAAAWMSLwULwUIYAAsYkXgoQwAEaYLWfkWgAI0wWs/ItAAAGDgYtAgAyN+QWaAAihwMWm4G8QQRDiMcCBcH3Cc+CDv/7xA4Tvh9Rz/y8QADBwMWgQAZG/ILNAARQ4GLTcDeIIIhxGOBAuD7hOfBB3/94gcJ3w+o5/5eIAIAAAVwWgQAVQ2ORaIQwEMAJiDg95G4nQL7mQVWI6GwRcfsZAcsKkJvxgxEjzFUgfHoSQ9Qq7KNwqHwuB13MA4a1q/DmBrHgPcmjiGoh//EwC5nGPEmS4RcfkVKOhJf+WOgoxJclFz3kgn//dBA+ya1GhurNn8zb//9NNutNuhz31f////9vt///z+I**********************GAExBwe8jcToF9zIKrEdDYIuP2MgOWFSE34wYiR5iqQPj0JIeoVdlG4VD4XA67mAcNa1fhzA1jwHuTRxDUQ//iYBczjHiTJcIuPyKlHQkv/LHQUYkuSi57yQT//uggfZNajQ3Vmz+Zt//+mm3Wm3Q576v////+32///5/EOgAAADVghQAAAAA==');
            audio.play();
            return;
        }
        toggleCheckboxButtons(true);
    }

    // Only disable checkboxes when timer starts
    toggleCheckboxButtons(true);

    startTime = new Date();
    localStorage.setItem('timerStarted', startTime.getTime());

    const startButton = document.querySelector('.start-button');
    const stopButton = document.querySelector('.stop-button');

    if (startButton && stopButton) {
        startButton.style.display = 'none';
        stopButton.style.display = 'inline';
    }

    if (popupWindow && !popupWindow.closed) {
        const popupDoc = popupWindow.document;
        if (popupDoc.getElementById('popupStartBtn')) {
            popupDoc.getElementById('popupStartBtn').style.display = 'none';
            popupDoc.getElementById('popupStopBtn').style.display = 'inline';
        }
    }

    // Clear existing interval if any
    if (timerInterval) {
        clearInterval(timerInterval);
    }

    // Start new interval
    timerInterval = setInterval(() => {
        const mainTimerDisplay = document.querySelector('.timer');
        if (mainTimerDisplay) {
            updateTimerDisplay(mainTimerDisplay, false);
        }

        if (popupWindow && !popupWindow.closed) {
            const popupTimerDisplay = popupWindow.document.getElementById('popupTimer');
            if (popupTimerDisplay) {
                updateTimerDisplay(popupTimerDisplay, true);
            }
        }
    }, 10);
}


function stopTimer(isPopup = false) {
    clearInterval(timerInterval);
    localStorage.removeItem('timerStarted');

    const currentTimestamp = Date.now();
    if (lastEntryTimestamp && (currentTimestamp - lastEntryTimestamp < 1000)) {
        return;
    }
    lastEntryTimestamp = currentTimestamp;

    toggleCheckboxButtons(false);

    // Get duration and determine color
    const duration = document.querySelector('.timer').textContent;
    const [minutes, seconds, milliseconds] = duration.split(':').map(Number);

    let colorClass, motivationalText;
    if (minutes < 12) {
        colorClass = 'timer-green';
        motivationalText = 'Great job! Keep it up! 💪';
    } else if (minutes >= 12 && minutes < 20) {
        colorClass = 'timer-yellow';
        motivationalText = 'Keep working hard! 😁';
    } else if (minutes >= 20 && minutes < 30) {
        colorClass = 'timer-red';
        motivationalText = 'Took too long! ☹️';
    } else {
        colorClass = 'timer-black';
        motivationalText = 'Game over dude! 😞';
    }

    // Get selected tasks
    const taskTypes = Array.from(document.querySelectorAll('input[name="taskType"]:checked'))
        .map(cb => cb.value)
        .join(', ');

    const subTaskTypes = Array.from(document.querySelectorAll('input[name="subTaskType"]:checked:not(#accsum)'))
        .map(cb => cb.value)
        .join(', ');

    entryCount++;
    const entryId = `entry-${Date.now()}`;

    // Create entry HTML
    const entryHTML = `
        <div class="entry-content">
            <strong>${entryCount}.</strong> Date: ${new Date().toLocaleString()} / 
            Duration: ${duration} / Task: ${taskTypes || 'N/A'} / 
            Sub-Task: ${subTaskTypes || 'N/A'}
            <span style="float: right;">${motivationalText}</span>
        </div>
        <button class="delete-button" onclick="deleteEntry('${entryId}')" title="Delete entry">
            <img src="http://imgfz.com/i/Dh8X6IV.png" alt="Delete" style="width: 27px; height: 27px;">
        </button>
    `;

    // Create and add entry to DOM
    const entry = document.createElement('div');
    entry.className = `registry-entry ${colorClass}`;
    entry.id = entryId;
    entry.innerHTML = entryHTML;
    document.getElementById('registry').insertBefore(entry, document.getElementById('registry').firstChild);

    // Save to localStorage
    const savedEntries = JSON.parse(localStorage.getItem('registryEntries')) || [];
    savedEntries.unshift({
        id: entryId,
        html: entryHTML,
        colorClass: colorClass,
        isSubTask: true,
        duration: duration,
        taskTypes: taskTypes,
        subTaskTypes: subTaskTypes,
        timestamp: new Date().toLocaleString()
    });
    localStorage.setItem('registryEntries', JSON.stringify(savedEntries));
    localStorage.setItem('entryCount', entryCount);

    // Update counts and UI
    casesCount++;
    updateCasesCount();
    updatePopupCases();

    // Reset UI
    if (isPopup) {
        const popupDoc = popupWindow.document;
        popupDoc.getElementById('popupStartBtn').style.display = 'inline';
        popupDoc.getElementById('popupStopBtn').style.display = 'none';
    } else {
        const button = document.querySelector('.stop-button');
        button.style.display = 'none';
        button.previousElementSibling.style.display = 'inline';
    }

    // Reset timer display after delay
    setTimeout(() => {
        const mainTimerDisplay = document.querySelector('.timer');
        mainTimerDisplay.textContent = '00:00:00';
        mainTimerDisplay.className = 'timer';

        if (popupWindow && !popupWindow.closed) {
            const popupTimerDisplay = popupWindow.document.getElementById('popupTimer');
            popupTimerDisplay.textContent = '00:00:00';
            popupTimerDisplay.className = 'popup-timer';
        }
    }, 1500);
}

function deleteEntry(entryId) {
    if (confirm('Are you sure you want to delete this entry?')) {
        const entry = document.getElementById(entryId);
        entry.remove();

        casesCount--;
        updateCasesCount();

        let savedEntries = JSON.parse(localStorage.getItem('registryEntries')) || [];
        savedEntries = savedEntries.filter(entry => !entry.html.includes(entryId));
        localStorage.setItem('registryEntries', JSON.stringify(savedEntries));

        entryCount--;
        localStorage.setItem('entryCount', entryCount);

        if (popupWindow && !popupWindow.closed) {
            updatePopupCases();
        }

        const entries = document.querySelectorAll('.registry-entry');
        entries.forEach((entry, index) => {
            const entryContent = entry.querySelector('.entry-content');
            const newNumber = entries.length - index;
            entryContent.innerHTML = entryContent.innerHTML.replace(
                /<strong>\d+\.<\/strong>/,
                `<strong>${newNumber}.</strong>`
            );
        });
    }
}

function resetData() {
    if (confirm('Are you sure you want to reset all data? This action cannot be undone.')) {
        localStorage.removeItem('casesCount');
        localStorage.removeItem('entryCount');
        localStorage.removeItem('registryEntries');
        localStorage.removeItem('timerStarted');
        localStorage.removeItem('acctSumStarted');
        casesCount = 0;
        entryCount = 0;
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        if (acctSumIntervalTimer) {
            clearInterval(acctSumIntervalTimer);
        }
        updateCasesCount();
        document.getElementById('registry').innerHTML = '';
        const mainTimer = document.querySelector('.timer');
        if (mainTimer) {
            mainTimer.textContent = '00:00:00';
            mainTimer.className = 'timer';
        }

        const acctSumTimer = document.getElementById('acctSumTimer');
        if (acctSumTimer) {
            acctSumTimer.textContent = '00:00:00';
            acctSumTimer.className = 'acct-sum-timer';
        }

        if (popupWindow && !popupWindow.closed) {
            popupWindow.document.getElementById('popupCases').textContent = '0';
        }
    }
}

function openPopupWindow() {
    if (popupWindow && !popupWindow.closed) {
        popupWindow.close();
    }

    const width = 250;
    const height = 150;
    const right = window.screen.width - width;
    const top = window.screen.height - height - 100;

    popupWindow = window.open('', 'timerPopup',
        `width=${width},height=${height},top=${top},left=${right},` +
        'resizable=yes,scrollbars=no,status=no,location=no,menubar=no,toolbar=no'
    );

    popupWindow.document.write(`
        <html>
        <head>
            <title>Timer</title>
            <style>
                body {
                    margin: 0;
                    padding: 10px;
                    background-color: #232f3e;
                    color: white;
                    font-family: Arial, sans-serif;
                    overflow: hidden;
                }
                .popup-content {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 10px;
                }
                .popup-timer {
                    font-size: 24px;
                    font-weight: bold;
                    padding: 5px 10px;
                    border-radius: 5px;
                }
                .popup-controls {
                    display: flex;
                    gap: 10px;
                }
                .popup-button {
                    background-color: #0066cc;
                    color: white;
                    border: none;
                    padding: 5px 10px;
                    border-radius: 5px;
                    cursor: pointer;
                }
                .timer-green { background-color: #00ff00; color: black; }
                .timer-yellow { background-color: #ffff00; color: black; }
                .timer-red { background-color: #ff0000; color: white; }
                .cases-count {
                    font-size: 18px;
                    margin-top: 5px;
                }
            </style>
        </head>
        <body>
            <div class="popup-content">
                <div id="popupTimer" class="popup-timer">00:00:00</div>
                <div class="cases-count">Cases: <span id="popupCases">0</span></div>
                <div class="popup-controls">
                    <button id="popupStartBtn" class="popup-button">Start</button>
                    <button id="popupStopBtn" class="popup-button" style="display:none;">Stop</button>
                    <button id="popupMaximizeBtn" class="popup-button">Maximize</button>
                </div>
            </div>
        </body>
        </html>
    `);

    const popupDoc = popupWindow.document;
    popupDoc.getElementById('popupStartBtn').onclick = () => startTimer(true);
    popupDoc.getElementById('popupStopBtn').onclick = () => stopTimer(true);
    popupDoc.getElementById('popupMaximizeBtn').onclick = async () => {
        // Close popup
        popupWindow.close();

        // Request notification permission if not granted
        if (Notification.permission !== "granted") {
            await Notification.requestPermission();
        }

        // Show notification to draw attention
        if (Notification.permission === "granted") {
            const notification = new Notification("Timer Window", {
                body: "Click here to return to the main timer window",
                icon: "your-icon-url.png" // Optional: add an icon
            });

            notification.onclick = function () {
                window.focus();
                notification.close();
            };
        }

        // Try to focus the window
        window.focus();
    };

    updatePopupCases();

    popupWindow.onbeforeunload = () => {
        popupWindow = null;
    };

    if (timerInterval) {
        popupDoc.getElementById('popupStartBtn').style.display = 'none';
        popupDoc.getElementById('popupStopBtn').style.display = 'inline';
        const popupTimerDisplay = popupDoc.getElementById('popupTimer');
        updateTimerDisplay(popupTimerDisplay, true);
    }
}

function updatePopupCases() {
    if (popupWindow && !popupWindow.closed) {
        popupWindow.document.getElementById('popupCases').textContent = casesCount;
    }
}

// Add event listener for the minimize button
document.getElementById('minimizeButton').addEventListener('click', openPopupWindow);

function getFormattedDate() {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const today = new Date();

    return `IPH Results, ${days[today.getDay()]}, ${months[today.getMonth()]}, ${today.getDate()}, ${today.getFullYear()}`;
}

async function exportToExcel() {
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Timer Records');

        worksheet.columns = [
            { header: '#', width: 5 },
            { header: 'Date', width: 20 },
            { header: 'Duration', width: 12 },
            { header: 'Queue', width: 15 },
            { header: 'Sub-Task', width: 15 },
            { header: 'Feedback', width: 25 }
        ];

        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '4F81BD' }
        };
        headerRow.alignment = { horizontal: 'center' };

        let savedEntries = JSON.parse(localStorage.getItem('registryEntries')) || [];

        // Helper function to parse duration to minutes
        function parseDuration(duration) {
            if (!duration) return 0;
            const [minutes, seconds] = duration.split(':').map(Number);
            return minutes + (seconds / 60);
        }

        // Sort entries by Queue, Sub-Task, and Duration
        savedEntries.sort((a, b) => {
            const getEntryInfo = (entry) => {
                if (entry.isSubTask) {
                    return {
                        queue: entry.taskTypes || '',
                        subTask: entry.subTaskTypes || '',
                        duration: parseDuration(entry.duration)
                    };
                } else {
                    const tempDiv = document.createElement('divdiv');
                    tempDiv.innerHTML = entry.html;
                    const content = tempDiv.textContent;
                    const durationMatch = content.match(/Duration: ([^/]+)/) || content.match(/Total Duration: ([^/]+)/);
                    return {
                        queue: (content.match(/Task: ([^/]+)/) || [])[1]?.trim() || '',
                        subTask: 'Acct Sum',
                        duration: parseDuration(durationMatch ? durationMatch[1] : '0:00')
                    };
                }
            };

            const aInfo = getEntryInfo(a);
            const bInfo = getEntryInfo(b);

            // Sorting priority for sub-tasks
            const subTaskPriority = {
                'Acct Sum': 1,
                'IDV': 2,
                'TIV': 3,
                'BIV': 4,
                'BOV': 5,
                'LOA': 6,
                'LRV': 7
            };

            // First sort by sub-task type
            if (aInfo.subTask !== bInfo.subTask) {
                return (subTaskPriority[aInfo.subTask] || 999) - (subTaskPriority[bInfo.subTask] || 999);
            }

            // Then by queue
            if (aInfo.queue !== bInfo.queue) {
                return aInfo.queue.localeCompare(bInfo.queue);
            }

            // Finally by duration
            return aInfo.duration - bInfo.duration;
        });
        function parseDuration(duration) {
            if (!duration) return 0;
            const parts = duration.split(':');
            if (parts.length === 3) {
                // Format: MM:SS:MS
                return (parseInt(parts[0]) * 60) + parseInt(parts[1]) + (parseInt(parts[2]) / 100);
            } else if (parts.length === 2) {
                // Format: MM:SS
                return (parseInt(parts[0]) * 60) + parseInt(parts[1]);
            }
            return 0;
        }
        // Update the section where groups and separators are added
        let currentSubTask = '';
        let currentQueue = '';
        let rowCounter = 1;

        savedEntries.forEach((entry, index) => {
            try {
                const entryInfo = entry.isSubTask ? {
                    queue: entry.taskTypes,
                    subTask: entry.subTaskTypes
                } : {
                    queue: entry.html.match(/Task: ([^/]+)/)[1].trim(),
                    subTask: 'Acct Sum'
                };

                // Add sub-task group header if sub-task changes
                if (entryInfo.subTask !== currentSubTask) {
                    // Add separator row
                    if (currentSubTask !== '') {
                        const separatorRow = worksheet.addRow(['']);
                        separatorRow.height = 20;
                        worksheet.mergeCells(`A${separatorRow.number}:F${separatorRow.number}`);
                        separatorRow.getCell('A').fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'E0E0E0' }
                        };
                    }

                    const headerRow = worksheet.addRow(['', `=== ${entryInfo.subTask} GROUP ===`]);
                    headerRow.getCell(2).font = { bold: true, color: { argb: '000000' } };
                    headerRow.getCell(2).fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'CCCCCC' }
                    };
                    currentSubTask = entryInfo.subTask;
                    currentQueue = ''; // Reset current queue when sub-task changes
                }

                // Add queue separator if queue changes within same sub-task
                if (entryInfo.queue !== currentQueue) {
                    const queueSeparator = worksheet.addRow(['', `-- ${entryInfo.queue} --`]);
                    queueSeparator.getCell(2).font = { italic: true, color: { argb: '666666' } };
                    currentQueue = entryInfo.queue;

                    const headerRow = worksheet.addRow(['', `=== ${entryInfo.queue} GROUP ===`]);
                    headerRow.getCell(2).font = { bold: true, color: { argb: '000000' } };
                    headerRow.getCell(2).fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'CCCCCC' }
                    };
                    currentQueue = entryInfo.queue;
                }

                // Add sub-task separator if sub-task changes
                if (entryInfo.subTask !== currentSubTask && index > 0) {
                    const subTaskSeparator = worksheet.addRow(['']);
                    subTaskSeparator.height = 15;
                    worksheet.mergeCells(`A${subTaskSeparator.number}:F${subTaskSeparator.number}`);
                    subTaskSeparator.getCell('A').fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'F0F0F0' }
                    };
                    currentSutSubTask = entryInfo.subTask;
                }

                // Add the actual entry
                let row;
                if (entry.isSubTask) {
                    row = worksheet.addRow([
                        rowCounter,
                        entry.timestamp,
                        entry.duration,
                        entry.taskTypes,
                        entry.subTaskTypes,
                        entry.html.match(/<span style="float: right;">(.*?)<\/span>/)[1]
                    ]);
                } else {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = entry.html;

                    const dateText = tempDiv.textContent.split('Date: ')[1]?.split(' / ')[0] || '';
                    const duration = tempDiv.textContent.includes('Total Duration:')
                        ? tempDiv.textContent.split('Total Duration: ')[1]?.split(/[\s\n]/)[0]
                        : tempDiv.textContent.split('Duration: ')[1]?.split(' / ')[0];
                    const taskType = (tempDiv.textContent.match(/Task: ([^/]+)/) || [])[1]?.trim() || 'N/A';
                    const feedback = tempDiv.querySelector('span')?.textContent.trim() || '';

                    row = worksheet.addRow([
                        rowCounter,
                        dateText,
                        duration,
                        taskType,
                        'Acct Sum',
                        feedback
                    ]);
                }

                // Apply styling
                let rowColor, textColor = '000000';
                if (entry.isSubTask) {
                    if (entry.colorClass.includes('timer-green')) {
                        rowColor = '92D050';
                    } else if (entry.colorClass.includes('timer-yellow')) {
                        rowColor = 'FFFF00';
                    } else if (entry.colorClass.includes('timer-red')) {
                        rowColor = 'FF0000';
                        textColor = 'FFFFFF';
                    } else if (entry.colorClass.includes('timer-black')) {
                        rowColor = '000000';
                        textColor = 'FFFFFF';
                    }
                } else {
                    if (entry.colorClass.includes('timer-black')) {
                        rowColor = '000000';
                        textColor = entry.borderStyle?.includes('border: 4px solid #ff0000;') ? 'FF0000' : 'FFFFFF';
                    } else {
                        rowColor = '007BFF';
                        if (entry.borderStyle?.includes('border: 4px solid #ff0000;')) {
                            textColor = 'FF0000';
                        } else if (entry.borderStyle?.includes('border: 4px solid #ffff00;')) {
                            textColor = 'FFFF00';
                        } else {
                            textColor = 'FFFFFF';
                        }
                    }
                }

                row.eachCell((cell) => {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: rowColor }
                    };
                    cell.font = { color: { argb: textColor } };
                    cell.alignment = { horizontal: 'center' };
                });

                rowCounter++;
            } catch (err) {
                console.error('Error processing entry:', err);
            }
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        // Use the new getFormattedDate function for the file name
        const fileName = `${getFormattedDate()}.xlsx`;

        saveAs(blob, fileName);

    } catch (error) {
        console.error('Export error:', error);
        alert('There was an error exporting to Excel. Error details: ' + error.message);
    }
}

async function showAlert40Min() {
    // Play sound
    const audio = new Audio('data:audio/wav;base64,//uQRAAAAWMSLwUIYAAsYkXgoQwAEaYLWfkWgAI0wWs/ItAAAGDgYtAgAyN+QWaAAihwMWm4G8QQRDiMcCBcH3Cc+CDv/7xA4Tvh9Rz/y8QADBwMWgQAZG/ILNAARQ4GLTcDeIIIhxGOBAuD7hOfBB3/94gcJ3w+o5/5eIAIAAAVwWgQAVQ2ORaIQwEMAJiDg95G4nQL7mQVWI6GwRcfsZAcsKkJvxgxEjzFUgfHoSQ9Qq7KNwqHwuB13MA4a1q/DmBrHgPcmjiGoh//EwC5nGPEmS4RcfkVKOhJf+WOgoxJclFz3kgn//dBA+ya1GhurNn8zb//9NNutNuhz31f////9vt///z+IdAEAA**********************we8jcToF9zIKrEdDYIuP2MgOWFSE34wYiR5iqQPj0JIeoVdlG4VD4XA67mAcNa1fhzA1jwHuTRxDUQ//iYBczjHiTJcIuPyKlHQkv/LHQUYkuSi57yQT//uggfZNajQ3Vmz+Zt//+mm3Wm3Q576v////+32///5/EOgAAADVghQAAAAA//uQZAUAB1WI0PZugAAAAAoQwAAAEk3nRd2qAAAAACiDgAAAAAAABCqEEQRLCgwpBGMlJkIz8jKhGvj4k6jzRnqasNKIeoh5gI7BJaC1A1AoNBjJgbyApVS4IDlZgDU5WUAxEKDNmmALHzZp0Fkz1FMTmGFl1FMEyodIavcCAUHDWrKAIA4aa2oCgILEBupZgHvAhEBcZ6joQBxS76AgccrFlczBvKLC0QI2cBoCFvfTDAo7eoOQInqDPBtvrDEZBNYN5xwNwxQRfw8ZQ5wQVLvO8OYU+mHvFLlDh05Mdg7BT6YrRPpCBznMB2r//xKJjyyOh+cImr2/4doscwD6neZjuZR4AgAABYAAAABy1xcdQtxYBYYZdifkUDgzzXaXn98Z0oi9ILU5mBjFANmRwlVJ3/6jYDAmxaiDG3/6xjQQCCKkRb/6kg/wW+kSJ5//rLobkLSiKmqP/0ikJuDaSaSf/6JiLYLEYnW/+kXg1WRVJL/9EmQ1YZIsv/6Qzwy5qk7/+tEU0nkls3/zIUMPKNX/6yZLf+kFgAfgGyLFAUwY//uQZAUABcd5UiNPVXAAAApAAAAAE0VZQKw9ISAAACgAAAAAVQIygIElVrFkBS+Jhi+EAuu+lK**********************SHTGkF5RWH7kz/ESHWPAq/kcCRhqBtMdokPdM7vil7RG98A2sc7zO6ZvTdM7pmOUAZTnJW+NXxqmd41dqJ6mLTXxrPpnV8avaIf5SvL7pndPvPpndJR9Kuu8fePvuiuhorgWjp7Mf/PRjxcFCPDkW31srioCExivv9lcwKEaHsf/7ow2Fl1T/9RkXgEhYElAoCLFtMArxwivDJJ+bR1HTKJdlEoTELCIqgEwVGSQ+hIm0NbK8WXcTEI0UPoa2NbG4y2K00JEWbZavJXkYaqo9CRHS55FcZTjKEk3NKoCYUnSQ0rWxrZbFKbKIhOKPZe1cJKzZSaQrIyULHDZmV5K4xySsDRKWOruanGtjLJXFEmwaIbDLX0hIPBUQPVFVkQkDoUNfSoDgQGKPekoxeGzA4DUvnn4bxzcZrtJyipKfPNy5w+9lnXwgqsiyHNeSVpemw4bWb9psYeq//uQZBoABQt4yMVxYAIAA**********************DAAAAD59jblTirQe9upFsmZbpMudy7Lz1X1DYsxOOSWpfPqNX2WqktK0DMvuGwlbNj44TleLPQ+Gsfb+GOWOKJoIrWb3cIMeeON6lz2umTqMXV8Mj30yWPpjoSa9ujK8SyeJP5y5mOW1D6hvLepeveEAEDo0mgCRClOEgANv3B9a6fikgUSu/DmAMATrGx7nng5p5iimPNZsfQLYB2sDLIkzRKZOHGAaUyDcpFBSLG9MCQALgAIgQs2YunOszLSAyQYPVC2YdGGeHD2dTdJk1pAHGAWDjnkcLKFymS3RQZTInzySoBwMG0QueC3gMsCEYxUqlrcxK6k1LQQcsmyYeQPdC2YfuGPASCBkcVMQQqpVJshui1tkXQJQV0OXGAZMXSOEEBRirXbVRQW7ugq7IM7rPWSZyDlM3IuNEkxzCOJ0ny2ThNkyRai1b6ev//3dzNGzNb//4uAvHT5sURcZCFcuKLhOFs8mLAAEAt4UWAAIABAAAAAB4qbHo0tIjVkUU//uQZAwABfSFz3ZqQAAAAAngwAAAE1HjMp2qAAAAACZDgAAAD5UkTE1UgZEUExqYynN1qZvqIOREEFmBcJQkwdxiFtw0qEOkGYfRDifBui9MQg4QAHAqWtAWHoCxu1Yf4VfWLPIM2mHDFsbQEVGwyqQoQcwnfHeIkNt9YnkiaS1oizycqJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfM**********************tAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=');
    audio.play();

    // Check if the window is active/focused
    const isWindowActive = document.hasFocus();

    // Show notification only if window is not active and notifications are supported
    if (!isWindowActive && "Notification" in window) {
        // First, check if we already have permission
        if (Notification.permission === "granted") {
            // Create and show notification
            try {
                const notification = new Notification("🚨 40 MINUTES ALERT!! 🚨", {
                    body: "⚠️ 📍 PLEASE CLICK HERE!!! 💡⚠️\n\n" +
                        "⚠️ 📍 PLEASE CLICK HERE!!! 💡⚠️",
                    icon: "https://your-icon-url.png",
                    requireInteraction: true,
                    silent: false,
                });

                notification.onclick = function () {
                    window.focus();
                    window.open('#', '_blank');
                    notification.close();
                };
            } catch (err) {
                console.error('Error showing notification:', err);
            }
        } else if (Notification.permission !== "denied") {
            // Request permission if not denied
            try {
                const permission = await Notification.requestPermission();
                if (permission === "granted") {
                    // If granted, show notification
                    const notification = new Notification("🚨 40 MINUTES ALERT!! 🚨", {
                        body: "⚠️ 📍 PLEASE CLICK HERE!!! 💡⚠️\n\n" +
                            "⚠️ 📍 PLEASE CLICK HERE!!! 💡⚠️",
                        icon: "https://your-icon-url.png",
                        requireInteraction: true,
                        silent: false,
                    });

                    notification.onclick = function () {
                        window.focus();
                        window.open('#', '_blank');
                        notification.close();
                    };
                }
            } catch (err) {
                console.error('Error requesting permission:', err);
            }
        }
    }

    // Always show the popup
    const popup = document.createElement('div');
    popup.className = 'alert-popup';
    popup.innerHTML = `
<h2>⚠️ <span style="color: #FF0000;">ALERT</span> ⚠️</h2>
<p>YOU HAVE WORKED THIS CASE FOR <span style="color: #FF0000;"><strong>40 MINUTES!!</strong></span></p>
<p>PLEASE REACH OUT TO A <span style="color: #00FF00;"><strong>MANAGER</strong></span> AND PROVIDE THE <span style="color: #87CEEB;"><strong>CID & TID</strong></span></p>
<p><span style="color: #00FF00;"><strong>MANAGER ON CALL:</strong></span> <a href="#" target="_blank" style="color: #87CEEB;">Click here</a></p>
<button onclick="this.parentElement.remove()">Close</button>

`;

    document.body.appendChild(popup);

}

// Add this at the start of your script
document.addEventListener('DOMContentLoaded', async () => {
    // Request notification permission when page loads
    if ("Notification" in window && Notification.permission === "default") {
        await Notification.requestPermission();
    }
});

const debouncedUpdate = debounce(() => {
    updateTimerDisplay(timerDisplay, false);
}, 16);