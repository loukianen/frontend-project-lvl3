import i18next from 'i18next';
import $ from 'jquery';
import 'bootstrap/js/dist/modal';

const showModal = ({ title, description, link }) => {
  const modal = document.getElementById('modal');
  const modalTitle = modal.querySelector('.modal-title');
  const modalBody = modal.querySelector('.modal-body');
  const linkToFullArticle = modal.querySelector('.full-article');
  modalTitle.textContent = title;
  modalBody.textContent = description;
  linkToFullArticle.setAttribute('href', link);
  $('#modal').modal();
};

const markPost = (postId, data) => {
  let postIndex;
  const state = data;
  state.posts.forEach((post, index) => {
    if (postId === post.id) {
      postIndex = index;
    }
  });
  state.posts[postIndex].readState = 'read';
};

const getFeedback = (processState) => {
  const mapping = {
    processing: i18next.t('messages.loadingStarted'),
    processed: i18next.t('messages.loadSuccess'),
    stoppedCauseInvalidUrl: i18next.t('messages.urlInvalid'),
    stoppedCauseFeedExist: i18next.t('messages.feedExist'),
    failed: i18next.t('messages.loadFailure'),
  };
  return mapping[processState] ?? '';
};

const renderFeedback = (state) => {
  const inputElement = document.querySelector('input');
  inputElement.classList.remove('is-invalid', 'is-valid');
  const validityClass = state.validation.url === 'valid' ? 'is-valid' : 'is-invalid';
  inputElement.classList.add(validityClass);
  const feedBackElement = document.querySelector('.feedback');
  feedBackElement.classList.remove('text-success', 'text-danger');
  const feedBackColor = state.validation.url === 'valid' ? 'text-success' : 'text-danger';
  feedBackElement.classList.add(feedBackColor);
  feedBackElement.textContent = getFeedback(state.process);
};

const renderFeeds = ({ feeds }) => {
  const feedsContainer = document.querySelector('.feeds');
  feedsContainer.innerHTML = '';
  const header = document.createElement('h2');
  header.textContent = i18next.t('ui.feeds');
  feedsContainer.appendChild(header);
  feeds.forEach((feed) => {
    const feedCard = document.createElement('div');
    feedCard.classList.add('card');
    const content = `<div class="card-body">
      <h3 class="card-title">${feed.title}</h3>
      <p class="card-text">${feed.description}</p>
    </div>`;
    feedCard.innerHTML = content;
    feedsContainer.appendChild(feedCard);
  });
};

const renderPosts = (data) => {
  const postsContainer = document.querySelector('.posts');
  postsContainer.innerHTML = '';
  const header = document.createElement('h2');
  header.textContent = i18next.t('ui.posts');
  postsContainer.appendChild(header);
  data.posts.forEach((post) => {
    const postCard = document.createElement('div');
    postCard.classList.add('card');
    const linkFont = post.readState === 'read' ? 'font-weight-normal' : 'font-weight-bold';
    const content = `<div class="card-body d-flex justify-content-between">
      <a href="${post.link}" class="card-link ${linkFont}" target="_blank">${post.title}</a>
      <button type="button" class="btn btn-primary" data-toggle="modal data-target="#modal">${i18next.t('ui.previewButtonLable')}</button></div>`;
    postCard.innerHTML = content;
    const button = postCard.querySelector('button');
    button.addEventListener('click', (event) => {
      event.preventDefault();
      showModal(post);
      markPost(post.id, data);
    });
    const articleLink = postCard.querySelector('.card-link');
    articleLink.addEventListener('click', () => {
      markPost(post.id, data);
    });
    postsContainer.appendChild(postCard);
  });
};

export default function render(path) {
  const processedPath = String(path).split('.')[0];
  switch (processedPath) {
    case 'process':
      renderFeedback(this);
      break;
    case 'feeds':
      renderFeeds(this);
      break;
    case 'posts':
      renderPosts(this);
      break;
    default:
      // console.log(`Sorry, we are out of ${path}.`);
  }
}
