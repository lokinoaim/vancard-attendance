/* =====================================================
   VANCard Attendance System v2
===================================================== */

const WEB_APP_URL =
"https://script.google.com/macros/s/AKfycbym0dHBkFFQxrswsmL2NLBDXrZsXQSMwMi1TJQeyu2SJv1wNEXhy3IScN98sJhLegPx/exec";

/* =====================================================
   HTML ELEMENTS
===================================================== */

const eventSelect = document.getElementById("eventSelect");
const refreshEvents = document.getElementById("refreshEvents");

const startScanner = document.getElementById("startScanner");
const stopScanner = document.getElementById("stopScanner");

const connectionStatus = document.getElementById("connectionStatus");

const scannerMessage = document.getElementById("scannerMessage");
const activityLog = document.getElementById("activityLog");

const memberId = document.getElementById("memberId");
const memberName = document.getElementById("memberName");
const memberCourse = document.getElementById("memberCourse");
const memberYear = document.getElementById("memberYear");
const attendanceStatus = document.getElementById("attendanceStatus");

/* =====================================================
   VARIABLES
===================================================== */

let htmlScanner = null;
let scannerRunning = false;
let processingScan = false;

/* =====================================================
   LOG
===================================================== */

function addLog(message){

    const row = document.createElement("div");

    row.textContent =
        "[" +
        new Date().toLocaleTimeString() +
        "] " +
        message;

    activityLog.prepend(row);

}

/* =====================================================
   CONNECTION STATUS
===================================================== */

function setOnline(){

    connectionStatus.textContent = "🟢 Online";
    connectionStatus.classList.remove("offline");
    connectionStatus.classList.add("online");

}

function setOffline(){

    connectionStatus.textContent = "🔴 Offline";
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
    attendanceStatus.textContent = "Waiting...";

}

function displayMember(data){

    memberId.textContent = data.memberID;
    memberName.textContent = data.name;
    memberCourse.textContent = data.course;
    memberYear.textContent = data.year;
    attendanceStatus.textContent = data.status;

}

/* =====================================================
   RESET DISPLAY
===================================================== */

function resetDisplay(){

    setTimeout(()=>{

        clearMember();

        scannerMessage.textContent =
        "Ready to scan.";

    },2000);

}
/* =====================================================
   LOAD EVENTS
===================================================== */

async function loadEvents(){

    scannerMessage.textContent = "Loading events...";

    try{

        const response = await fetch(
            WEB_APP_URL + "?action=events",
            {
                method:"GET",
                cache:"no-store"
            }
        );

        if(!response.ok){

            throw new Error(
                "HTTP " + response.status
            );

        }

        const data = await response.json();

        if(!data.success){

            throw new Error(data.message);

        }

        eventSelect.innerHTML = "";

        data.events.forEach(event=>{

            const option =
            document.createElement("option");

            option.value = event;
            option.textContent = event;

            eventSelect.appendChild(option);

        });

        setOnline();

        scannerMessage.textContent =
        "Ready to scan.";

        addLog(
            data.events.length +
            " event(s) loaded."
        );

    }

    catch(error){

        console.error(error);

        setOffline();

        scannerMessage.textContent =
        "Unable to load events.";

        addLog(
            "Connection failed."
        );

    }

}

/* =====================================================
   START SCANNER
===================================================== */

async function startQRScanner(){

    if(scannerRunning){

        return;

    }

    clearMember();

    scannerMessage.textContent =
    "Opening camera...";

    htmlScanner =
    new Html5Qrcode("reader");

    try{

        await htmlScanner.start(

            {
                facingMode:{
                    ideal:"environment"
                }
            },

            {
                fps:10,
                qrbox:{
                    width:250,
                    height:250
                }
            },

            onScanSuccess

        );

        scannerRunning = true;

        scannerMessage.textContent =
        "Scanner ready.";

        addLog(
            "Scanner started."
        );

    }

    catch(error){

        console.error(error);

        scannerMessage.textContent =
        "Unable to open camera.";

        addLog(
            "Camera error."
        );

    }

}

