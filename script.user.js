// ==UserScript==
// @name         AO3 Vanity
// @namespace    https://github.com/serpentineegg/ao3-vanity
// @version      0.0.0-dev
// @description  Add Tumblr and Twitter search links to AO3 works
// @author       serpentineegg
// @match        *://archiveofourown.org/*
// @grant        GM_addStyle
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  // Platforms to search for mentions of a work. Tumblr matches the
  // exact work URL in post links without login. Twitter search only
  // works logged in on x.com: its url: operator matches the expanded
  // URLs of t.co links, so results are specific to this work.
  const SEARCH_PLATFORMS = [
    {
      name: 'Tumblr',
      title: 'Search Tumblr for mentions of this work',
      createUrl: workId =>
        `https://www.tumblr.com/search/${encodeURIComponent(`archiveofourown.org/works/${workId}`)}`
    },
    {
      name: 'Twitter',
      title: 'Search Twitter for mentions of this work (requires being logged in on x.com)',
      createUrl: workId =>
        `https://x.com/search?q=${encodeURIComponent(`url:archiveofourown.org/works/${workId}`)}&f=live`
    }
  ];

  // Create search link elements for all platforms, separated by dots
  function createSearchLinks(workId) {
    const fragment = document.createDocumentFragment();
    SEARCH_PLATFORMS.forEach((platform, index) => {
      if (index > 0) {
        fragment.appendChild(document.createTextNode(' · '));
      }
      const searchLink = document.createElement('a');
      searchLink.href = platform.createUrl(workId);
      searchLink.target = '_blank';
      searchLink.rel = 'noopener noreferrer';
      searchLink.textContent = platform.name;
      searchLink.title = platform.title;
      fragment.appendChild(searchLink);
    });
    return fragment;
  }

  // Add search links to any work stats section
  function addSearchLinksToStats(workElement, workId) {
    // Check if already exists
    if (workElement.querySelector('.ao3-vanity-links')) {
      return;
    }

    // Check if this is a work.meta.group first
    if (workElement.matches('dl.work.meta.group')) {
      // For work.meta.group, insert after the stats section
      const statsSection = workElement.querySelector('dd.stats');
      if (statsSection) {
        const dt = document.createElement('dt');
        dt.className = 'ao3-vanity-links';
        dt.textContent = 'External Links:';

        const dd = document.createElement('dd');
        dd.className = 'ao3-vanity-links';
        dd.appendChild(createSearchLinks(workId));

        // Insert after the stats section
        const nextSibling = statsSection.nextSibling;
        if (nextSibling) {
          workElement.insertBefore(dt, nextSibling);
          workElement.insertBefore(dd, nextSibling);
        } else {
          workElement.appendChild(dt);
          workElement.appendChild(dd);
        }
      }
      return;
    }

    // Try different stats container locations for other elements
    let statsContainer = workElement.querySelector('dl.stats');

    // If no dl.stats, try the nested stats in work meta
    if (!statsContainer) {
      statsContainer = workElement.querySelector('dd.stats dl.stats');
    }

    if (!statsContainer) {
      return;
    }

    // Create the dd wrapper element
    const dd = document.createElement('dd');
    dd.className = 'ao3-vanity-links';
    dd.appendChild(createSearchLinks(workId));

    // For regular stats containers, append the wrapped links
    statsContainer.appendChild(dd);
  }

  // Process all work elements on any page
  function processAllWorks() {
    // Find all work elements with different selectors
    const workSelectors = [
      'li.work.blurb',              // Standard work listings
      'li.reading.work.blurb',      // Reading history
      'li.bookmark.blurb',          // Bookmarks
      'div.work.meta',              // Individual work pages
      'dl.work.meta.group',         // Work metadata sections
      'li.work'                     // Generic work items
    ];

    workSelectors.forEach(selector => {
      const workElements = document.querySelectorAll(selector);

      workElements.forEach(workElement => {
        let workId = null;

        // Try to find the work ID in different ways
        const titleLink = workElement.querySelector('h4.heading a[href*="/works/"]');
        if (titleLink) {
          workId = titleLink.href.match(/\/works\/(\d+)/)?.[1];
        } else if (selector === 'div.work.meta' || selector === 'dl.work.meta.group') {
          // For individual work pages
          workId = window.location.pathname.match(/\/works\/(\d+)/)?.[1];
        } else {
          // Try to find work ID in element attributes
          workId = workElement.id?.match(/work[_-](\d+)/)?.[1] ||
            workElement.className?.match(/work-(\d+)/)?.[1];
        }

        if (workId) {
          addSearchLinksToStats(workElement, workId);
        }
      });
    });
  }

  // Main initialization function
  function init() {
    // Process all works on any AO3 page
    processAllWorks();

    // Set up observer for dynamically loaded content
    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.addedNodes.length > 0) {
          // Debounce the processing to avoid excessive calls
          clearTimeout(window.ao3VanityTimeout);
          window.ao3VanityTimeout = setTimeout(processAllWorks, 500);
        }
      });
    });

    // Observe the main content area
    const mainContent = document.querySelector('#main') || document.body;
    if (mainContent) {
      observer.observe(mainContent, {
        childList: true,
        subtree: true
      });
    }
  }

  // Wait for page to load and initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})()
