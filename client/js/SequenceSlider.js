let labelPositionOffset = 0;
let sequenceTrackLength = 0;
let sequenceDuration = 0;
let sequenceStartTime = 0;
let sequenceEndTime = 0;

let currentlyActiveSequenceNodeLabel = undefined;
let currentlyActiveSequencePopup = undefined;
let sequencePopups = [];

function popupDismisser(event) {
    if (!(event.target == currentlyActiveSequencePopup ||
        currentlyActiveSequencePopup.contains(event.target)
    )) {
        currentlyActiveSequenceNodeLabel.click();
    }
    else {
        event.stopPropagation();
    }

}

function updateCurrentlyActivePopup(label, popup = undefined) {
    currentlyActiveSequenceNodeLabel = label;
    currentlyActiveSequencePopup = popup;

    if (label == undefined) {
        document.removeEventListener("click", popupDismisser);
    }
    else {
        document.addEventListener("click", popupDismisser);
    }
}

function tabberButtonHandler(current, shouldIncrement, subTimestamps, popup, timestamp) {
    let lastSelected = current;

    current = shouldIncrement ? (current + 1) % subTimestamps.length : current - 1;
    if (current < 0) {
        current = subTimestamps.length - 1;
    }

    if (lastSelected == current) {
        showSubTimestamp(popup, sanitizeTimestamp(timestamp), subTimestamps[current]);
    }
    else {
        showSubTimestamp(popup, sanitizeTimestamp(timestamp), subTimestamps[current], subTimestamps[lastSelected]);
    }
    return current;
}

function initializeSequencePopup(popup, data, name, above) {
    if (data["timestamp"] == undefined && data["desc"] == undefined && data.actions == undefined ) {
        popup.remove();
        return false;
    }
    popup.style.width = "auto";
    popup.style.height = "auto";
    popup.classList.add(above ? "above" : "below");

    let title = popup.getElementsByClassName("sequence-popup-heading")[0];
    let description = popup.getElementsByClassName("sequence-popup-description")[0];
    title.remove(); // TODO remove title for good if I really don't want to keep it
    let timestamp = data["timestamp"];
    popup.dataset.timestamp = sanitizeTimestamp(timestamp);

    title.innerText = name;
    description.innerText = data["desc"];

    let subTimestamps = [];
    for (let i = 0; i < data.actions.length; i++) {
        let actionGroup = data.actions[i];
        console.log("action", actionGroup)
        let subTimestamp = 0.0;
        let subContent = document.getElementById("sequencePopupContentTemp").cloneNode(true);
        subContent.id = "";
        subContent.dataset.subIndex = i;
        subContent.setAttribute("inactive", "true");
        for (let actionKey of Object.keys(actionGroup)) {
            if (actionKey == "timestamp") {
                subTimestamp = actionGroup[actionKey];
            }
            else {
                let actionElement = document.getElementById("sequencePopupActionTemp").cloneNode(true);
                actionElement.id = "";
                let actionLabel = actionElement.getElementsByClassName("sequence-action-label")[0];
                let actionLabelSecondary = actionElement.getElementsByClassName("secondary")[0];
                let actionValue = actionElement.getElementsByClassName("sequence-action-value")[0];

                let splitAction = actionKey.split(":");
                actionLabel.innerText = splitAction[0];
                actionLabelSecondary.innerText = splitAction[1];
                actionValue.innerText = actionGroup[actionKey].join(", ");

                subContent.appendChild(actionElement);
            }
        }

        subTimestamps.push({
            timestamp: subTimestamp,
            content: subContent
        });

        popup.appendChild(subContent);
    }

    let prevButton = popup.getElementsByClassName("sequence-popup-tab-prev")[0];
    let nextButton = popup.getElementsByClassName("sequence-popup-tab-next")[0];

    let selectedSubTimestamp = 0;
    prevButton.addEventListener("click", function() {
        selectedSubTimestamp = tabberButtonHandler(selectedSubTimestamp, false, subTimestamps, popup, timestamp);
    });
    nextButton.addEventListener("click", function() {
        selectedSubTimestamp = tabberButtonHandler(selectedSubTimestamp, true, subTimestamps, popup, timestamp);
    });
    if (subTimestamps.length <= 1) {
        prevButton.style.visibility = "hidden";
        nextButton.style.visibility = "hidden";
    }

    showSubTimestamp(popup, sanitizeTimestamp(timestamp), subTimestamps[0]);
    sequencePopups.push(popup);

    return true;
}

