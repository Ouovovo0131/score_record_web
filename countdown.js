const {
  FIXED_SCHEDULES,
  formatScheduleRange: formatExamRange,
  formatDurationShort: formatExamDurationShort,
  getScheduleState: getExamScheduleState,
  padTime: formatCountdownUnit,
} = window.ScoreRecordApp;

const countdownTitle = document.querySelector("#countdown-title");
const countdownSubtitle = document.querySelector("#countdown-subtitle");
const daysLeft = document.querySelector("#days-left");
const hoursLeft = document.querySelector("#hours-left");
const minutesLeft = document.querySelector("#minutes-left");
const secondsLeft = document.querySelector("#seconds-left");
const scheduleList = document.querySelector("#schedule-list");
const scheduleTemplate = document.querySelector("#schedule-item-template");

let countdownTimerId = null;

renderSchedules();
startCountdownTimer();

function renderSchedules() {
  renderCountdownSummary();
  renderScheduleList();
}

function renderCountdownSummary() {
  const primarySchedule = getPrimarySchedule();
  if (!primarySchedule) {
    countdownTitle.textContent = "目前沒有考程";
    countdownSubtitle.textContent = "尚未提供任何考試資料。";
    setCountdownValues("--", "--", "--", "--");
    return;
  }

  const scheduleState = getExamScheduleState(primarySchedule, new Date());
  if (scheduleState.phase === "active") {
    countdownTitle.textContent = `${primarySchedule.name} 進行中`;
    countdownSubtitle.textContent = `${formatExamRange(primarySchedule)} · 第 ${scheduleState.currentDay} / ${scheduleState.totalDays} 天`;
    setCountdownFromMs(scheduleState.diffMs);
    return;
  }

  if (scheduleState.phase === "completed") {
    countdownTitle.textContent = `${primarySchedule.name} 已結束`;
    countdownSubtitle.textContent = formatExamRange(primarySchedule);
    setCountdownValues("0", "0", "0", "0");
    return;
  }

  countdownTitle.textContent = `${primarySchedule.name} 倒數`;
  countdownSubtitle.textContent = formatExamRange(primarySchedule);
  setCountdownFromMs(scheduleState.diffMs);
}

function renderScheduleList() {
  scheduleList.innerHTML = "";

  const fragment = document.createDocumentFragment();
  const now = new Date();

  FIXED_SCHEDULES.forEach((schedule) => {
    const node = scheduleTemplate.content.firstElementChild.cloneNode(true);
    const state = getExamScheduleState(schedule, now);
    node.querySelector(".schedule-item-name").textContent = schedule.name;
    node.querySelector(".schedule-item-dates").textContent = formatExamRange(schedule);
    node.querySelector(".schedule-item-status").textContent = formatScheduleStatus(state);
    fragment.appendChild(node);
  });

  scheduleList.appendChild(fragment);
}

function getPrimarySchedule() {
  const now = new Date();
  return FIXED_SCHEDULES.find((schedule) => getExamScheduleState(schedule, now).phase === "active")
    || FIXED_SCHEDULES.find((schedule) => getExamScheduleState(schedule, now).phase === "upcoming")
    || FIXED_SCHEDULES.at(-1)
    || null;
}

function formatScheduleStatus(state) {
  if (state.phase === "upcoming") {
    return `距離開始還有 ${formatExamDurationShort(state.diffMs)}`;
  }

  if (state.phase === "active") {
    return `考試進行中，第 ${state.currentDay} / ${state.totalDays} 天`;
  }

  return "已結束";
}

function setCountdownFromMs(diffMs) {
  const safeMs = Math.max(diffMs, 0);
  const totalSeconds = Math.floor(safeMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  setCountdownValues(String(days), formatCountdownUnit(hours), formatCountdownUnit(minutes), formatCountdownUnit(seconds));
}

function setCountdownValues(days, hours, minutes, seconds) {
  daysLeft.textContent = days;
  hoursLeft.textContent = hours;
  minutesLeft.textContent = minutes;
  secondsLeft.textContent = seconds;
}

function startCountdownTimer() {
  if (countdownTimerId !== null) {
    window.clearInterval(countdownTimerId);
  }

  countdownTimerId = window.setInterval(renderSchedules, 1000);
}
