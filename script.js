// Function to Communicate with Arduino
let port;
let writer;
let reader;
let readableStreamClosed; // Declare in a higher scope

let receivedDataBuffer = "";
async function connectToArduino() {
    if (document.getElementById("upload").disabled === true) {
        try {
            const ports = await navigator.serial.requestPort();
            await ports.open({ baudRate: 115200 });
            port = ports;
            writer = port.writable.getWriter();
            const textDecoder = new TextDecoderStream();
            readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
            reader = textDecoder.readable.getReader();
            document.getElementById("upload").disabled = false;
            document.getElementById("connectImg").src = "./img/disconnect.svg";

            while (true) {
                try {
                    const { value, done } = await reader.read();
                    if (done) {
                        reader.releaseLock();
                        break;
                    }
                    if (value) {
                        receivedDataBuffer += value; // Append new data to the buffer
                        let messages = receivedDataBuffer.split("\n"); // Split messages by newline

                        // Process all complete messages except the last (incomplete) one
                        for (let i = 0; i < messages.length - 1; i++) {
                            console.log("Received:", messages[i].trim());
                        }

                        // Save the last incomplete part back to the buffer
                        receivedDataBuffer = messages[messages.length - 1];
                    }
                } catch (readError) {
                    document.getElementById("upload").disabled = true;
                    document.getElementById("connectImg").src = "./img/connect.svg";
                    break;
                }
            }
        } catch (error) {
            console.error("Error:", error);
        }
    } else {
        try {
            if (reader) {
                await reader.cancel();
                await readableStreamClosed.catch(() => {});
                reader.releaseLock();
                reader = null;
            }
            if (writer) {
                writer.releaseLock();
                writer = null;
            }
            if (port) {
                await port.close();
                document.getElementById("upload").disabled = true;
                document.getElementById("connectImg").src = "./img/connect.svg";
                port = null;
            }
        } catch (error) {
            console.error("Disconnection error:", error);
        }
    }
}


async function sendData(data) {
    const encoder = new TextEncoder();
    await writer.write(encoder.encode(data + '\n'));
}