function showSubTimestamp(popup, timestamp, newData, previousData = undefined) {
    if (previousData != undefined) {
        //previousData.content.style.visibility = "hidden";
        previousData.content.setAttribute("inactive", "true");
    }
    //newData.content.style.visibility = "";
    newData.content.removeAttribute("inactive");

    let timestampLabel = popup.getElementsByClassName("sequence-popup-tab-label")[0];
    timestampLabel.innerText = `T${timestamp >= 0 ? "+" : ""}${timestamp}s (+${newData.timestamp}s)`;
}

function createNode(data, index, offset, popupAbove, pixelsPerSecond) {
    let name = data["shortName"] ?? data["name"];
    if (name != "") {
        name = name.charAt(0).toUpperCase() + name.slice(1);
    }
    let type = data["type"] ?? "normal";
    let element = document.getElementById("sequenceSliderNodeTemp").cloneNode(true).children[0];
    element.id = "";
    element.style.left = `${offset}px`;
    element.style.paddingBottom = element.style.paddingTop;
    element.classList.add(type);

    let topLabel = element.getElementsByClassName("sequence-node-name")[0];
    let topArrow = element.getElementsByClassName("sequence-arrow-container")[0];
    let bottomLabel = element.getElementsByClassName("sequence-node-name")[1];
    let bottomArrow = element.getElementsByClassName("sequence-arrow-container")[1];
    let label = undefined
    if ((index + labelPositionOffset) % 2 == 0) {
        bottomLabel.remove();
        bottomArrow.remove();
        if (name == "") {
            topArrow.remove();
        }
        element.classList.add("top-label");
        label = topLabel;
    }
    else {
        topLabel.remove();
        topArrow.remove();
        if (name == "") {
            bottomArrow.remove();
        }
        element.classList.add("bottom-label");
        label = bottomLabel;
    }

    if (name == "") {
        labelPositionOffset++;
    }

    label.innerText = name;

    let popup = element.getElementsByClassName("sequence-node-popup")[0];
    let hasCreatedPopup = initializeSequencePopup(popup, data, name, popupAbove, pixelsPerSecond);

    if (hasCreatedPopup) {
        label.addEventListener("click", function (event) {
            if (isSequenceRunning) {
                return;
            }

            if (currentlyActiveSequenceNodeLabel != undefined &&
                currentlyActiveSequenceNodeLabel != label
            ) {
                currentlyActiveSequenceNodeLabel.click();
            }

            if (!popup.classList.contains("active")) {
                popup.classList.add("active");
                label.classList.add("active");
                updateCurrentlyActivePopup(label, popup);
            }
            else {
                popup.classList.remove("active");
                label.classList.remove("active");
                updateCurrentlyActivePopup(undefined);
            }
            event.stopPropagation();
        });
    }
    else {
        label.classList.add("non-interactible");
    }

    return element;
}

function createFullLine(duration, pixelsPerSecond) {
    let svgURI = "http://www.w3.org/2000/svg";
    let svg = document.createElementNS(svgURI, "svg");
    svg.setAttribute("width", `${duration * pixelsPerSecond + 1}px`);
    svg.setAttribute("height", "10px");
    svg.classList.add("sequence-line")

    let line = document.createElementNS(svgURI, "line");
    line.setAttribute("x1", "0");
    line.setAttribute("y1", "4.5");
    line.setAttribute("x2", duration * pixelsPerSecond + 1);
    line.setAttribute("y2", "4.5");
    line.setAttribute("stroke", "var(--content-primary)");

    svg.appendChild(line);
    return svg;
}

function createSecondsMarkers(track, pixelsPerSecond, minorInterval = 1, majorInterval = 5, alignToZero = true) {
    let timeSinceLastMajor = Number.MIN_SAFE_INTEGER;
    if (alignToZero) {
        timeSinceLastMajor = (Math.floor(Math.abs(sequenceStartTime / majorInterval)) + 1) * majorInterval * Math.sign(sequenceStartTime);
    }

    for (let time = Math.floor(sequenceStartTime); time <= sequenceEndTime; time = time + minorInterval)
    {
        if (time < sequenceStartTime) {
            continue;
        }
        let marker = document.getElementById("sequenceSecondsMarkerTemp").cloneNode(true);
        if (timeSinceLastMajor + majorInterval <= time) {
            console.log("major", timeSinceLastMajor, time)
            marker.classList.add("major");
            marker.innerText = time;
            timeSinceLastMajor = time;
        }
        else {
            marker.classList.add("minor");
        }
        marker.id = "";
        marker.style.left = `${(time - sequenceStartTime) * pixelsPerSecond}px`;
        track.appendChild(marker);
    }
}

