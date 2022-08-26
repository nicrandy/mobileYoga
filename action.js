////////// features to add and things to work on //////////
// get rolling average and eleiminate outliers for score feedback


const videoElement = document.getElementById('video');
const userCanvas = document.getElementById('reversed_user_canvas'); // draw video input image, reversed on canvas
const userContext = userCanvas.getContext('2d');
const drawingCanvas = document.getElementById('nonReversed_drawing_canvas'); // draw lines on canvas
const drawingContext = drawingCanvas.getContext('2d');
const targetCanvasFront = document.getElementById('target_pose_canvas_front'); // draw front target pose image on canvas
const targetContextFront = targetCanvasFront.getContext('2d');
const targetCanvasSide = document.getElementById('target_pose_canvas_side'); // draw side target pose image on canvas
const targetContextSide = targetCanvasSide.getContext('2d');
const scoreLineCanvas = document.getElementById('score_line');
const scoreLineContext = scoreLineCanvas.getContext('2d');

// ---------  START global variables ---------- //
var workoutInfo = [];
var allYogaPoseInfo = []; // load from json file of pose info
var currentLandmarksArray = []; // live update of output landmarks
var currentScore = 0;
var thisPoseHighScore = 0;

var numberOfPosesThisWorkout = 0; // total number of poses in this workout
var currentPoseInThisWorkout = 1; // track the current pose count starting at one

var displayLandmarkCircles = false;
var fullScreen = false;
var canUseConfirmSquares = true;
var saveWorkoutData = false;
var workoutInProgress = false;
var currentPoseScoreArray = []; // array of scores for each pose to calculate rolling average
var imageCanvasesCreated = []; // names of two image canvases created, so they can be deleted when next images loaded


var basePoseInfoFolderLocation = "workouts/Sun_Salutation/";
var preloadedImages = [];

var playingAudio = false;// if audio is currently playing
var audioStarted = false; // if the audio has been started or not
var audioFile = 'audio/airtone.mp3'; // location of audio file to play
var audioTimerFile = 'audio/timerSound.mp3' // location of audio file for timer

// display settings
var showScoreLabels = true;



// ---------  END global variables ---------- //



// from json file, includes image file location, name and pose angles
// parse the workout info file
function loadWorkoutInfoJSON(callback) {
    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open('GET', basePoseInfoFolderLocation + '/exerciseInfo.json', true);
    xobj.onreadystatechange = function () {
        if (xobj.readyState == 4 && xobj.status == "200") {
            // .open will NOT return a value but simply returns undefined in async mode so use a callback
            callback(xobj.responseText);
        }
    }
    xobj.send(null);
}
// Call to function with anonymous callback
loadWorkoutInfoJSON(function (response) {
    // Do Something with the response e.g.
    workoutInfo = JSON.parse(response); // save json info to global variable
    console.log(workoutInfo);
});








function loadJSON(callback) {
    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open('GET', basePoseInfoFolderLocation + '/poseInfo.json', true);
    xobj.onreadystatechange = function () {
        if (xobj.readyState == 4 && xobj.status == "200") {
            // .open will NOT return a value but simply returns undefined in async mode so use a callback
            callback(xobj.responseText);
        }
    }
    xobj.send(null);
}
// Call to function with anonymous callback
loadJSON(function (response) {
    // Do Something with the response e.g.
    allYogaPoseInfo = JSON.parse(response); // save json info to global variable
    parseYogaPoseInfo(allYogaPoseInfo); // get the number of unique poses in this workout
    // updatePoseCount();
    preloadedImages = preloadImages();
});

// get the number of unique poses
function parseYogaPoseInfo(poseInfo) {
    let poseNumberCounter = [];
    for (let i = 0; i < poseInfo.length; i++) {
        poseNumberCounter.push(poseInfo[i].PoseNumber);
    }
    numberOfPosesThisWorkout = countUnique(poseNumberCounter).length; // number of unique poses
    for (let i = 0; i < poseInfo.length; i++) {
        poseInfo[i].PoseNumber = parseInt(poseInfo[i].PoseNumber);
    }
}
function countUnique(iterable) {
    numArray = new Set(iterable);
    numArray = Array.from(numArray);
    numArray = numArray.sort(function (a, b) { return a - b; });
    return numArray;
}

// preload images
function preloadImages() {
    let thisPoseImages = [];
    console.log(allYogaPoseInfo.length);
    // create empty 2D array to hold images
    for (let i = 0; i < numberOfPosesThisWorkout; i++) {
        thisPoseImages[i] = [];
    }
    for (let i = 0; i < allYogaPoseInfo.length; i++) {
        let image = new Image();
        image.src = basePoseInfoFolderLocation + allYogaPoseInfo[i].RelativeLocation;
        thisPoseImages[allYogaPoseInfo[i].PoseNumber - 1].push(image.src = basePoseInfoFolderLocation + allYogaPoseInfo[i].RelativeLocation);
        // image.onload = function () {
        //     thisPoseImages[allYogaPoseInfo[i].PoseNumber - 1].push(image);
        // }
    }
    // for (let i = 0; i < allYogaPoseInfo.length; i++) {
    //     thisPoseImages[allYogaPoseInfo[i].PoseNumber - 1] = new Image();
    //     let thisImageSRC = thisPoseImages[allYogaPoseInfo[i].PoseNumber - 1].src = basePoseInfoFolderLocation + allYogaPoseInfo[i].RelativeLocation;

    // }
    console.log("images preloaded", thisPoseImages);
    return thisPoseImages;
}





function resizeCanvas() {
    userCanvas.width = window.innerWidth;
    userCanvas.height = window.innerHeight;
    drawingCanvas.width = window.innerWidth;
    drawingCanvas.height = window.innerHeight;
    scoreLineCanvas.width = window.innerWidth;
    scoreLineCanvas.height = window.innerHeight;
}
// adjust canvas size based on window size
window.addEventListener('resize', () => {
    resizeCanvas();
})
// set canvas size on page load
resizeCanvas();

// go to full screen
// Function for full screen activation
function activate(ele) {
    if (!fullScreen) {
        if (ele.requestFullscreen) {
            ele.requestFullscreen();
        }
        document.getElementById("full_screen").style.left = "85%";
        document.getElementById("full_screen").style.top = "90%";
        document.getElementById("full_screen").style.width = "15%";
        document.getElementById("full_screen").style.height = "10%";
        document.getElementById("full_screen").innerText = "Exit Full Screen";
        screen.orientation.lock('landscape');

        fullScreen = !fullScreen;
    }
    else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
        document.getElementById("full_screen").innerText = "Full Screen";
        fullScreen = !fullScreen;
    }
}

const pose = new Pose({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
    }
});
pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    smoothSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});
pose.onResults(onResults);

const camera = new Camera(videoElement, {
    onFrame: async () => {
        await pose.send({ image: videoElement });
    },
    width: window.innerWidth,
    height: window.innerHeight
});
camera.start();
function onResults(results) {
    if (!results.poseLandmarks) {
        return;
    }
    currentLandmarksArray = convertLandmarkObjectToArray(results.poseLandmarks);
    userContext.clearRect(0, 0, userCanvas.width, userCanvas.height);
    userContext.drawImage(results.image, 0, 0, userCanvas.width, userCanvas.height);
    // updatePose();
    var individualAngleScores = getScores();

    drawConfirmationSquares();
    // preloadImages();

    if (workoutInProgress) {
        drawLandmarkLines(currentLandmarksArray);
        drawScoreData();
        // drawNormalizedScoreLines();
        normalizedRecentScoreData();
        drawFeedbackCircles(individualAngleScores);
        updateTimer();
        timeInPose();
        controlAudio();
    }
}
///////////////////////////// for audio feedback ////////////////////////////////
// music playrate changes based on the current score
const audio = document.createElement('audio');
function controlAudio() {
    if (!playingAudio) {
        playingAudio = true;
        audioStarted = true;
        audio.setAttribute('src', audioFile);
        audio.play();
    }
    // check if within threshold of .5 to 2 or will crash if outside of range
    if (audioStarted) {
        if (currentScore / 100 < 0.5) {
            audio.playbackRate = 0.5;
        }
        else if (currentScore / 100 > 2) {
            audio.playbackRate = 2;
        }
        else {
            audio.playbackRate = currentScore / 100;
        }
    }
}

