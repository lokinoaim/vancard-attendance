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
    new Date().toLocaleTimeString()
    + " - "
    + message;

    activityLog.prepend(row);

}


/* =====================================================
   CONNECTION STATUS
===================================================== */

function setOnline(){

    connectionStatus.textContent = "Online";

    connectionStatus.classList.remove("offline");
    connectionStatus.classList.add("online");

}


function setOffline(){

    connectionStatus.textContent = "Offline";

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
   LOAD EVENTS
===================================================== */

async function loadEvents(){

    try{

        scannerMessage.textContent =
        "Loading events...";


        const response =
        await fetch(
            WEB_APP_URL + "?action=events"
        );


        const data =
        await response.json();


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
        "Events loaded successfully.";


        addLog("Events loaded.");


    }catch(error){

        console.error(error);

        setOffline();

        scannerMessage.textContent =
        "Unable to connect to server.";

        addLog("Connection failed.");

    }

}



/* =====================================================
   QR SCANNER
===================================================== */

async function startQRScanner(){

    if(scannerRunning){

        return;

    }


    htmlScanner =
    new Html5Qrcode("reader");



    try{


        await htmlScanner.start(

            {
                facingMode:{
                    exact:"environment"
                }
            },


            {
                fps:10,
                qrbox:250
            },


            onScanSuccess

        );


        scannerRunning = true;


        scannerMessage.textContent =
        "Scanner running.";


        addLog("Scanner started.");


    }catch(error){


        console.error(error);


        scannerMessage.textContent =
        "Camera failed.";


    }

}



async function stopQRScanner(){

    if(!scannerRunning){

        return;

    }


    await htmlScanner.stop();

    await htmlScanner.clear();


    scannerRunning = false;


    scannerMessage.textContent =
    "Scanner stopped.";

}



/* =====================================================
   QR RESULT
===================================================== */

async function onScanSuccess(decodedText){

    console.log("QR detected:", decodedText);
    alert("QR detected: " + decodedText);

    if(processingScan){
        return;
    }

    processingScan = true;

    const memberID = decodedText.trim();

    try{

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

        // Read the response as text first
        const text = await response.text();

        console.log("Server response:", text);
        alert("Server response:\n" + text);

        const result = JSON.parse(text);

        if(result.success){

            displayMember(result);

            addLog(result.name + " marked Present.");

        }else{

            addLog(result.message);
            alert(result.message);

        }

    }catch(error){

        console.error(error);

        alert("ERROR:\n" + error);

        addLog("Attendance failed: " + error);

    }

    setTimeout(() => {

        processingScan = false;

    }, 1500);

}


/* =====================================================
   BUTTONS
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
   START SYSTEM
===================================================== */

window.addEventListener(
"load",
()=>{

    clearMember();

    addLog("System initialized.");

    loadEvents();

});