function sanitizeTimestamp(timestamp) {
    if (timestamp == "START") {
        timestamp = sequenceStartTime;
    }
    else if (timestamp == "END") {
        timestamp = sequenceEndTime;
    }

    return timestamp;
}

function calcFinalNodeSize(defaultNodeSize, deltaToNext, deltaToPrevious, pixelsPerSecond) {
    let limitedNodeSize = Math.min(deltaToNext, deltaToPrevious ?? Number.MAX_SAFE_INTEGER) * pixelsPerSecond / 2;
    return Math.max(4, Math.min(defaultNodeSize, limitedNodeSize));
}

function createSequenceSlider(sequence, isSpectator, pixelsPerSecond = 25) {
    labelPositionOffset = 0;
    let track = document.getElementById("sequence-slider-track");
    track.replaceChildren();
    updateCurrentlyActivePopup(undefined);
    sequencePopups = [];

    let nowMarker = document.getElementById("sequence-slider-now-marker");

    moveSequenceSlider(0);

    sequenceStartTime = sequence["globals"]["startTime"];
    sequenceEndTime = sequence["globals"]["endTime"];
    sequenceDuration = sequenceEndTime - sequenceStartTime;

    let lastOffset = undefined;
    let sequenceData = sequence["data"];
    for (let i = 0; i < sequenceData.length; i++) {
        let isHidden = sequenceData[i]["hiddenFromSpectator"] && !isSpectator;
        let timestamp = sequenceData[i]["timestamp"];
        timestamp = sanitizeTimestamp(timestamp);

        let offset = (timestamp - sequenceStartTime) * pixelsPerSecond;
        let node = undefined;
        if (!isHidden) {
            node = createNode(sequenceData[i], i, offset, false, pixelsPerSecond);
        }
        else {
            labelPositionOffset++;
        }
        lastOffset = offset;

        if (node != undefined) {
            track.appendChild(node);
        }
    }
    track.appendChild(createFullLine(sequenceDuration, pixelsPerSecond));
    createSecondsMarkers(track, pixelsPerSecond);
    sequenceTrackLength = sequenceDuration * pixelsPerSecond;

    let nowOffset = 50;
    track.style.left = `${nowOffset}px`;
    track.style.width = `${lastOffset}px`;
    track.style.height = `${10}px`;
    nowMarker.style.left = `${nowOffset}px`;


    fixLabelCollisions();
    postProcessPopups(pixelsPerSecond);
}

function fixLabelCollisions() {
    let elements = [];

    let domElements = sequenceSliderTrack.getElementsByClassName("sequence-node-name");
    for (let sliderEntry of domElements)
    {
        let currentRect = sliderEntry.getBoundingClientRect();
        let isTop = sliderEntry.classList.contains("top-label");
        for (let previousElement of elements)
        {
            if (previousElement.rect.right > currentRect.left && previousElement.isTop == isTop)
            {
                previousElement.dom.classList.add("sequence-node-left");
                sliderEntry.classList.add("sequence-node-right")
            }
        }

        elements.push({
            isTop: isTop,
            rect: currentRect,
            dom: sliderEntry
        });
    }
}

function postProcessPopups(pixelsPerSecond) {
    for (let popup of sequencePopups) {
        positionPopup(popup, pixelsPerSecond);
        setScrollbarGutter(popup);
    }
}

// TODO this is technically not correct, since if the viewport width changes, the popup size can change (min-width depends on viewport width)
// so if the viewport width is changed after this is called, the offset might not be fully correct anymore
function positionPopup(popup, pixelsPerSecond) {
    // NOTE this needs to be run after the popup has been added to the DOM, otherwise
    // popup.offsetWidth would be 0 (the popup needed to be laid out once)
    let timestamp = popup.dataset.timestamp;
    let timeFromStart = timestamp - sequenceStartTime;
    let timeToEnd = sequenceEndTime - timestamp;

    let space = 0;
    let direction = 0;
    if (timeFromStart > timeToEnd) {
        space = timeToEnd * pixelsPerSecond;
        direction = -1;
    }
    else {
        space = timeFromStart * pixelsPerSecond;
        direction = 1;
    }
    let maxOffset = popup.offsetWidth * 0.45;
    let offset = Math.max(Math.min(maxOffset - space, maxOffset), 0) * direction;
    popup.style.transform = `translateX(${offset}px)`;
}

