// Re-render the timestamp in the viewer's own locale and timezone
(() => {
  const element = document.getElementById('genDate');
  const date = element && new Date(element.dateTime);
  if (date && !Number.isNaN(date.getTime())) {
    element.textContent = date.toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' });
  }
})();

// Fast, smooth in-page navigation
(() => {
  const clearHighlight = () => {
    const target = document.querySelector('.card.current-target');
    target?.classList.remove('current-target');
  };

  const addHighlight = (target) => {
    clearHighlight();
    if (!target?.classList.contains('card')) {
      return;
    }

    void target.offsetWidth;
    target.classList.add('current-target');
  };

  let scrollAnimationFrame;
  const stopScrolling = () => {
    cancelAnimationFrame(scrollAnimationFrame);
    scrollAnimationFrame = undefined;
  };

  const scrollToTarget = (target) => {
    stopScrolling();
    const current = window.scrollY;
    const destination = target.getBoundingClientRect().top + current - 14;

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.scrollTo(0, destination);
      return;
    }

    const delta = destination - current;
    const startTime = performance.now();

    const animate = (time) => {
      const progress = Math.min(1, (time - startTime) / 280);
      window.scrollTo(0, current + delta * (progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2));
      scrollAnimationFrame = progress < 1 ? requestAnimationFrame(animate) : undefined;
    };

    scrollAnimationFrame = requestAnimationFrame(animate);
  };

  const getHashTarget = (hash) => document.getElementById(hash.slice(1));
  addEventListener('popstate', () => {
    stopScrolling();
    addHighlight(getHashTarget(location.hash));
  });

  document.addEventListener('animationend', (event) => {
    if (event.animationName === 'target-highlight' && event.target instanceof Element) {
      event.target.classList.remove('current-target');
    }
  });

  document.addEventListener('click', (event) => {
    const link = event.target instanceof Element
      ? event.target.closest('.jump a[href^="#"], .permalink[href^="#"]')
      : null;
    if (!link) {
      return;
    }

    const hash = link.getAttribute('href');
    const target = getHashTarget(hash);
    if (!target) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (location.hash !== hash) {
      history.pushState(null, '', hash);
    }

    addHighlight(target);
    scrollToTarget(target);
  });

  addHighlight(getHashTarget(location.hash));
})();

// On non-Mac visitors, the markedit:// deep link won't work; point them to the app instead
(() => {
  // iPhone/iPad user agents also contain "Mac OS X", so match "Macintosh"
  // and exclude touch devices (iPadOS reports Macintosh but has touch points).
  const isMac = /Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints <= 1;
  if (isMac) {
    return;
  }

  document.querySelectorAll('.btn.install').forEach((button) => {
    button.href = 'https://github.com/MarkEdit-app/MarkEdit';
    const label = button.querySelector('.install-label');
    if (label) {
      label.textContent = 'Get MarkEdit';
    }
  });
})();

// Follow the browser color scheme for Light/Dark previews until the user picks one
(() => {
  const query = matchMedia('(prefers-color-scheme: dark)');
  const groups = new Map();

  document.querySelectorAll('.preview .tab-input').forEach((input) => {
    const group = groups.get(input.name) ?? {};
    group[input.classList.contains('dark') ? 'dark' : 'light'] = input;
    groups.set(input.name, group);
    input.addEventListener('change', () => { group.touched = true; });
  });

  const apply = () => {
    groups.forEach((group) => {
      if (group.touched) {
        return;
      }

      const target = query.matches ? group.dark : group.light;
      if (target && !target.checked) {
        target.checked = true;
      }
    });
  };

  apply();
  query.addEventListener('change', apply);
})();
