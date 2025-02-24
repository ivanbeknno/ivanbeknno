$(function() {
  var postURLs,
      isFetchingPosts = false,
      shouldFetchPosts = true;

  // Инициализация Clipboard.js один раз для всех элементов
  var clipboard = new ClipboardJS('.js-copy-url');

  clipboard.on('success', function(e) {
    // Найти или создать уведомление
    var notification = e.trigger.querySelector('.copy-notification');
    if (!notification) {
      notification = document.createElement('span');
      notification.className = 'copy-notification';
      notification.textContent = 'Скопировано!';
      e.trigger.appendChild(notification);
    }

    // Показать уведомление
    notification.classList.add('visible');

    // Скрыть через 2 секунды
    setTimeout(function() {
      notification.classList.remove('visible');
    }, 2000);

    e.clearSelection();
  });

  clipboard.on('error', function(e) {
    console.error('Ошибка при копировании:', e.action);
  });

  // Load the JSON file containing all URLs
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);

  // If a tag was passed as a url parameter then use it to filter the urls
  if (urlParams.has('tag')){
    const tag = urlParams.get('tag');
    document.getElementById(tag).classList.toggle('hidden');
    $.getJSON('/posts-by-tag.json', function(data) {
        let tag_item = data.find(el => el.tag === tag);
        postURLs = tag_item["posts"];
        // If there aren't any more posts available to load than already visible, disable fetching
        if (postURLs.length <= postsToLoad)
          disableFetching();
    });
  } else {
      $.getJSON('/all-posts.json', function(data) {
        postURLs = data["posts"];
        // If there aren't any more posts available to load than already visible, disable fetching
        if (postURLs.length <= postsToLoad)
          disableFetching();
      });
  }

  var postsToLoad = $(".tag-master:not(.hidden) .post-list").children().length,
      loadNewPostsThreshold = 10;

  // If there's no spinner, it's not a page where posts should be fetched
  if ($(".infinite-spinner").length < 1)
    shouldFetchPosts = false;

  // Are we close to the end of the page? If we are, load more posts
  $(window).scroll(function(e){
    if (!shouldFetchPosts || isFetchingPosts) return;

    var fetch = ( $(window).scrollTop() + $(window).height() ) >
                ( $(document).height() - ($(window).height() / 2) );

    // If we've scrolled past the loadNewPostsThreshold, fetch posts
    if (fetch) {
      fetchPosts();
    }
  });

  // Fetch a chunk of posts
  function fetchPosts() {
    // Exit if postURLs haven't been loaded
    if (!postURLs) return;

    isFetchingPosts = true;

    // Load as many posts as there were present on the page when it loaded
    // After successfully loading a post, load the next one
    var loadedPosts = 0,
        postCount = $(".tag-master:not(.hidden) .post-list").children().length,
        callback = function() {
          loadedPosts++;
          var postIndex = postCount + loadedPosts;

          if (postIndex > postURLs.length-1) {
            disableFetching();
            return;
          }

          if (loadedPosts < postsToLoad) {
            fetchPostWithIndex(postIndex, callback);
          } else {
            isFetchingPosts = false;
          }
        };

    fetchPostWithIndex(postCount + loadedPosts, callback);
  }

  function fetchPostWithIndex(index, callback) {
    var postData = postURLs[index];

    $.get(postData.url, function(data) {
      var $tempContainer = $('<div></div>').html(data);
      var $post = $tempContainer.find(".post");

      var $dateContainer = $post.find('p small');
      if ($dateContainer.length === 0) {
          $dateContainer = $('<p style="display: flex; justify-content: space-between; align-items: center"></p>');
      }
      var dateText = postData.date;

      // Создаем два отдельных small элемента
      var $leftSmall = $('<small></small>').text(dateText);
      var $rightSmall = $('<small></small>').html(
          '<a class="js-copy-url" data-clipboard-text="' + window.location.origin + postData.url + '">🔗 Копировать ссылку</a>'
      );

      // Очищаем и добавляем новые элементы в контейнер
      $dateContainer.empty()
          .append($leftSmall)
          .append($rightSmall);

      // Вставляем дату перед hr
      $post.find('hr').before($dateContainer);

      // Добавляем пост на страницу
      $post.appendTo(".tag-master:not(.hidden) .post-list");

      callback();
    });
  }

  function disableFetching() {
    shouldFetchPosts = false;
    isFetchingPosts = false;
    $(".infinite-spinner").fadeOut();
  }
});