// Alarm
const alarmList = document.getElementById('alarmList');
let alarms = {};
let mode = "";
let sounds = [];
function addAlarm(edit, id) {
    const barrier = document.createElement("div");
    barrier.id = "barrier";
    const newWindow = document.createElement("div");
    newWindow.className = "newWindow";
    const t = new Date;
    // Close
    const close = document.createElement("button");
    close.textContent = "×";
    close.className = "close";
    newWindow.appendChild(close);
    close.onclick = () => barrier.remove();
    // Time
    const time = document.createElement("fieldset");
    const timeLegend = document.createElement("legend");
    timeLegend.textContent = "Time";
    time.appendChild(timeLegend);
    time.className = "time";
    const timeInp = document.createElement("input");
    timeInp.type = "time";
    timeInp.value = t.getHours().toString().padStart(2, "0") + ":" + t.getMinutes().toString().padStart(2, "0");
    time.appendChild(timeInp);
    newWindow.appendChild(time);
    // Schedule
    const schedule = document.createElement("fieldset");
    const scheduleLegend = document.createElement("legend");
    schedule.appendChild(scheduleLegend);
    schedule.className = "repeat";
    schedule.oninput = ()=> {
        label.focus();
    }
    // Label
    const others = document.createElement("div");
    others.className = "others";
    newWindow.appendChild(others);
    const labelTxt = document.createElement("span");
    labelTxt.textContent = "Label:";
    others.appendChild(labelTxt);
    const label = document.createElement("input");
    label.type = "text";
    label.value = "Alarm";
    label.onfocus = function() {
        this.select();
    }
    label.onkeydown = function(key) {
        if (key.key == "Enter") {
            sound.focus();
        }
    }
    others.appendChild(label);
    const soundTxt = document.createElement("span");
    soundTxt.textContent = "Sound Index:";
    others.appendChild(soundTxt);
    let sound
    if (sounds.length == 0) {
        sound = document.createElement("input");
        sound.type = "number";
        sound.placeholder = "No sound imported";
        sound.onfocus = function() {
            this.select();
        }
        sound.onkeydown = function(key) {
            if (key.key == "Enter") {
                ok.click();
            }
        }
    } else {
        sound = document.createElement("select");
        const hint = document.createElement("option");
        hint.innerText = "Select a sound";
        hint.hidden = true;
        hint.selected = true;
        hint.disabled = true;
        sound.appendChild(hint);
        for (let y of sounds) {
            const opt = document.createElement("option");
            opt.innerText = y;
            sound.appendChild(opt);
        }
    }
    others.appendChild(sound);
    // Occurs
    const occurs = document.createElement("fieldset");
    const occursLegend = document.createElement("legend");
    occursLegend.textContent = "Occurs";
    occurs.appendChild(occursLegend);
    occurs.className = "occurs";
    for (let d of ["One time", "Daily", "Weekly", "Monthly", "Yearly"]) {
        const wrapper = document.createElement("span");
        wrapper.className = "radio-group";
        const rad = document.createElement("input");
        rad.type = "radio";
        rad.name = "occurs";
        rad.value = d;
        wrapper.appendChild(rad);
        const span = document.createElement("a");
        span.textContent = d;
        wrapper.appendChild(span);
        occurs.appendChild(wrapper);
        rad.onclick = function() {
            const val = (document.querySelector('input[name="occurs"]:checked').value);
            if (mode != document.querySelector('input[name="occurs"]:checked').value) {
                while (schedule.childNodes[1]) {
                    schedule.removeChild(schedule.childNodes[1]);
                }
                mode = val;
                if (val == "One time" || val == "Daily" || val == "Monthly" || val == "Yearly") {
                    scheduleLegend.textContent = "Date";
                    scheduleLegend.textContent = "Start Date";
                    const date = document.createElement("input");
                    date.id = "date";
                    date.type = "date";
                    date.value = t.getFullYear() + "-" + (t.getMonth() + 1).toString().padStart(2, "0") + "-" + t.getDate().toString().padStart(2, "0");
                    schedule.appendChild(date);
                } else if (val == "Weekly") {
                    scheduleLegend.textContent = "Repeat";
                    for (let d of ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]) {
                        const wrapper = document.createElement("span");
                        wrapper.className = "radio-group";
                        const check = document.createElement("input");
                        check.type = "checkbox";
                        if (d == "Sunday") {
                            check.value = 0;
                        } else {
                            check.value = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].indexOf(d) + 1;
                        }
                        check.name = "weekly"
                        wrapper.appendChild(check);
                        const span = document.createElement("a");
                        span.textContent = d;
                        wrapper.appendChild(span);
                        schedule.appendChild(wrapper);
                        if (["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].indexOf(d) <= 5) {
                            check.checked = true;
                        }
                    }
                }
            }
        }
    }
    newWindow.appendChild(occurs);
    // Save Button
    const ok = document.createElement("button");
    ok.textContent = "OK";
    ok.className = "okButton";
    others.appendChild(ok);
    ok.onclick = () => {
        let soundInt = 0;
        if (sounds.length == 0) {
            soundInt = sound.value.trim()
        } else {
            soundInt = sounds.indexOf(sound.value) + 1;
        }
        let newAlarm = {
            "label": label.value.trim(),
            "time": timeInp.value.trim(),
            "sound": soundInt,
            "occurs": mode
        };
        if (mode == "Weekly") {
            newAlarm["days"] = Array.from(document.querySelectorAll('input[name="weekly"]:checked')).map(checkbox => parseInt(checkbox.value));
        } else {
            newAlarm["date"] = document.getElementById("date").value.trim();
        }
        if (edit == undefined || edit == false || edit == null || edit == "") {
            alarms[Date.now()] = newAlarm;
        } else {
            alarms[id] = newAlarm;
        }
        close.click();
        renderAlarms();
    }
    // End
    newWindow.appendChild(schedule)
    barrier.appendChild(newWindow);
    document.body.appendChild(barrier);
    mode = "";
    // Preset
    label.focus();
    if (edit == undefined || edit == false || edit == null || edit == "") {
        document.querySelector('input[name="occurs"][value="One time"]').click();
    } else {
        document.querySelector(`input[name="occurs"][value="${alarms[id]["occurs"]}"]`).click();
        timeInp.value = alarms[id]["time"];
        label.value = alarms[id]["label"];
        if (sounds.length == 0) {
            sound.value = alarms[id]["sound"];
        } else {
            sound.value = sounds[parseInt(alarms[id]["sound"]) - 1]
        }
        if (alarms[id]["occurs"] == "Weekly") {
            for (let y of ['1','2','3','4','5','6','0']) {
                if (alarms[id]["days"].includes(parseInt(y))) {
                    document.querySelector(`input[name="weekly"][value="${y}"]`).checked = true;
                } else {
                    document.querySelector(`input[name="weekly"][value="${y}"]`).checked = false;
                }
            }
        } else {
            document.getElementById("date").value = alarms[id]["date"];
        }
    }
}
function editAlarm(id) {
    addAlarm(true, id);
}
function deleteAlarm(id) {
    delete alarms[id]
    renderAlarms();
}
function playSound() {
    let inp;
    if (sounds.length == 0) {
        inp = parseInt(prompt("Enter the sound index"));
    } else {
        let display = "";
        for (let f of sounds) {
            display += f + "\n";
        }
        inp = parseInt(prompt("Enter the sound index\n"+display));
    }
    console.log("2"+inp);
    sendData("2"+inp);
}