// play audio every set number of seconds
function playTimerAudio(timeDifferenceInSeconds) {
    let interval = 10; // seconds between audio plays
    if (timeDifferenceInSeconds > 5 && timeDifferenceInSeconds % interval == 0) {
        let timeFraction = (100 - timeDifferenceInSeconds) / 100;
        const audioSecondIndication = new Audio(audioTimerFile);
        if (timeFraction / 100 < 0.5) {
            audioSecondIndication.playbackRate = 0.5;
        }
        else if (timeFraction / 100 > 2) {
            audioSecondIndication.playbackRate = 2;
        }
        else {
            audioSecondIndication.playbackRate = timeFraction / 100;
        }
        audioSecondIndication.play();
    }
}

///////////////////////////// end audio feedback ////////////////////////////////


// take in landmarks and convert to 2D array [x,y,z,visibility]
// 32 landmarks with 4 numerical locations each
function convertLandmarkObjectToArray(landmarks) {
    let landmarkArray = [];
    for (let i = 0; i < landmarks.length; i++) {
        landmarkArray.push([landmarks[i].x, landmarks[i].y, landmarks[i].z, landmarks[i].visibility]);
    }
    return landmarkArray;
}

// convert from 3D array to object with x,y,z,visibility
function convertLandmarkArrayToObject(landmarkArray) {
    let landmarkObject = {};
    for (let i = 0; i < landmarkArray.length; i++) {
        landmarkObject[i] = {
            x: parseFloat(landmarkArray[i][0]),
            y: parseFloat(landmarkArray[i][1]),
            z: parseFloat(landmarkArray[i][2]),
            visibility: parseFloat(landmarkArray[i][3])
        }
    }
    return landmarkObject;
}





// this function tracks the time in pose and stops the timer if the score is below the threshold
var currentPoseStartTime = 0; // set the start time of current pose
var totalPoseTime = 0; // track the total time in pose
var minScoreThreshold = 60; // if score is below this threshold, stop the timer
var inPose = false; // boolean to track if user is in pose
var firstPass = true; // boolean to track if this is the first pass of the pose
var totalTime = 0; // total time in pose
function timeInPose() {
    if (currentScore > minScoreThreshold) {
        inPose = true;
        if (firstPass) {
            currentPoseStartTime = Date.now();
            firstPass = false;
        }
        else {
            totalPoseTime += Date.now() - currentPoseStartTime;
            currentPoseStartTime = Date.now();
        }
    }
    else {
        currentPoseStartTime = Date.now();
    }
    totalTime = totalPoseTime / 1000;
    totalTime = Math.round(totalTime * 10) / 10;
    let timeString = totalTime.toString();
    if (totalTime % 1 == 0) {
        timeString = totalTime + ".0";
    }
    document.getElementById("time").innerText = "Time:  " + timeString;
}

// this function tracks the total time in pose
var totalTimeForPose = 0; // track the total time for the pose
function updateTimer() {
    currentPoseEndTime = new Date().getTime();
    let timeDifference = currentPoseEndTime - totalTimeForPose;
    let timeDifferenceInSeconds = timeDifference / 1000;
    // round number to one decimal place
    // get the modulous of the variable and perform action if remainder is 0

    timeDifferenceInSeconds = Math.round(timeDifferenceInSeconds * 10) / 10;
    playTimerAudio(totalTime);


    // add .0 to time if it is exactly a whole number
    if (timeDifferenceInSeconds % 1 === 0) {
        timeDifferenceInSeconds = timeDifferenceInSeconds + ".0";
    }
    // document.getElementById("time").innerText = "Time:  " + timeDifferenceInSeconds;



    return timeDifferenceInSeconds;
}


// update current pose info and images
function updatePose() {
    currentPoseScoreArray = []; // clear the rolling average array for the next pose
    thisPoseHighScore = 0; // clear the high score for the next pose
    document.getElementById("pose_count").innerText = "Pose " + currentPoseInThisWorkout + " of " + numberOfPosesThisWorkout;
    totalTimeForPose = new Date().getTime();
    totalPoseTime = 0; // reset the total time for the pose
    // updateTargetImages();
    drawSingleImage();
    delayHighScoreCapture(); // delay the high score capture by one second
}

