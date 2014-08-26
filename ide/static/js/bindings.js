(function() {
  ko.bindingHandlers.contextMenu = {
    init: function (element, valueAccessor) {
      var value = valueAccessor();
      var clickEvent;
      $(element).contextmenu({
        target: value.target,
        before: function (e, context) {
          clickEvent = e;
          return value.before ? value.before(e, context) : true;
        },
        scopes: value.scopes || null,
        onItem: function (context, e) {
          var data = ko.dataFor(context.first().get()[0]);
          var action = $(e.target).text();
          value.onItem(action, data || context, clickEvent);
        }
      });
    }
  };

  ko.bindingHandlers.beforeUnloadText = {
    init: function (element, valueAccessor) {
      $(window).on('beforeunload', function() {
        var value = ko.unwrap(valueAccessor());
        if (value && value !== null) {
          return value;
        }
      });
    }
  };

  ko.bindingHandlers.terminal = {
    init: function (element, valueAccessor) {
      var options = valueAccessor();
      var terminal = $(element).terminal(options.onCommand, {
        greetings: '',
        prompt: '>> ',
        clear: false,
        exit: false,
        login: false,
      });
      if (!ko.unwrap(options.enabled)) {
        terminal.pause();
        terminal.echo('Preparing interpreter...');
      }
      $(element).data('terminal', terminal);

      // This fixes a problem where the terminal keeps stealing keystrokes when
      // a context menu spawns a modal, even though it doesn't have focus
      // anymore. See https://github.com/jcubic/jquery.terminal/issues/169.
      $(document).on('show.bs.context', function () {
        if (terminal.enabled()) {
          terminal.disable();
        }
      });
    },

    update: function (element, valueAccessor) {
      var terminal = $(element).data('terminal');
      var options = valueAccessor();
      if (ko.unwrap(options.enabled) && terminal.paused()) {
        terminal.clear();
        terminal.resume();
      }
    },
  }
})();
