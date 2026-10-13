const STORAGE_KEY = 'looplist-videos-v1';
const SCHEDULE_STORAGE_KEY = 'looplist-schedule-v1';
const allowedHosts = new Set(['tiktok.com', 'www.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com']);

const form = document.querySelector('#add-form');
const urlInput = document.querySelector('#video-url');
const formMessage = document.querySelector('#form-message');
const videoList = document.querySelector('#video-list');
const emptyState = document.querySelector('#empty-state');
const pendingCount = document.querySelector('#pending-count');
const clearCompletedButton = document.querySelector('#clear-completed');
const scheduleForm = document.querySelector('#schedule-form');
const postIdeaInput = document.querySelector('#post-idea');
const postTimeInput = document.querySelector('#post-time');
const scheduleMessage = document.querySelector('#schedule-message');
const scheduleList = document.querySelector('#schedule-list');
const scheduleEmpty = document.querySelector('#schedule-empty');
const scheduledCount = document.querySelector('#scheduled-count');
const enableRemindersButton = document.querySelector('#enable-reminders');
const simulatorForm = document.querySelector('#simulator-form');
const simulatorMessage = document.querySelector('#simulator-message');
const simulationResults = document.querySelector('#simulation-results');
const completionRate = document.querySelector('#completion-rate');
const averageWatchTime = document.querySelector('#average-watch-time');
const resultSampleSize = document.querySelector('#result-sample-size');
const retentionChart = document.querySelector('#retention-chart');

function showMessage(message, type = '') {
  formMessage.textContent = message;
  formMessage.className = `form-message${type ? ` ${type}` : ''}`;
}

function loadVideos() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) return [];

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.some(video =>
      !video || typeof video.id !== 'string' || typeof video.url !== 'string' ||
      typeof video.watched !== 'boolean'
    )) {
      throw new Error('Saved watchlist data has an unexpected format.');
    }
    return parsed;
  } catch (error) {
    showMessage(`Could not load your saved list: ${error.message}`, 'error');
    return [];
  }
}

let videos = loadVideos();

function loadSchedule() {
  try {
    const saved = localStorage.getItem(SCHEDULE_STORAGE_KEY);
    if (saved === null) return [];

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.some(post =>
      !post || typeof post.id !== 'string' || typeof post.idea !== 'string' ||
      typeof post.scheduledAt !== 'string' || Number.isNaN(Date.parse(post.scheduledAt)) ||
      typeof post.posted !== 'boolean' || typeof post.notified !== 'boolean'
    )) {
      throw new Error('Saved schedule data has an unexpected format.');
    }
    return parsed;
  } catch (error) {
    showScheduleMessage(`Could not load your schedule: ${error.message}`, 'error');
    return [];
  }
}

let schedule = loadSchedule();

function saveVideos() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(videos));
    return true;
  } catch (error) {
    showMessage(`Could not save your list in this browser: ${error.message}`, 'error');
    return false;
  }
}

function showScheduleMessage(message, type = '') {
  scheduleMessage.textContent = message;
  scheduleMessage.className = `form-message${type ? ` ${type}` : ''}`;
}

function saveSchedule() {
  try {
    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(schedule));
    return true;
  } catch (error) {
    showScheduleMessage(`Could not save your schedule in this browser: ${error.message}`, 'error');
    return false;
  }
}

function refreshReminderButton() {
  if (!('Notification' in window)) {
    enableRemindersButton.textContent = 'Notifications unavailable';
    enableRemindersButton.disabled = true;
  } else if (Notification.permission === 'granted') {
    enableRemindersButton.textContent = 'Reminders enabled';
    enableRemindersButton.disabled = true;
  } else if (Notification.permission === 'denied') {
    enableRemindersButton.textContent = 'Notifications blocked';
    enableRemindersButton.disabled = true;
    enableRemindersButton.title = 'Allow notifications for this site in your browser settings.';
  }
}

