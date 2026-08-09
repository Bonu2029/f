/* =========================================================
   Lumina Dental Studio — interactions
   Subtle by design: reveal on scroll, light parallax,
   a before/after slider and a validating booking form.
   ========================================================= */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ---------- Footer year ---------- */
  var year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Header shadow on scroll ---------- */
  var header = $('#siteHeader');
  var fab = $('.fab');

  function onScrollChrome() {
    var y = window.scrollY;
    if (header) header.classList.toggle('is-stuck', y > 8);
    if (fab) fab.classList.toggle('is-visible', y > 520);
  }

  /* ---------- Mobile menu ---------- */
  var toggle = $('#menuToggle');
  var nav = $('#nav');

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });

    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  /* ---------- Reveal on scroll (with a gentle stagger per group) ---------- */
  var revealItems = $$('.reveal');

  $$('.cards, .features, .reviews').forEach(function (group) {
    $$('.reveal', group).forEach(function (el, i) {
      el.style.setProperty('--stagger', (i % 4) * 0.07 + 's');
    });
  });

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });

    revealItems.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ---------- Light parallax on selected images ---------- */
  var parallaxEls = $$('[data-parallax]');
  var ticking = false;

  function applyParallax() {
    var vh = window.innerHeight;
    parallaxEls.forEach(function (el) {
      var rect = el.getBoundingClientRect();
      if (rect.bottom < -200 || rect.top > vh + 200) return;
      var strength = parseFloat(el.getAttribute('data-parallax')) || 10;
      // -1 (below fold) .. 1 (above fold)
      var progress = (vh / 2 - (rect.top + rect.height / 2)) / (vh / 2 + rect.height / 2);
      el.style.transform = 'translate3d(0,' + (progress * strength).toFixed(2) + 'px,0) scale(1.04)';
    });
  }

  function onScroll() {
    onScrollChrome();
    if (reduceMotion || ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      applyParallax();
      ticking = false;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScrollChrome();
  if (!reduceMotion) applyParallax();

  /* ---------- Before / after slider ---------- */
  var ba = $('#beforeAfter');
  if (ba) {
    var frame = $('.ba-frame', ba);
    var afterLayer = $('#baAfter');
    var handle = $('#baHandle');
    var dragging = false;

    function setPosition(pct) {
      var p = Math.max(0, Math.min(100, pct));
      afterLayer.style.setProperty('--ba-pos', p + '%');
      handle.style.left = p + '%';
      handle.setAttribute('aria-valuenow', String(Math.round(p)));
    }

    function positionFromEvent(e) {
      var rect = frame.getBoundingClientRect();
      var x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      setPosition((x / rect.width) * 100);
    }

    function startDrag(e) {
      dragging = true;
      frame.style.cursor = 'grabbing';
      positionFromEvent(e);
    }

    function moveDrag(e) {
      if (!dragging) return;
      if (e.cancelable) e.preventDefault();
      positionFromEvent(e);
    }

    function endDrag() {
      dragging = false;
      frame.style.cursor = '';
    }

    frame.addEventListener('mousedown', startDrag);
    frame.addEventListener('touchstart', startDrag, { passive: true });
    window.addEventListener('mousemove', moveDrag);
    window.addEventListener('touchmove', moveDrag, { passive: false });
    window.addEventListener('mouseup', endDrag);
    window.addEventListener('touchend', endDrag);

    handle.addEventListener('keydown', function (e) {
      var current = parseFloat(handle.getAttribute('aria-valuenow')) || 50;
      var step = e.shiftKey ? 10 : 2;
      if (e.key === 'ArrowLeft') { setPosition(current - step); e.preventDefault(); }
      if (e.key === 'ArrowRight') { setPosition(current + step); e.preventDefault(); }
      if (e.key === 'Home') { setPosition(0); e.preventDefault(); }
      if (e.key === 'End') { setPosition(100); e.preventDefault(); }
    });

    setPosition(50);
  }

  /* ---------- "Book Now" pre-selects the service ---------- */
  var serviceSelect = $('#bf-service');

  $$('[data-service]').forEach(function (link) {
    link.addEventListener('click', function () {
      if (!serviceSelect) return;
      serviceSelect.value = link.getAttribute('data-service');
      serviceSelect.dispatchEvent(new Event('change'));
      var field = serviceSelect.closest('.field');
      if (field) field.classList.remove('has-error');
    });
  });

  /* ---------- Booking form ---------- */
  var form = $('#bookForm');
  if (form) {
    var dateInput = $('#bf-date');
    if (dateInput) dateInput.min = new Date().toISOString().split('T')[0];

    var rules = {
      'bf-name': function (v) {
        return v.trim().length >= 2 ? '' : 'Please enter your name.';
      },
      'bf-phone': function (v) {
        // Accept the shapes people actually type: +1 206 555 0142, (206) 555-0142, 2065550142
        var digits = v.replace(/\D/g, '');
        var shaped = /^\+?[\d\s().-]+$/.test(v.trim());
        return shaped && digits.length >= 7 && digits.length <= 15
          ? ''
          : 'Please enter a phone number we can reach you on.';
      },
      'bf-email': function (v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Please enter a valid email address.';
      },
      'bf-service': function (v) { return v ? '' : 'Please choose a service.'; },
      'bf-date': function (v) { return v ? '' : 'Please choose a preferred date.'; },
      'bf-time': function (v) { return v ? '' : 'Please choose a preferred time.'; }
    };

    function validateField(id) {
      var input = document.getElementById(id);
      var message = rules[id](input.value);
      var field = input.closest('.field');
      var errorEl = $('[data-error-for="' + id + '"]', form);

      field.classList.toggle('has-error', Boolean(message));
      input.setAttribute('aria-invalid', message ? 'true' : 'false');
      if (errorEl) errorEl.textContent = message;
      return !message;
    }

    Object.keys(rules).forEach(function (id) {
      var input = document.getElementById(id);
      if (!input) return;
      input.addEventListener('blur', function () { validateField(id); });
      input.addEventListener('change', function () {
        if (input.closest('.field').classList.contains('has-error')) validateField(id);
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var firstInvalid = null;
      Object.keys(rules).forEach(function (id) {
        if (!validateField(id) && !firstInvalid) firstInvalid = document.getElementById(id);
      });

      if (firstInvalid) {
        firstInvalid.focus();
        firstInvalid.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
        return;
      }

      var data = {
        name: $('#bf-name').value.trim(),
        phone: $('#bf-phone').value.trim(),
        email: $('#bf-email').value.trim(),
        service: $('#bf-service').value,
        date: $('#bf-date').value,
        time: $('#bf-time').value
      };

      var endpoint = form.getAttribute('data-endpoint');
      var button = $('button[type="submit"]', form);

      function prettyDate(iso) {
        var parts = iso.split('-');
        var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        if (isNaN(d)) return iso;
        return d.toLocaleDateString(undefined, {
          weekday: 'long', day: 'numeric', month: 'long'
        });
      }

      function showSuccess() {
        var panel = $('#formSuccess');
        var text = $('#formSuccessText');
        text.textContent =
          'Thanks, ' + data.name.split(' ')[0] + '. We have your request for ' + data.service +
          ' on ' + prettyDate(data.date) + ', ' + data.time + '. We will call you to confirm.';
        panel.hidden = false;
      }

      if (endpoint) {
        button.disabled = true;
        button.textContent = 'Sending…';
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(data)
        })
          .then(function (res) {
            if (!res.ok) throw new Error('Request failed');
            showSuccess();
          })
          .catch(function () {
            button.disabled = false;
            button.textContent = 'Request Appointment';
            var errorEl = $('[data-error-for="bf-name"]', form);
            if (errorEl) {
              errorEl.textContent =
                'Sorry — we could not send that. Please call us on (206) 555-0142.';
            }
          });
        return;
      }

      // No endpoint configured: hand the request to the visitor's email client
      // so nothing is silently dropped.
      var to = form.getAttribute('data-fallback-email') || '';
      var subject = 'Appointment request — ' + data.service;
      var body =
        'Name: ' + data.name + '\n' +
        'Phone: ' + data.phone + '\n' +
        'Email: ' + data.email + '\n' +
        'Service: ' + data.service + '\n' +
        'Preferred date: ' + data.date + '\n' +
        'Preferred time: ' + data.time + '\n';

      window.location.href =
        'mailto:' + to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);

      showSuccess();
    });

    var resetBtn = $('#formReset');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        form.reset();
        $('#formSuccess').hidden = true;
        var button = $('button[type="submit"]', form);
        button.disabled = false;
        button.textContent = 'Request Appointment';
        $$('.field', form).forEach(function (f) { f.classList.remove('has-error'); });
        $$('.error', form).forEach(function (el) { el.textContent = ''; });
        $('#bf-name').focus();
      });
    }
  }
})();
