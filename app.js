// Default schedule (used if no parent schedule is saved on this device)
const DEFAULT_SCHEDULE = {
  mon_fri: {
    day: [
      { label: "Wake Up",     start: "07:00", end: "07:30", color: "#A8BED4", icon: "⏰" },
      { label: "Get Ready",   start: "07:30", end: "08:00", color: "#E0D5CB", icon: "👕" },
      { label: "Leave School",start: "08:00", end: "08:30", color: "#C5D4C9", icon: "🚗" },
      { label: "School",      start: "08:30", end: "09:06", color: "#B5C9D4", icon: "🏫" },
      { label: "School",      start: "09:06", end: "15:15", color: "#B5C9D4", icon: "🏫" },
      { label: "Arrive Home", start: "15:15", end: "15:45", color: "#C5D4C5", icon: "🏠" },
      { label: "Snack",       start: "15:45", end: "16:15", color: "#E8E0D0", icon: "🍎" },
      { label: "Play Time",   start: "16:15", end: "17:00", color: "#D0D8C5", icon: "🪀" },
      { label: "Mom Home",    start: "17:00", end: "17:30", color: "#C9BED4", icon: "👩‍👦" },
      { label: "Make Dinner", start: "17:30", end: "18:00", color: "#E0D0BF", icon: "👩‍🍳" },
      { label: "Eat Dinner",  start: "18:00", end: "18:30", color: "#D8C9B8", icon: "🍽️" },
      { label: "Bath Time",   start: "18:30", end: "19:00", color: "#B8D4D8", icon: "🛁" }
    ],
    night: [
      { label: "Screen Time", start: "19:00", end: "20:00", color: "#8B7E99", icon: "📺" },
      { label: "Wind Down",   start: "20:00", end: "21:00", color: "#736680", icon: "📖" },
      { label: "Lights Out",  start: "21:00", end: "21:15", color: "#5C5266", icon: "🛌" },
      { label: "Sleeping",    start: "21:15", end: "07:00", color: "#4A3F52", icon: "🌙" }
    ]
  },
  weekend: {
    day: [
      { label: "Wake Up",     start: "08:00", end: "08:30", color: "#A8BED4", icon: "⏰" },
      { label: "Breakfast",   start: "08:30", end: "09:30", color: "#E8CFC0", icon: "🥞" },
      { label: "Play Time",   start: "09:30", end: "12:30", color: "#D0D8C5", icon: "🧸" },
      { label: "Lunch",       start: "12:30", end: "13:30", color: "#D8C9B8", icon: "🥪" },
      { label: "Play Time",   start: "13:30", end: "17:00", color: "#D0D8C5", icon: "🧸" },
      { label: "Make Dinner", start: "17:00", end: "18:00", color: "#E8CFD8", icon: "👩‍🍳" },
      { label: "Eat Dinner",  start: "18:00", end: "18:30", color: "#D8C9B8", icon: "🍽️" },
      { label: "Bath Time",   start: "18:30", end: "19:00", color: "#B8D4D8", icon: "🛁" },
      { label: "Screen Time", start: "19:00", end: "20:00", color: "#8B7E99", icon: "📺" }
    ],
    night: [
      { label: "Sleep",       start: "20:00", end: "08:00", color: "#4A3F52", icon: "🌙" }
    ]
  }
};

// Try to load a saved schedule from this device.
// If none is saved or something goes wrong, fall back to DEFAULT_SCHEDULE.
let scheduleData;
try {
  const raw = localStorage.getItem("routineClockSchedule");
  if (raw) {
    scheduleData = JSON.parse(raw);
  } else {
    scheduleData = DEFAULT_SCHEDULE;
  }
} catch (e) {
  console.error("Error reading saved schedule, using default", e);
  scheduleData = DEFAULT_SCHEDULE;
}

const sectorsGroup = document.getElementById("sectors");
const activityLabel = document.getElementById("current-activity");

let currentMode = "";
let currentActivityIndex = -1;
let transitionWarningShown = false;
let audioContext = null;

/* ---------- Helpers ---------- */

function getAngles(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return (h % 12) * 30 + m * 0.5;
}

function createSector(startAngle, endAngle, color, isCurrent) {
  const startRad = ((startAngle - 90) * Math.PI) / 180;
  const endRad = ((endAngle - 90) * Math.PI) / 180;

  const r = 98;
  const cx = 100;
  const cy = 100;

  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);

  let diff = endAngle - startAngle;
  if (diff < 0) diff += 360;
  const largeArcFlag = diff > 180 ? 1 : 0;

  const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", d);
  path.setAttribute("fill", color);
  path.setAttribute("opacity", isCurrent ? "0.9" : "0.6");
  path.setAttribute("class", isCurrent ? "current-activity" : "");
  return path;
}

function createIcon(startAngle, endAngle, iconChar, isCurrent) {
  if (!iconChar) return null;

  let diff = endAngle - startAngle;
  if (diff < 0) diff += 360;
  let midAngle = startAngle + diff / 2;
  const midRad = ((midAngle - 90) * Math.PI) / 180;

  const r = 83; // closer to edge
  const cx = 100;
  const cy = 100;

  const x = cx + r * Math.cos(midRad);
  const y = cy + r * Math.sin(midRad);

  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.setAttribute("x", x);
  text.setAttribute("y", y);
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("dominant-baseline", "central");
  text.setAttribute("font-size", isCurrent ? "16" : "14");
  text.setAttribute("class", isCurrent ? "current-icon" : "");
  text.textContent = iconChar;
  return text;
}

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

