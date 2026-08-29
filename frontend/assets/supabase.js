(function () {
  "use strict";

  var cfg = window.TRINETRA_CONFIG || {};
  var isConfigured =
    cfg.SUPABASE_URL &&
    cfg.SUPABASE_URL.indexOf("your-project-ref") === -1 &&
    cfg.SUPABASE_ANON_KEY &&
    cfg.SUPABASE_ANON_KEY.indexOf("your-supabase") === -1;

  // Minimal placeholder client so pages never crash on .auth/.from() calls.
  var noopClient = {
    auth: {
      signUp: function () { return Promise.resolve({ data: null, error: { message: "Supabase not configured" } }); },
      signInWithPassword: function () { return noopClient.auth.signUp(); },
      signOut: function () { return Promise.resolve({ error: null }); },
      getSession: function () { return Promise.resolve({ data: { session: null }, error: null }); },
      onAuthStateChange: function () { return { data: { subscription: { unsubscribe: function () {} } } }; }
    },
    from: function () {
      return {
        select: function () { return noopClient.query; },
        insert: function () { return noopClient.query; },
        update: function () { return noopClient.query; },
        delete: function () { return noopClient.query; }
      };
    },
    query: {
      eq: function () { return noopClient.query; },
      order: function () { return noopClient.query; },
      limit: function () { return noopClient.query; },
      then: function (resolve) {
        return Promise.resolve({ data: [], error: { message: "Supabase not configured" } }).then(resolve);
      }
    }
  };

  var client = isConfigured ? null : noopClient;

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function initRealClient() {
    return loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2")
      .then(function () {
        client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
          auth: { persistSession: true, autoRefreshToken: true }
        });
        return client;
      })
      .catch(function () {
        client = noopClient;
        return client;
      });
  }

  var api = {
    get isConfigured() { return !!isConfigured; },
    get client() { return client; },
    ready: function () {
      if (!isConfigured) return Promise.resolve(noopClient);
      if (client && client !== noopClient) return Promise.resolve(client);
      return initRealClient();
    },
    // Sign-up / login helpers for the future auth flow.
    signUp: function (email, password) {
      return this.ready().then(function (c) { return c.auth.signUp({ email: email, password: password }); });
    },
    signIn: function (email, password) {
      return this.ready().then(function (c) { return c.auth.signInWithPassword({ email: email, password: password }); });
    },
    signOut: function () {
      return this.ready().then(function (c) { return c.auth.signOut(); });
    },
    // Latest reading per station, ready for the map/dashboard when data flows.
    latestReadings: function () {
      return this.ready().then(function (c) {
        return c
          .from(cfg.SUPABASE_READINGS_TABLE || "readings")
          .select("*")
          .order("recorded_at", { ascending: false })
          .limit(500)
          .then(function (res) { return res; });
      });
    },
    stations: function () {
      return this.ready().then(function (c) {
        return c
          .from(cfg.SUPABASE_STATIONS_TABLE || "stations")
          .select("*")
          .then(function (res) { return res; });
      });
    }
  };

  window.Trinetra = api;
})();