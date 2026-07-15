/* =====================================================
   VANCard Attendance System
   Frontend Script
===================================================== */
const WEB_APP_URL =
"https://script.google.com/macros/s/AKfycbym0dHBkFFQxrswsmL2NLBDXrZsXQSMwMi1TJQeyu2SJv1wNEXhy3IScN98sJhLegPx/exec";

/* =====================================================
   HTML ELEMENTS
===================================================== */

const eventSelect = document.getElementById("eventSelect");

const refreshEvents =
document.getElementById("refreshEvents");

const startScanner =
document.getElementById("startScanner");

const stopScanner =
document.getElementById("stopScanner");

const connectionStatus =
document.getElementById("connectionStatus");

const scannerMessage =
document.getElementById("scannerMessage");

const activityLog =
document.getElementById("activityLog");

const memberId =
document.getElementById("memberId");

const memberName =
document.getElementById("memberName");

const memberCourse =
document.getElementById("memberCourse");

const memberYear =
document.getElementById("memberYear");

const attendanceStatus =
document.getElementById("attendanceStatus");

/* =====================================================
   GLOBAL VARIABLES
===================================================== */

let htmlScanner = null;

let scannerRunning = false;

let processingScan = false;

/* =====================================================
   LOGGING
===================================================== */

function addLog(message){

    const time = new Date().toLocaleTimeString();

    const row = document.createElement("div");

    row.innerHTML =
    "<strong>" +
    time +
    "</strong> - " +
    message;

    activityLog.prepend(row);

}

/* =====================================================
   CONNECTION STATUS
===================================================== */

function setOnline(){

    connectionStatus.textContent =
    "Online";

    connectionStatus.classList.remove("offline");

    connectionStatus.classList.add("online");

}

function setOffline(){

    connectionStatus.textContent =
    "Offline";

    connectionStatus.classList.remove("online");

    connectionStatus.classList.add("offline");

}

/* =====================================================
   MEMBER DISPLAY
===================================================== */

function clearMember(){

    memberId.textContent = "-";

    memberName.textContent = "-";

    memberCourse.textContent = "-";

    memberYear.textContent = "-";

    attendanceStatus.textContent =
    "Waiting...";

    attendanceStatus.style.color =
    "#16a34a";

}

function displayMember(data){

    memberId.textContent =
    data.memberID;

    memberName.textContent =
    data.name;

    memberCourse.textContent =
    data.course;

    memberYear.textContent =
    data.year;

    attendanceStatus.textContent =
    data.status;

    attendanceStatus.style.color =
    "#16a34a";

}

/* =====================================================
   LOAD EVENTS
===================================================== */

async function loadEvents(){

    try{

        scannerMessage.textContent =
        "Loading events...";

        const response =
        await fetch(
            WEB_APP_URL +
            "?action=events"
        );

        const data =
        await response.json();

        if(!data.success){

            throw new Error(
                "Unable to load events."
            );

        }

        eventSelect.innerHTML = "";

        data.events.forEach(event=>{

            const option =
            document.createElement("option");

            option.value = event;

            option.textContent = event;

            eventSelect.appendChild(option);

        });

        scannerMessage.textContent =
        "Events loaded successfully.";

        setOnline();

        addLog(
            "Events loaded."
        );

    }

    catch(error){

        setOffline();

        scannerMessage.textContent =
        "Unable to connect to server.";

        addLog(
            "Connection failed."
        );

    }

}

/* =====================================================
   START QR SCANNER
===================================================== */

async function startQRScanner() {

    if (scannerRunning) {
        return;
    }

    if (eventSelect.value === "") {

        alert("Please select an event first.");

        return;

    }

    try {

        htmlScanner = new Html5Qrcode("reader");

        const cameras = await Html5Qrcode.getCameras();

        if (!cameras || cameras.length === 0) {

            alert("No camera detected.");

            return;

        }

        let cameraId = cameras[0].id;

        if (cameras.length > 1) {

            const backCamera = cameras.find(camera => {

                const name = camera.label.toLowerCase();

                return (
                    name.includes("back") ||
                    name.includes("rear") ||
                    name.includes("environment")
                );

            });

            if (backCamera) {

                cameraId = backCamera.id;

            }

        }

        await htmlScanner.start(

            cameraId,

            {

                fps: 10,

                qrbox: {

                    width: 250,

                    height: 250

                }

            },

            onScanSuccess,

            onScanFailure

        );

        scannerRunning = true;

        scannerMessage.textContent =
            "Scanner is running...";

        addLog("QR Scanner started.");

    }

    catch (error) {

        console.error(error);

        scannerMessage.textContent =
            "Unable to start camera.";

        addLog("Camera failed to start.");

    }

}

/* =====================================================
   STOP QR SCANNER
===================================================== */

async function stopQRScanner() {

    if (!scannerRunning) {

        return;

    }

    try {

        await htmlScanner.stop();

        await htmlScanner.clear();

        scannerRunning = false;

        scannerMessage.textContent =
            "Scanner stopped.";

        addLog("Scanner stopped.");

    }

    catch (error) {

        console.error(error);

    }

}

/* =====================================================
   QR CALLBACKS
===================================================== */

function onScanFailure(error) {

    // Ignore scan failures

}

async function onScanSuccess(decodedText) {

    if (processingScan) {

        return;

    }

    processingScan = true;

    const memberID = decodedText.trim();

    scannerMessage.textContent =
        "Processing attendance...";

    addLog("QR scanned: " + memberID);

    try {

        const response = await fetch(

            WEB_APP_URL,

            {

                method: "POST",

                headers: {

                    "Content-Type": "application/json"

                },

                body: JSON.stringify({

                    action: "attendance",

                    memberID: memberID,

                    event: eventSelect.value

                })

            }

        );

        const result = await response.json();

        if (result.success) {

            displayMember(result);

            scannerMessage.textContent =
                "Attendance recorded successfully.";

            addLog(

                result.name +
                " marked Present."

            );

        }

        else {

            attendanceStatus.textContent =
                result.message;

            attendanceStatus.style.color =
                "#dc2626";

            scannerMessage.textContent =
                result.message;

            addLog(result.message);

        }

    }

    catch (error) {

        console.error(error);

        scannerMessage.textContent =
            "Server connection failed.";

        addLog("Network error.");

    }

    setTimeout(function () {

        processingScan = false;

    }, 1500);

}
/* =====================================================
   BUTTON EVENTS
===================================================== */

startScanner.addEventListener("click", async () => {

    await startQRScanner();

});

stopScanner.addEventListener("click", async () => {

    await stopQRScanner();

});

refreshEvents.addEventListener("click", () => {

    loadEvents();

});

/* =====================================================
   PAGE VISIBILITY
===================================================== */

document.addEventListener("visibilitychange", async () => {

    if (document.hidden) {

        if (scannerRunning) {

            await stopQRScanner();

        }

    }

});

/* =====================================================
   NETWORK STATUS
===================================================== */

window.addEventListener("online", () => {

    setOnline();

    addLog("Internet connection restored.");

});

window.addEventListener("offline", () => {

    setOffline();

    addLog("Internet connection lost.");

});

/* =====================================================
   INITIALIZE APPLICATION
===================================================== */

window.addEventListener("load", async () => {

    clearMember();

    scannerMessage.textContent =
        "Connecting to server...";

    addLog("Initializing application...");

    await loadEvents();

});

/* =====================================================
   SAFETY CHECK
===================================================== */

window.addEventListener("beforeunload", async () => {

    if (scannerRunning) {

        try {

            await htmlScanner.stop();

            await htmlScanner.clear();

        }

        catch (e) {

        }

    }

});