function checkDueReminders() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const duePosts = schedule.filter(post =>
    !post.posted && !post.notified && Date.parse(post.scheduledAt) <= Date.now()
  );
  if (duePosts.length === 0) return;

  for (const post of duePosts) {
    try {
      new Notification('Time to post on TikTok', { body: post.idea });
      post.notified = true;
    } catch (error) {
      showScheduleMessage(`Could not show a browser reminder: ${error.message}`, 'error');
      break;
    }
  }
  if (duePosts.some(post => post.notified) && saveSchedule()) renderSchedule();
}

function formatScheduleDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function renderSchedule() {
  scheduleList.replaceChildren();
  const activePosts = schedule.filter(post => !post.posted)
    .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
  scheduledCount.textContent = String(activePosts.length);
  scheduleEmpty.hidden = schedule.length > 0;

  for (const post of [...activePosts, ...schedule.filter(item => item.posted)]) {
    const overdue = !post.posted && Date.parse(post.scheduledAt) <= Date.now();
    const card = document.createElement('article');
    card.className = `schedule-card${post.posted ? ' is-posted' : ''}${overdue ? ' is-due' : ''}`;

    const details = document.createElement('div');
    details.className = 'schedule-details';
    const idea = document.createElement('p');
    idea.className = 'schedule-idea';
    idea.textContent = post.idea;
    const date = document.createElement('p');
    date.className = 'schedule-date';
    date.textContent = post.posted
      ? `Posted · planned for ${formatScheduleDate(post.scheduledAt)}`
      : overdue
        ? `Reminder due · ${formatScheduleDate(post.scheduledAt)}`
        : formatScheduleDate(post.scheduledAt);
    details.append(idea, date);

    const actions = document.createElement('div');
    actions.className = 'schedule-actions';
    if (!post.posted) {
      const postedButton = document.createElement('button');
      postedButton.className = 'posted-button';
      postedButton.type = 'button';
      postedButton.textContent = 'Mark posted';
      postedButton.addEventListener('click', () => {
        post.posted = true;
        if (saveSchedule()) renderSchedule();
      });
      actions.append(postedButton);
    }

    const removeButton = document.createElement('button');
    removeButton.className = 'remove-button';
    removeButton.type = 'button';
    removeButton.textContent = '×';
    removeButton.setAttribute('aria-label', 'Remove scheduled post');
    removeButton.addEventListener('click', () => {
      schedule = schedule.filter(item => item.id !== post.id);
      if (saveSchedule()) renderSchedule();
    });
    actions.append(removeButton);
    card.append(details, actions);
    scheduleList.append(card);
  }
}

function createSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) | 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function showSimulatorMessage(message, type = '') {
  simulatorMessage.textContent = message;
  simulatorMessage.className = `form-message${type ? ` ${type}` : ''}`;
}