function getCurrentActivity(tasks, currentMinutes) {
  for (let i = 0; i < tasks.length; i++) {
    let startMin = timeToMinutes(tasks[i].start);
    let endMin = timeToMinutes(tasks[i].end);

    // handle overnight ranges
    if (endMin < startMin) {
      if (currentMinutes >= startMin || currentMinutes < endMin) {
        return i;
      }
    } else {
      if (currentMinutes >= startMin && currentMinutes < endMin) {
        return i;
      }
    }
  }
  return -1;
}

function playTransitionSound() {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.5
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (e) {
    console.log("Audio not supported");
  }
}

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9;
  utterance.pitch = 1.0;
  window.speechSynthesis.speak(utterance);
}

/* ---------- Main update loop ---------- */

function updateClock() {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const s = now.getSeconds();
  const day = now.getDay();

  const currentMinutes = h * 60 + m;
  const newMode = h >= 7 && h < 19 ? "day" : "night";
  const isWeekend = day === 0 || day === 6;

  // When mode changes (day/night), rebuild sectors/icons
  if (newMode !== currentMode) {
    currentMode = newMode;
    document.body.className = `${newMode}-mode`;

    const scheduleTypeAtModeChange = isWeekend ? "weekend" : "mon_fri";
    const tasksAtModeChange = scheduleData[scheduleTypeAtModeChange][newMode];

    sectorsGroup.innerHTML = "";

    const currentIdxAtModeChange = getCurrentActivity(
      tasksAtModeChange,
      currentMinutes
    );
    currentActivityIndex = currentIdxAtModeChange;

    tasksAtModeChange.forEach((task, idx) => {
      let startDeg = getAngles(task.start);
      let endDeg = getAngles(task.end);
      if (endDeg <= startDeg) endDeg += 360;

      const isCurrent = idx === currentIdxAtModeChange;
      const sector = createSector(startDeg, endDeg, task.color, isCurrent);
      sectorsGroup.appendChild(sector);

      const icon = createIcon(startDeg, endDeg, task.icon, isCurrent);
      if (icon) sectorsGroup.appendChild(icon);
    });
  }

  // Always compute current activity
  const scheduleType = isWeekend ? "weekend" : "mon_fri";
  const tasks = scheduleData[scheduleType][currentMode];
  const currentIdx = getCurrentActivity(tasks, currentMinutes);

  // If activity changed, redraw highlight + icon
  if (currentIdx !== currentActivityIndex) {
    // Voice line when the new activity starts
    if (currentIdx >= 0 && currentIdx < tasks.length) {
      const newTask = tasks[currentIdx];
      speak(`It's time for ${newTask.label}.`);
    }

    currentActivityIndex = currentIdx;
    transitionWarningShown = false;

    sectorsGroup.innerHTML = "";

    tasks.forEach((task, idx) => {
      let startDeg = getAngles(task.start);
      let endDeg = getAngles(task.end);
      if (endDeg <= startDeg) endDeg += 360;

      const isCurrent = idx === currentIdx;
      const sector = createSector(startDeg, endDeg, task.color, isCurrent);
      sectorsGroup.appendChild(sector);

      const icon = createIcon(startDeg, endDeg, task.icon, isCurrent);
      if (icon) sectorsGroup.appendChild(icon);
    });
  }

  // Transition warning: current activity ending soon (within 5 minutes)
  if (currentIdx >= 0 && currentIdx < tasks.length) {
    const currentTask = tasks[currentIdx];

    let endMin = timeToMinutes(currentTask.end);
    if (endMin < timeToMinutes(currentTask.start)) {
      endMin += 1440; // overnight
    }
    let currentMin = currentMinutes;
    if (currentMin < timeToMinutes(currentTask.start)) {
      currentMin += 1440;
    }

    const minutesLeft = endMin - currentMin;

    if (minutesLeft <= 5 && minutesLeft > 0 && !transitionWarningShown) {
      transitionWarningShown = true;
      playTransitionSound();
      document.body.classList.add("transition-warning");
      setTimeout(() => {
        document.body.classList.remove("transition-warning");
      }, 3000);

      // Tell the child that the current activity is ending soon
      speak(`${currentTask.label} is ending soon.`);
    }
  }

  // Move hands
  const sDeg = s * 6;
  const mDeg = m * 6 + s * 0.1;
  const hDeg = (h % 12) * 30 + m * 0.5;

  document
    .getElementById("second-hand")
    .setAttribute("transform", `rotate(${sDeg}, 100, 100)`);
  document
    .getElementById("minute-hand")
    .setAttribute("transform", `rotate(${mDeg}, 100, 100)`);
  document
    .getElementById("hour-hand")
    .setAttribute("transform", `rotate(${hDeg}, 100, 100)`);

  // Labels at bottom
  if (activityLabel && currentIdx >= 0) {
    const nextIdx = (currentIdx + 1) % tasks.length;
    activityLabel.innerHTML = `<div class="now-label">Now: ${
      tasks[currentIdx].label
    }</div><div class="next-label">Next: ${tasks[nextIdx].label}</div>`;
  } else if (activityLabel) {
    activityLabel.innerText = currentMode === "day" ? "Day Time" : "Night Time";
  }
}

setInterval(updateClock, 1000);
updateClock();

// Edit schedule button: go to setup page
const editBtn = document.getElementById("edit-schedule");
if (editBtn) {
  editBtn.addEventListener("click", () => {
    window.location.href = "setup.html";  // use your actual setup filename
  });
}










