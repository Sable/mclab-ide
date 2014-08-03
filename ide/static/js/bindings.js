(function() {
  ko.bindingHandlers.contextMenu = {
    init: function (element, valueAccessor) {
      var value = valueAccessor();
      $(element).contextmenu({
        target: value.target,
        before: value.before,
        scopes: value.scopes || null,
        onItem: function (context, e) {
          var data = ko.dataFor(context.first().get()[0]);
          var action = $(e.target).text();
          value.onItem(action, data ? data : context);
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