// draw one image
function drawSingleImage() {
    function putImageOnCanvas(canvas, context, i) {
        // place the image on the canvas
        let img = new Image();
        img.src = basePoseInfoFolderLocation + allYogaPoseInfo[i].RelativeLocation;
        img.onload = function () {
            imgWidth = img.width;
            imgHeight = img.height;
            imgRatio = img.width / img.height;
            userCanvasHeight = userCanvas.height;
            userCanvasWidth = userCanvas.width;
            userCanvasRatio = userCanvas.width / userCanvas.height;
            if (imgRatio > userCanvasRatio) {
                // image is wider than canvas
                canvas.width = userCanvasWidth * 0.5
                canvas.height = userCanvasHeight * 0.5 / imgRatio
            }
            else {
                // image is taller than canvas
                canvas.width = userCanvasWidth * 0.5 * imgRatio;
                canvas.height = userCanvasHeight * 0.5
            }
            canvas.style.left = "0%";
            let top = (userCanvas.height - canvas.height);
            canvas.style.top = top + "px";
            // clear the canvas
            context.clearRect(0, 0, canvas.width, canvas.height);
            // draw aura from center of canvas
            var x = canvas.width / 2,
                y = canvas.height / 2,
                // Radii of the white glow.
                innerRadius = x / 2,
                outerRadius = x,
                // Radius of the entire circle.
                radius = canvas.width;
            // change the aura based on image ratio
            if (imgHeight < imgWidth) {
                innerRadius = y / 2;
                outerRadius = y;
            }

            var gradient = context.createRadialGradient(x, y, innerRadius, x, y, outerRadius);
            gradient.addColorStop(0, 'rgba(238,255,20,1)');
            gradient.addColorStop(1, 'rgba(255,161,20,0)');

            context.arc(x, y, radius, 0, 2 * Math.PI);

            context.fillStyle = gradient;
            context.fill();

            context.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
    }
    for (let i = 0; i < allYogaPoseInfo.length; i++) {
        if (allYogaPoseInfo[i].PoseNumber == currentPoseInThisWorkout) {
            let poseToDisplay = workoutInfo[0].BestPoseImage;
            poseToDisplay = poseToDisplay[currentPoseInThisWorkout - 1];
            console.log("Pose to display: " + poseToDisplay);
            if (allYogaPoseInfo[i].FrontOrSide == poseToDisplay) {
                putImageOnCanvas(targetCanvasFront, targetContextFront, i);
            }
        }
    }
}


// draw two images
function drawImages() {
    // check to see which of the image angles are present
    let frontImagePresent = false;
    let backImagePresent = false;
    let leftImagePresent = false;
    let rightImagePresent = false;
    for (let i = 0; i < allYogaPoseInfo.length; i++) {
        if (allYogaPoseInfo[i].PoseNumber == currentPoseInThisWorkout) {
            if (allYogaPoseInfo[i].FrontOrSide === "front") {
                frontImagePresent = true;
            }
            if (allYogaPoseInfo[i].FrontOrSide === "back") {
                backImagePresent = true;
            }
            if (allYogaPoseInfo[i].FrontOrSide === "left") {
                leftImagePresent = true;
            }
            if (allYogaPoseInfo[i].FrontOrSide === "right") {
                rightImagePresent = true;
            }
        }
    }
    function putImageOnCanvas(canvas, context, i) {
        // place the image on the canvas
        let img = new Image();
        img.src = basePoseInfoFolderLocation + allYogaPoseInfo[i].RelativeLocation;
        img.onload = function () {
            imgWidth = img.width;
            imgHeight = img.height;
            imgRatio = img.width / img.height;
            userCanvasHeight = userCanvas.height;
            userCanvasWidth = userCanvas.width;
            userCanvasRatio = userCanvas.width / userCanvas.height;
            if (imgRatio > userCanvasRatio) {
                // image is wider than canvas
                canvas.width = userCanvasWidth * 0.5
                canvas.height = userCanvasHeight * 0.5 / imgRatio
            }
            else {
                // image is taller than canvas
                canvas.width = userCanvasWidth * 0.5 * imgRatio;
                canvas.height = userCanvasHeight * 0.5
            }


            if (canvas == targetCanvasFront) {
                canvas.style.left = "0%";
            }
            else {
                let left = (userCanvas.width - canvas.width)
                canvas.style.left = left + "px";
            }
            let top = (userCanvas.height - canvas.height);
            canvas.style.top = top + "px";
            // clear the canvas
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
    }
    for (let i = 0; i < allYogaPoseInfo.length; i++) {
        if (allYogaPoseInfo[i].PoseNumber == currentPoseInThisWorkout) {
            if (allYogaPoseInfo[i].FrontOrSide === "front") {
                putImageOnCanvas(targetCanvasFront, targetContextFront, i);

            }
            if (allYogaPoseInfo[i].FrontOrSide === "right") {
                putImageOnCanvas(targetCanvasSide, targetContextSide, i);

            }
        }
    }
}


function updateTargetImages() {
    function calculateImageCropArea(image, landmarks) {
        let cropXBoarderAmount = image.width * 0.1;
        let cropYBoarderAmount = image.height * 0.1;
        //iterate landmarks array and calculate min and max x and y values for the image landmarks
        let minX = image.width;
        let maxX = 0;
        let minY = image.height;
        let maxY = 0;
        for (let i = 0; i < landmarks.length; i++) {
            if (landmarks[i][0] < minX) {
                minX = landmarks[i][0];
            }
            if (landmarks[i][0] > maxX) {
                maxX = landmarks[i][0];
            }
            if (landmarks[i][1] < minY) {
                minY = landmarks[i][1];
            }
            if (landmarks[i][1] > maxY) {
                maxY = landmarks[i][1];
            }
        }

        let imageCropArea = {
            sx: 0,
            sy: 0,
            swidth: 0,
            sheight: 0
        }
        imageCropArea.sx = parseInt(image.width * minX - cropXBoarderAmount);
        imageCropArea.sy = parseInt(image.height * minY - cropYBoarderAmount);
        imageCropArea.swidth = parseInt(image.width * maxX + cropXBoarderAmount);
        imageCropArea.sheight = parseInt(image.height * maxY + cropYBoarderAmount);
        console.log("crop areas: " + imageCropArea.sx + " " + imageCropArea.sy + " " + imageCropArea.swidth + " " + imageCropArea.sheight + " " + minY + " " + maxY + " " + minX + " " + maxX);
        return imageCropArea;
    }
    // iterate all pose info and update the target images
    let usedFirstImage = false;
    let usedBothImages = false;
    function updateImage(canvas, context, i, flipped) {


        if (flipped) {
            // flip the canvas context horizontally
            context.translate(canvas.width, 0);
            context.scale(-1, 1);
            console.log(" flipped front image ")
        }
        let img = new Image();
        img.src = basePoseInfoFolderLocation + allYogaPoseInfo[i].RelativeLocation;
        img.onload = function () {
            if (usedFirstImage) {
                usedBothImages = true;
            }
            else {
                usedFirstImage = true;
            }
            // let imageCropArea = calculateImageCropArea(img, allYogaPoseInfo[i].Landmarks);
            canvas.width = img.width / 3;
            canvas.height = img.height / 3;


            canvas.style.left = "10%";
            canvas.style.top = (window.height - canvas.height) + "px";
            console.log("used first image  " + usedFirstImage + " " + i);

            // if (usedBothImages) {
            //     canvas.style.left = "70%";
            //     canvas.style.top = (window.height - canvas.height) + "px";
            //     console.log("used both images " + usedBothImages + " " + i);
            // }
            context.clearRect(0, 0, canvas.width, canvas.height);
            // context.drawImage(img, imageCropArea.sx, imageCropArea.sy, imageCropArea.swidth, imageCropArea.sheight, 0, 0, canvas.width, canvas.height);

            context.drawImage(img, 0, 0, canvas.width, canvas.height);


        }
    }
    // create a new canvas for the target image
    function createImageCanvas(frontOrSide, i) {
        // remove previous canvas if it exists
        if (imageCanvasesCreated.length > 0) {
            for (let j = 0; j < imageCanvasesCreated.length; j++) {
                let node = document.getElementById('"' + imageCanvasesCreated[j] + '"');
                console.log("removing canvas " + imageCanvasesCreated[j]);
                node.remove();
            }
        }

        let img = new Image();
        img.src = basePoseInfoFolderLocation + allYogaPoseInfo[i].RelativeLocation;
        console.log("image src: " + img.src);
        img.onload = function () {
            console.log("image size: " + img.width + " " + img.height);

            let canvas = document.createElement('canvas');
            let context = canvas.getContext('2d');
            if (frontOrSide == "front") {
                canvas.style.left = "20%";
                canvas.style.top = (window.innerHeight - canvas.height) + "%";
            }
            else {
                canvas.style.left = "80%";
                canvas.style.top = (window.innerHeight - canvas.height) + "%";
            }
            let canvasName = "target_image_" + frontOrSide + "_" + i;
            canvas.id = canvasName;
            imageCanvasesCreated.push(canvas);
            console.log("canvas id: " + canvas.id);
            canvas.width = img.width;
            canvas.height = img.height;
            document.getElementById("image_canvases").appendChild(canvas);

            // context.clearRect(0, 0, canvas.width, canvas.height);

            let createdcanvas = document.getElementById(canvasName);
            let createdcontext = createdcanvas.getContext('2d');
            createdcontext.drawImage(img, 0, 0);


        }
        if (usedFirstImage) {
            usedBothImages = true;
        }
        else {
            usedFirstImage = true;
        }

    }
    // check to see which of the image angles are present
    let frontImagePresent = false;
    let backImagePresent = false;
    let leftImagePresent = false;
    let rightImagePresent = false;
    for (let i = 0; i < allYogaPoseInfo.length; i++) {
        if (allYogaPoseInfo[i].PoseNumber == currentPoseInThisWorkout) {

            if (allYogaPoseInfo[i].FrontOrSide === "front") {
                frontImagePresent = true;
            }
            if (allYogaPoseInfo[i].FrontOrSide === "back") {
                backImagePresent = true;
            }
            if (allYogaPoseInfo[i].FrontOrSide === "left") {
                leftImagePresent = true;
            }
            if (allYogaPoseInfo[i].FrontOrSide === "right") {
                rightImagePresent = true;
            }
        }
    }
    console.log("front: " + frontImagePresent + " back: " + backImagePresent + " left: " + leftImagePresent + " right: " + rightImagePresent);
    for (let i = 0; i < allYogaPoseInfo.length; i++) {
        if (allYogaPoseInfo[i].PoseNumber == currentPoseInThisWorkout) {
            // check if there is a front image first, then right, then left, then back
            if (allYogaPoseInfo[i].FrontOrSide == "front" && usedBothImages == false) {
                if (frontImagePresent) {
                    if (usedFirstImage == false) {
                        updateImage(targetCanvasFront, targetContextFront, i, true); // true means flip the image
                        console.log("using front image " + usedFirstImage)
                        // createImageCanvas("front", i);
                    }
                    else {
                        updateImage(targetCanvasSide, targetContextSide, i);
                        // createImageCanvas("side", i);
                    }
                }
            }
            else if (allYogaPoseInfo[i].FrontOrSide == "right" && usedBothImages == false) {
                if (rightImagePresent) {
                    if (usedFirstImage == false) {
                        updateImage(targetCanvasFront, targetContextFront, i);
                        // createImageCanvas("front", i);
                    }
                    else {
                        updateImage(targetCanvasSide, targetContextSide, i);
                        // createImageCanvas("side", i);
                    }
                }
            }
            else if (allYogaPoseInfo[i].FrontOrSide == "left" && usedBothImages == false && ((!frontImagePresent && !rightImagePresent) || leftImagePresent)) {
                if (!frontImagePresent && !rightImagePresent) {
                    if (usedFirstImage == false) {
                        updateImage(targetCanvasFront, targetContextFront, i);
                        // createImageCanvas("front", i);
                    }
                    else {
                        updateImage(targetCanvasSide, targetContextSide, i);
                        // createImageCanvas("side", i);
                    }
                }
            }
            else if (allYogaPoseInfo[i].FrontOrSide == "back" && usedBothImages == false && ((!frontImagePresent && !rightImagePresent && !leftImagePresent) || backImagePresent)) {
                if (!frontImagePresent && !rightImagePresent && !leftImagePresent) {
                    if (usedFirstImage == false) {
                        updateImage(targetCanvasFront, targetContextFront, i);
                        // createImageCanvas("front", i);
                    }
                    else {
                        updateImage(targetCanvasSide, targetContextSide, i);
                        // createImageCanvas("side", i);
                    }
                }
            }
        }
    }
}




// capture still image from camera
function captureImage() {
    userContext.drawImage(videoElement, 0, 0, userCanvas.width, userCanvas.height);
    // save image to file
    let imageData = userContext.getImageData(0, 0, userCanvas.width, userCanvas.height);
    let image = new Image();
    image.src = userCanvas.toDataURL("image/png");
    image.width = userCanvas.width;
    image.height = userCanvas.height;
}

// draw lines between landmarks and circles on landmark locations
function drawLandmarkLines(landmarks) {
    // connections to draw based on Blazepose model card
    let connections = [[11, 13], [13, 15], [15, 19], [12, 14], [14, 16], [16, 20], [12, 11], [12, 24], [11, 23], [23, 24], [23, 25], [24, 26], [26, 28], [25, 27], [27, 31], [28, 32]];
    connections.forEach(function (item, index) {
        let xStart = Math.round(landmarks[item[0]][0] * userCanvas.width);
        let yStart = Math.round(landmarks[item[0]][1] * userCanvas.height);
        let yFinish = Math.round(landmarks[item[1]][1] * userCanvas.height);
        let xFinish = Math.round(landmarks[item[1]][0] * userCanvas.width);
        userContext.beginPath();
        userContext.moveTo(xStart, yStart);

        if (item[0] == 12 && item[1] == 11 || item[0] == 23 && item[1] == 24) { // between shoulders and hips
            userContext.strokeStyle = 'rgba(45,0,249,0.5)';
        }
        else if (item[0] % 2 == 0) { // right side of body
            userContext.strokeStyle = 'rgba(242,29,29,0.5)';
        }
        else { // left side of body
            userContext.strokeStyle = 'rgba(0,236,61,0.5)';
        }
        userContext.lineWidth = 10;
        userContext.lineCap = 'round';
        userContext.lineTo(xFinish, yFinish);
        userContext.stroke();

        userContext.beginPath();
        userContext.moveTo(xStart, yStart);

        if (item[0] == 12 && item[1] == 11 || item[0] == 23 && item[1] == 24) {
            userContext.strokeStyle = 'rgba(0,237,249,0.8)';
        }
        else if (item[0] % 2 == 0) {
            userContext.strokeStyle = 'rgba(255,20,251,0.8)';
        }
        else {
            userContext.strokeStyle = 'rgba(57,236,0,0.8)';
        }
        userContext.lineWidth = 2;
        userContext.lineCap = 'round';
        userContext.lineTo(xFinish, yFinish);
        userContext.stroke();
    });
    if (displayLandmarkCircles) {
        for (let i = 0; i < landmarks.length; i++) {
            const landmark = landmarks[i];
            const x = landmark[0] * userCanvas.width;
            const y = landmark[1] * userCanvas.height;
            let circleDiameter = 10;
            if (i == 0) {
                userContext.fillStyle = 'lightgreen';
                userContext.strokeStyle = 'green';
                // get the distance between points in 2d space
                let distance = Math.sqrt(Math.pow(landmarks[11][0] - landmarks[12][0], 2) + Math.pow(landmarks[11][1] - landmarks[12][1], 2));
                distance = parseInt(distance * userCanvas.width / 3.5);
                circleDiameter = distance;
                // don't draw green circle on head
                circleDiameter = 0;
            }
            else if (i < 11) {
                // change circleDiameter to draw facial landmarks
                userContext.fillStyle = 'lightblue';
                userContext.strokeStyle = 'blue';
                circleDiameter = 0;
            }
            else if (i % 2 == 0) {
                userContext.fillStyle = 'orange';
                userContext.strokeStyle = 'red';
                circleDiameter = 15;
            }
            else {
                userContext.fillStyle = 'lightgreen';
                userContext.strokeStyle = 'green';
                circleDiameter = 15;
            }
            userContext.linewidth = 10;
            userContext.beginPath();
            userContext.arc(x, y, circleDiameter, 0, 2 * Math.PI);
            userContext.closePath();
            userContext.fill();
            userContext.stroke();
        }
    }
}

// draw squares on top left and top right of the image to act as confirmation areas. When user puts hands in both squares, it confirms the selection
var startConfirmation = false; // flag to start confirmation
var completeConfirmation = false; // flag to complete confirmation
function drawConfirmationSquares() {
    document.getElementById("status").style.visibility = "hidden";
    // clear the drawingContext
    // drawingContext.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    let showHands = false;
    let upperCorners = false;
    let nearHead = true;
    if (showHands) {
        // draw hands for confirmation area
        let leftHandImage = new Image();
        leftHandImage.src = "images/leftHand.png";
        leftHandImage.onload = function () {
            drawingContext.drawImage(leftHandImage, 0, 0, userCanvas.width * .1, userCanvas.height * .1);
        }
        let rightHandImage = new Image();
        rightHandImage.src = "images/rightHand.png";
        rightHandImage.onload = function () {
            drawingContext.drawImage(rightHandImage, userCanvas.width * .9, 0, userCanvas.width * .1, userCanvas.height * .1);
        }
    }
    // draw circles instead of hands
    if (upperCorners) {
        let circleDiameter = userCanvas.width * .03;
        userContext.linewidth = 5;
        userContext.fillStyle = 'rgba(88,24,69,0.05)';
        userContext.strokeStyle = 'rgb(0, 200, 0)';
        userContext.beginPath();
        userContext.arc(userCanvas.width * .05, userCanvas.height * .05, circleDiameter, 0, 2 * Math.PI);
        userContext.closePath();
        userContext.fill();
        userContext.stroke();

        userContext.fillStyle = 'rgba(88,24,69,0.05)';
        userContext.strokeStyle = 'rgb(200, 0, 0)';
        userContext.beginPath();
        userContext.arc(userCanvas.width * .95, userCanvas.height * .05, circleDiameter, 0, 2 * Math.PI);
        userContext.closePath();
        userContext.fill();
        userContext.stroke();
    }
    let nearHeadCircleDiameter = parseInt(Math.abs(currentLandmarksArray[11][0] - currentLandmarksArray[12][0]) * userCanvas.width * .15);
    let leftX = parseInt(currentLandmarksArray[11][0] * userCanvas.width); // left shoulder
    let leftY = parseInt(currentLandmarksArray[3][1] * userCanvas.height); // left eye
    let rightX = parseInt(currentLandmarksArray[12][0] * userCanvas.width); // right shoulder
    let rightY = parseInt(currentLandmarksArray[6][1] * userCanvas.height); // right eye
    if (nearHead) {
        userContext.linewidth = 5;
        userContext.fillStyle = 'rgba(88,24,69,0.5)';
        userContext.strokeStyle = 'rgb(0, 200, 0)';
        userContext.beginPath();
        userContext.arc(leftX, leftY, nearHeadCircleDiameter, 0, 2 * Math.PI);
        userContext.closePath();
        userContext.fill();
        userContext.stroke();
        userContext.fillStyle = 'rgba(88,24,69,0.5)';
        userContext.strokeStyle = 'rgb(200, 0, 0)';
        userContext.beginPath();
        userContext.arc(rightX, rightY, nearHeadCircleDiameter, 0, 2 * Math.PI);
        userContext.closePath();
        userContext.fill();
        userContext.stroke();
    }

    // get the center of the users right and left hand, mid point between pinky and thumb
    let RightHandCenterX = ((currentLandmarksArray[22][0] - currentLandmarksArray[18][0]) / 2) + currentLandmarksArray[18][0];
    let RightHandCenterY = ((currentLandmarksArray[22][1] - currentLandmarksArray[18][1]) / 2) + currentLandmarksArray[18][1];
    let LeftHandCenterX = ((currentLandmarksArray[21][0] - currentLandmarksArray[17][0]) / 2) + currentLandmarksArray[17][0];
    let LeftHandCenterY = ((currentLandmarksArray[21][1] - currentLandmarksArray[17][1]) / 2) + currentLandmarksArray[17][1];
    // draw a circle at the center of the hands
    circleDiameter = 20;
    userContext.fillStyle = 'rgba(88,24,69,0.5)';
    userContext.strokeStyle = 'green';
    userContext.beginPath();
    userContext.arc(LeftHandCenterX * userCanvas.width, LeftHandCenterY * userCanvas.height, circleDiameter, 0, 2 * Math.PI);
    userContext.closePath();
    userContext.fill();
    userContext.stroke();
    userContext.fillStyle = 'rgba(88,24,69,0.5)';
    userContext.strokeStyle = 'red';
    userContext.beginPath();
    userContext.arc(RightHandCenterX * userCanvas.width, RightHandCenterY * userCanvas.height, circleDiameter, 0, 2 * Math.PI);
    userContext.closePath();
    userContext.fill();
    userContext.stroke();
    // detect if the user has put their hands in the confirmation squares
    function confirmChoice() {
        startConfirmation = true;
        setTimeout(() => {
            completeConfirmation = true;
        }, "1000") // hands must be in confirmation area for set amount of time
        console.log("confirm statuses: " + startConfirmation + " " + completeConfirmation + " " + canUseConfirmSquares);
        if (completeConfirmation && startConfirmation) {
            if (!workoutInProgress) {
                startWorkout();
            }
            else {
                currentPoseInThisWorkout++;
                if (currentPoseInThisWorkout <= numberOfPosesThisWorkout) {
                    updatePose();
                }
                else {
                    workoutFinished();
                }
            }

            canUseConfirmSquares = false;
            setTimeout(() => {
                canUseConfirmSquares = true;
            }, "3000")
        }
    }
    if (canUseConfirmSquares) {
        if (upperCorners || showHands) {
            if (RightHandCenterX < .1 && RightHandCenterY < .1 && LeftHandCenterX > .9 && LeftHandCenterY < .1) {
                confirmChoice();
            }
        }
        else if (nearHead) {
            // check if the rightHandCenterX and LeftHandCenterX are within the nearHeadCircleDiameter area
            let leftx = LeftHandCenterX;
            let lefty = LeftHandCenterY;
            let leftcircleX = currentLandmarksArray[11][0];
            let leftcircleY = currentLandmarksArray[3][1];
            let leftrad = Math.abs(currentLandmarksArray[11][0] - currentLandmarksArray[12][0]) * .15;
            let rightx = RightHandCenterX;
            let righty = RightHandCenterY;
            let rightcircleX = currentLandmarksArray[12][0];
            let rightcircleY = currentLandmarksArray[6][1];
            let rightrad = Math.abs(currentLandmarksArray[11][0] - currentLandmarksArray[12][0]) * .15;
            if (((leftx - leftcircleX) * (leftx - leftcircleX) + (lefty - leftcircleY) * (lefty - leftcircleY) <= leftrad * leftrad) &&
                ((rightx - rightcircleX) * (rightx - rightcircleX) + (righty - rightcircleY) * (righty - rightcircleY) <= rightrad * rightrad)) {
                confirmChoice();
            }
            else {
                startConfirmation = false;
                completeConfirmation = false;
            }
        }
        else {
            confirmChoice();

        }
    }

}

function startWorkout() {
    workoutInProgress = true;
    updatePose();
    if (!saveWorkoutData) {
        timerToSaveData();
        saveWorkoutData = true;
    }
    if (showScoreLabels) {
        let scoreClasses = document.getElementsByClassName("score_info");
        for (let i = 0; i < scoreClasses.length; i++) {
            scoreClasses[i].style.visibility = "visible";
        }
        // let lineLabels = document.getElementsByClassName("line_label");
        // for (let i = 0; i < lineLabels.length; i++) {
        //     lineLabels[i].style.visibility = "visible";
        // }
    }

}

function workoutFinished() {
    document.getElementById("pose_count").innerText = "You done finished fool! Congratulagtiones!";
    workoutInProgress = false;
    console.log("workout finished");
    targetContextSide.clearRect(0, 0, targetCanvasSide.width, targetCanvasSide.height);
    targetContextFront.clearRect(0, 0, targetCanvasFront.width, targetCanvasFront.height);
    scoreLineContext.clearRect(0, 0, scoreLineCanvas.width, scoreLineCanvas.height);
    let scoreClass = document.getElementsByClassName("score_info");
    for (let i = 0; i < scoreClass.length; i++) {
        scoreClass[i].style.visibility = "hidden";
    }
    parseWorkoutData(allWorkoutData);
}

// save user data
var scoreArray = [];
var normalizedScoreArray = [];
// draw score data on canvas
function drawNormalizedScoreLines() {
    document.getElementById("score_line").style.zIndex = 1;
    // scoreLineContext.clearRect(0, 0, scoreLineCanvas.width, scoreLineCanvas.height);
    // draw background line with darker color
    scoreLineContext.strokeStyle = "white";
    scoreLineContext.lineWidth = 2;
    scoreLineContext.beginPath();
    // normalize the score array between 0 and 1 and save as new array

    let array = currentPoseScoreArray;
    let min = 10000
    let max = -10000;
    for (let i = 0; i < array.length; i++) {
        if (array[i] < min) {
            min = array[i];
        }
        if (array[i] > max) {
            max = array[i];
        }
    }
    let normalizedArray = [];
    for (let i = 0; i < array.length; i++) {
        normalizedArray.push((array[i] - min) / (max - min));
    }
    let startY = document.getElementById("score_display").offsetHeight
    let startX = (document.getElementById("score_display").offsetWidth / 2);
    let endY = window.innerHeight;
    let endX = document.getElementById("score_display").offsetWidth;
    scoreLineContext.lineWidth = 10;

    scoreLineContext.moveTo(startX, 0);
    for (let i = 0; i < normalizedArray.length; i++) {
        // let moveToX = parseInt(scoreLineCanvas.width / (scoreArray.length / (i + 1)));
        // let moveToY = parseInt(scoreLineCanvas.height - (4 * (scoreArray[i] - 50)));
        let moveToY = parseInt((endY / (normalizedArray.length / (i + 1))));
        let moveToX = parseInt((endX * normalizedArray[i]));
        scoreLineContext.lineTo(moveToX, moveToY);
    }
    scoreLineContext.fill();
    scoreLineContext.stroke();
}
function drawScoreData() {
    let drawCurrentScore = true;
    let drawAvgScore = false;
    let drawMaxScore = false;
    document.getElementById("score_line").style.zIndex = 1;
    scoreLineContext.clearRect(0, 0, scoreLineCanvas.width, scoreLineCanvas.height);
    // current score line
    if (drawCurrentScore) {

        // draw background line with darker color
        let scoreArray = currentPoseScoreArray;
        let lowerLimit = 80;
        let upperLimit = 100;
        let colorSolidChoices = ['red', 'orange', 'green'];
        let colorStrokeChoices = ['pink', 'yellow', 'lightgreen'];
        let selectionChoice = 0;
        if (currentScore < lowerLimit) {
            selectionChoice = 0;
        }
        else if (currentScore < upperLimit) {
            selectionChoice = 1;
        }
        else {
            selectionChoice = 2;
        }

        scoreLineContext.fillStyle = "rgba(0, 255, 50, 0)";
        scoreLineContext.strokeStyle = [colorSolidChoices[selectionChoice]];
        scoreLineContext.lineWidth = 10;
        scoreLineContext.beginPath();
        scoreLineContext.moveTo(-(scoreLineCanvas.width * .1), scoreLineCanvas.height);
        for (let i = 0; i < scoreArray.length; i++) {
            let moveToX = parseInt(scoreLineCanvas.width / (scoreArray.length / (i + 1)));
            let moveToY = parseInt(scoreLineCanvas.height - (4 * (scoreArray[i] - 50)));
            if (moveToY < 10000) {
                scoreLineContext.lineTo(moveToX, moveToY);
            }
        }
        scoreLineContext.fill();
        scoreLineContext.stroke();
        // draw foreground line with lighter color
        scoreLineContext.fillStyle = "rgba(0, 255, 50, 0)";
        scoreLineContext.strokeStyle = [colorStrokeChoices[selectionChoice]];
        scoreLineContext.lineWidth = 3;
        scoreLineContext.beginPath();
        scoreLineContext.moveTo(0, scoreLineCanvas.height);
        let moveToX = 0;
        let moveToY = 0;
        for (let i = 0; i < scoreArray.length; i++) {
            moveToX = parseInt(scoreLineCanvas.width / (scoreArray.length / (i + 1)));
            moveToY = parseInt(scoreLineCanvas.height - (4 * (scoreArray[i] - 50)));
            if (moveToY < 10000) {
                scoreLineContext.lineTo(moveToX, moveToY);
            }
        }
        scoreLineContext.fill();
        scoreLineContext.stroke();
        document.getElementById("now_line_lable").style.left = "96%";
        document.getElementById("now_line_lable").style.top = (moveToY - 10) + "px";
    }

    // draw high score line
    if (drawMaxScore) {
        let highScore = calculateRollingAverageAndHighScore()[1];
        scoreLineContext.fillStyle = "rgba(0, 255, 50, 0)";
        scoreLineContext.strokeStyle = [colorStrokeChoices[selectionChoice]];
        scoreLineContext.lineWidth = 3;
        scoreLineContext.beginPath();
        let highyPosition = parseInt(scoreLineCanvas.height - (4 * (highScore - 50)))
        scoreLineContext.moveTo(0, highyPosition);
        scoreLineContext.lineTo(scoreLineCanvas.width, highyPosition);
        scoreLineContext.fill();
        scoreLineContext.stroke();

        document.getElementById("high_line_lable").style.left = "96%";
        document.getElementById("high_line_lable").style.top = (highyPosition - 10) + "px";
    }

    if (drawAvgScore) {
        // draw average score line
        let avgScore = calculateRollingAverageAndHighScore()[0];
        scoreLineContext.fillStyle = "rgba(0, 255, 50, 0)";
        scoreLineContext.strokeStyle = [colorStrokeChoices[selectionChoice]];
        scoreLineContext.lineWidth = 3;
        scoreLineContext.beginPath();
        let avgyPosition = parseInt(scoreLineCanvas.height - (4 * (avgScore - 50)))
        scoreLineContext.moveTo(0, avgyPosition);
        scoreLineContext.lineTo(scoreLineCanvas.width, avgyPosition);
        scoreLineContext.fill();
        scoreLineContext.stroke();

        document.getElementById("avg_line_lable").style.left = "96%";
        document.getElementById("avg_line_lable").style.top = (avgyPosition - 10) + "px";
    }
}

// draw circles on landmarks to indicate how well the angle matches the target pose angle
// take in the output from angle differences between user and target pose
function drawFeedbackCircles(angles) {
    // allAngles = [leftShoulderAngle, rightShoulderAngle, leftElbowAngle, rightElbowAngle, leftArmAngleToGround, rightArmAngleToGround, leftHipAngle, rightHipAngle, leftKneeAngle, rightKneeAngle, leftLegAngleToGround, rightLegAngleToGround, leftFootAngle, rightFootAngle];
    let drawingCanvas = userContext;
    let targetLandmarks = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 29, 30, 27, 28];
    // draw lines from landmark to lowest Y point (ground)
    // find lowest Y point
    let lowestY = 0;
    for (let i = 0; i < currentLandmarksArray.length; i++) {
        if (currentLandmarksArray[i][1] > lowestY) {
            lowestY = currentLandmarksArray[i][1];
        }
    }
    let landmarkStartPoints = [13, 14, 25, 26];
    let good = 30;
    let OK = 60;
    let bad = 90;
    for (let i = 0; i < angles.length; i++) {
        if (angles[i] < good) {
            drawingCanvas.fillStyle = 'rgba(0, 255, 0,0.5)'; // green
        }
        else if (angles[i] < OK) {
            drawingCanvas.fillStyle = 'rgba(255, 255, 0,0.5)'; // yellow
        }
        else {
            drawingCanvas.fillStyle = 'rgba(255, 0, 0,0.5)'; // red
        }
        for (let j = 0; j < currentLandmarksArray.length; j++) {
            if (j == targetLandmarks[i]) {
                // don't draw midpoint to ground 
                if (targetLandmarks[i] != 15 && targetLandmarks[i] != 16 && targetLandmarks[i] != 29 && targetLandmarks[i] != 30) {
                    drawingCanvas.beginPath();
                    drawingCanvas.arc(currentLandmarksArray[j][0] * userCanvas.width, currentLandmarksArray[j][1] * userCanvas.height, 30, 0, 2 * Math.PI);
                    drawingCanvas.closePath();
                    drawingCanvas.fill();
                }
            }
        }
        // for (let i = 0; i < landmarkStartPoints.length; i++) {
        //     for (let j = 0; j < currentLandmarksArray.length; j++) {
        //         if (j == landmarkStartPoints[i]) {
        //             drawingCanvas.lineWidth = 3;
        //             drawingCanvas.beginPath();
        //             drawingCanvas.moveTo(currentLandmarksArray[j][0] * userCanvas.width, currentLandmarksArray[j][1] * userCanvas.height);
        //             drawingCanvas.lineTo(currentLandmarksArray[j][0] * userCanvas.width, lowestY * userCanvas.height);
        //             drawingCanvas.stroke();
        //         }
        //     }
        // }
    }
}

////////////////////// calculations //////////////////////

function formulaToCalculatePoseScore(angle) {
    return parseInt(((1500 - parseInt(angle)) / 10));
}

function getScores() {
    userDistances = CalculateLandmarkNormalizedDistances(convertLandmarkArrayToObject(currentLandmarksArray));
    userAngles = CalculateAllAngles(convertLandmarkArrayToObject(currentLandmarksArray));
    let minDistance = 100000000;
    let minAngle = 100000000;
    let bestIndividualAngleDifferencesArray = [];
    for (let i = 0; i < allYogaPoseInfo.length; i++) {
        if (allYogaPoseInfo[i].PoseNumber == currentPoseInThisWorkout) {

            var targetLandmarks = allYogaPoseInfo[i].Landmarks;
            var targetDistances = CalculateLandmarkNormalizedDistances(convertLandmarkArrayToObject(targetLandmarks));
            var differenceScore = CalculateDistanceDifferences(userDistances, targetDistances);

            var targetAngles = CalculateAllAngles(convertLandmarkArrayToObject(targetLandmarks));
            let poseHandicap = 10; // amount of play to allow for each angle difference
            var returneddifferenceAngle = CalculateAngleDifferences(userAngles, targetAngles, poseHandicap);
            var differenceAngle = returneddifferenceAngle[0];
            var returnedindividualAngleDifferences = returneddifferenceAngle[1];
        }
        if (differenceScore < minDistance) {
            minDistance = differenceScore;
        }
        if (differenceAngle < minAngle) {
            minAngle = differenceAngle;
            bestIndividualAngleDifferencesArray = returneddifferenceAngle[1];
        }
        if (scoreArray.length < 300 && minAngle > 10 && minAngle < 1000) {
            scoreArray.push(formulaToCalculatePoseScore(minAngle));
        }
        else {
            if (minAngle > 10 && minAngle < 10000) {
                scoreArray.shift();
                scoreArray.push(formulaToCalculatePoseScore(minAngle));
            }
        }
    }
    return bestIndividualAngleDifferencesArray;
}



function normalizedRecentScoreData() {
    let scoreModifierAmount = -30; // adjust the score numbers by a set amount
    /// remove abnormal data and average 5 latest data points
    var normalizedData = 0;
    let latestFiveArray = []; // get the latest 5 data points
    let latestFiveAverage = 0; // get the average of the latest 5 data points
    let normalizedDataArray = [];
    // first, get the five latest data points
    for (let j = 0; j < 10; j++) {
        latestFiveArray.push(scoreArray[scoreArray.length - j - 1]);
    }
    // second, get the average of the latest 5 data points
    for (let j = 0; j < latestFiveArray.length; j++) {
        latestFiveAverage += latestFiveArray[j];
    }
    latestFiveAverage = latestFiveAverage / latestFiveArray.length;
    // third, remove abnormal data
    for (let j = 0; j < latestFiveArray.length; j++) {
        if (latestFiveArray[j] < latestFiveAverage * 1.2 || latestFiveArray[j] > latestFiveAverage * .8) {
            normalizedDataArray.push(latestFiveArray[j]);
        }
    }
    // fourth, get the average of the normalized data
    for (let j = 0; j < normalizedDataArray.length; j++) {
        normalizedData += normalizedDataArray[j];
    }
    normalizedData = normalizedData / normalizedDataArray.length;
    let displayScore = parseInt(normalizedData);
    document.getElementById("score").innerText = "Now:  " + (displayScore + scoreModifierAmount) + "%";
    document.getElementById("avg_score").innerText = "Avg:  " + (calculateRollingAverageAndHighScore()[0] + scoreModifierAmount) + "%";
    // document.getElementById("high_score").innerText = "High:  " + (calculateRollingAverageAndHighScore()[1] + scoreModifierAmount) + "%";

    // push to array if length is less than 300
    if (currentPoseScoreArray.length < 300) {
        currentPoseScoreArray.push(normalizedData);
    }
    else {
        currentPoseScoreArray.shift();
        currentPoseScoreArray.push(normalizedData);
    }
    // currentPoseScoreArray.push(displayScore);
    currentScore = parseInt((normalizedData - 30));
    return normalizedData;
}

// calculate the rolling average of the scoreArray
function calculateRollingAverageAndHighScore() {
    let rollingAverage = 0;
    for (let i = 0; i < currentPoseScoreArray.length; i++) {
        rollingAverage += currentPoseScoreArray[i];
        if (currentPoseScoreArray[i] > thisPoseHighScore) {
            thisPoseHighScore = parseInt(currentPoseScoreArray[i] * 10) / 10;
        }
    }
    rollingAverage = parseInt(rollingAverage / currentPoseScoreArray.length);
    return [rollingAverage, thisPoseHighScore];
}

// calculate the average of recent scores
function calculateRecentScoresAverage() {
    let average = 0;
    let numberOfScoresToAverage = 7
    for (let i = currentPoseScoreArray.length - numberOfScoresToAverage; i < currentPoseScoreArray.length; i++) {
        average += currentPoseScoreArray[i];
    }
    average = parseInt(average / numberOfScoresToAverage);

    if (scoreArray.length < 300) {
        scoreArray.push(average);
    }
    else {
        scoreArray.shift();
        scoreArray.push(average);
    }
    return average;
}

// take in the landmarks object and calculat the distances from landmarks to center of body
let distancesToCalculate = [0, 13, 14, 15, 16, 25, 26, 27, 28]; // landmarks to calculate distances to center of body
function CalculateLandmarkNormalizedDistances(landmarks) {
    // calculate middle of hips point
    centerHipsX = (landmarks[23].x + landmarks[24].x) / 2;
    centerHipsY = (landmarks[23].y + landmarks[24].y) / 2;
    centerHipsZ = (landmarks[23].z + landmarks[24].z) / 2;
    let hips = {
        x: centerHipsX,
        y: centerHipsY,
        z: centerHipsZ,
    };
    // calculate middle of shoulders point
    centerShouldersX = (landmarks[11].x + landmarks[12].x) / 2;
    centerShouldersY = (landmarks[11].y + landmarks[12].y) / 2;
    centerShouldersZ = (landmarks[11].z + landmarks[12].z) / 2;
    let shoulders = {
        x: centerShouldersX,
        y: centerShouldersY,
        z: centerShouldersZ,
    };
    // calculate middle point of body between center of shoulder and center of hips
    centerBodyX = (centerShouldersX + centerHipsX) / 2;
    centerBodyY = (centerShouldersY + centerHipsY) / 2;
    centerBodyZ = (centerShouldersZ + centerHipsZ) / 2;
    let body = {
        x: centerBodyX,
        y: centerBodyY,
        z: centerBodyZ,
    };
    centerOfBodyPoint = body;
    // set the normalized distance reference distance based on center point of hips to center point of shoulders
    let centerHipstoCenterShouldersDistance = CalculateDistance(hips, shoulders);

    // iterate through all landmarks and calculate the distance from the landmark to the center point of the body
    let normalizedDistances = [];
    for (let i = 0; i < distancesToCalculate.length; i++) {
        let thisLandmark = landmarks[distancesToCalculate[i]];
        let thisNormalizedDistance = CalculateDistance(thisLandmark, body) / centerHipstoCenterShouldersDistance;
        normalizedDistances.push(thisNormalizedDistance);
    }
    // normalize the distances based on the ratio of the distance from the center point of hips to the center point of shoulders
    for (let i = 0; i < normalizedDistances.length; i++) {
        normalizedDistances[i] = normalizedDistances[i] / centerHipstoCenterShouldersDistance
    }
    return normalizedDistances;

}

// calculate the distance between points in 3D space
function CalculateDistance(coord1, coord2) {
    return Math.sqrt(Math.pow(coord1.x - coord2.x, 2) + Math.pow(coord1.y - coord2.y, 2) + Math.pow(coord1.z - coord2.z, 2));
}

// calculate the difference between the user's pose distances and the target pose distances
function CalculateDistanceDifferences(userAngles, targetAngles) {
    let totalDistanceDifference = 0;
    for (let i = 0; i < userAngles.length; i++) {
        let P1thisPoseAnglesNew = userAngles[i];
        let P2thisPoseAnglesNew = targetAngles[i];
        let thisDistanceDifference = Math.abs(P1thisPoseAnglesNew - P2thisPoseAnglesNew);
        totalDistanceDifference += thisDistanceDifference;
    }
    return totalDistanceDifference;
}
// take in the landmarks object and calculat the angles of landmarks
function CalculateAngle(coord1, coord2, coord3) {
    const v1 = {
        x: coord1.x - coord2.x,
        y: coord1.y - coord2.y,
        z: coord1.z - coord2.z,
    };
    const v2 = {
        x: coord3.x - coord2.x,
        y: coord3.y - coord2.y,
        z: coord3.z - coord2.z,
    };
    // Normalize v1
    const v1mag = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
    const v1norm = {
        x: v1.x / v1mag,
        y: v1.y / v1mag,
        z: v1.z / v1mag,
    };
    // Normalize v2
    const v2mag = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);
    const v2norm = {
        x: v2.x / v2mag,
        y: v2.y / v2mag,
        z: v2.z / v2mag,
    };
    // Calculate the dot products of vectors v1 and v2
    const dotProducts = v1norm.x * v2norm.x + v1norm.y * v2norm.y + v1norm.z * v2norm.z;
    // Extract the angle from the dot products
    const angle = (Math.acos(dotProducts) * 180.0) / Math.PI;
    // Round result to 3 decimal points and return
    return Math.round(angle);
};
// calculate angle of joints
// middle landmark is the fixed point
function CalculateAllAngles(landmarks) {
    let allLandmarkAngles = [];
    let allToGroundAngles = [];
    // shoulders
    let leftShoulderAngle = CalculateAngle(landmarks[13], landmarks[11], landmarks[23]);
    let rightShoulderAngle = CalculateAngle(landmarks[14], landmarks[12], landmarks[24]);
    // elbows
    let leftElbowAngle = CalculateAngle(landmarks[11], landmarks[13], landmarks[15]);
    let rightElbowAngle = CalculateAngle(landmarks[12], landmarks[14], landmarks[16]);
    // wrists
    let leftWristAngle = CalculateAngle(landmarks[13], landmarks[15], landmarks[17]);
    let rightWristAngle = CalculateAngle(landmarks[14], landmarks[16], landmarks[18]);
    // feet
    let leftFootAngle = CalculateAngle(landmarks[25], landmarks[27], landmarks[31]);
    let rightFootAngle = CalculateAngle(landmarks[26], landmarks[28], landmarks[32]);
    // hips    
    let leftHipAngle = CalculateAngle(landmarks[11], landmarks[23], landmarks[25]);
    let rightHipAngle = CalculateAngle(landmarks[12], landmarks[24], landmarks[26]);
    // knees
    let leftKneeAngle = CalculateAngle(landmarks[23], landmarks[25], landmarks[27]);
    let rightKneeAngle = CalculateAngle(landmarks[24], landmarks[26], landmarks[28]);

    // upper arms to ground
    let leftArmAngleToGroundMiddlePoint = { "x": landmarks[11].x, "y": 10, "z": landmarks[11].z };
    let leftArmAngleToGround = CalculateAngle(leftArmAngleToGroundMiddlePoint, landmarks[11], landmarks[13]);
    let rightArmAngleToGroundMiddlePoint = { "x": landmarks[12].x, "y": 10, "z": landmarks[12].z };
    let rightArmAngleToGround = CalculateAngle(rightArmAngleToGroundMiddlePoint, landmarks[12], landmarks[14]);
    // lower arms to ground
    let leftForearmAngleToGroundMiddlePoint = { "x": landmarks[13].x, "y": 10, "z": landmarks[13].z };
    let leftForearmAngleToGround = CalculateAngle(leftForearmAngleToGroundMiddlePoint, landmarks[13], landmarks[15]);
    let rightForearmAngleToGroundMiddlePoint = { "x": landmarks[14].x, "y": 10, "z": landmarks[14].z };
    let rightForearmAngleToGround = CalculateAngle(rightForearmAngleToGroundMiddlePoint, landmarks[14], landmarks[16]);
    // upper legs to ground
    let leftLegAngleToGroundMiddlePoint = { "x": landmarks[23].x, "y": 10, "z": landmarks[23].z };
    let leftLegAngleToGround = CalculateAngle(leftLegAngleToGroundMiddlePoint, landmarks[23], landmarks[25]);
    let rightLegAngleToGroundMiddlePoint = { "x": landmarks[24].x, "y": 10, "z": landmarks[24].z };
    let rightLegAngleToGround = CalculateAngle(rightLegAngleToGroundMiddlePoint, landmarks[24], landmarks[26]);
    // lower legs to ground
    let leftShinAngleToGroundMiddlePoint = { "x": landmarks[25].x, "y": 10, "z": landmarks[25].z };
    let leftShinAngleToGround = CalculateAngle(leftShinAngleToGroundMiddlePoint, landmarks[25], landmarks[27]);
    let rightShinAngleToGroundMiddlePoint = { "x": landmarks[26].x, "y": 10, "z": landmarks[26].z };
    let rightShinAngleToGround = CalculateAngle(rightShinAngleToGroundMiddlePoint, landmarks[26], landmarks[28]);
    // upper body to ground (shoulders to hips angle in relation to the ground)
    let leftShoulderToHipsAngleToGroundMiddlePoint = { "x": landmarks[23].x, "y": 10, "z": landmarks[23].z };
    let leftShoulderToHipsAngleToGround = CalculateAngle(leftShoulderToHipsAngleToGroundMiddlePoint, landmarks[23], landmarks[11]);
    let rightShoulderToHipsAngleToGroundMiddlePoint = { "x": landmarks[24].x, "y": 10, "z": landmarks[24].z };
    let rightShoulderToHipsAngleToGround = CalculateAngle(rightShoulderToHipsAngleToGroundMiddlePoint, landmarks[24], landmarks[12]);



    allLandmarkAngles = [leftWristAngle, rightWristAngle, leftShoulderAngle, rightShoulderAngle, leftElbowAngle, rightElbowAngle, leftHipAngle, rightHipAngle, leftKneeAngle, rightKneeAngle, leftFootAngle, rightFootAngle];
    allToGroundAngles = [leftArmAngleToGround, rightArmAngleToGround, leftForearmAngleToGround, rightForearmAngleToGround, leftLegAngleToGround, rightLegAngleToGround, leftShinAngleToGround, rightShinAngleToGround, leftShoulderToHipsAngleToGround, rightShoulderToHipsAngleToGround];
    let angles = [leftWristAngle, rightWristAngle, leftShoulderAngle, rightShoulderAngle, leftElbowAngle, rightElbowAngle, leftHipAngle, rightHipAngle, leftKneeAngle, rightKneeAngle, leftFootAngle, rightFootAngle, leftArmAngleToGround, rightArmAngleToGround, leftForearmAngleToGround, rightForearmAngleToGround, leftLegAngleToGround, rightLegAngleToGround, leftShinAngleToGround, rightShinAngleToGround, leftShoulderToHipsAngleToGround, rightShoulderToHipsAngleToGround];
    return angles
}

