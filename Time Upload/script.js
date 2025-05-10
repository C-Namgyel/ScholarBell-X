let port;
let writer;
let reader;

async function connectToArduino() {
    try {
        const ports = await navigator.serial.requestPort();
        await ports.open({ baudRate: 9600 });
        port = ports;

        // Initialize the writer
        writer = port.writable.getWriter();

        // Initialize the reader
        const textDecoder = new TextDecoderStream();
        const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
        reader = textDecoder.readable.getReader();

        console.log("Connected to Arduino!");

        // Start reading data
        while (true) {
            const { value, done } = await reader.read();
            if (done) {
                // Allow the serial port to be closed later
                reader.releaseLock();
                break;
            }
            if (value) {
                console.log("Received:", value.trim());
            }
        }
    } catch (error) {
        console.error("Error:", error);
    }
}


async function sendData(data) {
    const encoder = new TextEncoder();
    await writer.write(encoder.encode(data + '\n'));
}

document.getElementById("connect").onclick = function() {
    connectToArduino();
}

const currentDate = new Date();
const hours = currentDate.getHours();
const minutes = currentDate.getMinutes();
const date = currentDate.getDate();
const month = currentDate.getMonth() + 1;
const year = currentDate.getFullYear();

document.getElementById("time").value = String(hours).padStart(2, '0') + ":" + String(minutes).padStart(2, '0');
document.getElementById("date").value = String(year).padStart(2, '0') + "-" + String(month).padStart(2, '0') + "-" + String(date).padStart(2, '0');

document.getElementById("current").oninput = function() {
    if (this.checked == true) {
        document.getElementById("date").disabled = true;
        document.getElementById("time").disabled = true;
    } else {
        document.getElementById("date").disabled = false;
        document.getElementById("time").disabled = false;
    }
}

document.getElementById("upload").onclick = function() {
    let dataStr = "";
    if (document.getElementById("current").checked == true) {
        const currentDate = new Date();
        const hours = currentDate.getHours();
        const minutes = currentDate.getMinutes();
        const seconds = currentDate.getSeconds();
        const month = currentDate.getMonth() + 1;
        const year = currentDate.getFullYear() % 100;
        dataStr += `${year},${month},${date},${hours},${minutes},${seconds}`;
    } else {
        let date = document.getElementById("date").value.split("-");
        let time = document.getElementById("time").value.split(":");
        dataStr += `${parseInt(date[0])},${parseInt(date[1])},${parseInt(date[2])},${parseInt(time[0])},${parseInt(time[1])},0`;
    }
    sendData("0"+dataStr);
    // console.log("0"+dataStr);
}