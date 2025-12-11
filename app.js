/**
 * App.js
 * Handles user interactions for the CSS Object-Fit Visualizer.
 * 
 * Responsibilities:
 * 1. Listen for inputs from the Control Panel.
 * 2. Update CSS Variables on the root/container to reflect changes.
 * 3. Handle Draggable Logic for the Control Panel.
 */

document.addEventListener('DOMContentLoaded', () => {

    // --- State & DOM Elements ---
    const root = document.documentElement;
    const fitRadios = document.querySelectorAll('input[name="object-fit"]');
    const posXInput = document.getElementById('posX');
    const posYInput = document.getElementById('posY');
    const valXDisplay = document.getElementById('valX');
    const valYDisplay = document.getElementById('valY');

    const controlPanel = document.getElementById('controlPanel');
    const panelHeader = document.getElementById('panelHeader');

    // --- 1. Control Panel Logic ---

    // Object Fit Handler
    fitRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const newVal = e.target.value;
            // Update the CSS variable that controls object-fit on .focus img
            root.style.setProperty('--fit-mode', newVal);
        });
    });

    // Object Position X Handler
    posXInput.addEventListener('input', (e) => {
        const val = e.target.value;
        valXDisplay.textContent = `${val}%`;
        root.style.setProperty('--pos-x', `${val}%`);
    });

    // Object Position Y Handler
    posYInput.addEventListener('input', (e) => {
        const val = e.target.value;
        valYDisplay.textContent = `${val}%`;
        root.style.setProperty('--pos-y', `${val}%`);
    });

    // --- 2. Draggable Panel Logic ---

    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    panelHeader.addEventListener('mousedown', dragStart);
    document.addEventListener('mouseup', dragEnd);
    document.addEventListener('mousemove', drag);

    function dragStart(e) {
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;

        if (e.target === panelHeader || panelHeader.contains(e.target)) {
            isDragging = true;
            controlPanel.style.cursor = 'grabbing';
            panelHeader.style.cursor = 'grabbing';
        }
    }

    function dragEnd(e) {
        initialX = currentX;
        initialY = currentY;

        isDragging = false;
        controlPanel.style.cursor = 'default';
        panelHeader.style.cursor = 'move';
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();

            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;

            xOffset = currentX;
            yOffset = currentY;

            setTranslate(currentX, currentY, controlPanel);
        }
    }

    function setTranslate(xPos, yPos, el) {
        el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
    }

    // --- 3. Ghosting Logic (The Core Update) ---
    /*
     * To show exactly what is "cut off", we must manually reproduce the CSS object-fit math
     * and apply it to our Ghost images. 
     */

    const scenes = document.querySelectorAll('.scene');

    function updateGhosts() {
        const fitMode = getComputedStyle(root).getPropertyValue('--fit-mode').trim();
        // Get raw percentage values from sliders (0-100)
        const rawX = parseInt(posXInput.value, 10);
        const rawY = parseInt(posYInput.value, 10);

        scenes.forEach(scene => {
            const wrapper = scene.querySelector('.visualizer-wrapper');
            const ghostImg = scene.querySelector('.ghost img');
            const focusImg = scene.querySelector('.focus img');

            // Ensure images are loaded before doing math
            if (!focusImg.naturalWidth) return;

            // Box Dimensions (300x300)
            const boxW = wrapper.clientWidth;
            const boxH = wrapper.clientHeight;

            // Image Natural Dimensions
            const natW = focusImg.naturalWidth;
            const natH = focusImg.naturalHeight;
            const imgRatio = natW / natH;
            const boxRatio = boxW / boxH;

            // Logic Switch
            if (fitMode === 'fill' || fitMode === 'contain') {
                // Ghosting is confusing here because everything is visible or distorted.
                // Best to hide it as requested.
                ghostImg.style.opacity = '0';
                return;
            }

            // For 'cover' and 'none', show the ghost
            ghostImg.style.opacity = '0.4';

            let targetW, targetH;

            if (fitMode === 'none') {
                targetW = natW;
                targetH = natH;
            } else if (fitMode === 'cover') {
                // Cover Logic:
                // If image is "wider" than box (relative to aspect), height = boxHeight, width = scaled
                // If image is "taller" than box, width = boxWidth, height = scaled
                if (imgRatio > boxRatio) {
                    // Image is wider than box -> Match Height, Scale Width
                    targetH = boxH;
                    targetW = boxH * imgRatio;
                } else {
                    // Image is taller than box -> Match Width, Scale Height
                    targetW = boxW;
                    targetH = boxW / imgRatio;
                }
            }

            // Calculation Position
            // The formula for object-position is:
            // Left = (BoxWidth - ImgWidth) * (PosX%)
            // Top = (BoxHeight - ImgHeight) * (PosY%)

            const left = (boxW - targetW) * (rawX / 100);
            const top = (boxH - targetH) * (rawY / 100);

            // Apply Styles
            ghostImg.style.width = `${targetW}px`;
            ghostImg.style.height = `${targetH}px`;
            ghostImg.style.left = `${left}px`;
            ghostImg.style.top = `${top}px`;
        });
    }

    // Attach Listeners for Ghost Updates
    // Update when input changes
    [posXInput, posYInput, ...fitRadios].forEach(el => {
        el.addEventListener('input', updateGhosts);
        el.addEventListener('change', updateGhosts); // for radios
    });

    // Update when images load (in case of race condition)
    document.querySelectorAll('img').forEach(img => {
        img.addEventListener('load', updateGhosts);
    });

    // Initial run
    // setTimeout to ensure layout is settled and variables are applied
    setTimeout(updateGhosts, 100);

    // --- 4. Tool Buttons (Reset) ---
    const btnReset = document.getElementById('btnReset');

    // Default Values
    const DEFAULT_FIT = 'fill';
    const DEFAULT_POS_X = 50;
    const DEFAULT_POS_Y = 50;

    // --- 5. Live CSS Output ---
    const cssOutput = document.getElementById('cssOutput');

    function updateCodeOutput() {
        // Read current values
        // Note: fitRadios is a NodeList, we need the checked one
        const activeRadio = Array.from(fitRadios).find(r => r.checked);
        const fitMode = activeRadio ? activeRadio.value : 'fill';
        const x = posXInput.value;
        const y = posYInput.value;

        const lines = [
            '.img {',
            '    width: 300px;',
            '    height: 300px;'
        ];

        if (fitMode !== 'fill') {
            lines.push(`    object-fit: ${fitMode};`);
        }

        if (x !== '50' || y !== '50') {
            lines.push(`    object-position: ${x}% ${y}%;`);
        }

        lines.push('}');
        cssOutput.textContent = lines.join('\n');
    }

    // Attach to inputs
    [posXInput, posYInput, ...fitRadios].forEach(el => {
        el.addEventListener('input', updateCodeOutput);
        el.addEventListener('change', updateCodeOutput);
    });

    btnReset.addEventListener('click', () => {
        // Reset Inputs
        document.querySelector(`input[name="object-fit"][value="${DEFAULT_FIT}"]`).checked = true;
        posXInput.value = DEFAULT_POS_X;
        posYInput.value = DEFAULT_POS_Y;

        // Reset Displays
        valXDisplay.textContent = `${DEFAULT_POS_X}%`;
        valYDisplay.textContent = `${DEFAULT_POS_Y}%`;

        // Reset DOM Styles
        root.style.setProperty('--fit-mode', DEFAULT_FIT);
        root.style.setProperty('--pos-x', `${DEFAULT_POS_X}%`);
        root.style.setProperty('--pos-y', `${DEFAULT_POS_Y}%`);

        // Update Ghosts & Code
        updateGhosts();
        updateCodeOutput();
    });

    // Initial Run
    updateCodeOutput();

    // --- 6. Click to Copy Code ---
    const codeBlock = document.getElementById('codeBlock');
    const copyMsg = document.getElementById('copyMsg');

    codeBlock.addEventListener('click', () => {
        const textToCopy = cssOutput.textContent;
        navigator.clipboard.writeText(textToCopy).then(() => {
            // Show notification
            copyMsg.classList.add('visible');

            // Hide after 2 seconds
            setTimeout(() => {
                copyMsg.classList.remove('visible');
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    });
});