// TODO this has the same issue as positionPopup()
function setScrollbarGutter(popup) {
    // NOTE this needs to be run after the popup has been added to the DOM, otherwise
    // offsetHeight and scrollHeight would be 0 (the elements need to be laid out once)
    let description = popup.getElementsByClassName("sequence-popup-description")[0];
    let tabber = popup.getElementsByClassName("sequence-popup-tabber")[0];
    let contentContainers = popup.getElementsByClassName("sequence-popup-content");
    let maxHeight = parseFloat(getComputedStyle(popup).getPropertyValue("max-height"));
    let maxContentHeight = maxHeight - description.offsetHeight - tabber.offsetHeight;

    console.log("max height", maxHeight, description.offsetHeight, tabber.offsetHeight)
    for (let container of contentContainers) {
        console.log("checking for scrollbar", container.scrollHeight, maxContentHeight)
        if (container.scrollHeight > maxContentHeight) {
            console.log("detected scrollbar", popup);
            container.style.scrollbarGutter = "stable";
        }
    }
}

let moveRule = undefined;
let animationRule = undefined;

function getSequencePercentage(time) {;
    return (time - sequenceStartTime) / sequenceDuration;
}

function getCurrentSequencePosition() {
    let transformMatrix = getComputedStyle(sequenceSliderTrack).transform;
    let matrixContents = transformMatrix.replace("matrix(", "").replace(")", "");
    let elements = matrixContents.split(", ");
    return Math.abs(elements[4]);
}

function getCurrentSequencePercentage() {
    let position = getCurrentSequencePosition();
    return position / sequenceTrackLength;
}

function createKeyframeString(percentage, position) {
    return `${Math.round(percentage * 100)}% {
        transform: translateX(-${position}px)
    }`;
}

function stopSequenceSlider() {
    console.log("current position", getCurrentSequencePosition());
    // add 2 to position since animation runs a tiny touch longer after getting
    // position and it would jump a tiny bit backwards when stopping otherwise
    moveSequenceSlider(getCurrentSequencePosition() + 2);
    sequenceSliderTrack.classList.remove("active");
}

function syncSequenceSliderTime(time)
{
    getMoveRule();
    getAnimationRule();

    if (!isTrackAnimating(sequenceSliderTrack)) {
        startSequenceSlider();
    }

    let percentage = getSequencePercentage(time);
    let currentPercentage = getCurrentSequencePercentage();
    let delta = percentage - currentPercentage;
    if (Math.abs(delta) < 0.02) {
        console.log("animation sync ignored because delta not big enough")
        // don't update slider position if delta is small enough
        return;
    }

    let remainingDuration = (1 - percentage) * sequenceDuration;
    animationRule.style.animationDuration = `${remainingDuration}s`;

    let newStartPosition = sequenceTrackLength * percentage;
    moveSequenceSlider(newStartPosition);
    sequenceSliderTrack.style.animationName = "none";

    moveRule.deleteRule("0%");
    moveRule.appendRule(createKeyframeString(0, newStartPosition))
    setTimeout(function () {
        sequenceSliderTrack.style.transform = '';
        sequenceSliderTrack.style.animation = '';
    }, 10)
}

function getAnimationRule() {
    if (animationRule != undefined) {
        return animationRule;
    }

    let stylesheets = document.styleSheets;

    let sequenceStyleSheet = undefined;
    for (let stylesheet of stylesheets) {
        if (stylesheet.href.endsWith("sequenceSlider.css")) {
            sequenceStyleSheet = stylesheet;
            break;
        }
    }

    for (let i = 0; i < sequenceStyleSheet.cssRules.length; i++) {
        let rule = sequenceStyleSheet.cssRules[i];
        if (rule.selectorText == ".slider-track.active") {
            // CSSStyleRule
            animationRule = rule;
        }
    }
}

function getMoveRule() {
    if (moveRule != undefined) {
        return moveRule;
    }

    let stylesheets = document.styleSheets;

    let sequenceStyleSheet = undefined;
    for (let stylesheet of stylesheets) {
        if (stylesheet.href.endsWith("sequenceSlider.css")) {
            sequenceStyleSheet = stylesheet;
            break;
        }
    }

    for (let i = 0; i < sequenceStyleSheet.cssRules.length; i++) {
        let rule = sequenceStyleSheet.cssRules[i];
        if (rule.name == "move-track") {
            // CSSKeyframesRule
            moveRule = rule;
            moveRule.appendRule(createKeyframeString(1, sequenceTrackLength));
        }
    }
}

