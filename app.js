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
