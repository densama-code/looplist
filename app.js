const STORAGE_KEY = 'looplist-videos-v1';
const allowedHosts = new Set(['tiktok.com', 'www.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com']);

const form = document.querySelector('#add-form');
const urlInput = document.querySelector('#video-url');
const formMessage = document.querySelector('#form-message');
const videoList = document.querySelector('#video-list');
const emptyState = document.querySelector('#empty-state');
const pendingCount = document.querySelector('#pending-count');
const clearCompletedButton = document.querySelector('#clear-completed');

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

function saveVideos() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(videos));
    return true;
  } catch (error) {
    showMessage(`Could not save your list in this browser: ${error.message}`, 'error');
    return false;
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

document.querySelector('#clear-credentials').addEventListener('click', () => {
  document.querySelector('#client-key').value = '';
  document.querySelector('#client-secret').value = '';
});

renderVideos();