function isTrackAnimating(track) {
    if (track.classList.contains("active")) {
        return true;
    }
    return false;
}

function initializeSliderStart() {
    sequenceSliderTrack.style.transform = '';
    currentlyActiveSequenceNodeLabel?.click();
    updateCurrentlyActivePopup(undefined);
}

function startSequenceSlider()
{
    initializeSliderStart();

    getMoveRule();
    getAnimationRule();
    sequenceSliderTrack.addEventListener("animationend", function() {
        // cleaning up keyframes inserted to sync animation position
        for (let i = 0; i <= 100; i++) {
            moveRule.deleteRule(`${i}%`);
        }

        sequenceSliderTrack.classList.remove("active");
        moveSequenceSlider(sequenceTrackLength);
    });

    animationRule.style.animationDuration = `${sequenceDuration}s`;
    sequenceSliderTrack.classList.add("active");
}

let sequenceSliderTrack = document.getElementById("sequence-slider-track");
let activeStepTrack = undefined;
let trackIsDown = false;
let previousMousePos = {};
let currentTrackPos = 0;
function initSequenceSliderTrack(track, isMainSequence = true) {
    console.log("track", track)
    track.addEventListener("mousedown", function(e) {
        if (!targetIsOnSliderTrack(track, e.target) || isSequenceRunning) {
            return;
        }
        track.classList.add("grabbed");
        if (isMainSequence) {
            trackIsDown = true;
            activeStepTrack = undefined;
        }
        else {
            activeStepTrack = track;
            trackIsDown = false;
        }
        mouseMoveStart = [
            e.clientX,
            e.clientY
        ];
        previousMousePos = {
            x: e.clientX,
            y: e.clientY
        }
        e.preventDefault();
    });
    track.addEventListener("wheel", function(e) {
        if (!targetIsOnSliderTrack(track, e.target) || isSequenceRunning) {
            return;
        }
        let sensitivity = -0.4;
        let scrollDelta = e.deltaY * sensitivity;
        // TODO this logic really doesn't work with dynamic amount of sequences
        // but realistically we don't need that I don't know why I initially
        // started designing this feature to work with an arbitrary amount of sliders
        // that is severely broken in various places anyways.
        let oldTransitionStyle = track.style.transition;
        track.style.transition = "transform 0.1s linear";
        if (isMainSequence) {
            moveSequenceSlider(currentTrackPos -= scrollDelta);
        }
        else {
            moveStepSequenceSlider(track, currentStepSequencePos -= scrollDelta, false);
        }
        setTimeout(function () {
            track.style.transition = oldTransitionStyle;
        }, 10000)
        e.preventDefault();
    })
}

function targetIsOnSliderTrack(track, target) {
    let svgLine = track.getElementsByClassName("sequence-line")[0];
    if (target == svgLine || svgLine.contains(target)) {
        return true;
    }
    return false;
}

document.addEventListener('mousemove', function(event) {
    if (trackIsDown || activeStepTrack != undefined) {
        let delta = event.clientX - previousMousePos.x;
        previousMousePos.x = event.clientX;
        previousMousePos.y = event.clientY;

        if (trackIsDown) {
            moveSequenceSlider(currentTrackPos -= delta);
        }
        else if (activeStepTrack != undefined) {
            moveStepSequenceSlider(activeStepTrack, currentStepSequencePos -= delta);
        }
    }
}, true);

document.addEventListener('mouseup', function() {
    if (trackIsDown) {
        moveSequenceSlider(Math.round(currentTrackPos));
        sequenceSliderTrack.classList.remove("grabbed");
        trackIsDown = false;
    }
    else if (activeStepTrack != undefined) {
        moveStepSequenceSlider(activeStepTrack, Math.round(currentStepSequencePos));
        activeStepTrack.classList.remove("grabbed");
        activeStepTrack = undefined;
    }
});

initSequenceSliderTrack(sequenceSliderTrack);

function moveSequenceSlider(position) {
    currentTrackPos = Math.min(sequenceTrackLength, Math.max(0, position));
    sequenceSliderTrack.style.transform = `translateX(-${currentTrackPos}px)`;
}


// TODO
// - swap out with abort sequence
// - a seconds marker in/on the timeline (overlapping + gradient background)
// - spectator mode