function renderRetentionResults({ sampleSize, videoLength, hookStrength, seed }) {
  const random = createSeededRandom(seed);
  const thresholds = [0.25, 0.5, 0.75, 1];
  const buckets = [0, 0, 0, 0, 0];
  let completed = 0;
  let totalWatchSeconds = 0;

  for (let session = 0; session < sampleSize; session += 1) {
    let watchSeconds = 0;
    for (let elapsed = 0; elapsed < videoLength; elapsed += 5) {
      const fatigue = (elapsed / videoLength) * 0.035;
      const durationEffect = (videoLength / 180) * 0.03;
      const dropoffChance = 0.22 - hookStrength * 0.025 + durationEffect + fatigue;
      if (random() < dropoffChance) break;
      watchSeconds += Math.min(5, videoLength - elapsed);
    }

    const fractionWatched = watchSeconds / videoLength;
    totalWatchSeconds += watchSeconds;
    if (fractionWatched >= 1) completed += 1;
    const bucket = thresholds.findIndex(threshold => fractionWatched < threshold);
    buckets[bucket === -1 ? buckets.length - 1 : bucket] += 1;
  }

  const completionPercentage = (completed / sampleSize) * 100;
  completionRate.textContent = `${completionPercentage.toFixed(1)}%`;
  averageWatchTime.textContent = `${(totalWatchSeconds / sampleSize).toFixed(1)} sec`;
  resultSampleSize.textContent = sampleSize.toLocaleString();
  retentionChart.replaceChildren();

  const labels = ['0–24%', '25–49%', '50–74%', '75–99%', '100%'];
  for (let index = 0; index < buckets.length; index += 1) {
    const row = document.createElement('div');
    row.className = 'retention-row';
    const label = document.createElement('span');
    label.className = 'retention-label';
    label.textContent = labels[index];
    const track = document.createElement('span');
    track.className = 'retention-track';
    const bar = document.createElement('span');
    bar.className = 'retention-bar';
    bar.style.width = `${(buckets[index] / sampleSize) * 100}%`;
    track.append(bar);
    const count = document.createElement('span');
    count.className = 'retention-count';
    count.textContent = `${buckets[index].toLocaleString()} (${((buckets[index] / sampleSize) * 100).toFixed(1)}%)`;
    row.append(label, track, count);
    retentionChart.append(row);
  }

  simulationResults.hidden = false;
  showSimulatorMessage(`Simulation complete · ${videoLength}s video · opening strength ${hookStrength}/5 · seed ${seed}.`);
}

function safeVideoUrl(value) {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || !allowedHosts.has(url.hostname.toLowerCase())) return null;
    return url.href;
  } catch {
    return null;
  }
}

function renderVideos() {
  videoList.replaceChildren();
  const pending = videos.filter(video => !video.watched).length;
  pendingCount.textContent = String(pending);
  emptyState.hidden = videos.length > 0;
  clearCompletedButton.hidden = !videos.some(video => video.watched);

  for (const video of videos) {
    const card = document.createElement('article');
    card.className = `video-card${video.watched ? ' is-watched' : ''}`;

    const icon = document.createElement('span');
    icon.className = 'video-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '▷';

    const details = document.createElement('div');
    details.className = 'video-details';
    const label = document.createElement('p');
    label.className = 'video-label';
    label.textContent = video.watched ? 'Watched' : 'Saved video';
    const link = document.createElement('a');
    link.className = 'video-url';
    link.href = video.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = video.url;
    link.title = video.url;
    details.append(label, link);

    const actions = document.createElement('div');
    actions.className = 'video-actions';
    const openLink = document.createElement('a');
    openLink.className = 'open-link';
    openLink.href = video.url;
    openLink.target = '_blank';
    openLink.rel = 'noopener noreferrer';
    openLink.setAttribute('aria-label', 'Open video in a new tab');
    openLink.innerHTML = '<span aria-hidden="true">↗</span><span class="open-label">Open video</span>';

    const watchedButton = document.createElement('button');
    watchedButton.className = 'watched-button';
    watchedButton.type = 'button';
    watchedButton.textContent = video.watched ? '✓' : '○';
    watchedButton.setAttribute('aria-label', video.watched ? 'Mark as not watched' : 'Mark as watched');
    watchedButton.addEventListener('click', () => {
      video.watched = !video.watched;
      if (saveVideos()) renderVideos();
    });

    const removeButton = document.createElement('button');
    removeButton.className = 'remove-button';
    removeButton.type = 'button';
    removeButton.textContent = '×';
    removeButton.setAttribute('aria-label', 'Remove video from queue');
    removeButton.addEventListener('click', () => {
      videos = videos.filter(item => item.id !== video.id);
      if (saveVideos()) renderVideos();
    });

    actions.append(openLink, watchedButton, removeButton);
    card.append(icon, details, actions);
    videoList.append(card);
  }
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const url = safeVideoUrl(urlInput.value);
  if (!url) {
    showMessage('Enter a valid HTTPS link from tiktok.com, vm.tiktok.com, or vt.tiktok.com.', 'error');
    urlInput.focus();
    return;
  }
  if (videos.some(video => video.url === url)) {
    showMessage('That video is already in your list.', 'error');
    return;
  }

  videos.unshift({ id: crypto.randomUUID(), url, watched: false });
  if (saveVideos()) {
    urlInput.value = '';
    showMessage('Video added to your queue.', 'success');
    renderVideos();
  }
});

