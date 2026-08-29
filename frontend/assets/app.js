(function () {
  "use strict";

  var ICONS = {
    search: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    bell: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
    settings: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    person: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/></svg>',
    dashboard: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
    insights: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m7 14 4-4 3 3 5-6"/></svg>',
    map: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3 3 5.5v15L9 18l6 2.5 6-2.5v-15L15 5.5 9 3z"/><path d="M9 3v15M15 5.5v15"/></svg>',
    assistant: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M12 4v4M2 12h2M20 12h2"/><path d="M12 12h.01M15 12h.01M9 12h.01"/></svg>',
    history: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></svg>',
    report: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 15h6M9 11h2"/></svg>',
    logout: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/></svg>',
    menu: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
    mic: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v4"/></svg>',
    send: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></svg>',
    "chevron-down": '<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    calendar: '<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    sync: '<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.3"/><path d="M21 3v6h-6"/></svg>',
    expand: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>',
    download: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/></svg>',
    warning: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3z"/><path d="M12 9v4M12 17h.01"/></svg>',
    sun: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    leaf: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 4 13c0-5 4-9 9-9a9 9 0 0 1 9 9c0 5-4 7-9 7z"/><path d="M4 20c3-4 6-8 11-10"/></svg>',
    server: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><path d="M6 6h.01M6 18h.01"/></svg>',
    image: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg>'
  };

  var NAV = [
    { id: "dashboard", label: "Dashboard", icon: "dashboard", href: "dashboard.html" },
    { id: "analytics", label: "Analytics", icon: "insights", href: "analytics.html" },
    { id: "map", label: "Live Map", icon: "map", href: "map.html" },
    { id: "assistant", label: "AI Assistant", icon: "assistant", href: "assistant.html" },
    { id: "history", label: "Historical Data", icon: "history", href: "dashboard.html" },
    { id: "settings", label: "Settings", icon: "settings", href: "settings.html" }
  ];

  var page = document.body.getAttribute("data-page") || "";

  function icon(name) {
    return ICONS[name] || "";
  }

  function buildHeader() {
    var header = document.createElement("header");
    header.className = "topbar";
    header.innerHTML =
      '<button class="menu-toggle" data-action="toggle-sidebar" aria-label="Open menu">' + icon("menu") + "</button>" +
      '<a class="brand" href="dashboard.html">' +
      '<img src="assets/somaiya-logo.svg" alt="Somaiya Vidyavihar University logo"/>' +
      '<span><strong class="brand-name">Trinetra</strong><span class="small-caps">Somaiya Vidyavihar University</span></span>' +
      "</a>" +
      '<div class="topbar-search"><span>' + icon("search") + "</span>" +
      '<input type="search" placeholder="Search locations, sensors..." aria-label="Search"/></div>' +
      '<div class="topbar-actions">' +
      '<button aria-label="Notifications">' + icon("bell") + "</button>" +
      '<button aria-label="Theme" data-action="toggle-theme">' + icon("sun") + "</button>" +
      '<a class="avatar" href="settings.html" aria-label="Profile">' + icon("person") + "</a>" +
      "</div>";
    document.body.insertBefore(header, document.body.firstChild);
  }

  function buildSidebar() {
    var nav = document.createElement("nav");
    nav.className = "sidebar";
    nav.setAttribute("aria-label", "Main navigation");
    var items = NAV.map(function (n) {
      var active = n.id === page ? " active" : "";
      return '<a class="nav-item' + active + '" href="' + n.href + '">' +
        icon(n.icon) + "<span>" + (n.id === "history" ? "Historical" : n.label) + "</span></a>";
    }).join("");
    nav.innerHTML =
      '<div class="sidebar-label">Navigation<span>Monitoring Suite</span></div>' +
      items +
      '<div class="sidebar-footer">' +
      '<button class="btn-report" data-action="report">' + icon("report") + "Report Issue</button>" +
      "</div>";
    var shell = document.body.querySelector(".shell");
    (shell || document.body).insertBefore(nav, shell ? shell.firstChild : null);
  }

  function buildFooter() {
    var footer = document.createElement("footer");
    footer.className = "footer";
    footer.innerHTML =
      '<div class="footer-inner">' +
      '<span>&copy; 2026 Somaiya Vidyavihar University. NAAC \'A\' Accredited.</span>' +
      '<div class="footer-links"><a href="#">Privacy Policy</a><a href="#">Terms</a><a href="#">Research</a></div>' +
      "</div>";
    document.body.appendChild(footer);
  }

  function wrapMain() {
    var main = document.querySelector(".main");
    if (main) {
      main.classList.add("shell-main");
      var wrapper = document.createElement("div");
      wrapper.className = "shell";
      document.body.insertBefore(wrapper, main);
      wrapper.appendChild(main);
    }
  }

  function bindActions() {
    document.addEventListener("click", function (e) {
      var el = e.target.closest("[data-action]");
      if (!el) return;
      var action = el.getAttribute("data-action");

      if (action === "toggle-sidebar") {
        var sidebar = document.querySelector(".sidebar");
        sidebar.classList.toggle("open");
      } else if (action === "toggle-theme") {
        var root = document.documentElement;
        var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
        root.setAttribute("data-theme", next);
        try { localStorage.setItem("trinetra-theme", next); } catch (err) {}
      } else if (action === "report") {
        document.querySelector(".sidebar").classList.remove("open");
      } else if (action === "logout") {
        window.location.href = "index.html";
      }
    });

    var segs = document.querySelectorAll(".seg[data-seg]");
    segs.forEach(function (seg) {
      seg.addEventListener("click", function (e) {
        var btn = e.target.closest("button");
        if (!btn) return;
        seg.querySelectorAll("button").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
      });
    });

    var chips = document.querySelectorAll(".chips[data-chips] .chip, .chip-toggle");
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () { chip.classList.toggle("active"); });
    });

    var form = document.getElementById("login-form");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        window.location.href = "dashboard.html";
      });
    }
  }

  function applyTheme() {
    var saved = null;
    try { saved = localStorage.getItem("trinetra-theme"); } catch (err) {}
    if (saved) document.documentElement.setAttribute("data-theme", saved);
  }

  applyTheme();

  if (page && page !== "login") {
    wrapMain();
    buildHeader();
    buildSidebar();
    buildFooter();
  }

  bindActions();
})();