// take in the two angle arrays and find the differnence between them. poseHandicap is the amount of slack to give , eg. 10 allows 10 degrees of slack
function CalculateAngleDifferences(userAngles, targetAngles, poseHandicap) {
    let individualAngleDifferences = []; // calculate individual angle differences
    let totalAngleDifference = 0; // calculate the total angle differences
    for (let i = 0; i < userAngles.length; i++) {
        let P1thisPoseAnglesNew = userAngles[i];
        let P2thisPoseAnglesNew = targetAngles[i];
        let thisAngleDifference = Math.abs(P1thisPoseAnglesNew - P2thisPoseAnglesNew) - poseHandicap;
        individualAngleDifferences.push(thisAngleDifference);
        totalAngleDifference += thisAngleDifference;
    }
    return [totalAngleDifference, individualAngleDifferences];
}

//////////////////////// data to analyze ////////////////////////////////

// delay capture of high score since there is a bug that immediately captures the score
function delayHighScoreCapture() {
    setTimeout(function () {
        thisPoseHighScore = 0;
        console.log("reset high score" + thisPoseHighScore);
    }, 3000);
}

// set a timer so datatosave is called ten times a second
function timerToSaveData() {
    var saveDataTimeout = setTimeout(function () {
        dataToSave();
        timerToSaveData();

    }, 1000);
}