function renderAlarms() {
    const sortedEntries = Object.entries(alarms).sort(([, a], [, b]) => {
        return a.time.localeCompare(b.time);
    });
    const sortedData = Object.fromEntries(sortedEntries);
    alarmList.innerHTML = '';
    if (sortedData.length === 0) {
        alarmList.innerHTML = '<p id="noAlarms" style="text-align: center; color: gray;">No alarms set.</p>'
    } else {
        Object.entries(sortedData).forEach(([id, alarm]) => {
            const card = document.createElement('div');
            card.className = 'card';
            const time = document.createElement('h3');
            time.textContent = alarm.time;
            card.appendChild(time);
            const occurs = document.createElement('p');
            occurs.textContent = alarm.occurs+": ";
            if (alarm["occurs"] == "Weekly") {
                for (let z of alarm.days) {
                    occurs.textContent += ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][z];
                    if (alarm.days.indexOf(z) != alarm.days.length - 1) {
                        occurs.textContent += ", ";
                    }
                }
            } else {
                occurs.textContent += alarm.date;
            }
            occurs.style.color = 'gray';
            occurs.style.fontSize = "12px";
            card.appendChild(occurs);
            const label = document.createElement('b');
            label.textContent = alarm.label;
            card.appendChild(label)
            const soundLabel = document.createElement('a');
            if (sounds.length == 0) {
                soundLabel.textContent = alarm.sound;   
            } else {
                soundLabel.textContent = sounds[parseInt(alarm.sound) - 1];
            }
            card.appendChild(soundLabel)
            const editButton = document.createElement('button');
            editButton.textContent = 'Edit';
            editButton.className = "edit";
            editButton.onclick = () => editAlarm(id);
            card.appendChild(editButton);
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.className = "delete";
            deleteButton.onclick = () => deleteAlarm(id);
            card.appendChild(deleteButton);
            alarmList.appendChild(card);
        });
    }
}

// Export and import Data
function exportData() {
    const filename = prompt("Enter file name:");
    if (filename != null && filename != undefined && filename.trim() != "") {
        const dat = JSON.stringify(alarms);
        const blob = new Blob([dat], {type: 'text/plain' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = filename + ".bell";
        link.click();
        URL.revokeObjectURL(url);
    }
}
function importData(elem) {
    const file = elem.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        alarms = JSON.parse(text);
        renderAlarms();
        elem.value = null;
    };
    reader.onerror = function(e) {
        console.error("Error reading file", e);
    };
    reader.readAsText(file);
}

// Sound Import
function importSound(elem) {
    const files = elem.files;
    sounds = [];
    for (let file of files) {
        sounds.push(file.webkitRelativePath);
    }
    renderAlarms();
}

// Upload alarm
function binary2decimal(val) {;
    let decimal = 0;
    for (let i = 0; i < 8; i++) {
        decimal += parseInt(val[i]) * Math.pow(2, 7 - i);
    }
    return(decimal);
}
function uploadAlarm() {
    // console.log("1"+JSON.stringify(Object.values(alarms)))
    let uploadData = "";
    for (let x of ['time', 'sound']) {
        let arr = "";
        for (let y of Object.values(alarms)) {
            if (x == "time") {
                arr += parseInt(y[x].split(":")[0]) * 60 + parseInt(y[x].split(":")[1]);
            } else {
                arr += y[x];
            }
            if (Object.values(alarms).indexOf(y) != Object.values(alarms).length - 1) {
                arr += ";";
            }
        }
        uploadData += arr + "|";
    }
    let dayBinary = "0";
    for (let z of Object.values(alarms)) {
        for (let d = 0; d < 7; d++) {
            if (z["days"].includes(d)) {
                dayBinary += "1";
            } else {
                dayBinary += "0";
            }
        }
        uploadData += binary2decimal(dayBinary);
        dayBinary = "0";
        if (Object.values(alarms).indexOf(z) != Object.values(alarms).length - 1) {
            uploadData += ";";
        }
    }

    console.log("1"+Object.keys(alarms).length.toString().padStart(2, "0")+uploadData);
    sendData("1"+Object.keys(alarms).length.toString().padStart(2, "0")+uploadData);
}