clearCompletedButton.addEventListener('click', () => {
  videos = videos.filter(video => !video.watched);
  if (saveVideos()) renderVideos();
});

function updateMinimumPostTime() {
  const localNow = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
  postTimeInput.min = localNow;
}

scheduleForm.addEventListener('submit', event => {
  event.preventDefault();
  const idea = postIdeaInput.value.trim();
  const scheduledAt = new Date(postTimeInput.value);
  if (!idea || !postTimeInput.value || Number.isNaN(scheduledAt.getTime())) {
    showScheduleMessage('Enter a video idea and a valid posting date and time.', 'error');
    return;
  }
  if (scheduledAt.getTime() <= Date.now()) {
    showScheduleMessage('Choose a posting time in the future.', 'error');
    postTimeInput.focus();
    return;
  }

  schedule.push({
    id: crypto.randomUUID(),
    idea,
    scheduledAt: scheduledAt.toISOString(),
    posted: false,
    notified: false
  });
  if (saveSchedule()) {
    scheduleForm.reset();
    updateMinimumPostTime();
    showScheduleMessage('Post added to your schedule.', 'success');
    renderSchedule();
  }
});

enableRemindersButton.addEventListener('click', async () => {
  if (!('Notification' in window)) {
    showScheduleMessage('Browser notifications are not supported here. Keep the page open to see due posts in your schedule.', 'error');
    refreshReminderButton();
    return;
  }
  try {
    const permission = await Notification.requestPermission();
    refreshReminderButton();
    if (permission === 'granted') {
      showScheduleMessage('Browser reminders are enabled for this device.', 'success');
      checkDueReminders();
    } else if (permission === 'denied') {
      showScheduleMessage('Notifications are blocked. Allow them in your browser settings to receive reminders.', 'error');
    } else {
      showScheduleMessage('Notifications were not enabled. You can allow them later in your browser.', 'error');
    }
  } catch (error) {
    showScheduleMessage(`Could not enable browser reminders: ${error.message}`, 'error');
  }
});

simulatorForm.addEventListener('submit', event => {
  event.preventDefault();
  const sampleSize = Number(document.querySelector('#sample-size').value);
  const videoLength = Number(document.querySelector('#video-length').value);
  const hookStrength = Number(document.querySelector('#hook-strength').value);
  const seed = Number(document.querySelector('#simulation-seed').value);
  if (!Number.isInteger(sampleSize) || sampleSize < 100 || sampleSize > 5000) {
    showSimulatorMessage('Choose a whole-number sample size from 100 to 5,000.', 'error');
    return;
  }
  if (!Number.isInteger(seed) || seed < 1 || seed > 4_294_967_295) {
    showSimulatorMessage('Choose a whole-number seed from 1 to 4,294,967,295.', 'error');
    return;
  }
  if (![15, 30, 60, 90].includes(videoLength) || hookStrength < 1 || hookStrength > 5) {
    showSimulatorMessage('Choose a listed video length and an opening strength from 1 to 5.', 'error');
    return;
  }

  renderRetentionResults({ sampleSize, videoLength, hookStrength, seed });
});

document.querySelector('#clear-credentials').addEventListener('click', () => {
  document.querySelector('#client-key').value = '';
  document.querySelector('#client-secret').value = '';
});

updateMinimumPostTime();
refreshReminderButton();
renderSchedule();
checkDueReminders();
window.setInterval(() => {
  checkDueReminders();
  renderSchedule();
}, 30_000);
renderVideos();
