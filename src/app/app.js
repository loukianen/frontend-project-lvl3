// @ts-check

import axios from 'axios';
import i18next from 'i18next';
import onChange from 'on-change';
import { string } from 'yup';
import resources from './locale';
import { makeNewData, getPosts } from './makeNewData';
import renderChanges from './view';

const getRssData = (url) => axios
  .get(`https://api.allorigins.win/get?charset=UTF-8&url=${url}`)
  .then((response) => response.data.contents)
  .catch(() => {
    throw new Error('Parsing_data_error');
  });

const checkIfUrlExist = (data) => {
  const existLinks = data.feeds.length > 0 ? data.feeds.map((feed) => feed.url) : [];
  return existLinks.includes(data.currentUrl) ? new Error('Url_already_exist') : true;
};

const validate = (data) => {
  const schema = string().url().min(1);
  return schema.isValid(data.currentUrl)
    .then((isValid) => (isValid ? checkIfUrlExist(data) : new Error('Url_invalid')));
};

const setLanguage = (language = window.navigator.language) => {
  switch (language) {
    case 'ru':
      return 'ru';
    default:
      return 'en';
  }
};

const applyUi = () => {
  const leadElement = document.querySelector('.lead');
  const addButton = document.querySelector('button[aria-label="add"]');
  const exampleElement = document.getElementById('example');
  leadElement.textContent = i18next.t('ui.lead');
  addButton.textContent = i18next.t('ui.add');
  exampleElement.textContent = i18next.t('ui.example');
};

export default () => {
  i18next.init({
    lng: setLanguage(), // You can set language: setLanguage('ru')). Default - locale.
    debug: true,
    resources,
  });

  applyUi();

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
    const curState = data;
    const iter = () => {
      const refreshPromises = curState.feeds.map((feed) => {
        const { url } = feed;
        const promise = getRssData(url)
          .then((rssData) => getPosts(rssData))
          .catch();
        return promise;
      });
      const newPosts = [];
      let postsWithoutId = [];
      Promise.all(refreshPromises).then((promisesPesolve) => {
        promisesPesolve.forEach((list, index) => {
          let curList = list;
          const feedId = curState.feeds[index].id;
          const curPostsbyFeedId = curState.posts.filter((post) => post.feedId === feedId);
          curPostsbyFeedId.forEach((post) => {
            const newList = [];
            curList.forEach((item) => {
              if (item.title === post.title) {
                newPosts.push(post);
              } else {
                const itemWithFeedId = { ...item, feedId };
                newList.push(itemWithFeedId);
              }
            });
            curList = newList;
          });
          postsWithoutId = [...postsWithoutId, ...curList];
        });
        let lastId = Math.max(...newPosts.map((el) => el.id));
        postsWithoutId.forEach((post) => {
          const curId = lastId + 1;
          newPosts.push({ ...post, id: curId, readState: 'notRead' });
          lastId = curId;
        });
        curState.posts = newPosts;
        setTimeout(iter, 5000);
      }).catch();
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
