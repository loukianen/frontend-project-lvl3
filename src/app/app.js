// @ts-check

import axios from 'axios';
import i18next from 'i18next';
import onChange from 'on-change';
import { string } from 'yup';
import resources from './locale';
import makeNewData from './makeNewData';
import renderChanges from './view';

const getRssData = (url) => axios
  .get(`https://api.allorigins.win/get?charset=UTF-8&url=${url}`)
  .then((response) => response.data.contents);

const checkIfUrlExist = (data) => {
  const existLinks = data.feeds.length > 0 ? data.feeds.map((feed) => feed.url) : [];
  return existLinks.includes(data.currentUrl) ? new Error('Url_already_exist') : true;
};

const validate = (data) => {
  const schema = string().url().min(1);
  return schema.isValid(data.currentUrl)
    .then((isValid) => (isValid ? checkIfUrlExist(data) : new Error('Url_invalid')));
};

export default () => {
  let lang;
  switch (window.navigator.language) {
    case 'ru':
      lang = 'ru';
      break;
    default:
      lang = 'en';
  }
  // You can connect cupport russian language 'i18next.init({ lng: lang })

  i18next.init({
    lng: lang,
    debug: true,
    resources,
  });

  const stateLayout = {
    currentUrl: '',
    process: 'fillingForm',
    validation: {
      url: 'none',
    },
    refresher: 'notStarted',
    feeds: [],
    posts: [],
  };

  const state = onChange(stateLayout, renderChanges, { ignoreKeys: ['currentUrl', 'validation', 'refresher'] });

  const refreshData = (data) => {
    const iter = () => {
      const refreshPromises = data.feeds.map((feed) => {
        const { url } = feed;
        const promise = getRssData(url).then((rssData) => {
          const newData = makeNewData(rssData, state);
          if (newData instanceof Error) {
            throw newData;
          }
          state.feeds = newData.feeds;
          state.posts = newData.posts;
        });
        return promise;
      });
      Promise.all(refreshPromises).then(() => {
        setTimeout(iter, 5000);
      });
    };
    if (state.refresher === 'notStarted') {
      state.refresher = 'started';
      iter();
    }
  };

  renderChanges(state);

  const form = document.querySelector('form');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    state.process = 'fillingForm';
    const formData = new FormData(event.target);
    state.currentUrl = formData.get('url');
    new Promise((resolve) => resolve(validate(state)))
      .then((validationResult) => {
        if (validationResult instanceof Error) {
          throw validationResult;
        }
        state.validation.url = 'valid';
        state.process = 'processing';
      })
      .then(() => getRssData(state.currentUrl))
      .then((rssData) => {
        const newData = makeNewData(rssData, state);
        if (newData instanceof Error) {
          throw newData;
        }
        state.feeds = newData.feeds;
        state.posts = newData.posts;
        state.process = 'processed';
        form.querySelector('input').value = '';
        refreshData(state);
      })
      .catch((e) => {
        const errorName = e.message;
        state.validation.url = 'invalid';
        const errorActions = {
          Url_invalid: () => {
            state.process = 'stoppedCauseInvalidUrl';
          },
          Url_already_exist: () => {
            state.process = 'stoppedCauseFeedExist';
          },
          Parsing_data_error: () => {
            state.process = 'failed';
          },
        };
        errorActions[errorName]();
      });
  });
};
