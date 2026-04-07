/**
* Template Name: iPortfolio
* Template URL: https://bootstrapmade.com/iportfolio-bootstrap-portfolio-websites-template/
* Updated: Mar 17 2024 with Bootstrap v5.3.3
* Author: BootstrapMade.com
* License: https://bootstrapmade.com/license/
*/

(function() {
  "use strict";

  const PORTFOLIO_DETAILS = {
    '1': {
      heading: 'App 1',
      title: 'Mobile app concept',
      category: 'App',
      client: 'Personal project',
      date: '2024',
      url: '#',
      urlLabel: 'Add your link',
      description: 'UI exploration and prototype for a productivity app. Focus on clear navigation, accessible components, and a cohesive visual system.',
      images: ['assets/img/portfolio/portfolio-1.jpg', 'assets/img/portfolio/portfolio-details-1.jpg', 'assets/img/portfolio/portfolio-details-2.jpg']
    },
    '2': {
      heading: 'Web 3',
      title: 'Responsive web experience',
      category: 'Web',
      client: 'Freelance',
      date: '2023',
      url: '#',
      urlLabel: 'Add your link',
      description: 'Full-width layouts, component library, and performance-minded front-end structure for a marketing site.',
      images: ['assets/img/portfolio/portfolio-2.jpg', 'assets/img/portfolio/portfolio-details-2.jpg', 'assets/img/portfolio/portfolio-details-3.jpg']
    },
    '3': {
      heading: 'App 2',
      title: 'App dashboard',
      category: 'App',
      client: 'Academic / demo',
      date: '2023',
      url: '#',
      urlLabel: 'Add your link',
      description: 'Dashboard views with data summaries, filters, and export-friendly layouts.',
      images: ['assets/img/portfolio/portfolio-3.jpg', 'assets/img/portfolio/portfolio-details-1.jpg', 'assets/img/portfolio/portfolio-details-3.jpg']
    },
    '4': {
      heading: 'Card 2',
      title: 'Print & digital card set',
      category: 'Card',
      client: 'Brand concept',
      date: '2022',
      url: '#',
      urlLabel: 'Add your link',
      description: 'Coordinated card designs for events and social campaigns with consistent typography and color.',
      images: ['assets/img/portfolio/portfolio-4.jpg', 'assets/img/portfolio/portfolio-details-2.jpg', 'assets/img/portfolio/portfolio-1.jpg']
    },
    '5': {
      heading: 'Web 2',
      title: 'Corporate website refresh',
      category: 'Web',
      client: 'Demo client',
      date: '2024',
      url: '#',
      urlLabel: 'Add your link',
      description: 'Information architecture update, reusable sections, and CMS-friendly templates.',
      images: ['assets/img/portfolio/portfolio-5.jpg', 'assets/img/portfolio/portfolio-details-3.jpg', 'assets/img/portfolio/portfolio-details-1.jpg']
    },
    '6': {
      heading: 'App 3',
      title: 'Utility app screens',
      category: 'App',
      client: 'Personal project',
      date: '2023',
      url: '#',
      urlLabel: 'Add your link',
      description: 'Onboarding, settings, and core task flows with emphasis on speed and low cognitive load.',
      images: ['assets/img/portfolio/portfolio-6.jpg', 'assets/img/portfolio/portfolio-details-1.jpg', 'assets/img/portfolio/portfolio-details-3.jpg']
    },
    '7': {
      heading: 'Card 1',
      title: 'Invitation & stationery',
      category: 'Card',
      client: 'Event concept',
      date: '2022',
      url: '#',
      urlLabel: 'Add your link',
      description: 'Elegant layout and print-ready artwork for invitations and thank-you cards.',
      images: ['assets/img/portfolio/portfolio-7.jpg', 'assets/img/portfolio/portfolio-details-2.jpg', 'assets/img/portfolio/portfolio-7.jpg']
    },
    '8': {
      heading: 'Card 3',
      title: 'Promotional card series',
      category: 'Card',
      client: 'Marketing demo',
      date: '2023',
      url: '#',
      urlLabel: 'Add your link',
      description: 'Series of cards for seasonal campaigns with modular illustrations and copy blocks.',
      images: ['assets/img/portfolio/portfolio-8.jpg', 'assets/img/portfolio/portfolio-details-3.jpg', 'assets/img/portfolio/portfolio-8.jpg']
    },
    '9': {
      heading: 'Web 3',
      title: 'Landing page system',
      category: 'Web',
      client: 'Freelance',
      date: '2024',
      url: '#',
      urlLabel: 'Add your link',
      description: 'Hero variants, feature grids, and testimonial sections built for easy reuse across launches.',
      images: ['assets/img/portfolio/portfolio-9.jpg', 'assets/img/portfolio/portfolio-details-1.jpg', 'assets/img/portfolio/portfolio-9.jpg']
    }
  }

  const applyPortfolioDetailsFromQuery = () => {
    const slidesWrap = select('#portfolio-details-slides')
    if (!slidesWrap) return
    const id = new URLSearchParams(window.location.search).get('id')
    const data = id ? PORTFOLIO_DETAILS[id] : null
    if (!data) return

    const headingEl = select('#portfolio-details-heading')
    const crumbEl = select('#portfolio-details-crumb')
    if (headingEl) headingEl.textContent = data.heading
    if (crumbEl) crumbEl.textContent = data.heading

    const titleEl = select('#pd-title')
    const descEl = select('#pd-description')
    if (titleEl) titleEl.textContent = data.title
    if (descEl) descEl.textContent = data.description

    const cat = select('#pd-category')
    const client = select('#pd-client')
    const date = select('#pd-date')
    const urlA = select('#pd-url')
    if (cat) cat.textContent = data.category
    if (client) client.textContent = data.client
    if (date) date.textContent = data.date
    if (urlA) {
      urlA.href = data.url
      urlA.textContent = data.urlLabel
    }

    slidesWrap.innerHTML = data.images.map((src) =>
      '<div class="swiper-slide"><img src="' + src + '" alt=""></div>'
    ).join('')

    document.title = data.heading + ' — Portfolio Details'
  }

  /**
   * Easy selector helper function
   */
  const select = (el, all = false) => {
    el = el.trim()
    if (all) {
      return [...document.querySelectorAll(el)]
    } else {
      return document.querySelector(el)
    }
  }

  /**
   * Easy event listener function
   */
  const on = (type, el, listener, all = false) => {
    let selectEl = select(el, all)
    if (selectEl) {
      if (all) {
        selectEl.forEach(e => e.addEventListener(type, listener))
      } else {
        selectEl.addEventListener(type, listener)
      }
    }
  }

  /**
   * Easy on scroll event listener 
   */
  const onscroll = (el, listener) => {
    el.addEventListener('scroll', listener)
  }

  /**
   * Navbar links active state on scroll
   */
  let navbarlinks = select('#navbar .scrollto', true)
  const navbarlinksActive = () => {
    let position = window.scrollY + 200
    navbarlinks.forEach(navbarlink => {
      if (!navbarlink.hash) return
      let section = select(navbarlink.hash)
      if (!section) return
      if (position >= section.offsetTop && position <= (section.offsetTop + section.offsetHeight)) {
        navbarlink.classList.add('active')
      } else {
        navbarlink.classList.remove('active')
      }
    })
  }
  window.addEventListener('load', navbarlinksActive)
  onscroll(document, navbarlinksActive)

  /**
   * Scrolls to an element with header offset
   */
  const scrollto = (el) => {
    let elementPos = select(el).offsetTop
    window.scrollTo({
      top: elementPos,
      behavior: 'smooth'
    })
  }

  /**
   * Back to top button
   */
  let backtotop = select('.back-to-top')
  if (backtotop) {
    const toggleBacktotop = () => {
      if (window.scrollY > 100) {
        backtotop.classList.add('active')
      } else {
        backtotop.classList.remove('active')
      }
    }
    window.addEventListener('load', toggleBacktotop)
    onscroll(document, toggleBacktotop)
  }

  /**
   * Mobile nav toggle
   */
  on('click', '.mobile-nav-toggle', function(e) {
    select('body').classList.toggle('mobile-nav-active')
    this.classList.toggle('bi-list')
    this.classList.toggle('bi-x')
  })

  /**
   * Scrool with ofset on links with a class name .scrollto
   */
  on('click', '.scrollto', function(e) {
    if (select(this.hash)) {
      e.preventDefault()

      let body = select('body')
      if (body.classList.contains('mobile-nav-active')) {
        body.classList.remove('mobile-nav-active')
        let navbarToggle = select('.mobile-nav-toggle')
        navbarToggle.classList.toggle('bi-list')
        navbarToggle.classList.toggle('bi-x')
      }
      scrollto(this.hash)
    }
  }, true)

  /**
   * Scroll with ofset on page load with hash links in the url
   */
  window.addEventListener('load', () => {
    if (window.location.hash) {
      if (select(window.location.hash)) {
        scrollto(window.location.hash)
      }
    }
  });

  /**
   * Hero type effect
   */
  const typed = select('.typed')
  if (typed) {
    let typed_strings = typed.getAttribute('data-typed-items')
    typed_strings = typed_strings.split(',')
    new Typed('.typed', {
      strings: typed_strings,
      loop: true,
      typeSpeed: 100,
      backSpeed: 50,
      backDelay: 2000
    });
  }

  /**
   * Skills animation
   */
  let skilsContent = select('.skills-content');
  if (skilsContent) {
    new Waypoint({
      element: skilsContent,
      offset: '80%',
      handler: function(direction) {
        let progress = select('.progress .progress-bar', true);
        progress.forEach((el) => {
          el.style.width = el.getAttribute('aria-valuenow') + '%'
        });
      }
    })
  }

  /**
   * Porfolio isotope and filter
   */
  window.addEventListener('load', () => {
    let portfolioContainer = select('.portfolio-container');
    if (portfolioContainer) {
      let portfolioIsotope = new Isotope(portfolioContainer, {
        itemSelector: '.portfolio-item'
      });

      let portfolioFilters = select('#portfolio-flters li', true);

      on('click', '#portfolio-flters li', function(e) {
        e.preventDefault();
        portfolioFilters.forEach(function(el) {
          el.classList.remove('filter-active');
        });
        this.classList.add('filter-active');

        portfolioIsotope.arrange({
          filter: this.getAttribute('data-filter')
        });
        portfolioIsotope.on('arrangeComplete', function() {
          AOS.refresh()
        });
      }, true);
    }

  });

  /**
   * Initiate portfolio lightbox
   */
  if (select('.portfolio-lightbox', true).length) {
    GLightbox({
      selector: '.portfolio-lightbox'
    })
  }

  applyPortfolioDetailsFromQuery()

  /**
   * Portfolio details slider
   */
  const portfolioDetailsSlider = select('.portfolio-details-slider')
  if (portfolioDetailsSlider) {
    new Swiper('.portfolio-details-slider', {
      speed: 400,
      loop: true,
      autoplay: {
        delay: 5000,
        disableOnInteraction: false
      },
      pagination: {
        el: portfolioDetailsSlider.querySelector('.swiper-pagination'),
        type: 'bullets',
        clickable: true
      }
    })
  }

  /**
   * Testimonials slider
   */
  const testimonialsSlider = select('.testimonials-slider')
  if (testimonialsSlider) {
    new Swiper('.testimonials-slider', {
      speed: 600,
      loop: true,
      autoplay: {
        delay: 5000,
        disableOnInteraction: false
      },
      slidesPerView: 'auto',
      pagination: {
        el: testimonialsSlider.querySelector('.swiper-pagination'),
        type: 'bullets',
        clickable: true
      },
      breakpoints: {
        320: {
          slidesPerView: 1,
          spaceBetween: 20
        },

        1200: {
          slidesPerView: 3,
          spaceBetween: 20
        }
      }
    })
  }

  /**
   * Animation on scroll
   */
  window.addEventListener('load', () => {
    AOS.init({
      duration: 1000,
      easing: 'ease-in-out',
      once: true,
      mirror: false
    })
  });

  /**
   * Initiate Pure Counter 
   */
  new PureCounter();

  const footerYear = select('#footer-year')
  if (footerYear) {
    footerYear.textContent = new Date().getFullYear()
  }

})()