// data to save to JSON file
var allWorkoutData = [{}];
function dataToSave() {
    let currentTime = new Date();
    let time = currentTime.getTime();
    let currentPoseNumber = currentPoseInThisWorkout;
    let currentLandmarks = currentLandmarksArray;
    let workout = {
        "date": time,
        "pose": currentPoseNumber,
        "score": currentScore,
        "landmarks": currentLandmarks
    };
    if (workoutInProgress) {
        allWorkoutData.push(workout);
    }
}

// parse workout data. unique pose number starts at 1
function parseWorkoutData(workoutData) {
    // calculate the number of data points for each pose
    // skip the first data point since it isn't recorded properly
    let totalCount = 0;
    let countArray = [];
    let currentPose = 0;

    currentPose = workoutData[1].pose;
    for (let i = 0; i < workoutData.length; i++) {
        if (i > 0) {
            if (i == workoutData.length - 1) {
                countArray.push(totalCount + 1);
            }
            if (workoutData[i].pose == currentPose) {
                totalCount++;
            }
            else {
                countArray.push(totalCount);
                currentPose = workoutData[i].pose;
                totalCount = 1;
            }
        }
    }

    // get the total time for each pose
    let dataPointTracker = 1;
    for (let i = 1; i < countArray.length + 1; i++) {
        let startTime = 0;
        let endTime = 0;
        let totalTime = 0;
        for (let j = 1; j < countArray[i] + 1; j++) {
            if (j == 1) {
                startTime = workoutData[dataPointTracker].date;

            }
            else if (j == countArray[i]) {
                endTime = workoutData[dataPointTracker].date;

            }
            dataPointTracker++;

        }

        totalTime = endTime - startTime;

    }
}

