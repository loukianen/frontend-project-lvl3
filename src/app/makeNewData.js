export const getId = (titleName, list) => {
  if (list.length === 0) {
    return { id: 1, existation: 'new' };
  }
  const feedSameTitle = list.filter((el) => el.title === titleName)[0];
  if (feedSameTitle) {
    return { id: feedSameTitle.id, existation: 'existing' };
  }
  const lastId = Math.max(...list.map((el) => el.id));
  return { id: lastId + 1, existation: 'new' };
};

const addId = (notIdFeed, notIdPosts, currentData) => {
  const { id: feedId } = getId(notIdFeed.title, currentData.feeds);
  const feedWithId = { id: feedId, url: currentData.currentUrl, ...notIdFeed };
  const postList = currentData.posts;
  const postsWithId = notIdPosts.map((post) => {
    const { id, existation } = getId(post.title, postList);
    let readState = 'notRead';
    if (existation === 'existing') {
      currentData.posts.forEach((el) => {
        if (el.id === id) {
          readState = el.readState;
        }
      });
    }
    const newPost = {
      id,
      feedId,
      readState,
      ...post,
    };
    postList.push(newPost);
    return newPost;
  });
  return { feedWithId, postsWithId };
};

const getProperties = (node) => {
  const title = node.querySelector('title').textContent;
  const description = node.querySelector('description').textContent;
  const link = node.querySelector('link').textContent;
  return { title, description, link };
};

const parsingRss = (data) => {
  const parser = new DOMParser();
  const parsedRss = parser.parseFromString(data, 'text/xml');
  const channelNode = parsedRss.querySelector('channel');
  if (!channelNode || channelNode === null) {
    throw new Error('Parsing_data_error');
  }
  const feed = getProperties(channelNode);

  const itemNodes = Array.from(parsedRss.querySelectorAll('item'));
  if (itemNodes.length === 0) {
    throw new Error('Parsing_data_error');
  }
  const posts = itemNodes.map((node) => getProperties(node));
  return { feed, posts };
};

const makeNewDataForState = (newData, oldData) => {
  const newFeed = newData.feedWithId;
  const feedId = newFeed.id;
  const peeledOldFeeds = oldData.feeds.filter((feed) => feed.id !== feedId);
  const feeds = [newFeed, ...peeledOldFeeds];
  const newPosts = newData.postsWithId;
  const peeledOldPosts = oldData.posts.filter((post) => post.feedId !== feedId);
  const posts = [...newPosts, ...peeledOldPosts];
  return { feeds, posts };
};

export const getPosts = (rssData) => {
  const parsedRssData = parsingRss(rssData);
  return parsedRssData.posts;
};

export const makeNewData = (rssData, state) => {
  const { feed, posts } = parsingRss(rssData);
  const dataWithId = addId(feed, posts, state);
  const newDataForState = makeNewDataForState(dataWithId, state);
  return newDataForState;
};
