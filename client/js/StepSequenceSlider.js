let currentStepSequencePos = 0;
let stepSequenceTrackLength = 0;
let stepSliderStepDistance = 0;
let stepSequenceTrack = undefined;

function resetStepSequence() {
    let nodes = stepSequenceTrack.getElementsByClassName("sequence-node");

    for (let node of nodes) {
        node.classList.remove("active");
        node.classList.remove("visited");
    }
}

function createStepSequenceSlider(sequence, stepDistance = 75) {
    let container = document.getElementById("custom-sequence-slider-container");
    let nowMarker = container.getElementsByClassName("now-marker")[0];
    container.replaceChildren(nowMarker);
    let track = document.getElementById("sequenceSliderTrackTemp").cloneNode(true);
    track.id = "";

    stepSliderStepDistance = stepDistance;

    moveStepSequenceSlider(track, 0);

    let lastOffset = undefined;
    for (let i = 0; i < sequence.length; i++) {
        let offset = i * stepDistance;
        let node = undefined;
        node = createNode(sequence[i], i, offset, false, stepDistance);
        lastOffset = offset;

        if (node != undefined) {
            track.appendChild(node);
        }
    }
    track.appendChild(createFullLine(sequence.length - 1, stepDistance));
    stepSequenceTrackLength = (sequence.length - 1) * stepDistance;
    let resetButton = track.getElementsByClassName("reset-button")[0];

    let nowOffset = stepDistance * 1.5;
    track.style.left = `${nowOffset}px`;
    track.style.width = `${lastOffset}px`;
    track.style.height = `${10}px`;
    nowMarker.style.left = `${nowOffset}px`;
    resetButton.style.left = `${lastOffset + 20}px`;
    resetButton.addEventListener("click", resetStepSequence);

    container.appendChild(track);
    stepSequenceTrack = track;


    initSequenceSliderTrack(track, false);
}

function moveStepSliderToIndex(track, index) {
    let nodes = track.getElementsByClassName("sequence-node");
    let clampedIndex = Math.min(nodes.length, Math.max(0, index));
    currentStepSequencePos = clampedIndex * stepSliderStepDistance;
    track.style.transition = '';
    track.style.transform = `translateX(-${currentStepSequencePos}px)`;

    let currentNode = undefined;
    for (let node of nodes) {
        if (node.classList.contains("active")) {
            currentNode = node;
            break;
        }
    }
    if (currentNode != undefined) {
        currentNode.classList.remove("active");
        currentNode.classList.add("visited");
    }
    nodes[clampedIndex].classList.remove("visited");
    nodes[clampedIndex].classList.add("active");
}

function moveStepSequenceSlider(track, position) {
    if (track == undefined) {
        return;
    }
    currentStepSequencePos = Math.min(stepSequenceTrackLength, Math.max(0, position));
    track.style.transition = "none";
    track.style.transform = `translateX(-${currentStepSequencePos}px)`;
}

function testStepMove(index) {
    let track = document.getElementsByClassName("slider-track stepped")[1];
    moveStepSliderToIndex(track, index);
}
