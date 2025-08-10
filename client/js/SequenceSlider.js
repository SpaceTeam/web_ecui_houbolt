let labelPositionOffset = 0;
let sequenceTrackLength = 0;
let sequenceDuration = 0;
let sequenceStartTime = 0;
let sequenceEndTime = 0;

function createNode(name, index, offset) {
    let element = document.getElementById("sequenceSliderNodeTemp").cloneNode(true).children[0];
    element.id = "";
    element.style.left = `${offset}px`;
    element.style.paddingBottom = element.style.paddingTop;

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

    return element;
}

function createFullLine(duration, pixelsPerSecond) {
    let svgURI = "http://www.w3.org/2000/svg";
    let svg = document.createElementNS(svgURI, "svg");
    svg.setAttribute("width", `${duration * pixelsPerSecond}px`);
    svg.setAttribute("height", "10px");

    let line = document.createElementNS(svgURI, "line");
    line.setAttribute("x1", "0");
    line.setAttribute("y1", "4.5");
    line.setAttribute("x2", duration * pixelsPerSecond);
    line.setAttribute("y2", "4.5");
    line.setAttribute("stroke", "var(--content-primary)");

    svg.appendChild(line);
    return svg;
}

function sanitizeTimestamp(timestamp, startTime, endTime) {
    if (timestamp == "START") {
        timestamp = startTime;
    }
    else if (timestamp == "END") {
        timestamp = endTime;
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
    let nowMarker = document.getElementById("sequence-slider-now-marker");

    let nowOffset = 75;
    track.style.left = `${nowOffset}px`;
    track.style.height = `${10}px`;
    nowMarker.style.left = `${nowOffset}px`;

    moveSequenceSlider(0);

    let lastOffset = undefined;
    let startTime = sequence["globals"]["startTime"];
    let endTime = sequence["globals"]["endTime"];
    let sequenceData = sequence["data"];
    for (let i = 0; i < sequenceData.length; i++) {
        let name = sequenceData[i]["shortName"] ?? sequenceData[i]["name"];
        if (name != "") {
            name = name.charAt(0).toUpperCase() + name.slice(1);
        }
        let isHidden = sequenceData[i]["hiddenFromSpectator"] && isSpectator;
        let timestamp = sequenceData[i]["timestamp"];
        timestamp = sanitizeTimestamp(timestamp, startTime, endTime);

        let offset = (timestamp - startTime) * pixelsPerSecond;
        let node = undefined;
        if (!isHidden) {
            node = createNode(name, i, offset);
        }
        else {
            labelPositionOffset++;
        }
        lastOffset = offset;

        if (node != undefined) {
            track.appendChild(node);
        }
    }
    track.appendChild(createFullLine(endTime - startTime, pixelsPerSecond));
    track.style.width = `${lastOffset}px`;

    sequenceDuration = endTime - startTime;
    sequenceStartTime = startTime;
    sequenceEndTime = endTime;
    sequenceTrackLength = sequenceDuration * pixelsPerSecond;

    fixLabelCollisions();
}

function fixLabelCollisions() {
    let elements = [];

    let domElements = document.getElementsByClassName("sequence-node-name");
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
    if (moveRule == undefined) {
        return;
    }

    let percentage = getSequencePercentage(time);
    let currentPercentage = getCurrentSequencePercentage();
    let delta = percentage - currentPercentage;
    if (Math.abs(delta) < 0.02) {
        console.log("delta not big enough")
        // don't update slider position if delta is small enough
        return;
    }

    let remainingDuration = (1 - percentage) * sequenceDuration;
    animationRule.style.animationDuration = remainingDuration;

    let newStartPosition = sequenceTrackLength * percentage;
    moveSequenceSlider(newStartPosition);
    sequenceSliderTrack.style.animationName = "none";

    moveRule.deleteRule("0%");
    moveRule.appendRule(createKeyframeString("0%", newStartPosition))
    setTimeout(function () {
        sequenceSliderTrack.style.transform = '';
        sequenceSliderTrack.style.animation = '';
    }, 10)
}

function startSequenceSlider()
{
    sequenceSliderTrack.style.transform = '';
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
        if (rule.selectorText == "#sequence-slider-track.active") {
            // CSSStyleRule
            console.log("active rule", rule);
            animationRule = rule;
            animationRule.style.animationDuration = `${sequenceDuration}s`;
        }
        else if (rule.name == "move-track") {
            // CSSKeyframesRule
            console.log("move rule")
            moveRule = rule;
            moveRule.appendRule(createKeyframeString(1, sequenceTrackLength));
        }
    }

    sequenceSliderTrack.addEventListener("animationend", function() {
        console.log("animation end");
        // cleaning up keyframes inserted to sync animation position
        for (let i = 0; i <= 100; i++) {
            moveRule.deleteRule(`${i}%`);
        }
        moveRule.deleteRule("from");
        moveRule.deleteRule("to");

        sequenceSliderTrack.classList.remove("active");
        moveSequenceSlider(sequenceTrackLength);
    });

    sequenceSliderTrack.classList.add("active");
}

let sequenceSliderTrack = undefined;
let trackIsDown = false;
let previousMousePos = {};
let currentTrackPos = 0;
function initSequenceSliderTrack() {
    sequenceSliderTrack = document.getElementById("sequence-slider-track");

    sequenceSliderTrack.addEventListener("mousedown", function(e) {
        sequenceSliderTrack.classList.add("grabbed");
		trackIsDown = true;
		mouseMoveStart = [
			e.clientX,
            e.clientY
		];
        previousMousePos = {
            x: e.clientX,
            y: e.clientY
        }
	});
}

initSequenceSliderTrack();

function moveSequenceSlider(position) {
    currentTrackPos = Math.min(sequenceTrackLength, Math.max(0, position));
    sequenceSliderTrack.style.transform = `translateX(-${currentTrackPos}px)`;
}

document.addEventListener('mousemove', function(event) {
    if (trackIsDown) {
        let delta = event.clientX - previousMousePos.x;
        previousMousePos.x = event.clientX;
        previousMousePos.y = event.clientY;

        moveSequenceSlider(currentTrackPos -= delta);
    }
}, true);

document.addEventListener('mouseup', function(e) {
    if (trackIsDown) {
        sequenceSliderTrack.classList.remove("grabbed");
        trackIsDown = false;
    }
});
// TODO
// - swap out with abort sequence
// - chaining of sequences (llserver sequence, internal sequence) + nice visual on the "connection point"
// - animation of internal sequence (unknown duration between steps) -> maybe "timed sequence" vs "stepped sequence" with
//   stepped having similar style but: all shown at once (or at least only moved over once closing in on the end) and "empty node"
//   "current node" and "past node" styles (transparent, green, grey?)
// - clicking on timeline events to see what happens at that moment
// - a seconds marker in/on the timeline (overlapping + gradient background)