/* =====================================================
   STOP SCANNER
===================================================== */

async function stopQRScanner(){

    if(!scannerRunning){

        return;

    }

    try{

        await htmlScanner.stop();

        await htmlScanner.clear();

    }

    catch(error){

        console.log(error);

    }

    scannerRunning = false;

    scannerMessage.textContent =
    "Scanner stopped.";

}
/* =====================================================
   QR SCAN RESULT
===================================================== */

async function onScanSuccess(decodedText){

    if(processingScan){
        return;
    }

    processingScan = true;

    const memberID = decodedText.trim();
   if(preventDuplicateScan(memberID)){
    return;
}

    scannerMessage.textContent =
    "Processing attendance...";

    addLog(
        "Scanned: " + memberID
    );

    try{

        const formData = new FormData();

        formData.append(
            "action",
            "attendance"
        );

        formData.append(
            "memberID",
            memberID
        );

        formData.append(
            "event",
            eventSelect.value
        );

        const response = await fetch(
            WEB_APP_URL,
            {
                method:"POST",
                body:formData
            }
        );

        if(!response.ok){

            throw new Error(
                "HTTP " + response.status
            );

        }

        const result =
        await response.json();

        if(result.success){

            displayMember(result);

            scannerMessage.textContent =
            "✅ Attendance Recorded";

            addLog(
                result.name +
                " marked Present."
            );

        }

        else{

            clearMember();

            scannerMessage.textContent =
            result.message;

            addLog(
                result.message
            );

        }

    }

    catch(error){

        console.error(error);

        scannerMessage.textContent =
        "Attendance Failed";

        addLog(
            error.toString()
        );

    }

    processingScan = false;

    setTimeout(async()=>{

        clearMember();

        scannerMessage.textContent =
        "Ready to scan.";

    },2000);

}
/* =====================================================
   BUTTON EVENTS
===================================================== */

startScanner.addEventListener(
    "click",
    startQRScanner
);


stopScanner.addEventListener(
    "click",
    stopQRScanner
);


refreshEvents.addEventListener(
    "click",
    loadEvents
);


/* =====================================================
   PAGE INITIALIZATION
===================================================== */

window.addEventListener(
    "load",
    ()=>{

        clearMember();

        loadEvents();

        addLog(
            "System initialized."
        );

    }
);
/* =====================================================
   DUPLICATE SCAN PROTECTION
===================================================== */

let lastScannedID = "";
let lastScanTime = 0;


/* =====================================================
   SCANNER COOLDOWN CHECK
===================================================== */

function preventDuplicateScan(memberID){

    const currentTime = Date.now();


    if(
        memberID === lastScannedID &&
        currentTime - lastScanTime < 5000
    ){

        addLog(
            "Duplicate scan ignored: " + memberID
        );

        return true;

    }


    lastScannedID = memberID;
    lastScanTime = currentTime;


    return false;

}


/* =====================================================
   CAMERA CLEANUP
===================================================== */

window.addEventListener(
    "beforeunload",
    ()=>{

        if(scannerRunning){

            stopQRScanner();

        }

    }
);
/* =====================================================
   SYSTEM STATUS CHECK
===================================================== */

function systemReady(){

    if(
        !WEB_APP_URL ||
        WEB_APP_URL.length < 10
    ){

        setOffline();

        addLog(
            "Invalid Web App URL."
        );

        return false;

    }


    return true;

}


/* =====================================================
   INTERNET MONITORING
===================================================== */

window.addEventListener(
    "online",
    ()=>{

        setOnline();

        addLog(
            "Internet connection restored."
        );

    }
);


window.addEventListener(
    "offline",
    ()=>{

        setOffline();

        addLog(
            "Internet connection lost."
        );

    }
);


/* =====================================================
   FINAL STARTUP CHECK
===================================================== */

if(systemReady()){

    addLog(
        "VANCard Attendance System v2 Ready."
    );

}
